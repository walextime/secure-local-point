import JSZip from 'jszip';
import { db, dbOperations } from '@/lib/dexieDb';
import { toast } from 'sonner';
import { generateId } from '@/lib/utils';

// Backup metadata and versioning
export interface BackupMetadata {
  version: string;
  timestamp: number;
  appVersion: string;
  schemaVersion: number;
  checksum: string;
  size: number;
  tables: Record<string, number>;
  actionQueueCount: number;
  fileAssets: string[];
  config: Record<string, unknown>;
}

// Backup archive structure
export interface BackupArchive {
  metadata: BackupMetadata;
  database: Record<string, unknown[]>;
  actionQueue: unknown[];
  fileAssets: Record<string, string>; // filename -> base64
  config: Record<string, unknown>;
  manifest: BackupManifest;
}

// Backup manifest for integrity checking
export interface BackupManifest {
  version: string;
  timestamp: number;
  checksum: string;
  entries: BackupManifestEntry[];
}

export interface BackupManifestEntry {
  path: string;
  checksum: string;
  size: number;
  type: 'database' | 'file' | 'config' | 'action-queue';
}

// Backup status tracking
export interface BackupStatus {
  id: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'validating' | 'restoring';
  progress: number;
  message: string;
  timestamp: number;
  metadata?: BackupMetadata;
  error?: string;
}

// Current schema version - increment when database schema changes
const CURRENT_SCHEMA_VERSION = 1;
const CURRENT_APP_VERSION = '1.0.0';

class SystemBackupService {
  private static instance: SystemBackupService;
  private activeBackups: Map<string, BackupStatus> = new Map();
  private backupLock = false;

  static getInstance(): SystemBackupService {
    if (!SystemBackupService.instance) {
      SystemBackupService.instance = new SystemBackupService();
    }
    return SystemBackupService.instance;
  }

  // Generate checksum for data integrity
  private async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Create backup manifest
  private async createManifest(archive: BackupArchive): Promise<BackupManifest> {
    const entries: BackupManifestEntry[] = [];
    
    // Database tables
    for (const [tableName, data] of Object.entries(archive.database)) {
      const dataStr = JSON.stringify(data);
      const checksum = await this.generateChecksum(dataStr);
      entries.push({
        path: `database/${tableName}`,
        checksum,
        size: dataStr.length,
        type: 'database'
      });
    }

    // Action queue
    const actionQueueStr = JSON.stringify(archive.actionQueue);
    const actionQueueChecksum = await this.generateChecksum(actionQueueStr);
    entries.push({
      path: 'action-queue',
      checksum: actionQueueChecksum,
      size: actionQueueStr.length,
      type: 'action-queue'
    });

    // File assets
    for (const [filename, base64Data] of Object.entries(archive.fileAssets)) {
      const checksum = await this.generateChecksum(base64Data);
      entries.push({
        path: `files/${filename}`,
        checksum,
        size: base64Data.length,
        type: 'file'
      });
    }

    // Config
    const configStr = JSON.stringify(archive.config);
    const configChecksum = await this.generateChecksum(configStr);
    entries.push({
      path: 'config',
      checksum: configChecksum,
      size: configStr.length,
      type: 'config'
    });

    const manifestData = JSON.stringify(entries);
    const manifestChecksum = await this.generateChecksum(manifestData);

    return {
      version: '1.0',
      timestamp: Date.now(),
      checksum: manifestChecksum,
      entries
    };
  }

  // Validate backup integrity
  private async validateBackup(archive: BackupArchive): Promise<boolean> {
    try {
      // Validate manifest
      const expectedManifest = await this.createManifest(archive);
      if (JSON.stringify(expectedManifest) !== JSON.stringify(archive.manifest)) {
        console.error('Manifest validation failed');
        return false;
      }

      // Validate each entry
      for (const entry of archive.manifest.entries) {
        let data: string;
        
        switch (entry.type) {
          case 'database':
            const tableName = entry.path.split('/')[1];
            data = JSON.stringify(archive.database[tableName]);
            break;
          case 'action-queue':
            data = JSON.stringify(archive.actionQueue);
            break;
          case 'file':
            const filename = entry.path.split('/')[1];
            data = archive.fileAssets[filename];
            break;
          case 'config':
            data = JSON.stringify(archive.config);
            break;
          default:
            console.error(`Unknown entry type: ${entry.type}`);
            return false;
        }

        const checksum = await this.generateChecksum(data);
        if (checksum !== entry.checksum) {
          console.error(`Checksum mismatch for ${entry.path}`);
          return false;
        }

        if (data.length !== entry.size) {
          console.error(`Size mismatch for ${entry.path}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Backup validation error:', error);
      return false;
    }
  }

  // Create full system backup
  async createBackup(): Promise<{ backupId: string; archive: BackupArchive }> {
    if (this.backupLock) {
      throw new Error('Backup already in progress');
    }

    this.backupLock = true;
    const backupId = generateId();

    try {
      console.log('Starting system backup...');
      
      // Update backup status
      this.activeBackups.set(backupId, {
        id: backupId,
        status: 'in-progress',
        progress: 0,
        message: 'Initializing backup...',
        timestamp: Date.now()
      });

      // 1. Capture database state
      const database: Record<string, unknown[]> = {};
      const tables = ['products', 'customers', 'sales', 'pendingSales', 'users', 'settings', 'creditPayments', 'partialPayments', 'userReceiptCounters', 'pendingSaleEvents'];
      
      for (const table of tables) {
        const data = await dbOperations.directGetAll(table);
        database[table] = data;
        this.updateProgress(backupId, (tables.indexOf(table) + 1) / (tables.length + 4) * 100);
      }

      // 2. Capture action queue
      const actionQueue = await dbOperations.directGetAll('actionQueue');
      this.updateProgress(backupId, 60);

      // 3. Capture file assets (from localStorage, sessionStorage, etc.)
      const fileAssets: Record<string, string> = {};
      
      // Capture localStorage
      const localStorageData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localStorageData[key] = localStorage.getItem(key);
        }
      }
      fileAssets['localStorage.json'] = btoa(JSON.stringify(localStorageData));

      // Capture sessionStorage
      const sessionStorageData = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          sessionStorageData[key] = sessionStorage.getItem(key);
        }
      }
      fileAssets['sessionStorage.json'] = btoa(JSON.stringify(sessionStorageData));

      this.updateProgress(backupId, 70);

      // 4. Capture configuration
      const config = {
        appVersion: CURRENT_APP_VERSION,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        storageQuota: await this.getStorageQuota(),
        features: {
          serviceWorker: 'serviceWorker' in navigator,
          indexedDB: 'indexedDB' in window,
          localStorage: 'localStorage' in window,
          sessionStorage: 'sessionStorage' in window
        }
      };

      this.updateProgress(backupId, 80);

      // 5. Create backup archive
      const archive: BackupArchive = {
        metadata: {
          version: '1.0',
          timestamp: Date.now(),
          appVersion: CURRENT_APP_VERSION,
          schemaVersion: CURRENT_SCHEMA_VERSION,
          checksum: '', // Will be set after manifest creation
          size: 0, // Will be calculated
          tables: Object.fromEntries(Object.entries(database).map(([k, v]) => [k, v.length])),
          actionQueueCount: actionQueue.length,
          fileAssets: Object.keys(fileAssets),
          config
        },
        database,
        actionQueue,
        fileAssets,
        config,
        manifest: {} as BackupManifest // Will be set below
      };

      // 6. Create and validate manifest
      archive.manifest = await this.createManifest(archive);
      archive.metadata.checksum = archive.manifest.checksum;
      archive.metadata.size = JSON.stringify(archive).length;

      this.updateProgress(backupId, 90);

      // 7. Validate backup integrity
      const isValid = await this.validateBackup(archive);
      if (!isValid) {
        throw new Error('Backup validation failed');
      }

      this.updateProgress(backupId, 100);
      this.updateStatus(backupId, 'completed', 'Backup completed successfully');

      console.log('System backup completed successfully');
      return { backupId, archive };

    } catch (error) {
      console.error('Backup failed:', error);
      this.updateStatus(backupId, 'failed', `Backup failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      this.backupLock = false;
    }
  }

  // Create backup ZIP file
  async createBackupZip(archive: BackupArchive): Promise<Blob> {
    const zip = new JSZip();

    // Add metadata
    zip.file('metadata.json', JSON.stringify(archive.metadata, null, 2));

    // Add database tables
    const dbFolder = zip.folder('database');
    for (const [tableName, data] of Object.entries(archive.database)) {
      dbFolder?.file(`${tableName}.json`, JSON.stringify(data, null, 2));
    }

    // Add action queue
    zip.file('action-queue.json', JSON.stringify(archive.actionQueue, null, 2));

    // Add file assets
    const filesFolder = zip.folder('files');
    for (const [filename, base64Data] of Object.entries(archive.fileAssets)) {
      filesFolder?.file(filename, base64Data, { base64: true });
    }

    // Add config
    zip.file('config.json', JSON.stringify(archive.config, null, 2));

    // Add manifest
    zip.file('manifest.json', JSON.stringify(archive.manifest, null, 2));

    return await zip.generateAsync({ type: 'blob' });
  }

  // Restore system from backup
  async restoreBackup(archive: BackupArchive): Promise<void> {
    const restoreId = generateId();

    try {
      console.log('Starting system restore...');
      
      this.updateStatus(restoreId, 'validating', 'Validating backup integrity...');

      // 1. Validate backup integrity
      const isValid = await this.validateBackup(archive);
      if (!isValid) {
        throw new Error('Backup validation failed - backup may be corrupted');
      }

      this.updateStatus(restoreId, 'restoring', 'Restoring database...');

      // 2. Check version compatibility
      if (archive.metadata.schemaVersion > CURRENT_SCHEMA_VERSION) {
        throw new Error(`Backup schema version (${archive.metadata.schemaVersion}) is newer than current version (${CURRENT_SCHEMA_VERSION}). Please update the application.`);
      }

      // 3. Perform schema migration if needed
      if (archive.metadata.schemaVersion < CURRENT_SCHEMA_VERSION) {
        await this.migrateSchema(archive.metadata.schemaVersion, CURRENT_SCHEMA_VERSION);
      }

      // 4. Clear existing data
      await this.clearExistingData();

      this.updateProgress(restoreId, 20);

      // 5. Restore database in transaction
      await db.transaction('rw', [
        db.products, db.customers, db.sales, db.pendingSales,
        db.users, db.settings, db.creditPayments, db.partialPayments,
        db.userReceiptCounters, db.pendingSaleEvents, db.actionQueue
      ], async () => {
        // Restore database tables
        for (const [tableName, data] of Object.entries(archive.database)) {
          if (data.length > 0) {
            await (db as any)[tableName].bulkAdd(data);
          }
        }

        // Restore action queue
        if (archive.actionQueue.length > 0) {
          await db.actionQueue.bulkAdd(archive.actionQueue);
        }
      });

      this.updateProgress(restoreId, 60);

      // 6. Restore file assets
      for (const [filename, base64Data] of Object.entries(archive.fileAssets)) {
        if (filename === 'localStorage.json') {
          const data = JSON.parse(atob(base64Data));
          for (const [key, value] of Object.entries(data)) {
            localStorage.setItem(key, value as string);
          }
        } else if (filename === 'sessionStorage.json') {
          const data = JSON.parse(atob(base64Data));
          for (const [key, value] of Object.entries(data)) {
            sessionStorage.setItem(key, value as string);
          }
        }
      }

      this.updateProgress(restoreId, 80);

      // 7. Restore configuration
      // Configuration is already captured in the backup metadata
      // and can be used for validation

      this.updateProgress(restoreId, 100);
      this.updateStatus(restoreId, 'completed', 'Restore completed successfully');

      console.log('System restore completed successfully');
      toast.success('System restore completed successfully');

    } catch (error) {
      console.error('Restore failed:', error);
      this.updateStatus(restoreId, 'failed', `Restore failed: ${error instanceof Error ? error.message : String(error)}`);
      toast.error(`Restore failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // Schema migration
  private async migrateSchema(fromVersion: number, toVersion: number): Promise<void> {
    console.log(`Migrating schema from version ${fromVersion} to ${toVersion}`);
    
    // Add migration logic here as schema evolves
    if (fromVersion === 0 && toVersion === 1) {
      // Example migration: add new fields to existing tables
      // This would be implemented as the schema evolves
    }
  }

  // Clear existing data
  private async clearExistingData(): Promise<void> {
    await db.transaction('rw', [
      db.products, db.customers, db.sales, db.pendingSales,
      db.users, db.settings, db.creditPayments, db.partialPayments,
      db.userReceiptCounters, db.pendingSaleEvents, db.actionQueue
    ], async () => {
      await Promise.all([
        db.products.clear(),
        db.customers.clear(),
        db.sales.clear(),
        db.pendingSales.clear(),
        db.users.clear(),
        db.settings.clear(),
        db.creditPayments.clear(),
        db.partialPayments.clear(),
        db.userReceiptCounters.clear(),
        db.pendingSaleEvents.clear(),
        db.actionQueue.clear()
      ]);
    });
  }

  // Get storage quota information
  private async getStorageQuota(): Promise<{ usage: number; quota: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0
        };
      } catch (error) {
        console.error('Failed to get storage quota:', error);
        return null;
      }
    }
    return null;
  }

  // Update backup progress
  private updateProgress(backupId: string, progress: number): void {
    const backup = this.activeBackups.get(backupId);
    if (backup) {
      backup.progress = progress;
      this.activeBackups.set(backupId, backup);
    }
  }

  // Update backup status
  private updateStatus(backupId: string, status: BackupStatus['status'], message: string): void {
    const backup = this.activeBackups.get(backupId);
    if (backup) {
      backup.status = status;
      backup.message = message;
      backup.timestamp = Date.now();
      this.activeBackups.set(backupId, backup);
    }
  }

  // Get backup status
  getBackupStatus(backupId: string): BackupStatus | undefined {
    return this.activeBackups.get(backupId);
  }

  // Get all active backups
  getActiveBackups(): BackupStatus[] {
    return Array.from(this.activeBackups.values());
  }

  // Parse backup from ZIP file
  async parseBackupZip(blob: Blob): Promise<BackupArchive> {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(blob);

    // Read metadata
    const metadataFile = zipContent.file('metadata.json');
    if (!metadataFile) {
      throw new Error('Invalid backup: missing metadata.json');
    }
    const metadata: BackupMetadata = JSON.parse(await metadataFile.async('string'));

    // Read database tables
    const database: Record<string, unknown[]> = {};
    const dbFolder = zipContent.folder('database');
    if (dbFolder) {
      for (const [tableName, count] of Object.entries(metadata.tables)) {
        const tableFile = dbFolder.file(`${tableName}.json`);
        if (tableFile) {
          database[tableName] = JSON.parse(await tableFile.async('string'));
        }
      }
    }

    // Read action queue
    const actionQueueFile = zipContent.file('action-queue.json');
    const actionQueue = actionQueueFile ? JSON.parse(await actionQueueFile.async('string')) : [];

    // Read file assets
    const fileAssets: Record<string, string> = {};
    const filesFolder = zipContent.folder('files');
    if (filesFolder) {
      for (const filename of metadata.fileAssets) {
        const file = filesFolder.file(filename);
        if (file) {
          fileAssets[filename] = await file.async('base64');
        }
      }
    }

    // Read config
    const configFile = zipContent.file('config.json');
    const config = configFile ? JSON.parse(await configFile.async('string')) : {};

    // Read manifest
    const manifestFile = zipContent.file('manifest.json');
    const manifest: BackupManifest = manifestFile ? JSON.parse(await manifestFile.async('string')) : {} as BackupManifest;

    const archive: BackupArchive = {
      metadata,
      database,
      actionQueue,
      fileAssets,
      config,
      manifest
    };

    return archive;
  }
}

export const systemBackupService = SystemBackupService.getInstance(); 
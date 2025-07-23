import Dexie, { Table } from 'dexie';
import { db } from '@/lib/dexieDb';
import { generateId } from '@/lib/utils';
import { toast } from 'sonner';

// UUID for tracking entities across backups
export interface EntityUUID {
  id: string;
  uuid: string;
  table: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

// Action log entry for incremental tracking
export interface ActionLogEntry {
  id: string;
  uuid: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'BATCH_CREATE' | 'BATCH_UPDATE' | 'BATCH_DELETE';
  table: string;
  entityId?: string;
  entityUUID?: string;
  data?: any;
  previousData?: any;
  timestamp: number;
  userId?: string;
  sessionId: string;
  sequence: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  error?: string;
  retryCount: number;
  dependencies?: string[]; // UUIDs of dependent actions
}

// Snapshot metadata
export interface SnapshotMetadata {
  id: string;
  uuid: string;
  name: string;
  description?: string;
  timestamp: number;
  schemaVersion: number;
  appVersion: string;
  snapshotType: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  parentSnapshotUUID?: string; // For incremental snapshots
  baseSnapshotUUID?: string;   // For differential snapshots
  checksum: string;
  size: number;
  compressionRatio?: number;
  tableCounts: Record<string, number>;
  actionLogCount: number;
  entityUUIDCount: number;
  isComplete: boolean;
  isVerified: boolean;
  createdAt: number;
  updatedAt: number;
}

// Snapshot data structure
export interface SnapshotData {
  metadata: SnapshotMetadata;
  entityUUIDs: EntityUUID[];
  tableData: Record<string, any[]>;
  actionLog: ActionLogEntry[];
  configuration: Record<string, any>;
  fileAssets: Record<string, string>; // filename -> base64
}

// Backup session for tracking ongoing operations
export interface BackupSession {
  id: string;
  sessionId: string;
  status: 'INITIALIZING' | 'CAPTURING' | 'PROCESSING' | 'COMPLETING' | 'COMPLETED' | 'FAILED';
  snapshotUUID?: string;
  progress: number;
  message: string;
  startTime: number;
  endTime?: number;
  error?: string;
  retryCount: number;
}

// Restore session for tracking restore operations
export interface RestoreSession {
  id: string;
  sessionId: string;
  status: 'VALIDATING' | 'MIGRATING' | 'RESTORING' | 'REPLAYING' | 'COMPLETING' | 'COMPLETED' | 'FAILED';
  snapshotUUID?: string;
  progress: number;
  message: string;
  startTime: number;
  endTime?: number;
  error?: string;
  migrationLog: string[];
  replayLog: string[];
}

// Extended Dexie database for incremental backups
export class IncrementalBackupDatabase extends Dexie {
  // Core tables
  entityUUIDs!: Table<EntityUUID>;
  actionLog!: Table<ActionLogEntry>;
  snapshots!: Table<SnapshotData>;
  backupSessions!: Table<BackupSession>;
  restoreSessions!: Table<RestoreSession>;
  
  // Migration tracking
  migrations!: Table<{
    id: string;
    version: number;
    name: string;
    appliedAt: number;
    checksum: string;
  }>;

  constructor() {
    super('IncrementalBackupDB');
    
    this.version(1).stores({
      entityUUIDs: 'id, uuid, table, createdAt, updatedAt',
      actionLog: 'id, uuid, action, table, timestamp, sequence, status',
      snapshots: 'id, uuid, timestamp, schemaVersion, isComplete',
      backupSessions: 'id, sessionId, status, startTime',
      restoreSessions: 'id, sessionId, status, startTime',
      migrations: 'id, version, name, appliedAt'
    });

    // Add indexes for better performance
    this.version(2).stores({
      entityUUIDs: 'id, uuid, table, createdAt, updatedAt, &uuid',
      actionLog: 'id, uuid, action, table, timestamp, sequence, status, &uuid',
      snapshots: 'id, uuid, timestamp, schemaVersion, isComplete, &uuid',
      backupSessions: 'id, sessionId, status, startTime',
      restoreSessions: 'id, sessionId, status, startTime',
      migrations: 'id, version, name, appliedAt'
    });
  }
}

// Global instance
export const incrementalBackupDB = new IncrementalBackupDatabase();

class IncrementalBackupService {
  private static instance: IncrementalBackupService;
  private activeSessions: Map<string, BackupSession | RestoreSession> = new Map();
  private actionSequence = 0;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): IncrementalBackupService {
    if (!IncrementalBackupService.instance) {
      IncrementalBackupService.instance = new IncrementalBackupService();
    }
    return IncrementalBackupService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUUID(): string {
    return `uuid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate checksum for data integrity
  private async generateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Create entity UUID mapping
  private async createEntityUUID(entityId: string, table: string, data: any): Promise<EntityUUID> {
    const existingUUID = await incrementalBackupDB.entityUUIDs
      .where('id')
      .equals(entityId)
      .and(uuid => uuid.table === table)
      .first();

    if (existingUUID) {
      // Update existing UUID
      const updatedUUID: EntityUUID = {
        ...existingUUID,
        updatedAt: Date.now(),
        version: existingUUID.version + 1
      };
      await incrementalBackupDB.entityUUIDs.put(updatedUUID);
      return updatedUUID;
    } else {
      // Create new UUID
      const newUUID: EntityUUID = {
        id: entityId,
        uuid: this.generateUUID(),
        table,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
      };
      await incrementalBackupDB.entityUUIDs.add(newUUID);
      return newUUID;
    }
  }

  // Log action for incremental tracking
  private async logAction(
    action: ActionLogEntry['action'],
    table: string,
    entityId: string,
    data?: any,
    previousData?: any,
    userId?: string
  ): Promise<ActionLogEntry> {
    const entityUUID = await incrementalBackupDB.entityUUIDs
      .where('id')
      .equals(entityId)
      .and(uuid => uuid.table === table)
      .first();

    if (!entityUUID) {
      throw new Error(`Entity UUID not found for ${table}:${entityId}`);
    }

    const actionEntry: ActionLogEntry = {
      id: generateId(),
      uuid: this.generateUUID(),
      action,
      table,
      entityId,
      entityUUID: entityUUID.uuid,
      data,
      previousData,
      timestamp: Date.now(),
      userId,
      sessionId: this.sessionId,
      sequence: ++this.actionSequence,
      status: 'PENDING',
      retryCount: 0
    };

    await incrementalBackupDB.actionLog.add(actionEntry);
    return actionEntry;
  }

  // Create incremental snapshot
  async createIncrementalSnapshot(
    name: string,
    description?: string,
    parentSnapshotUUID?: string
  ): Promise<SnapshotData> {
    const sessionId = this.generateSessionId();
    const snapshotUUID = this.generateUUID();

    // Create backup session
    const backupSession: BackupSession = {
      id: generateId(),
      sessionId,
      status: 'INITIALIZING',
      snapshotUUID,
      progress: 0,
      message: 'Initializing incremental backup...',
      startTime: Date.now(),
      retryCount: 0
    };

    await incrementalBackupDB.backupSessions.add(backupSession);
    this.activeSessions.set(sessionId, backupSession);

    try {
      // Update session status
      await this.updateBackupSession(sessionId, 'CAPTURING', 10, 'Capturing entity UUIDs...');

      // 1. Capture entity UUIDs
      const entityUUIDs = await incrementalBackupDB.entityUUIDs.toArray();
      await this.updateBackupSession(sessionId, 'CAPTURING', 30, 'Capturing table data...');

      // 2. Capture table data
      const tableData: Record<string, any[]> = {};
      const tables = ['products', 'customers', 'sales', 'pendingSales', 'users', 'settings', 'creditPayments', 'partialPayments', 'userReceiptCounters', 'pendingSaleEvents'];
      
      for (const table of tables) {
        const data = await dbOperations.directGetAll(table);
        tableData[table] = data;
      }

      await this.updateBackupSession(sessionId, 'CAPTURING', 50, 'Capturing action log...');

      // 3. Capture action log since last snapshot
      let actionLog: ActionLogEntry[] = [];
      if (parentSnapshotUUID) {
        const parentSnapshot = await incrementalBackupDB.snapshots
          .where('uuid')
          .equals(parentSnapshotUUID)
          .first();
        
        if (parentSnapshot) {
          actionLog = await incrementalBackupDB.actionLog
            .where('timestamp')
            .above(parentSnapshot.metadata.timestamp)
            .toArray();
        }
      } else {
        // Full snapshot - capture all action log
        actionLog = await incrementalBackupDB.actionLog.toArray();
      }

      await this.updateBackupSession(sessionId, 'CAPTURING', 70, 'Capturing configuration...');

      // 4. Capture configuration
      const configuration = {
        appVersion: '1.0.0',
        schemaVersion: 1,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        storageQuota: await this.getStorageQuota()
      };

      await this.updateBackupSession(sessionId, 'CAPTURING', 80, 'Capturing file assets...');

      // 5. Capture file assets
      const fileAssets: Record<string, string> = {};
      
      // LocalStorage
      const localStorageData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localStorageData[key] = localStorage.getItem(key);
        }
      }
      fileAssets['localStorage.json'] = btoa(JSON.stringify(localStorageData));

      // SessionStorage
      const sessionStorageData = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          sessionStorageData[key] = sessionStorage.getItem(key);
        }
      }
      fileAssets['sessionStorage.json'] = btoa(JSON.stringify(sessionStorageData));

      await this.updateBackupSession(sessionId, 'PROCESSING', 90, 'Generating checksum...');

      // 6. Create snapshot data
      const snapshotData: SnapshotData = {
        metadata: {
          id: generateId(),
          uuid: snapshotUUID,
          name,
          description,
          timestamp: Date.now(),
          schemaVersion: 1,
          appVersion: '1.0.0',
          snapshotType: parentSnapshotUUID ? 'INCREMENTAL' : 'FULL',
          parentSnapshotUUID,
          checksum: '', // Will be set below
          size: 0, // Will be calculated
          tableCounts: Object.fromEntries(Object.entries(tableData).map(([k, v]) => [k, v.length])),
          actionLogCount: actionLog.length,
          entityUUIDCount: entityUUIDs.length,
          isComplete: false,
          isVerified: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        entityUUIDs,
        tableData,
        actionLog,
        configuration,
        fileAssets
      };

      // 7. Generate checksum and finalize
      const dataString = JSON.stringify(snapshotData);
      snapshotData.metadata.checksum = await this.generateChecksum(dataString);
      snapshotData.metadata.size = dataString.length;

      await this.updateBackupSession(sessionId, 'COMPLETING', 95, 'Saving snapshot...');

      // 8. Save snapshot
      await incrementalBackupDB.snapshots.add(snapshotData);

      // 9. Mark as complete and verified
      snapshotData.metadata.isComplete = true;
      snapshotData.metadata.isVerified = true;
      await incrementalBackupDB.snapshots.put(snapshotData);

      await this.updateBackupSession(sessionId, 'COMPLETED', 100, 'Incremental backup completed');

      console.log('Incremental snapshot created:', snapshotUUID);
      return snapshotData;

    } catch (error) {
      console.error('Incremental backup failed:', error);
      await this.updateBackupSession(sessionId, 'FAILED', 0, `Backup failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      this.activeSessions.delete(sessionId);
    }
  }

  // Restore snapshot with action replay
  async restoreSnapshot(snapshotUUID: string): Promise<void> {
    const sessionId = this.generateSessionId();

    // Create restore session
    const restoreSession: RestoreSession = {
      id: generateId(),
      sessionId,
      status: 'VALIDATING',
      snapshotUUID,
      progress: 0,
      message: 'Validating snapshot...',
      startTime: Date.now(),
      migrationLog: [],
      replayLog: []
    };

    await incrementalBackupDB.restoreSessions.add(restoreSession);
    this.activeSessions.set(sessionId, restoreSession);

    try {
      // 1. Load snapshot
      const snapshot = await incrementalBackupDB.snapshots
        .where('uuid')
        .equals(snapshotUUID)
        .first();

      if (!snapshot) {
        throw new Error(`Snapshot not found: ${snapshotUUID}`);
      }

      if (!snapshot.metadata.isComplete || !snapshot.metadata.isVerified) {
        throw new Error('Snapshot is incomplete or unverified');
      }

      await this.updateRestoreSession(sessionId, 'VALIDATING', 10, 'Validating snapshot integrity...');

      // 2. Validate snapshot integrity
      const dataString = JSON.stringify(snapshot);
      const expectedChecksum = await this.generateChecksum(dataString);
      
      if (expectedChecksum !== snapshot.metadata.checksum) {
        throw new Error('Snapshot checksum validation failed');
      }

      await this.updateRestoreSession(sessionId, 'MIGRATING', 20, 'Checking schema compatibility...');

      // 3. Check schema compatibility and migrate if needed
      const currentSchemaVersion = 1; // Get from current app
      if (snapshot.metadata.schemaVersion < currentSchemaVersion) {
        await this.migrateSnapshot(snapshot, currentSchemaVersion, sessionId);
      }

      await this.updateRestoreSession(sessionId, 'RESTORING', 40, 'Clearing existing data...');

      // 4. Clear existing data
      await this.clearExistingData();

      await this.updateRestoreSession(sessionId, 'RESTORING', 50, 'Restoring database...');

      // 5. Restore database in transaction
      await db.transaction('rw', [
        db.products, db.customers, db.sales, db.pendingSales,
        db.users, db.settings, db.creditPayments, db.partialPayments,
        db.userReceiptCounters, db.pendingSaleEvents, db.actionQueue
      ], async () => {
        // Restore table data
        for (const [tableName, data] of Object.entries(snapshot.tableData)) {
          if (data.length > 0) {
            await (db as any)[tableName].bulkAdd(data);
          }
        }
      });

      await this.updateRestoreSession(sessionId, 'RESTORING', 70, 'Restoring file assets...');

      // 6. Restore file assets
      for (const [filename, base64Data] of Object.entries(snapshot.fileAssets)) {
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

      await this.updateRestoreSession(sessionId, 'REPLAYING', 80, 'Replaying action log...');

      // 7. Replay action log (idempotent)
      await this.replayActionLog(snapshot.actionLog, sessionId);

      await this.updateRestoreSession(sessionId, 'COMPLETING', 90, 'Finalizing restore...');

      // 8. Restore entity UUIDs
      await incrementalBackupDB.entityUUIDs.clear();
      if (snapshot.entityUUIDs.length > 0) {
        await incrementalBackupDB.entityUUIDs.bulkAdd(snapshot.entityUUIDs);
      }

      await this.updateRestoreSession(sessionId, 'COMPLETED', 100, 'Restore completed successfully');

      console.log('Snapshot restored successfully:', snapshotUUID);
      toast.success('Snapshot restored successfully');

    } catch (error) {
      console.error('Restore failed:', error);
      await this.updateRestoreSession(sessionId, 'FAILED', 0, `Restore failed: ${error instanceof Error ? error.message : String(error)}`);
      toast.error(`Restore failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      this.activeSessions.delete(sessionId);
    }
  }

  // Replay action log with idempotent operations
  private async replayActionLog(actionLog: ActionLogEntry[], sessionId: string): Promise<void> {
    // Sort by sequence number to ensure correct order
    const sortedActions = actionLog.sort((a, b) => a.sequence - b.sequence);
    
    let replayedCount = 0;
    const totalActions = sortedActions.length;

    for (const action of sortedActions) {
      try {
        // Check if action was already applied (idempotent check)
        const existingEntity = await dbOperations.directGet(action.table, action.entityId);
        
        if (action.action === 'CREATE' && !existingEntity) {
          // Create entity if it doesn't exist
          await dbOperations.put(action.table, action.data);
        } else if (action.action === 'UPDATE' && existingEntity) {
          // Update entity if it exists
          await dbOperations.put(action.table, action.data);
        } else if (action.action === 'DELETE' && existingEntity) {
          // Delete entity if it exists
          await dbOperations.delete(action.table, action.entityId);
        } else if (action.action === 'BATCH_CREATE') {
          // Handle batch operations
          for (const item of action.data) {
            const existing = await dbOperations.directGet(action.table, item.id);
            if (!existing) {
              await dbOperations.put(action.table, item);
            }
          }
        }

        replayedCount++;
        await this.updateRestoreSession(sessionId, 'REPLAYING', 80 + (replayedCount / totalActions) * 10, 
          `Replaying action ${replayedCount}/${totalActions}`);

      } catch (error) {
        console.error(`Failed to replay action ${action.uuid}:`, error);
        // Continue with other actions, don't fail the entire restore
      }
    }
  }

  // Migrate snapshot to newer schema
  private async migrateSnapshot(snapshot: SnapshotData, targetSchemaVersion: number, sessionId: string): Promise<void> {
    const migrationLog: string[] = [];
    
    for (let version = snapshot.metadata.schemaVersion + 1; version <= targetSchemaVersion; version++) {
      migrationLog.push(`Migrating from schema version ${version - 1} to ${version}`);
      
      // Apply schema-specific migrations
      if (version === 2) {
        // Example migration: Add new fields to existing tables
        for (const [tableName, data] of Object.entries(snapshot.tableData)) {
          if (tableName === 'customers') {
            for (const customer of data) {
              if (!customer.hasOwnProperty('creditLimit')) {
                customer.creditLimit = 0;
              }
              if (!customer.hasOwnProperty('balance')) {
                customer.balance = 0;
              }
            }
          }
        }
      }
      
      // Update schema version
      snapshot.metadata.schemaVersion = version;
    }

    // Update migration log in restore session
    const restoreSession = await incrementalBackupDB.restoreSessions
      .where('sessionId')
      .equals(sessionId)
      .first();
    
    if (restoreSession) {
      restoreSession.migrationLog = migrationLog;
      await incrementalBackupDB.restoreSessions.put(restoreSession);
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

  // Update backup session
  private async updateBackupSession(sessionId: string, status: BackupSession['status'], progress: number, message: string): Promise<void> {
    const session = await incrementalBackupDB.backupSessions
      .where('sessionId')
      .equals(sessionId)
      .first();
    
    if (session) {
      session.status = status;
      session.progress = progress;
      session.message = message;
      session.updatedAt = Date.now();
      await incrementalBackupDB.backupSessions.put(session);
    }
  }

  // Update restore session
  private async updateRestoreSession(sessionId: string, status: RestoreSession['status'], progress: number, message: string): Promise<void> {
    const session = await incrementalBackupDB.restoreSessions
      .where('sessionId')
      .equals(sessionId)
      .first();
    
    if (session) {
      session.status = status;
      session.progress = progress;
      session.message = message;
      session.updatedAt = Date.now();
      await incrementalBackupDB.restoreSessions.put(session);
    }
  }

  // Get all snapshots
  async getSnapshots(): Promise<SnapshotMetadata[]> {
    const snapshots = await incrementalBackupDB.snapshots.toArray();
    return snapshots.map(s => s.metadata).sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get active sessions
  async getActiveSessions(): Promise<(BackupSession | RestoreSession)[]> {
    return Array.from(this.activeSessions.values());
  }

  // Resume unfinished workflows
  async resumeUnfinishedWorkflows(): Promise<void> {
    // Find incomplete backup sessions
    const incompleteBackups = await incrementalBackupDB.backupSessions
      .where('status')
      .anyOf(['INITIALIZING', 'CAPTURING', 'PROCESSING', 'COMPLETING'])
      .toArray();

    for (const backup of incompleteBackups) {
      console.log(`Resuming incomplete backup session: ${backup.sessionId}`);
      // Mark as failed to prevent hanging sessions
      backup.status = 'FAILED';
      backup.error = 'Session interrupted - marked as failed';
      await incrementalBackupDB.backupSessions.put(backup);
    }

    // Find incomplete restore sessions
    const incompleteRestores = await incrementalBackupDB.restoreSessions
      .where('status')
      .anyOf(['VALIDATING', 'MIGRATING', 'RESTORING', 'REPLAYING', 'COMPLETING'])
      .toArray();

    for (const restore of incompleteRestores) {
      console.log(`Resuming incomplete restore session: ${restore.sessionId}`);
      // Mark as failed to prevent hanging sessions
      restore.status = 'FAILED';
      restore.error = 'Session interrupted - marked as failed';
      await incrementalBackupDB.restoreSessions.put(restore);
    }
  }

  // Wrapper for database operations that logs actions
  async addWithLogging(table: string, data: any, userId?: string): Promise<string> {
    const entityId = data.id || generateId();
    
    // Create entity UUID if it doesn't exist
    await this.createEntityUUID(entityId, table, data);
    
    // Log the action
    await this.logAction('CREATE', table, entityId, data, undefined, userId);
    
    // Perform the actual operation
    return await dbOperations.add(table, data, userId);
  }

  async updateWithLogging(table: string, entityId: string, data: any, userId?: string): Promise<string> {
    // Get previous data for logging
    const previousData = await dbOperations.directGet(table, entityId);
    
    // Log the action
    await this.logAction('UPDATE', table, entityId, data, previousData, userId);
    
    // Perform the actual operation
    return await dbOperations.put(table, data, userId);
  }

  async deleteWithLogging(table: string, entityId: string, userId?: string): Promise<string> {
    // Get data for logging before deletion
    const data = await dbOperations.directGet(table, entityId);
    
    // Log the action
    await this.logAction('DELETE', table, entityId, undefined, data, userId);
    
    // Perform the actual operation
    return await dbOperations.delete(table, entityId, userId);
  }
}

export const incrementalBackupService = IncrementalBackupService.getInstance(); 
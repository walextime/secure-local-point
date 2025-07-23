import { BackupHistoryManager, BackupHistoryEntry } from '../../lib/backupHistoryDB';
import { BackupQueueReplay } from '../../lib/backupQueueReplay';

// Enhanced backup upload configuration
export interface EnhancedBackupUploadConfig {
  scriptUrl: string;
  driveFolderId: string;
  emailDestination: string;
  priority?: 'high' | 'normal' | 'low';
  retryOnFailure?: boolean;
  notifyOnCompletion?: boolean;
}

// Enhanced upload result with queue information
export interface EnhancedUploadResult {
  success: boolean;
  message: string;
  timestamp: Date;
  backupId?: string;
  queued?: boolean;
  retryAttempts?: number;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  readableZipSize?: number;
  systemZipSize?: number;
}

// Backup status update callback
export type BackupStatusCallback = (status: {
  backupId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
  retryAttempts?: number;
}) => void;

export class EnhancedBackupUploadService {
  private static statusCallbacks: Map<string, BackupStatusCallback> = new Map();
  
  // Register status callback for a backup
  static registerStatusCallback(backupId: string, callback: BackupStatusCallback): void {
    this.statusCallbacks.set(backupId, callback);
  }
  
  // Unregister status callback
  static unregisterStatusCallback(backupId: string): void {
    this.statusCallbacks.delete(backupId);
  }
  
  // Enhanced backup upload with queue support
  static async uploadBackup(config: EnhancedBackupUploadConfig): Promise<EnhancedUploadResult> {
    const requestId = Date.now().toString();
    console.log(`[${requestId}] ENHANCED BACKUP UPLOAD STARTED`);
    
    try {
      // Validate configuration
      if (!config.scriptUrl || !config.driveFolderId || !config.emailDestination) {
        const missingFields = [];
        if (!config.scriptUrl) missingFields.push('Script URL');
        if (!config.driveFolderId) missingFields.push('Folder ID');
        if (!config.emailDestination) missingFields.push('Email');
        
        return {
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          timestamp: new Date()
        };
      }
      
      // Generate backup data
      const backupData = await this.generateBackupData();
      
      // Create backup history entry
      const backupId = await BackupHistoryManager.addBackupEntry({
        timestamp: new Date().toISOString(),
        status: 'pending',
        url: '/proxy',
        method: 'POST',
        requestData: {
          action: 'upload',
          driveFolderId: config.driveFolderId,
          email: config.emailDestination,
          hasZipFile: !!backupData.readableZip,
          hasSysZipFile: !!backupData.systemZip
        },
        retryAttempts: 0,
        maxRetries: 10,
        userNotified: false
      });
      
      console.log(`[${requestId}] Created backup entry: ${backupId}`);
      
      // Notify status callback
      this.notifyStatusCallback(backupId, 'pending', 'Backup queued for upload');
      
      // Attempt immediate upload if online
      if (navigator.onLine) {
        console.log(`[${requestId}] Online, attempting immediate upload`);
        
        const uploadResult = await this.attemptUpload(backupId, backupData, config);
        
        if (uploadResult.success) {
          return {
            ...uploadResult,
            backupId,
            status: 'completed'
          };
        } else {
          // Upload failed, will be retried by queue system
          return {
            success: false,
            message: 'Upload failed, backup queued for retry',
            timestamp: new Date(),
            backupId,
            queued: true,
            status: 'pending'
          };
        }
      } else {
        // Offline, queue for later
        console.log(`[${requestId}] Offline, queuing backup for later upload`);
        
        return {
          success: false,
          message: 'Offline - backup queued for upload when connection restored',
          timestamp: new Date(),
          backupId,
          queued: true,
          status: 'pending'
        };
      }
      
    } catch (error) {
      console.error(`[${requestId}] ENHANCED BACKUP UPLOAD ERROR:`, error);
      
      return {
        success: false,
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }
  
  // Attempt to upload backup data
  private static async attemptUpload(
    backupId: string, 
    backupData: { readableZip: Blob; systemZip: Blob },
    config: EnhancedBackupUploadConfig
  ): Promise<EnhancedUploadResult> {
    try {
      // Update status to in progress
      await BackupHistoryManager.updateBackupStatus(backupId, {
        status: 'in_progress',
        startedAt: new Date().toISOString()
      });
      
      this.notifyStatusCallback(backupId, 'in_progress', 'Uploading backup...');
      
      // Convert blobs to base64
      const readableZipBase64 = await this.blobToBase64(backupData.readableZip);
      const systemZipBase64 = await this.blobToBase64(backupData.systemZip);
      
      // Prepare upload data
      const uploadData = {
        targetUrl: config.scriptUrl,
        action: 'upload',
        driveFolderId: config.driveFolderId,
        email: config.emailDestination,
        zipFile: readableZipBase64,
        sysZipFile: systemZipBase64,
        timestamp: new Date().toISOString()
      };
      
      // Make upload request
      const response = await fetch('/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData)
      });
      
      if (response.ok) {
        const result = await response.text();
        
        // Update status to completed
        await BackupHistoryManager.updateBackupStatus(backupId, {
          status: 'completed',
          completedAt: new Date().toISOString()
        });
        
        this.notifyStatusCallback(backupId, 'completed', 'Backup uploaded successfully!');
        
        return {
          success: true,
          message: 'Backup uploaded successfully! ✅',
          timestamp: new Date(),
          backupId,
          status: 'completed',
          readableZipSize: backupData.readableZip.size,
          systemZipSize: backupData.systemZip.size
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error(`[EnhancedBackupUpload] Upload attempt failed for ${backupId}:`, error);
      
      // Update retry count
      await BackupHistoryManager.updateBackupStatus(backupId, {
        retryAttempts: 1, // Will be incremented by queue system
        lastRetry: new Date().toISOString()
      });
      
      this.notifyStatusCallback(backupId, 'failed', `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        backupId,
        status: 'failed'
      };
    }
  }
  
  // Generate backup data
  private static async generateBackupData(): Promise<{ readableZip: Blob; systemZip: Blob }> {
    // Import the existing backup generation functions
    const { generateReadableBackup, generateSystemBackup, createZipFile } = await import('./backupUploadService');
    
    // Generate readable backup files
    const readableFiles = await generateReadableBackup();
    const readableZip = await createZipFile(readableFiles, 'readable_backup');
    
    // Generate system backup data
    const systemData = await generateSystemBackup();
    const systemZip = await createZipFile([
      {
        content: JSON.stringify(systemData, null, 2),
        filename: 'system_backup.json'
      }
    ], 'system_backup');
    
    return { readableZip, systemZip };
  }
  
  // Convert blob to base64
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  // Notify status callback
  private static notifyStatusCallback(backupId: string, status: string, message: string): void {
    const callback = this.statusCallbacks.get(backupId);
    if (callback) {
      callback({
        backupId,
        status: status as 'pending' | 'in_progress' | 'completed' | 'failed',
        message,
        retryAttempts: 0
      });
    }
  }
  
  // Get backup status
  static async getBackupStatus(backupId: string): Promise<BackupHistoryEntry | undefined> {
    return await BackupHistoryManager.getBackupEntry(backupId);
  }
  
  // Get all backup history
  static async getBackupHistory(options: {
    status?: 'pending' | 'in_progress' | 'completed' | 'failed';
    limit?: number;
    offset?: number;
  } = {}): Promise<BackupHistoryEntry[]> {
    return await BackupHistoryManager.getBackupHistory(options);
  }
  
  // Get backup statistics
  static async getBackupStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    expired: number;
    averageRetryAttempts: number;
  }> {
    return await BackupHistoryManager.getBackupStats();
  }
  
  // Retry failed backup
  static async retryBackup(backupId: string): Promise<boolean> {
    try {
      const backup = await BackupHistoryManager.getBackupEntry(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }
      
      if (backup.status !== 'failed') {
        throw new Error('Backup is not in failed status');
      }
      
      // Reset retry attempts and mark as pending
      await BackupHistoryManager.updateBackupStatus(backupId, {
        status: 'pending',
        retryAttempts: 0,
        queuedAt: new Date().toISOString()
      });
      
      // Trigger queue replay
      await BackupQueueReplay.forceReplay();
      
      return true;
    } catch (error) {
      console.error('[EnhancedBackupUpload] Failed to retry backup:', error);
      return false;
    }
  }
  
  // Delete backup entry
  static async deleteBackup(backupId: string): Promise<boolean> {
    try {
      await BackupHistoryManager.deleteBackupEntry(backupId);
      return true;
    } catch (error) {
      console.error('[EnhancedBackupUpload] Failed to delete backup:', error);
      return false;
    }
  }
  
  // Clear all failed backups
  static async clearFailedBackups(): Promise<number> {
    return await BackupQueueReplay.clearFailedBackups();
  }
  
  // Get queue status
  static async getQueueStatus(): Promise<{
    pendingCount: number;
    failedCount: number;
    isReplaying: boolean;
    lastReplayAttempt: string | null;
  }> {
    return await BackupQueueReplay.getQueueStatus();
  }
}

// Export the enhanced upload function for backward compatibility
export const uploadBackup = EnhancedBackupUploadService.uploadBackup.bind(EnhancedBackupUploadService); 
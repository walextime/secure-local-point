import { BackupHistoryManager, BackupQueueManager, initializeBackupHistoryDB } from './backupHistoryDB';

// Queue replay configuration
const MAX_REPLAY_ATTEMPTS = 3;
const REPLAY_DELAY = 2000; // 2 seconds between attempts

export class BackupQueueReplay {
  private static isReplaying = false;
  private static replayAttempts = 0;
  
  // Initialize queue replay on app startup
  static async initialize(): Promise<void> {
    try {
      console.log('[BackupQueueReplay] Initializing backup queue replay...');
      
      // Initialize the backup history database
      await initializeBackupHistoryDB();
      
      // Check if we're online
      if (navigator.onLine) {
        console.log('[BackupQueueReplay] Online, checking for queued backups...');
        await this.replayQueuedBackups();
      } else {
        console.log('[BackupQueueReplay] Offline, will replay when connection restored');
        this.setupOnlineListener();
      }
      
      // Set up network status listeners
      this.setupNetworkListeners();
      
    } catch (error) {
      console.error('[BackupQueueReplay] Failed to initialize:', error);
    }
  }
  
  // Replay all queued backups
  static async replayQueuedBackups(): Promise<void> {
    if (this.isReplaying) {
      console.log('[BackupQueueReplay] Already replaying, skipping...');
      return;
    }
    
    this.isReplaying = true;
    
    try {
      // Get pending backups from history
      const pendingBackups = await BackupHistoryManager.getPendingBackups();
      
      if (pendingBackups.length === 0) {
        console.log('[BackupQueueReplay] No pending backups to replay');
        return;
      }
      
      console.log(`[BackupQueueReplay] Found ${pendingBackups.length} pending backups to replay`);
      
      // Process each pending backup
      for (const backup of pendingBackups) {
        try {
          console.log(`[BackupQueueReplay] Replaying backup: ${backup.id}`);
          
          // Update status to in progress
          await BackupHistoryManager.updateBackupStatus(backup.id, {
            status: 'in_progress',
            startedAt: new Date().toISOString()
          });
          
          // Attempt to upload the backup
          const success = await this.attemptBackupUpload(backup);
          
          if (success) {
            console.log(`[BackupQueueReplay] Backup ${backup.id} uploaded successfully`);
          } else {
            console.log(`[BackupQueueReplay] Backup ${backup.id} failed, will retry later`);
          }
          
          // Small delay between uploads to avoid overwhelming the server
          await this.delay(1000);
          
        } catch (error) {
          console.error(`[BackupQueueReplay] Error replaying backup ${backup.id}:`, error);
          
          // Mark as failed if we've exceeded retry attempts
          if (backup.retryAttempts >= backup.maxRetries) {
            await BackupHistoryManager.updateBackupStatus(backup.id, {
              status: 'failed',
              failedAt: new Date().toISOString(),
              error: error instanceof Error ? error.message : 'Unknown error',
              errorDetails: error instanceof Error ? error.stack : undefined
            });
          }
        }
      }
      
    } catch (error) {
      console.error('[BackupQueueReplay] Error during queue replay:', error);
    } finally {
      this.isReplaying = false;
    }
  }
  
  // Attempt to upload a single backup
  private static async attemptBackupUpload(backup: import('./backupHistoryDB').BackupHistoryEntry): Promise<boolean> {
    try {
      // Reconstruct the request from backup data
      const requestData = {
        targetUrl: backup.url,
        ...backup.requestData
      };
      
      // Make the upload request
      const response = await fetch('/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        // Update backup status to completed
        await BackupHistoryManager.updateBackupStatus(backup.id, {
          status: 'completed',
          completedAt: new Date().toISOString()
        });
        
        // Notify user of success
        this.notifyUser('Backup uploaded successfully!', 'success');
        
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('[BackupQueueReplay] Upload attempt failed:', error);
      
      // Update retry count
      await BackupHistoryManager.updateBackupStatus(backup.id, {
        retryAttempts: backup.retryAttempts + 1,
        lastRetry: new Date().toISOString()
      });
      
      return false;
    }
  }
  
  // Set up network status listeners
  private static setupNetworkListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('[BackupQueueReplay] Network connection restored');
      this.notifyUser('Connection restored. Retrying queued backups...', 'info');
      
      // Wait a moment for connection to stabilize
      setTimeout(() => {
        this.replayQueuedBackups();
      }, 2000);
    });
    
    window.addEventListener('offline', () => {
      console.log('[BackupQueueReplay] Network connection lost');
      this.notifyUser('Connection lost. Backups will be queued for later upload.', 'warning');
    });
    
    // Listen for visibility changes (app becomes visible)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        console.log('[BackupQueueReplay] App became visible and online, checking queue...');
        setTimeout(() => {
          this.replayQueuedBackups();
        }, 1000);
      }
    });
  }
  
  // Set up online listener for initial connection
  private static setupOnlineListener(): void {
    const checkOnline = () => {
      if (navigator.onLine) {
        console.log('[BackupQueueReplay] Connection restored, replaying queue...');
        this.replayQueuedBackups();
      } else {
        // Check again in 5 seconds
        setTimeout(checkOnline, 5000);
      }
    };
    
    // Start checking for online status
    setTimeout(checkOnline, 5000);
  }
  
  // Get queue status for UI
  static async getQueueStatus(): Promise<{
    pendingCount: number;
    failedCount: number;
    isReplaying: boolean;
    lastReplayAttempt: string | null;
  }> {
    try {
      const pendingBackups = await BackupHistoryManager.getPendingBackups();
      const failedBackups = await BackupHistoryManager.getFailedBackups();
      
      return {
        pendingCount: pendingBackups.length,
        failedCount: failedBackups.length,
        isReplaying: this.isReplaying,
        lastReplayAttempt: this.replayAttempts > 0 ? new Date().toISOString() : null
      };
    } catch (error) {
      console.error('[BackupQueueReplay] Error getting queue status:', error);
      return {
        pendingCount: 0,
        failedCount: 0,
        isReplaying: false,
        lastReplayAttempt: null
      };
    }
  }
  
  // Force replay of queue (for manual retry)
  static async forceReplay(): Promise<void> {
    console.log('[BackupQueueReplay] Force replay requested');
    this.replayAttempts++;
    await this.replayQueuedBackups();
  }
  
  // Clear failed backups
  static async clearFailedBackups(): Promise<number> {
    try {
      const failedBackups = await BackupHistoryManager.getFailedBackups();
      const idsToDelete = failedBackups.map(backup => backup.id);
      
      for (const id of idsToDelete) {
        await BackupHistoryManager.deleteBackupEntry(id);
      }
      
      console.log(`[BackupQueueReplay] Cleared ${idsToDelete.length} failed backups`);
      return idsToDelete.length;
    } catch (error) {
      console.error('[BackupQueueReplay] Error clearing failed backups:', error);
      return 0;
    }
  }
  
  // Utility function for delays
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Notify user of backup status
  private static notifyUser(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    // Dispatch custom event for UI to handle
    const event = new CustomEvent('backupNotification', {
      detail: {
        message,
        type,
        timestamp: new Date().toISOString()
      }
    });
    
    window.dispatchEvent(event);
    
    // Also log to console
    console.log(`[BackupQueueReplay] ${type.toUpperCase()}: ${message}`);
  }
}

// Auto-initialize when module is loaded
if (typeof window !== 'undefined') {
  // Initialize after a short delay to ensure app is ready
  setTimeout(() => {
    BackupQueueReplay.initialize().catch(error => {
      console.error('[BackupQueueReplay] Failed to initialize:', error);
    });
  }, 1000);
} 
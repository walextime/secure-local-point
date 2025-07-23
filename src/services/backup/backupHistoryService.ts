import { dbOperations, STORES } from '@/lib/db';
import { BackupHistoryEntry, BackupHistoryRecord } from '@/types/backup';
import { CustomerAnalyticsService } from '@/services/customerAnalyticsService';

export interface BackupHistoryDetails {
  id: string;
  timestamp: number;
  type: 'manual' | 'auto' | 'online' | 'system' | 'human-readable';
  status: 'success' | 'failed' | 'partial';
  filesCreated: string[];
  errors: string[];
  config: {
    includeCustomers: boolean;
    includeInventory: boolean;
    includeSales: boolean;
    formats: string[];
    storageLocation: string;
    encryptFiles: boolean;
    backupType?: string;
  };
  metadata: {
    totalCustomers: number;
    totalProducts: number;
    totalSales: number;
    backupSize?: number;
    duration?: number;
    customerAnalyticsIncluded: boolean;
  };
  uploadInfo?: {
    uploadedToCloud: boolean;
    cloudProvider?: string;
    emailSent: boolean;
    emailRecipient?: string;
  };
}

export class BackupHistoryService {
  /**
   * Log a backup operation to history
   */
  static async logBackupOperation(details: Omit<BackupHistoryDetails, 'id' | 'timestamp'>): Promise<void> {
    try {
      const historyRecord = await dbOperations.get<BackupHistoryRecord>(STORES.SETTINGS, 'backup-history');
      
      const newEntry: BackupHistoryEntry = {
        id: `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        filesCreated: details.filesCreated,
        errors: details.errors,
        success: details.status === 'success',
        config: {
          type: details.type,
          backupType: details.config.backupType,
          includeCustomers: details.config.includeCustomers,
          includeInventory: details.config.includeInventory,
          includeSales: details.config.includeSales,
          formats: details.config.formats,
          storageLocation: details.config.storageLocation,
          encryptFiles: details.config.encryptFiles,
          metadata: details.metadata,
          uploadInfo: details.uploadInfo
        }
      };
      
      let entries = historyRecord?.entries || [];
      entries = [...entries, newEntry].slice(-100); // Keep last 100 entries
      
      await dbOperations.put(STORES.SETTINGS, {
        id: 'backup-history',
        entries
      });
      
      console.log(`✅ Logged ${details.type} backup: ${details.status}`);
    } catch (error) {
      console.error('Error logging backup operation:', error);
    }
  }
  
  /**
   * Log a successful backup
   */
  static async logSuccessfulBackup(
    type: BackupHistoryDetails['type'],
    filesCreated: string[],
    config: BackupHistoryDetails['config'],
    metadata: BackupHistoryDetails['metadata'],
    uploadInfo?: BackupHistoryDetails['uploadInfo']
  ): Promise<void> {
    await this.logBackupOperation({
      type,
      status: 'success',
      filesCreated,
      errors: [],
      config,
      metadata,
      uploadInfo
    });
  }
  
  /**
   * Log a failed backup
   */
  static async logFailedBackup(
    type: BackupHistoryDetails['type'],
    errors: string[],
    config: BackupHistoryDetails['config'],
    metadata: BackupHistoryDetails['metadata']
  ): Promise<void> {
    await this.logBackupOperation({
      type,
      status: 'failed',
      filesCreated: [],
      errors,
      config,
      metadata
    });
  }
  
  /**
   * Log a partial backup (some files succeeded, some failed)
   */
  static async logPartialBackup(
    type: BackupHistoryDetails['type'],
    filesCreated: string[],
    errors: string[],
    config: BackupHistoryDetails['config'],
    metadata: BackupHistoryDetails['metadata']
  ): Promise<void> {
    await this.logBackupOperation({
      type,
      status: 'partial',
      filesCreated,
      errors,
      config,
      metadata
    });
  }
  
  /**
   * Get backup history with analytics
   */
  static async getBackupHistoryWithAnalytics(): Promise<BackupHistoryDetails[]> {
    try {
      const historyRecord = await dbOperations.get<BackupHistoryRecord>(STORES.SETTINGS, 'backup-history');
      const entries = historyRecord?.entries || [];
      
      return entries.map(entry => {
        const config = entry.config as any;
        return {
          id: entry.id,
          timestamp: entry.timestamp,
          type: config.type || 'manual',
          status: entry.success ? 'success' : 'failed',
          filesCreated: entry.filesCreated,
          errors: entry.errors,
          config: {
            includeCustomers: config.includeCustomers || false,
            includeInventory: config.includeInventory || false,
            includeSales: config.includeSales || false,
            formats: config.formats || [],
            storageLocation: config.storageLocation || 'local',
            encryptFiles: config.encryptFiles || false,
            backupType: config.backupType
          },
          metadata: config.metadata || {
            totalCustomers: 0,
            totalProducts: 0,
            totalSales: 0,
            customerAnalyticsIncluded: false
          },
          uploadInfo: config.uploadInfo
        };
      }).sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting backup history:', error);
      return [];
    }
  }
  
  /**
   * Get backup statistics
   */
  static async getBackupStatistics(): Promise<{
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    partialBackups: number;
    totalFilesCreated: number;
    averageBackupSize: number;
    lastBackupDate: number | null;
    backupTypes: Record<string, number>;
  }> {
    try {
      const history = await this.getBackupHistoryWithAnalytics();
      
      const totalBackups = history.length;
      const successfulBackups = history.filter(h => h.status === 'success').length;
      const failedBackups = history.filter(h => h.status === 'failed').length;
      const partialBackups = history.filter(h => h.status === 'partial').length;
      
      const totalFilesCreated = history.reduce((sum, h) => sum + h.filesCreated.length, 0);
      const averageBackupSize = history.length > 0 
        ? history.reduce((sum, h) => sum + (h.metadata.backupSize || 0), 0) / history.length 
        : 0;
      
      const lastBackupDate = history.length > 0 ? history[0].timestamp : null;
      
      const backupTypes = history.reduce((acc, h) => {
        acc[h.type] = (acc[h.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        totalBackups,
        successfulBackups,
        failedBackups,
        partialBackups,
        totalFilesCreated,
        averageBackupSize,
        lastBackupDate,
        backupTypes
      };
    } catch (error) {
      console.error('Error getting backup statistics:', error);
      return {
        totalBackups: 0,
        successfulBackups: 0,
        failedBackups: 0,
        partialBackups: 0,
        totalFilesCreated: 0,
        averageBackupSize: 0,
        lastBackupDate: null,
        backupTypes: {}
      };
    }
  }
  
  /**
   * Clean up old backup history entries
   */
  static async cleanupOldHistory(keepLastDays: number = 30): Promise<void> {
    try {
      const historyRecord = await dbOperations.get<BackupHistoryRecord>(STORES.SETTINGS, 'backup-history');
      const entries = historyRecord?.entries || [];
      
      const cutoffDate = Date.now() - (keepLastDays * 24 * 60 * 60 * 1000);
      const filteredEntries = entries.filter(entry => entry.timestamp >= cutoffDate);
      
      if (filteredEntries.length !== entries.length) {
        await dbOperations.put(STORES.SETTINGS, {
          id: 'backup-history',
          entries: filteredEntries
        });
        
        console.log(`🧹 Cleaned up ${entries.length - filteredEntries.length} old backup history entries`);
      }
    } catch (error) {
      console.error('Error cleaning up backup history:', error);
    }
  }
} 
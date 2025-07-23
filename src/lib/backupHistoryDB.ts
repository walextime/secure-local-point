import Dexie from 'dexie';

// Backup status types
export type BackupStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';

// Backup history entry interface
export interface BackupHistoryEntry {
  id: string;
  timestamp: string;
  status: BackupStatus;
  url: string;
  method: string;
  
  // Request data
  requestData: {
    action: string;
    driveFolderId: string;
    email: string;
    hasZipFile: boolean;
    hasSysZipFile: boolean;
  };
  
  // Timestamps
  queuedAt?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  expiredAt?: string;
  
  // Retry information
  retryAttempts: number;
  maxRetries: number;
  lastRetry?: string;
  
  // Error information
  error?: string;
  errorDetails?: string;
  
  // File information
  fileSize?: number;
  checksum?: string;
  
  // User feedback
  userNotified: boolean;
  notificationSent?: string;
}

// Backup queue entry interface
export interface BackupQueueEntry {
  id: string;
  request: Request;
  metadata: {
    requestId: string;
    timestamp: string;
    retryAttempts: number;
    lastRetry?: string;
  };
}

// Database class for backup history
export class BackupHistoryDB extends Dexie {
  backupHistory!: Dexie.Table<BackupHistoryEntry, string>;
  backupQueue!: Dexie.Table<BackupQueueEntry, string>;

  constructor() {
    super('BackupHistoryDB');
    
    this.version(1).stores({
      backupHistory: 'id, timestamp, status, queuedAt, startedAt, completedAt, failedAt',
      backupQueue: 'id, timestamp, retryAttempts'
    });
    
    // Add indexes for better querying
    this.version(2).stores({
      backupHistory: 'id, timestamp, status, queuedAt, startedAt, completedAt, failedAt, retryAttempts',
      backupQueue: 'id, timestamp, retryAttempts, status'
    });
  }
}

// Singleton instance
export const backupHistoryDB = new BackupHistoryDB();

// Utility functions for backup history management
export class BackupHistoryManager {
  
  // Add new backup entry
  static async addBackupEntry(entry: Omit<BackupHistoryEntry, 'id'>): Promise<string> {
    const id = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullEntry: BackupHistoryEntry = {
      ...entry,
      id,
      userNotified: false,
      maxRetries: 10
    };
    
    await backupHistoryDB.backupHistory.put(fullEntry);
    console.log('[BackupHistory] Added new backup entry:', id);
    return id;
  }
  
  // Update backup status
  static async updateBackupStatus(id: string, updates: Partial<BackupHistoryEntry>): Promise<void> {
    const entry = await backupHistoryDB.backupHistory.get(id);
    if (!entry) {
      throw new Error(`Backup entry not found: ${id}`);
    }
    
    const updatedEntry = { ...entry, ...updates };
    await backupHistoryDB.backupHistory.put(updatedEntry);
    console.log('[BackupHistory] Updated backup status:', id, updates.status);
  }
  
  // Get backup history with filtering
  static async getBackupHistory(options: {
    status?: BackupStatus;
    limit?: number;
    offset?: number;
    sortBy?: 'timestamp' | 'status' | 'retryAttempts' | 'failedAt';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<BackupHistoryEntry[]> {
    let query = backupHistoryDB.backupHistory.toCollection();
    
    // Apply filters
    if (options.status) {
      query = query.filter(entry => entry.status === options.status);
    }
    
    // Apply sorting
    if (options.sortBy) {
      query = query.reverse(); // Dexie sorts by primary key by default
    }
    
    // Apply pagination
    if (options.offset) {
      query = query.offset(options.offset);
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const entries = await query.toArray();
    
    // Manual sorting if needed
    if (options.sortBy && options.sortBy !== 'timestamp') {
      entries.sort((a, b) => {
        const aVal = a[options.sortBy!];
        const bVal = b[options.sortBy!];
        
        if (options.sortOrder === 'desc') {
          return bVal > aVal ? 1 : -1;
        } else {
          return aVal > bVal ? 1 : -1;
        }
      });
    }
    
    return entries;
  }
  
  // Get pending backups
  static async getPendingBackups(): Promise<BackupHistoryEntry[]> {
    return await this.getBackupHistory({ 
      status: 'pending',
      sortBy: 'timestamp',
      sortOrder: 'asc'
    });
  }
  
  // Get failed backups
  static async getFailedBackups(): Promise<BackupHistoryEntry[]> {
    return await this.getBackupHistory({ 
      status: 'failed',
      sortBy: 'failedAt',
      sortOrder: 'desc'
    });
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
    const allEntries = await backupHistoryDB.backupHistory.toArray();
    
    const stats = {
      total: allEntries.length,
      pending: allEntries.filter(e => e.status === 'pending').length,
      inProgress: allEntries.filter(e => e.status === 'in_progress').length,
      completed: allEntries.filter(e => e.status === 'completed').length,
      failed: allEntries.filter(e => e.status === 'failed').length,
      expired: allEntries.filter(e => e.status === 'expired').length,
      averageRetryAttempts: 0
    };
    
    if (allEntries.length > 0) {
      const totalRetries = allEntries.reduce((sum, entry) => sum + entry.retryAttempts, 0);
      stats.averageRetryAttempts = totalRetries / allEntries.length;
    }
    
    return stats;
  }
  
  // Clean up expired backups (older than 7 days)
  static async cleanupExpiredBackups(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const expiredEntries = await backupHistoryDB.backupHistory
      .where('timestamp')
      .below(sevenDaysAgo.toISOString())
      .and(entry => entry.status === 'pending' || entry.status === 'failed')
      .toArray();
    
    // Mark as expired
    for (const entry of expiredEntries) {
      await this.updateBackupStatus(entry.id, {
        status: 'expired',
        expiredAt: new Date().toISOString()
      });
    }
    
    console.log(`[BackupHistory] Marked ${expiredEntries.length} entries as expired`);
    return expiredEntries.length;
  }
  
  // Delete old backup entries (older than 30 days)
  static async deleteOldBackups(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const oldEntries = await backupHistoryDB.backupHistory
      .where('timestamp')
      .below(thirtyDaysAgo.toISOString())
      .toArray();
    
    const idsToDelete = oldEntries.map(entry => entry.id);
    await backupHistoryDB.backupHistory.bulkDelete(idsToDelete);
    
    console.log(`[BackupHistory] Deleted ${oldEntries.length} old backup entries`);
    return oldEntries.length;
  }
  
  // Mark backup as notified
  static async markAsNotified(id: string): Promise<void> {
    await this.updateBackupStatus(id, {
      userNotified: true,
      notificationSent: new Date().toISOString()
    });
  }
  
  // Get backup entry by ID
  static async getBackupEntry(id: string): Promise<BackupHistoryEntry | undefined> {
    return await backupHistoryDB.backupHistory.get(id);
  }
  
  // Delete backup entry
  static async deleteBackupEntry(id: string): Promise<void> {
    await backupHistoryDB.backupHistory.delete(id);
    console.log(`[BackupHistory] Deleted backup entry: ${id}`);
  }
}

// Queue management functions
export class BackupQueueManager {
  
  // Add request to queue
  static async addToQueue(request: Request, metadata: {
    requestId?: string;
    timestamp?: string;
    retryAttempts?: number;
    lastRetry?: string;
    [key: string]: unknown;
  }): Promise<string> {
    const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await backupHistoryDB.backupQueue.put({
      id,
      request,
      metadata: {
        requestId: metadata.requestId || id,
        timestamp: new Date().toISOString(),
        retryAttempts: metadata.retryAttempts || 0,
        ...metadata
      }
    });
    
    console.log('[BackupQueue] Added request to queue:', id);
    return id;
  }
  
  // Get queued requests
  static async getQueuedRequests(): Promise<BackupQueueEntry[]> {
    return await backupHistoryDB.backupQueue.toArray();
  }
  
  // Remove from queue
  static async removeFromQueue(id: string): Promise<void> {
    await backupHistoryDB.backupQueue.delete(id);
    console.log(`[BackupQueue] Removed request from queue: ${id}`);
  }
  
  // Clear entire queue
  static async clearQueue(): Promise<void> {
    await backupHistoryDB.backupQueue.clear();
    console.log('[BackupQueue] Cleared entire queue');
  }
}

// Initialize database
export async function initializeBackupHistoryDB(): Promise<void> {
  try {
    await backupHistoryDB.open();
    console.log('[BackupHistory] Database initialized successfully');
    
    // Clean up expired backups on startup
    await BackupHistoryManager.cleanupExpiredBackups();
    
  } catch (error) {
    console.error('[BackupHistory] Failed to initialize database:', error);
    throw error;
  }
} 
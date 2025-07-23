

export interface QueuedBackup {
  id: string;
  file: File;
  config: CloudSyncConfig;
  attempts: number;
  lastAttempt: Date;
  nextRetry: Date;
  error?: string;
  createdAt: Date;
}

export interface CloudSyncConfig {
  googleDriveFolderId: string;
  googleAppsScriptLink: string;
  emailDestination: string;
  enableAutoUpload: boolean;
  backupTime: string;
  uploadRetryLimit: number;
}

export interface RetryQueueStatus {
  isOnline: boolean;
  queueLength: number;
  processing: boolean;
  lastCheck: Date;
}

class RetryQueue {
  private queue: QueuedBackup[] = [];
  private isProcessing = false;
  private isOnline = navigator.onLine;
  private maxRetries = 3;
  private baseDelay = 5000; 
  private maxDelay = 300000; 
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadQueue();
    this.setupNetworkListeners();
    this.startProcessing();
  }

  
  async addToQueue(file: File, config: CloudSyncConfig): Promise<string> {
    const queuedBackup: QueuedBackup = {
      id: this.generateId(),
      file,
      config,
      attempts: 0,
      lastAttempt: new Date(),
      nextRetry: new Date(),
      createdAt: new Date()
    };

    this.queue.push(queuedBackup);
    this.saveQueue();
    
    console.log(`Added backup ${queuedBackup.id} to retry queue`);
    return queuedBackup.id;
  }

  
  removeFromQueue(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
      console.log(`Removed backup ${id} from retry queue`);
      return true;
    }
    return false;
  }

  
  getStatus(): RetryQueueStatus {
    return {
      isOnline: this.isOnline,
      queueLength: this.queue.length,
      processing: this.isProcessing,
      lastCheck: new Date()
    };
  }

  
  getQueue(): QueuedBackup[] {
    return [...this.queue];
  }

  
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    console.log('Retry queue cleared');
  }

  
  private startProcessing(): void {
    this.checkInterval = setInterval(() => {
      this.processQueue();
    }, 10000); 
  }

  
  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      
      this.queue.sort((a, b) => a.nextRetry.getTime() - b.nextRetry.getTime());

      const now = new Date();
      const readyItems = this.queue.filter(item => 
        item.nextRetry <= now && item.attempts < this.maxRetries
      );

      for (const item of readyItems) {
        await this.processItem(item);
      }
    } catch (error) {
      console.error('Error processing retry queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  
  private async processItem(item: QueuedBackup): Promise<void> {
    try {
      console.log(`Processing backup ${item.id} (attempt ${item.attempts + 1})`);

      
      const { uploadToGoogleDrive } = await import('./cloudSync');
      
      const result = await uploadToGoogleDrive(item.file, item.config);
      
      if (result.success) {
        
        this.removeFromQueue(item.id);
        console.log(`Backup ${item.id} uploaded successfully`);
        
        
        this.updateUploadStatus({
          lastUpload: new Date().toISOString(),
          status: 'success',
          message: 'Upload completed successfully'
        });
      } else {
        
        this.handleFailedUpload(item, result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.handleFailedUpload(item, errorMessage);
    }
  }

  
  private handleFailedUpload(item: QueuedBackup, error: string): void {
    item.attempts++;
    item.lastAttempt = new Date();
    item.error = error;

    if (item.attempts >= this.maxRetries) {
      
      this.removeFromQueue(item.id);
      console.log(`Backup ${item.id} failed after ${item.attempts} attempts`);
      
      
      this.updateUploadStatus({
        lastUpload: new Date().toISOString(),
        status: 'failed',
        message: `Failed after ${item.attempts} attempts: ${error}`
      });
    } else {
      
      const delay = Math.min(
        this.baseDelay * Math.pow(2, item.attempts - 1),
        this.maxDelay
      );
      item.nextRetry = new Date(Date.now() + delay);
      
      console.log(`Scheduled retry for backup ${item.id} in ${delay}ms`);
    }

    this.saveQueue();
  }

  
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Internet connection restored - resuming queue processing');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Internet connection lost - pausing queue processing');
    });
  }

  
  private generateId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  
  private saveQueue(): void {
    try {
      
      const serializableQueue = this.queue.map(item => ({
        ...item,
        file: {
          name: item.file.name,
          size: item.file.size,
          type: item.file.type,
          lastModified: item.file.lastModified
        }
      }));
      
      localStorage.setItem('backup_retry_queue', JSON.stringify(serializableQueue));
    } catch (error) {
      console.error('Error saving retry queue:', error);
    }
  }

  
  private loadQueue(): void {
    try {
      const saved = localStorage.getItem('backup_retry_queue');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.queue = parsed.map((item: Partial<QueuedBackup> & { file: { name: string; size: number; type: string; lastModified: number } }) => ({
          ...item,
          lastAttempt: new Date(item.lastAttempt || new Date()),
          nextRetry: new Date(item.nextRetry || new Date()),
          createdAt: new Date(item.createdAt || new Date())
        }));
        console.log(`Loaded ${this.queue.length} items from retry queue`);
      }
    } catch (error) {
      console.error('Error loading retry queue:', error);
      this.queue = [];
    }
  }

  
  private updateUploadStatus(status: { lastUpload: string; status: string; message: string }): void {
    try {
      localStorage.setItem('cloud_upload_status', JSON.stringify({
        ...status,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error updating upload status:', error);
    }
  }

  
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}


export const retryQueue = new RetryQueue();


export const addToRetryQueue = (file: File, config: CloudSyncConfig) => 
  retryQueue.addToQueue(file, config);

export const getRetryQueueStatus = () => retryQueue.getStatus();

export const getRetryQueue = () => retryQueue.getQueue();

export const clearRetryQueue = () => retryQueue.clearQueue();

export const removeFromRetryQueue = (id: string) => retryQueue.removeFromQueue(id); 
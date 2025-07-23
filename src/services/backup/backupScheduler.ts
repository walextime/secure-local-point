import { createFullBackup, isBackupRunning } from './backupManager';
import { retryUpload, getCloudUploadStatus } from './cloudSync';
import { uploadBackup } from './backupUploadService';
import { dbOperations, STORES } from '@/lib/db';
import { BackupSettings } from '@/types/backup';



async function getBackupSettings(): Promise<BackupSettings | null> {
  try {
    const settings = await dbOperations.get<BackupSettings>(STORES.SETTINGS, 'backup-settings');
    return settings || null;
  } catch (error) {
    console.error('Error loading backup settings:', error);
    return null;
  }
}

// Helper to get cloud backup config from localStorage, with fallback to last used
function getCloudBackupConfigWithFallback() {
  let config = {
    scriptUrl: '',
    driveFolderId: '',
    emailDestination: ''
  };
  const savedConfig = localStorage.getItem('backupUploadConfig');
  if (savedConfig) {
    try {
      config = JSON.parse(savedConfig);
    } catch (e) {
      console.error('Failed to parse backupUploadConfig:', e);
    }
  }
  // Fallback to last used if missing
  if (!config.scriptUrl || !config.driveFolderId || !config.emailDestination) {
    const lastConfig = localStorage.getItem('lastCloudBackupConfig');
    if (lastConfig) {
      try {
        const parsed = JSON.parse(lastConfig);
        config = { ...config, ...parsed };
      } catch (e) {
        console.error('Failed to parse lastCloudBackupConfig:', e);
      }
    }
  }
  return config;
}

export async function runScheduledBackup() {
  const settings = await getBackupSettings();
  
  if (!settings || !settings.autoBackupEnabled) {
    console.log('Automatic backup is disabled or settings not found');
    return;
  }

  // Check if backup is already running
  if (isBackupRunning()) {
    console.log('⚠️ Backup already in progress, skipping scheduled backup');
    return;
  }

  // Check cooldown period
  const now = Date.now();
  if (now - lastBackupTime < BACKUP_COOLDOWN) {
    console.log('⚠️ Backup cooldown active, skipping scheduled backup');
    return;
  }

  try {
    console.log('Starting scheduled backup at:', new Date().toLocaleString());
    
    // Create both local and online backups in one operation
    console.log('Creating full backup (local + online)...');
    await createFullBackup();
    
    // Update last backup time
    lastBackupTime = now;
    
    console.log('Scheduled backup completed successfully');
  } catch (error) {
    console.error('Scheduled backup failed:', error);
  }
}

export async function shouldRunBackup(): Promise<boolean> {
  const settings = await getBackupSettings();
  if (!settings || !settings.autoBackupEnabled) return false;
  
  const now = new Date();
  const [hours, minutes] = settings.autoBackupTime.split(':').map(Number);
  const backupTime = new Date();
  backupTime.setHours(hours, minutes, 0, 0);
  
  // Check if it's exactly the backup time (within 1 minute)
  const diff = Math.abs(now.getTime() - backupTime.getTime());
  const shouldRun = diff < 60 * 1000; // Only run if within 1 minute of exact time
  
  // Log for debugging
  if (shouldRun) {
    console.log(`Backup time reached! Current time: ${now.toLocaleTimeString()}, Backup time: ${backupTime.toLocaleTimeString()}, Diff: ${diff}ms`);
  }
  
  return shouldRun;
}

export function cleanupOldBackups() {
  // For now, we'll use a default retention period of 30 days
  const retentionDays = 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  
  
  console.log(`Cleaning up backups older than ${retentionDays} days`);
}

let schedulerInterval: NodeJS.Timeout | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;
let lastBackupTime = 0;
const BACKUP_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown between backups

export function startBackupScheduler() {
  console.log('Starting backup scheduler...');
  
  // Clear any existing intervals
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  
  // Check every 30 seconds for more precise timing
  schedulerInterval = setInterval(async () => {
    if (await shouldRunBackup()) {
      console.log('Backup time reached, executing scheduled backup...');
      await runScheduledBackup();
    }
  }, 30 * 1000);
  
  // Cleanup old backups daily at 2 AM
  cleanupInterval = setInterval(() => {
    cleanupOldBackups();
  }, 24 * 60 * 60 * 1000);
}

export function restartBackupScheduler() {
  console.log('Restarting backup scheduler with new settings...');
  startBackupScheduler();
}

export function triggerBackupRetry() {
  
  console.log('Backup retry triggered (stub)');
} 
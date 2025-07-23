import { createHumanReadableZip, createSystemZip, restoreFromSystemBackup as restoreFromZip } from './backupUtils';
import { saveBackupToLocal, getBackupDirectory } from './localStorage';
import { uploadToGoogleDrive, testAppsScriptEndpoint, getCloudUploadStatus as getCloudStatus } from './cloudSync';
import { dbOperations, STORES } from '@/lib/db';
import { BackupHistoryEntry, BackupHistoryRecord } from '@/types/backup';
import { uploadBackupToAppsScript } from './backupUploadService';
import { BackupHistoryService } from './backupHistoryService';
import { CustomerAnalyticsService } from '@/services/customerAnalyticsService';
import { toast } from 'sonner';

interface BackupStatus {
  type: 'human' | 'system';
  filename: string;
  time: string;
  status: 'saved' | 'failed';
}

let lastBackupStatus: BackupStatus | null = null;
let isBackupInProgress = false;

// Backup lock to prevent multiple simultaneous backups
export function isBackupRunning(): boolean {
  return isBackupInProgress;
}

async function getBackupMetadata() {
  try {
    const customers = await dbOperations.getAll(STORES.CUSTOMERS);
    const products = await dbOperations.getAll(STORES.PRODUCTS);
    const sales = await dbOperations.getAll(STORES.SALES);
    const analytics = await CustomerAnalyticsService.getCustomerAnalytics();
    
    return {
      totalCustomers: customers.length,
      totalProducts: products.length,
      totalSales: sales.length,
      customerAnalyticsIncluded: analytics.length > 0
    };
  } catch (error) {
    console.error('Error getting backup metadata:', error);
    return {
      totalCustomers: 0,
      totalProducts: 0,
      totalSales: 0,
      customerAnalyticsIncluded: false
    };
  }
}

function getAppsScriptConfig() {
  // Try to get config from localStorage (as used in BackupSettings UI)
  try {
    const config = localStorage.getItem('backupUploadConfig');
    if (config) {
      const parsed = JSON.parse(config);
      console.log('Backup config loaded:', parsed);
      if (parsed.scriptUrl && parsed.emailDestination) {
        return {
          scriptUrl: parsed.scriptUrl,
          email: parsed.emailDestination,
          driveFolderId: parsed.driveFolderId || ''
        };
      }
    }
  } catch (error) {
    console.error('Error parsing backup upload config:', error);
  }
  // Fallback: prompt or use defaults (could be extended)
  return { scriptUrl: '', email: '', driveFolderId: '' };
}

export async function createHumanReadableBackup() {
  const startTime = Date.now();
  const now = new Date();
  const dir = getBackupDirectory(now);
  const filename = `readable_backup_${dir}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.zip`;
  
  try {
    // Update customer analytics before backup
    await CustomerAnalyticsService.updateCustomerAnalytics();
    
    const zipBlob = await createHumanReadableZip();
    await saveBackupToLocal(zipBlob, filename);
    
    const duration = Date.now() - startTime;
    const metadata = await getBackupMetadata();
    
    lastBackupStatus = { type: 'human', filename, time: now.toISOString(), status: 'saved' };
    
    // Log successful backup
    await BackupHistoryService.logSuccessfulBackup(
      'human-readable',
      [filename],
      {
        includeCustomers: true,
        includeInventory: true,
        includeSales: true,
        formats: ['xlsx', 'pdf'],
        storageLocation: 'local',
        encryptFiles: false,
        backupType: 'human-readable'
      },
      {
        ...metadata,
        backupSize: zipBlob.size,
        duration
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const metadata = await getBackupMetadata();
    
    lastBackupStatus = { type: 'human', filename, time: now.toISOString(), status: 'failed' };
    
    // Log failed backup
    await BackupHistoryService.logFailedBackup(
      'human-readable',
      [error.message || String(error)],
      {
        includeCustomers: true,
        includeInventory: true,
        includeSales: true,
        formats: ['xlsx', 'pdf'],
        storageLocation: 'local',
        encryptFiles: false,
        backupType: 'human-readable'
      },
      {
        ...metadata,
        duration
      }
    );
  }
}

export async function createSystemBackup() {
  const startTime = Date.now();
  const now = new Date();
  const dir = getBackupDirectory(now);
  const filename = `system_backup_${dir}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.zip`;
  
  try {
    // Update customer analytics before backup
    await CustomerAnalyticsService.updateCustomerAnalytics();
    
    const zipBlob = await createSystemZip();
    await saveBackupToLocal(zipBlob, filename);
    
    const duration = Date.now() - startTime;
    const metadata = await getBackupMetadata();
    
    lastBackupStatus = { type: 'system', filename, time: now.toISOString(), status: 'saved' };
    
    // Log successful backup
    await BackupHistoryService.logSuccessfulBackup(
      'system',
      [filename],
      {
        includeCustomers: true,
        includeInventory: true,
        includeSales: true,
        formats: ['json'],
        storageLocation: 'local',
        encryptFiles: false,
        backupType: 'system'
      },
      {
        ...metadata,
        backupSize: zipBlob.size,
        duration
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const metadata = await getBackupMetadata();
    
    lastBackupStatus = { type: 'system', filename, time: now.toISOString(), status: 'failed' };
    
    // Log failed backup
    await BackupHistoryService.logFailedBackup(
      'system',
      [error.message || String(error)],
      {
        includeCustomers: true,
        includeInventory: true,
        includeSales: true,
        formats: ['json'],
        storageLocation: 'local',
        encryptFiles: false,
        backupType: 'system'
      },
      {
        ...metadata,
        duration
      }
    );
  }
}

export async function restoreFromSystemBackup(file: File) {
  const result = await restoreFromZip(file);
  return result;
}

export async function getLastBackupStatus() {
  return lastBackupStatus;
}

export async function forceCloudUpload() {
  // Cloud upload functionality to be implemented
  console.log('Cloud upload functionality to be implemented');
}

export async function getCloudUploadStatus() {
  return await getCloudStatus();
}

export async function createFullBackup() {
  // Prevent multiple simultaneous backups
  if (isBackupInProgress) {
    console.log('⚠️ Backup already in progress, skipping...');
    return;
  }
  
  isBackupInProgress = true;
  const startTime = Date.now();
  const now = new Date();
  const dir = getBackupDirectory(now);
  
  try {
    console.log('Starting full backup process...');
    
    // Update customer analytics before backup
    await CustomerAnalyticsService.updateCustomerAnalytics();
    
    // Step 1: Create both backup files locally
    console.log('Creating local backup files...');
    const humanReadableZip = await createHumanReadableZip();
    const systemZip = await createSystemZip();
    
    // Step 2: Save both files locally
    const humanReadableFilename = `readable_backup_${dir}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.zip`;
    const systemFilename = `system_backup_${dir}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.zip`;
    
    await saveBackupToLocal(humanReadableZip, humanReadableFilename);
    await saveBackupToLocal(systemZip, systemFilename);
    
    console.log('✅ Local backups saved successfully');
    
    // Step 3: Upload both files to cloud (single upload operation)
    const { scriptUrl, email, driveFolderId } = getAppsScriptConfig();
    if (scriptUrl && email) {
      console.log('Starting cloud upload...');
      console.log('Script URL:', scriptUrl);
      console.log('Email:', email);
      console.log('Drive Folder ID:', driveFolderId);
      
      try {
        // Upload both files in sequence
        const humanReadableResult = await uploadBackupToAppsScript({
          file: humanReadableZip,
          email,
          filename: humanReadableFilename,
          scriptUrl,
          mimeType: 'application/zip'
        });
        
        const systemResult = await uploadBackupToAppsScript({
          file: systemZip,
          email,
          filename: systemFilename,
          scriptUrl,
          mimeType: 'application/zip'
        });
        
        if (humanReadableResult.success && systemResult.success) {
          console.log('✅ Both backups uploaded to cloud successfully');
          toast.success('Backup completed: Local saved + Cloud uploaded!');
        } else {
          console.warn('⚠️ Partial cloud upload success');
          toast.warning('Backup saved locally, but cloud upload had issues');
        }
      } catch (uploadError) {
        console.error('❌ Cloud upload failed:', uploadError);
        toast.error('Backup saved locally, but cloud upload failed');
      }
    } else {
      console.log('Cloud config not available, skipping cloud upload');
      toast.success('Backup saved locally only');
    }
    
    // Step 4: Log the backup
    const duration = Date.now() - startTime;
    const metadata = await getBackupMetadata();
    
    await BackupHistoryService.logSuccessfulBackup(
      'auto',
      [humanReadableFilename, systemFilename],
      {
        includeCustomers: true,
        includeInventory: true,
        includeSales: true,
        formats: ['xlsx', 'pdf', 'json'],
        storageLocation: 'both',
        encryptFiles: false,
        backupType: 'full'
      },
      {
        ...metadata,
        backupSize: humanReadableZip.size + systemZip.size,
        duration
      }
    );
    
    console.log('✅ Full backup process completed successfully');
    
  } catch (error) {
    console.error('❌ Full backup failed:', error);
    toast.error('Backup failed: ' + (error.message || String(error)));
    
    const duration = Date.now() - startTime;
    const metadata = await getBackupMetadata();
    
    await BackupHistoryService.logFailedBackup(
      'auto',
      [error.message || String(error)],
      {
        includeCustomers: true,
        includeInventory: true,
        includeSales: true,
        formats: ['xlsx', 'pdf', 'json'],
        storageLocation: 'both',
        encryptFiles: false,
        backupType: 'full'
      },
      {
        ...metadata,
        duration
      }
    );
  } finally {
    // Always release the backup lock
    isBackupInProgress = false;
  }
} 
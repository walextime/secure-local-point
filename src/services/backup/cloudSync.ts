import { dbOperations, STORES } from '@/lib/db';
import { BackupHistoryEntry, BackupHistoryRecord } from '@/types/backup';

export interface CloudSyncConfig {
  googleDriveFolderId: string;
  googleAppsScriptLink: string;
  emailDestination: string;
  enableAutoUpload: boolean;
  backupTime: string;
  uploadRetryLimit: number;
}

export interface CloudUploadResult {
  success: boolean;
  message: string;
  fileId?: string;
  emailSent?: boolean;
}

export interface CloudUploadStatus {
  lastUpload: string | null;
  status: 'success' | 'failed' | 'pending' | 'none' | 'error';
  message?: string;
  timestamp?: string;
}


export const testAppsScriptEndpoint = async (appsScriptUrl: string): Promise<boolean> => {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] TESTING APPS SCRIPT ENDPOINT`);
  console.log(`[${requestId}] URL: ${appsScriptUrl}`);
  
  try {
    if (!appsScriptUrl.startsWith('https://script.google.com/')) {
      console.error(`[${requestId}] ERROR: Invalid Google Apps Script URL format`);
      return false;
    }

    console.log(`[${requestId}] Sending test request to proxy...`);
    const response = await fetch('http://localhost:8888/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUrl: appsScriptUrl,
        action: 'test',
        timestamp: new Date().toISOString()
      })
    });

    console.log(`[${requestId}] Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.text();
      console.log(`[${requestId}] Test successful: ${result}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`[${requestId}] Test failed: ${response.status} ${response.statusText}`);
      console.error(`[${requestId}] Error response: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`[${requestId}] ERROR TESTING APPS SCRIPT ENDPOINT:`);
    console.error(`[${requestId}] Error type: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
    console.error(`[${requestId}] Error message: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};


async function logCloudUploadHistory(fileName: string, success: boolean, errorMsg?: string) {
  const historyRecord = await dbOperations.get<BackupHistoryRecord>(STORES.SETTINGS, 'backup-history');
  const newEntry: BackupHistoryEntry = {
    id: `cloud-upload-${Date.now()}`,
    timestamp: Date.now(),
    filesCreated: [fileName],
    errors: errorMsg ? [errorMsg] : [],
    success,
    config: { type: 'cloud-upload' }
  };
  let entries = historyRecord?.entries || [];
  entries = [...entries, newEntry].slice(-50);
  await dbOperations.put(STORES.SETTINGS, {
    id: 'backup-history',
    entries
  });
}


export const uploadToGoogleDrive = async (
  file: File, 
  config: CloudSyncConfig
): Promise<CloudUploadResult> => {
  try {
    if (!navigator.onLine) {
      const { addToRetryQueue } = await import('./retryQueue');
      await addToRetryQueue(file, config);
      await logCloudUploadHistory(file.name, false, 'Offline - backup queued for retry when connection is restored');
      return {
        success: false,
        message: 'Offline - backup queued for retry when connection is restored'
      };
    }
    const base64Data = await fileToBase64(file);
    const requestId = Date.now().toString();
    console.log(`[${requestId}] UPLOADING TO GOOGLE DRIVE`);
    console.log(`[${requestId}] File: ${file.name} (${file.size} bytes)`);
    console.log(`[${requestId}] Script URL: ${config.googleAppsScriptLink}`);
    console.log(`[${requestId}] Folder ID: ${config.googleDriveFolderId}`);
    console.log(`[${requestId}] Email: ${config.emailDestination}`);

    const response = await fetch('http://localhost:8888/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUrl: config.googleAppsScriptLink,
        action: 'upload',
        folderId: config.googleDriveFolderId,
        fileName: file.name,
        fileData: base64Data,
        emailDestination: config.emailDestination
      })
    });

    console.log(`[${requestId}] Response status: ${response.status} ${response.statusText}`);
    console.log(`[${requestId}] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] HTTP ERROR: ${response.status} ${response.statusText}`);
      console.error(`[${requestId}] Error response: ${errorText}`);
      await logCloudUploadHistory(file.name, false, `HTTP error! status: ${response.status}. Response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
    }
    const result = await response.json();
    if (result.success) {
      await logCloudUploadHistory(file.name, true);
      return {
        success: true,
        message: result.message || 'Upload completed',
        fileId: result.fileId,
        emailSent: result.emailSent || false
      };
    } else {
      const { addToRetryQueue } = await import('./retryQueue');
      await addToRetryQueue(file, config);
      await logCloudUploadHistory(file.name, false, result.message || 'Upload failed - queued for retry');
      return {
        success: false,
        message: result.message || 'Upload failed - queued for retry'
      };
    }
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    try {
      const { addToRetryQueue } = await import('./retryQueue');
      await addToRetryQueue(file, config);
    } catch (queueError) {
      console.error('Error adding to retry queue:', queueError);
    }
    await logCloudUploadHistory(file.name, false, error instanceof Error ? error.message : 'Upload failed - queued for retry');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Upload failed - queued for retry'
    };
  }
};


export const retryUpload = async (
  uploadFunction: () => Promise<CloudUploadResult>,
  maxRetries: number = 3
): Promise<CloudUploadResult> => {
  let lastError: string = '';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadFunction();
      
      if (result.success) {
        return result;
      }
      
      lastError = result.message;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000; 
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return {
    success: false,
    message: `Upload failed after ${maxRetries} attempts. Last error: ${lastError}`
  };
};


const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};


export const getCloudUploadStatus = async (): Promise<CloudUploadStatus> => {
  try {
    const status = localStorage.getItem('cloud_upload_status');
    return status ? JSON.parse(status) : { lastUpload: null, status: 'none' };
  } catch (error) {
    console.error('Error getting cloud upload status:', error);
    return { lastUpload: null, status: 'error' };
  }
};


export const updateCloudUploadStatus = (status: Partial<CloudUploadStatus>): void => {
  try {
    localStorage.setItem('cloud_upload_status', JSON.stringify({
      ...status,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error updating cloud upload status:', error);
  }
};


export const scheduleCloudUploads = (config: CloudSyncConfig): void => {
  if (!config.enableAutoUpload) {
    return;
  }

  
  const [hours, minutes] = config.backupTime.split(':').map(Number);
  
  
  const now = new Date();
  const nextUpload = new Date();
  nextUpload.setHours(hours, minutes, 0, 0);
  
  
  if (nextUpload <= now) {
    nextUpload.setDate(nextUpload.getDate() + 1);
  }
  
  const timeUntilUpload = nextUpload.getTime() - now.getTime();
  
  
  setTimeout(() => {
    
    console.log('Scheduled cloud upload triggered');
  }, timeUntilUpload);
  
  console.log(`Next cloud upload scheduled for: ${nextUpload.toLocaleString()}`);
}; 
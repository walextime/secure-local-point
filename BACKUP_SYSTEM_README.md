# Enhanced Backup Upload System

A comprehensive backup upload system for POS PWA with offline support, automatic retry, and persistent queue management.

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UI Component  │───▶│  Service Worker  │───▶│  IndexedDB      │
│   (Upload Btn)  │    │  (Background     │    │  (Queue +       │
│                  │    │   Sync)          │    │   History)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Network Check  │    │  Retry Logic     │    │  Backup History │
│  (Online/Off)   │    │  (7-day expiry)  │    │  (Status Track) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## ✨ **Key Features**

### 🔄 **Offline Support**
- **Queue Management**: Failed uploads are automatically queued
- **Background Sync**: Uses Workbox BackgroundSyncPlugin with 7-day retention
- **Network Detection**: Automatically detects online/offline status
- **Persistent Storage**: Queue survives browser restarts and closures

### 🔁 **Automatic Retry**
- **Smart Retry Logic**: Up to 10 retry attempts with exponential backoff
- **7-Day Retention**: Queued requests persist for up to 7 days
- **Fallback System**: Manual retry if background sync fails
- **Status Tracking**: Comprehensive status tracking with timestamps

### 📊 **Comprehensive History**
- **Status Tracking**: Pending, In Progress, Completed, Failed, Expired
- **Detailed Metadata**: Timestamps, retry attempts, error messages
- **Statistics**: Backup success rates, average retry attempts
- **Cleanup**: Automatic cleanup of expired entries

### 🎨 **Rich UI**
- **Real-time Status**: Live updates of queue status and progress
- **Network Indicators**: Visual online/offline status
- **Progress Tracking**: Upload progress with percentage
- **History Management**: View, retry, and delete backup entries

## 📁 **File Structure**

```
src/
├── lib/
│   ├── backupHistoryDB.ts          # IndexedDB schema and management
│   ├── backupQueueReplay.ts        # Browser startup queue replay
│   └── serviceWorkerRegistration.ts # Service worker registration
├── services/backup/
│   └── enhancedBackupUploadService.ts # Enhanced upload service
├── components/admin/backup/
│   └── EnhancedBackupManager.tsx   # Main UI component
└── public/
    └── service-worker.js           # Service worker with background sync
```

## 🚀 **Quick Start**

### 1. **Service Worker Registration**
```typescript
import { ServiceWorkerRegistration } from '@/lib/serviceWorkerRegistration';

// Auto-registers on import, or manually:
await ServiceWorkerRegistration.register();
```

### 2. **Database Initialization**
```typescript
import { initializeBackupHistoryDB } from '@/lib/backupHistoryDB';

await initializeBackupHistoryDB();
```

### 3. **Upload Backup**
```typescript
import { EnhancedBackupUploadService } from '@/services/backup/enhancedBackupUploadService';

const result = await EnhancedBackupUploadService.uploadBackup({
  scriptUrl: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  driveFolderId: 'YOUR_FOLDER_ID',
  emailDestination: 'your-email@example.com'
});

if (result.success) {
  console.log('Backup uploaded successfully!');
} else if (result.queued) {
  console.log('Backup queued for later upload');
}
```

### 4. **UI Integration**
```typescript
import { EnhancedBackupManager } from '@/components/admin/backup/EnhancedBackupManager';

// Use in your React component
<EnhancedBackupManager />
```

## 🔧 **Configuration**

### **Service Worker Configuration**
```javascript
// public/service-worker.js
const BACKUP_QUEUE_NAME = 'backup-upload-queue';
const MAX_RETENTION_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_RETRIES = 10;
```

### **Database Schema**
```typescript
// IndexedDB Tables
backupHistory: {
  id: string;                    // Unique backup ID
  timestamp: string;             // Creation timestamp
  status: BackupStatus;          // Current status
  url: string;                   // Upload URL
  method: string;                // HTTP method
  requestData: object;           // Request payload
  queuedAt?: string;            // Queue timestamp
  startedAt?: string;           // Start timestamp
  completedAt?: string;         // Completion timestamp
  failedAt?: string;            // Failure timestamp
  expiredAt?: string;           // Expiry timestamp
  retryAttempts: number;        // Retry count
  maxRetries: number;           // Max retries allowed
  lastRetry?: string;           // Last retry timestamp
  error?: string;               // Error message
  errorDetails?: string;        // Detailed error info
  fileSize?: number;            // File size in bytes
  checksum?: string;            // File checksum
  userNotified: boolean;        // User notification status
  notificationSent?: string;    // Notification timestamp
}

backupQueue: {
  id: string;                   // Queue entry ID
  request: Request;             // HTTP request object
  metadata: object;             // Request metadata
}
```

## 📊 **Status Tracking**

### **Backup Statuses**
- **`pending`**: Queued for upload
- **`in_progress`**: Currently uploading
- **`completed`**: Successfully uploaded
- **`failed`**: Upload failed (can be retried)
- **`expired`**: Exceeded 7-day retention period

### **Queue Status**
```typescript
interface QueueStatus {
  pendingCount: number;         // Number of pending uploads
  failedCount: number;          // Number of failed uploads
  isReplaying: boolean;         // Currently processing queue
  lastReplayAttempt: string;    // Last replay timestamp
}
```

## 🔄 **Retry Logic**

### **Automatic Retry**
1. **Network Failure**: Request automatically queued
2. **Background Sync**: Triggered when connection restored
3. **Exponential Backoff**: Increasing delays between retries
4. **Max Retries**: 10 attempts before permanent failure
5. **7-Day Retention**: Requests expire after 7 days

### **Manual Retry**
```typescript
// Retry a specific failed backup
await EnhancedBackupUploadService.retryBackup(backupId);

// Retry all failed backups
const failedBackups = await BackupHistoryManager.getFailedBackups();
for (const backup of failedBackups) {
  await EnhancedBackupUploadService.retryBackup(backup.id);
}
```

## 🎨 **UI Components**

### **EnhancedBackupManager**
- **Real-time Status**: Live queue and progress updates
- **Network Indicators**: Visual online/offline status
- **Upload Progress**: Progress bar with percentage
- **History Management**: View, retry, delete backups
- **Statistics Dashboard**: Backup success rates and metrics

### **Status Indicators**
- 🟡 **Pending**: Clock icon, yellow badge
- 🔵 **In Progress**: Spinning refresh icon, blue badge
- 🟢 **Completed**: Check circle icon, green badge
- 🔴 **Failed**: X circle icon, red badge
- 🟠 **Expired**: Alert triangle icon, orange badge

## 🔧 **API Reference**

### **EnhancedBackupUploadService**

#### **uploadBackup(config)**
```typescript
interface EnhancedBackupUploadConfig {
  scriptUrl: string;           // Google Apps Script URL
  driveFolderId: string;       // Google Drive folder ID
  emailDestination: string;    // Email address
  priority?: 'high' | 'normal' | 'low';
  retryOnFailure?: boolean;
  notifyOnCompletion?: boolean;
}
```

#### **getBackupHistory(options)**
```typescript
interface HistoryOptions {
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'status' | 'retryAttempts' | 'failedAt';
  sortOrder?: 'asc' | 'desc';
}
```

#### **getBackupStats()**
```typescript
interface BackupStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  expired: number;
  averageRetryAttempts: number;
}
```

### **BackupHistoryManager**

#### **addBackupEntry(entry)**
Add a new backup entry to the history.

#### **updateBackupStatus(id, updates)**
Update the status of a backup entry.

#### **getBackupHistory(options)**
Retrieve backup history with filtering and pagination.

#### **cleanupExpiredBackups()**
Mark backups older than 7 days as expired.

#### **deleteOldBackups()**
Delete backups older than 30 days.

### **BackupQueueReplay**

#### **initialize()**
Initialize the queue replay system on app startup.

#### **replayQueuedBackups()**
Attempt to replay all pending backups.

#### **forceReplay()**
Manually trigger queue replay.

#### **getQueueStatus()**
Get current queue status and statistics.

## 🛠️ **Error Handling**

### **Network Errors**
- **Offline**: Requests automatically queued
- **Connection Lost**: Graceful degradation with user notification
- **Server Errors**: Automatic retry with exponential backoff

### **Data Validation**
- **Missing Fields**: Clear error messages for required fields
- **Invalid URLs**: Validation of Google Apps Script URLs
- **File Size**: Checks for empty or corrupted backup files

### **User Feedback**
- **Toast Notifications**: Success, error, and info messages
- **Progress Indicators**: Real-time upload progress
- **Status Updates**: Live status updates in UI

## 🔒 **Security Considerations**

### **Data Privacy**
- **Local Storage**: All backup data stored locally in IndexedDB
- **No External Dependencies**: No third-party services required
- **User Control**: Users can delete backup history at any time

### **Error Logging**
- **Detailed Logs**: Comprehensive error logging for debugging
- **User Privacy**: No sensitive data in error logs
- **Debug Mode**: Optional verbose logging for development

## 🧪 **Testing**

### **Offline Testing**
```javascript
// Simulate offline mode
navigator.onLine = false;

// Trigger backup upload
await EnhancedBackupUploadService.uploadBackup(config);

// Verify queued
const queueStatus = await EnhancedBackupUploadService.getQueueStatus();
console.log('Pending:', queueStatus.pendingCount);
```

### **Retry Testing**
```javascript
// Simulate network failure
// The service worker will automatically queue the request

// Check queue status
const queueStatus = await EnhancedBackupUploadService.getQueueStatus();
console.log('Failed:', queueStatus.failedCount);

// Manually retry
await EnhancedBackupUploadService.retryBackup(backupId);
```

## 📈 **Performance**

### **Optimizations**
- **Lazy Loading**: Backup data generated only when needed
- **Efficient Storage**: Compressed backup data in IndexedDB
- **Background Processing**: Non-blocking upload operations
- **Smart Retry**: Exponential backoff prevents server overload

### **Memory Management**
- **Automatic Cleanup**: Expired entries removed automatically
- **Size Limits**: Configurable history size limits
- **Garbage Collection**: Old entries cleaned up periodically

## 🔄 **Migration Guide**

### **From Basic Backup**
1. **Replace Service**: Use `EnhancedBackupUploadService` instead of basic service
2. **Update UI**: Replace basic upload button with `EnhancedBackupManager`
3. **Initialize**: Add service worker registration and database initialization
4. **Test**: Verify offline functionality and retry logic

### **Database Migration**
```typescript
// The system automatically handles database schema updates
// No manual migration required
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Service Worker Not Registering**
```javascript
// Check browser support
if (!('serviceWorker' in navigator)) {
  console.warn('Service Worker not supported');
}

// Check registration status
const status = ServiceWorkerRegistration.getStatus();
console.log('SW Status:', status);
```

#### **Queue Not Processing**
```javascript
// Check background sync support
if (!ServiceWorkerRegistration.isBackgroundSyncSupported()) {
  console.warn('Background Sync not supported');
}

// Manually trigger replay
await BackupQueueReplay.forceReplay();
```

#### **Database Errors**
```javascript
// Check IndexedDB support
if (!('indexedDB' in window)) {
  console.error('IndexedDB not supported');
}

// Reinitialize database
await initializeBackupHistoryDB();
```

### **Debug Mode**
```typescript
// Enable verbose logging
localStorage.setItem('backupDebug', 'true');

// Check logs in browser console
// Look for [BackupQueueReplay], [EnhancedBackupUpload], etc.
```

## 📚 **Additional Resources**

- **Workbox Documentation**: https://developers.google.com/web/tools/workbox
- **Background Sync API**: https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API
- **IndexedDB Guide**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **Service Worker API**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

## 🤝 **Contributing**

1. **Fork the repository**
2. **Create a feature branch**
3. **Add tests for new functionality**
4. **Ensure offline functionality works**
5. **Submit a pull request**

## 📄 **License**

This backup system is part of the TechPlusPOS project and follows the same licensing terms. 
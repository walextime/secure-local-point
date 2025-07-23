importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const { BackgroundSyncPlugin } = workbox.backgroundSync;
const { registerRoute } = workbox.routing;
const { NetworkOnly } = workbox.strategies;

// Backup queue configuration
const BACKUP_QUEUE_NAME = 'backup-upload-queue';
const MAX_RETENTION_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Background sync plugin for backup uploads
const backgroundSyncPlugin = new BackgroundSyncPlugin(BACKUP_QUEUE_NAME, {
  maxRetentionTime: MAX_RETENTION_TIME,
  onSync: async ({ queue }) => {
    console.log('[SW] Background sync triggered, processing queue...');
    let entry;
    
    while (entry = await queue.shiftRequest()) {
      try {
        console.log('[SW] Processing queued backup request:', entry.request.url);
        
        // Clone the request since it might be consumed
        const request = entry.request.clone();
        
        // Attempt to upload the backup
        const response = await fetch(request);
        
        if (response.ok) {
          console.log('[SW] Backup upload successful');
          
          // Update backup history with success
          await updateBackupHistory(entry.request, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            retryAttempts: entry.metadata?.retryAttempts || 0
          });
          
          // Notify the main app
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'BACKUP_UPLOAD_SUCCESS',
                requestId: entry.metadata?.requestId,
                timestamp: new Date().toISOString()
              });
            });
          });
          
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
      } catch (error) {
        console.error('[SW] Backup upload failed:', error);
        
        // Update backup history with failure
        await updateBackupHistory(entry.request, {
          status: 'failed',
          failedAt: new Date().toISOString(),
          error: error.message,
          retryAttempts: (entry.metadata?.retryAttempts || 0) + 1
        });
        
        // Re-queue if we haven't exceeded max retries
        const retryAttempts = (entry.metadata?.retryAttempts || 0) + 1;
        const maxRetries = 10; // Maximum retry attempts
        
        if (retryAttempts < maxRetries) {
          console.log(`[SW] Re-queuing backup request (attempt ${retryAttempts}/${maxRetries})`);
          await queue.pushRequest(entry.request, {
            ...entry.metadata,
            retryAttempts,
            lastRetry: new Date().toISOString()
          });
        } else {
          console.log('[SW] Max retries exceeded, marking as permanently failed');
          
          // Notify the main app of permanent failure
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'BACKUP_UPLOAD_PERMANENT_FAILURE',
                requestId: entry.metadata?.requestId,
                error: error.message,
                timestamp: new Date().toISOString()
              });
            });
          });
        }
      }
    }
  }
});

// Register route for backup uploads
registerRoute(
  ({ url }) => url.pathname === '/api/backup' || url.pathname === '/proxy',
  new NetworkOnly({
    plugins: [backgroundSyncPlugin]
  }),
  'POST'
);

// Handle fetch failures for backup requests
self.addEventListener('fetch', event => {
  if (event.request.method === 'POST' && 
      (event.request.url.includes('/api/backup') || event.request.url.includes('/proxy'))) {
    
    event.respondWith(
      fetch(event.request).catch(async error => {
        console.log('[SW] Backup request failed, adding to queue:', error);
        
        // Add request to background sync queue
        const queue = await backgroundSyncPlugin.queue;
        await queue.pushRequest(event.request, {
          requestId: generateRequestId(),
          timestamp: new Date().toISOString(),
          retryAttempts: 0
        });
        
        // Update backup history with pending status
        await updateBackupHistory(event.request, {
          status: 'pending',
          queuedAt: new Date().toISOString(),
          retryAttempts: 0
        });
        
        // Return a response indicating the request was queued
        return new Response(JSON.stringify({
          success: false,
          message: 'Backup queued for upload when online',
          queued: true,
          timestamp: new Date().toISOString()
        }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }
});

// Handle background sync events
self.addEventListener('sync', event => {
  if (event.tag === BACKUP_QUEUE_NAME) {
    console.log('[SW] Background sync event received');
    event.waitUntil(backgroundSyncPlugin.onSync({ queue: event.queue }));
  }
});

// Handle push notifications for backup status updates
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    console.log('[SW] Push notification received:', data);
    
    const options = {
      body: data.message || 'Backup status update',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'backup-status',
      data: data
    };
    
    event.waitUntil(
      self.registration.showNotification('TechPlusPOS Backup', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});

// Utility functions
function generateRequestId() {
  return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function updateBackupHistory(request, updateData) {
  try {
    const db = await openBackupHistoryDB();
    const tx = db.transaction(['backupHistory'], 'readwrite');
    const store = tx.objectStore('backupHistory');
    
    // Extract request data for history
    const requestData = await request.clone().json();
    const requestId = updateData.requestId || generateRequestId();
    
    const historyEntry = {
      id: requestId,
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method,
      ...updateData,
      requestData: {
        action: requestData.action,
        driveFolderId: requestData.driveFolderId,
        email: requestData.email,
        hasZipFile: !!requestData.zipFile,
        hasSysZipFile: !!requestData.sysZipFile
      }
    };
    
    await store.put(historyEntry);
    console.log('[SW] Backup history updated:', historyEntry);
    
  } catch (error) {
    console.error('[SW] Failed to update backup history:', error);
  }
}

async function openBackupHistoryDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BackupHistoryDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('backupHistory')) {
        const store = db.createObjectStore('backupHistory', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('queuedAt', 'queuedAt', { unique: false });
      }
    };
  });
}

// Handle messages from main app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'GET_BACKUP_QUEUE_STATUS') {
    event.waitUntil(
      backgroundSyncPlugin.queue.getRequests().then(requests => {
        event.ports[0].postMessage({
          type: 'BACKUP_QUEUE_STATUS',
          queueSize: requests.length,
          requests: requests.map(req => ({
            url: req.url,
            timestamp: req.metadata?.timestamp
          }))
        });
      })
    );
  }
});

console.log('[SW] Backup service worker registered with background sync support'); 
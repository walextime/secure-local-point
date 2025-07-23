const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Get app information
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // Get server status
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  
  // Send notifications to main process
  sendNotification: (title, body) => ipcRenderer.send('notification', { title, body }),
  
  // Handle app events
  onAppReady: (callback) => ipcRenderer.on('app-ready', callback),
  onServerStatus: (callback) => ipcRenderer.on('server-status', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Handle window events
window.addEventListener('DOMContentLoaded', () => {
  console.log('🔌 Preload script loaded');
}); 
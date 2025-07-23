const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Get app version
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Get app name
  getAppName: () => ipcRenderer.invoke('get-app-name'),
  
  // Reload the app
  reload: () => ipcRenderer.invoke('reload'),
  
  // Open developer tools
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
  
  // Minimize window
  minimize: () => ipcRenderer.invoke('minimize'),
  
  // Maximize window
  maximize: () => ipcRenderer.invoke('maximize'),
  
  // Close window
  close: () => ipcRenderer.invoke('close'),
  
  // Get platform info
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Get server status
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  
  // Send notification
  sendNotification: (title, body) => ipcRenderer.invoke('send-notification', title, body),
  
  // File system operations (safe)
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  
  // App data operations
  getAppData: () => ipcRenderer.invoke('get-app-data'),
  setAppData: (key, value) => ipcRenderer.invoke('set-app-data', key, value),
  
  // System information
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // Window controls
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  isMinimized: () => ipcRenderer.invoke('is-minimized'),
  
  // Theme operations
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  
  // Logging
  log: (level, message) => ipcRenderer.invoke('log', level, message),
  
  // App lifecycle
  quit: () => ipcRenderer.invoke('quit'),
  restart: () => ipcRenderer.invoke('restart'),
  
  // Listen for events from main process
  on: (channel, callback) => {
    // Whitelist channels
    const validChannels = [
      'server-status',
      'app-data-updated',
      'theme-changed',
      'window-state-changed',
      'notification'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
  
  // Remove event listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Handle window load
window.addEventListener('DOMContentLoaded', () => {
  // You can add any initialization code here
  console.log('Preload script loaded');
});

// Handle window unload
window.addEventListener('beforeunload', () => {
  // Clean up any resources if needed
  console.log('Preload script unloading');
}); 
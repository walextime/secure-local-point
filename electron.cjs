// Force CommonJS mode for this file
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '';
if (!process.env.NODE_OPTIONS.includes('--input-type=commonjs')) {
  process.env.NODE_OPTIONS += ' --input-type=commonjs';
}

const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

let mainWindow;
let serverProcess;

// Add v8-compile-cache for faster startup
try { require('v8-compile-cache'); } catch (e) {}

function createWindow() {
  // Detect dev vs prod
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === '1' || process.env.VITE_DEV_SERVER_URL;
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    show: false, // Don't show until ready
    backgroundColor: '#f8fafc', // Match your app's background color
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    title: 'TechPlusPOS',
    icon: path.join(__dirname, 'public', 'favicon.ico')
  });

  // Load the app (dev: localhost, prod: file)
  if (isDev) {
    mainWindow.loadURL('http://localhost:8000');
  } else {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    mainWindow.loadURL(`file://${indexPath}`);
  }

  // Show window when ready to avoid blank screen
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Main window is ready and visible');
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  // Handle load failures - reload to fallback route
  mainWindow.webContents.on('did-fail-load', () => {
    console.error('Window failed to load. Reloading index.html...');
    if (isDev) {
      setTimeout(() => mainWindow.loadURL('http://localhost:8000'), 2000);
    } else {
      const indexPath = path.join(__dirname, 'dist', 'index.html');
      setTimeout(() => mainWindow.loadURL(`file://${indexPath}`), 2000);
    }
  });

  return mainWindow;
}

function waitForServer(url, cb) {
  const tryConnect = () => {
    http.get(url, res => {
      if (res.statusCode === 200) {
        console.log('✅ Server is ready');
        cb();
      } else {
        setTimeout(tryConnect, 500);
      }
    }).on('error', () => {
      setTimeout(tryConnect, 500);
    });
  };
  tryConnect();
}

function startServer() {
  console.log('🚀 Starting TechPlusPOS server...');
  
  serverProcess = spawn('node', ['server/launcher.cjs'], {
    cwd: process.cwd(),
    detached: false,
    stdio: 'ignore'
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Server process error:', error);
  });

  return serverProcess;
}

// App event handlers
app.whenReady().then(() => {
  console.log('🚀 Initializing TechPlusPOS Desktop App...');
  
  // Start the server
  startServer();
  
  // Wait for server to be ready, then create window
  waitForServer('http://localhost:8000', createWindow);
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app quit
app.on('before-quit', () => {
  console.log('🛑 Shutting down TechPlusPOS...');
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
}); 
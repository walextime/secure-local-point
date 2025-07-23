const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.loadURL('http://localhost:8000');

  // Show window only when login page is loaded
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
    if (serverProcess) serverProcess.kill();
  });
}

function waitForServer(url, cb) {
  const tryConnect = () => {
    http.get(url, res => {
      if (res.statusCode === 200) cb();
      else setTimeout(tryConnect, 500);
    }).on('error', () => setTimeout(tryConnect, 500));
  };
  tryConnect();
}

app.on('ready', () => {
  // Start your server
  serverProcess = spawn('node', ['server/launcher.cjs'], {
    cwd: process.cwd(),
    detached: false,
    stdio: 'ignore'
  });

  // Wait for server to be ready
  waitForServer('http://localhost:8000', createWindow);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (serverProcess) serverProcess.kill();
}); 
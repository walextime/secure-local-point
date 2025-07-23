#!/usr/bin/env node

const express = require('express');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');

// Try to require tray (will fail if not available in compiled version)
let tray = null;
try {
  const { app: electronApp, Tray, Menu } = require('electron');
  tray = { app: electronApp, Tray, Menu };
} catch (error) {
  console.log('Tray not available in compiled version');
}

const POS_APP = {
  name: 'Tech Plus POS',
  port: process.env.PORT || 8000,
  url: `http://localhost:${process.env.PORT || 8000}`
};

let server = null;
let trayIcon = null;

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Serve static files from dist folder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Handle all routes by serving index.html (for React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    platform: os.platform(),
    arch: os.arch()
  });
});

// Server info endpoint
app.get('/api/server-info', (req, res) => {
  res.json({
    port: POS_APP.port,
    hostname: os.hostname(),
    platform: os.platform(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// Function to open browser
function openBrowser() {
  const url = POS_APP.url;
  console.log(`🌍 Opening browser: ${url}`);
  
  if (os.platform() === 'win32') {
    exec(`start ${url}`, (error) => {
      if (error) {
        console.error('❌ Failed to open browser:', error.message);
      } else {
        console.log('✅ Browser opened successfully');
      }
    });
  } else if (os.platform() === 'darwin') {
    exec(`open ${url}`, (error) => {
      if (error) {
        console.error('❌ Failed to open browser:', error.message);
      } else {
        console.log('✅ Browser opened successfully');
      }
    });
  } else {
    exec(`xdg-open ${url}`, (error) => {
      if (error) {
        console.error('❌ Failed to open browser:', error.message);
      } else {
        console.log('✅ Browser opened successfully');
      }
    });
  }
}

// Function to create tray icon (if available)
function createTrayIcon() {
  if (!tray) return;
  
  try {
    // Create tray icon
    trayIcon = new tray.Tray(path.join(__dirname, '../public/favicon.ico'));
    
    // Create context menu
    const contextMenu = tray.Menu.buildFromTemplate([
      {
        label: `Open ${POS_APP.name}`,
        click: () => {
          openBrowser();
        }
      },
      {
        label: 'Server Info',
        click: () => {
          console.log(`Server running on ${POS_APP.url}`);
        }
      },
      { type: 'separator' },
      {
        label: 'Exit',
        click: () => {
          console.log('🛑 Exiting Tech Plus POS...');
          if (trayIcon) {
            trayIcon.destroy();
          }
          process.exit(0);
        }
      }
    ]);
    
    trayIcon.setContextMenu(contextMenu);
    trayIcon.setToolTip(`${POS_APP.name} - Running on ${POS_APP.url}`);
    
    console.log('✅ Tray icon created');
  } catch (error) {
    console.log('⚠️ Could not create tray icon:', error.message);
  }
}

// Function to start server
function startServer() {
  server = app.listen(POS_APP.port, () => {
    console.log(`🚀 ${POS_APP.name} running on ${POS_APP.url}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, '../dist')}`);
    console.log(`🌐 Platform: ${os.platform()} ${os.arch()}`);
    
    // Open browser automatically
    setTimeout(() => {
      openBrowser();
    }, 1000);
    
    // Create tray icon if available
    if (tray) {
      createTrayIcon();
    }
  });
}

// Graceful shutdown
function shutdown() {
  console.log('\n🛑 Shutting down Tech Plus POS...');
  
  if (trayIcon) {
    trayIcon.destroy();
  }
  
  if (server) {
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

// Handle process signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown();
});

// Check if dist folder exists
const distPath = path.join(__dirname, '../dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ Dist folder not found. Please build the project first:');
  console.error('   npm run build');
  process.exit(1);
}

// Start the application
console.log(`🎯 Starting ${POS_APP.name}...`);
startServer(); 
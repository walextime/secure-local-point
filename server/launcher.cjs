#!/usr/bin/env node

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const { exec, spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const http = require('http');

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
  port: process.env.PORT || 888,
  host: 'techplus.pos',
  url: `http://techplus.pos:${process.env.PORT || 888}`
};

let server = null;
let trayIcon = null;
let browserOpened = false;

// --- Security Middleware Imports ---
const devWhitelist = ['http://localhost:8000', 'http://localhost:888', 'http://techplus.pos:888'];
const prodWhitelist = ['https://your-production-domain.com'];
const whitelist = process.env.NODE_ENV === 'production' ? prodWhitelist : devWhitelist;

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like curl, mobile apps)
    if (!origin) return callback(null, true);
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200,
};

// --- Express App Setup ---
const app = express();

// 1. CORS (must be first)
app.use(cors(corsOptions));

// 2. Helmet for security headers
app.use(helmet());

// 3. Rate limiting (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 4. JSON body parser and static files
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Health check endpoint (before CSRF)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    platform: os.platform(),
    arch: os.arch()
  });
});

// Server info endpoint (before CSRF)
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

// 5. CSRF protection (cookie-based) - applied after API endpoints
app.use(csrf({ cookie: false }));

// Serve static files from dist folder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Handle all routes by serving index.html (for React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Function to check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

// Function to find available port
async function findAvailablePort(startPort) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
    if (port > startPort + 100) {
      throw new Error('No available ports found');
    }
  }
  return port;
}

// Function to open browser with better error handling
function openBrowser() {
  if (browserOpened) return;
  
  const url = POS_APP.url;
  console.log(`🌍 Opening browser: ${url}`);
  
  const openCommands = {
    win32: [
      'cmd', ['/c', 'start', url],
      'powershell', ['-Command', `Start-Process "${url}"`],
      'explorer', [url]
    ],
    darwin: [
      'open', [url]
    ],
    linux: [
      'xdg-open', [url],
      'gnome-open', [url],
      'kde-open', [url]
    ]
  };
  
  const commands = openCommands[os.platform()] || openCommands.linux;
  
  function tryOpenBrowser(index = 0) {
    if (index >= commands.length) {
      console.error('❌ Failed to open browser with any command');
      return;
    }
    
    const [command, args] = commands.slice(index * 2, (index + 1) * 2);
    
    const child = spawn(command, args, {
      stdio: 'ignore',
      detached: true
    });
    
    child.on('error', (error) => {
      console.log(`⚠️ Failed with ${command}: ${error.message}`);
      setTimeout(() => tryOpenBrowser(index + 1), 500);
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ Browser opened successfully');
        browserOpened = true;
      } else {
        console.log(`⚠️ ${command} exited with code ${code}`);
        setTimeout(() => tryOpenBrowser(index + 1), 500);
      }
    });
    
    child.unref();
  }
  
  // Wait a bit for server to be fully ready
  setTimeout(() => {
    tryOpenBrowser();
  }, 1500);
}

// Function to create tray icon (if available)
function createTrayIcon() {
  if (!tray) return;
  
  try {
    // Create tray icon
    const iconPath = path.join(__dirname, '../public/favicon.ico');
    trayIcon = new tray.Tray(iconPath);
    
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
async function startServer() {
  try {
    // Find available port
    const actualPort = await findAvailablePort(POS_APP.port);
    if (actualPort !== POS_APP.port) {
      console.log(`⚠️ Port ${POS_APP.port} was busy, using port ${actualPort}`);
      POS_APP.port = actualPort;
      POS_APP.url = `http://techplus.pos:${actualPort}`;
    }
    
    server = app.listen(POS_APP.port, () => {
      console.log(`🚀 ${POS_APP.name} running on ${POS_APP.url}`);
      console.log(`📁 Serving static files from: ${path.join(__dirname, '../dist')}`);
      console.log(`🌐 Platform: ${os.platform()} ${os.arch()}`);
      console.log(`📊 Node.js version: ${process.version}`);
      
      // Open browser automatically
      openBrowser();
      
      // Create tray icon if available
      if (tray) {
        createTrayIcon();
      }
    });
    
    server.on('error', (error) => {
      console.error('❌ Server error:', error.message);
      if (error.code === 'EADDRINUSE') {
        console.log('⚠️ Port is in use, trying to find another port...');
        startServer();
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
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
    
    // Force exit after 5 seconds if server doesn't close gracefully
    setTimeout(() => {
      console.log('⚠️ Force closing...');
      process.exit(1);
    }, 5000);
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

// --- Server Startup Sequence ---
const distPath = path.join(__dirname, '../dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ Dist folder not found. Please build the project first:');
  console.error('   npm run build');
  process.exit(1);
}

console.log(`🎯 Starting ${POS_APP.name}...`);
console.log(`📂 Working directory: ${process.cwd()}`);
console.log(`📁 Dist path: ${distPath}`);
startServer(); 
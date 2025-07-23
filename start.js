#!/usr/bin/env node

/**
 * Development Mode Startup Script
 * 
 * This script provides a comprehensive startup wrapper for the POS app in development mode.
 * It handles:
 * - Killing any processes on required ports (8000 for Vite, 8888 for proxy)
 * - Starting Vite dev server and proxy server as child processes
 * - Waiting for both ports to be available before proceeding
 * - Automatically opening the default browser to the frontend
 * - Graceful shutdown and error handling
 * - Cross-platform compatibility (Windows, macOS, Linux)
 */

import { spawn, exec } from 'child_process';
import { createServer } from 'http';
import { platform } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const VITE_PORT = 8000;
const PROXY_PORT = 8888;
const VITE_URL = `http://localhost:${VITE_PORT}`;
const PROXY_URL = `http://localhost:${PROXY_PORT}`;

// Process management
let viteProcess = null;
let proxyProcess = null;
let isShuttingDown = false;

// Cross-platform port killer
async function killProcessOnPort(port) {
  return new Promise((resolve) => {
    const isWindows = platform() === 'win32';
    
    if (isWindows) {
      // Windows: Use netstat to find PID and taskkill to kill
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (error || !stdout) {
          console.log(`No process found on port ${port}`);
          resolve();
          return;
        }
        
        const lines = stdout.split('\n');
        const pids = new Set();
        
        lines.forEach(line => {
          const match = line.match(/\s+(\d+)$/);
          if (match) {
            pids.add(match[1]);
          }
        });
        
        if (pids.size === 0) {
          console.log(`No process found on port ${port}`);
          resolve();
          return;
        }
        
        const killPromises = Array.from(pids).map(pid => {
          return new Promise((resolveKill) => {
            exec(`taskkill /F /PID ${pid}`, (killError) => {
              if (killError) {
                console.log(`Failed to kill process ${pid}: ${killError.message}`);
              } else {
                console.log(`Killed process ${pid} on port ${port}`);
              }
              resolveKill();
            });
          });
        });
        
        Promise.all(killPromises).then(() => resolve());
      });
    } else {
      // Unix-like systems: Use lsof to find PID and kill to terminate
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (error || !stdout) {
          console.log(`No process found on port ${port}`);
          resolve();
          return;
        }
        
        const pids = stdout.trim().split('\n').filter(pid => pid);
        
        if (pids.length === 0) {
          console.log(`No process found on port ${port}`);
          resolve();
          return;
        }
        
        const killPromises = pids.map(pid => {
          return new Promise((resolveKill) => {
            exec(`kill -9 ${pid}`, (killError) => {
              if (killError) {
                console.log(`Failed to kill process ${pid}: ${killError.message}`);
              } else {
                console.log(`Killed process ${pid} on port ${port}`);
              }
              resolveKill();
            });
          });
        });
        
        Promise.all(killPromises).then(() => resolve());
      });
    }
  });
}

// Check if port is available
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.close();
      resolve(true);
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

// Wait for port to be ready
async function waitForPort(port, maxAttempts = 30) {
  console.log(`Waiting for port ${port} to be ready...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    if (await isPortAvailable(port)) {
      console.log(`Port ${port} is now available`);
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
}

// Start Vite dev server
function startViteServer() {
  console.log('Starting Vite development server...');
  
  viteProcess = spawn('npx', ['vite', '--port', VITE_PORT.toString()], {
    stdio: 'pipe',
    shell: true,
    cwd: __dirname
  });
  
  viteProcess.stdout.on('data', (data) => {
    console.log(`[Vite] ${data.toString().trim()}`);
  });
  
  viteProcess.stderr.on('data', (data) => {
    console.error(`[Vite Error] ${data.toString().trim()}`);
  });
  
  viteProcess.on('close', (code) => {
    if (!isShuttingDown) {
      console.error(`Vite process exited with code ${code}`);
      process.exit(1);
    }
  });
  
  return viteProcess;
}

// Start proxy server
function startProxyServer() {
  console.log('Starting proxy server...');
  
  proxyProcess = spawn('node', ['proxy-backup.js'], {
    stdio: 'pipe',
    shell: true,
    cwd: __dirname
  });
  
  proxyProcess.stdout.on('data', (data) => {
    console.log(`[Proxy] ${data.toString().trim()}`);
  });
  
  proxyProcess.stderr.on('data', (data) => {
    console.error(`[Proxy Error] ${data.toString().trim()}`);
  });
  
  proxyProcess.on('close', (code) => {
    if (!isShuttingDown) {
      console.error(`Proxy process exited with code ${code}`);
      process.exit(1);
    }
  });
  
  return proxyProcess;
}

// Open browser
async function openBrowser(url) {
  const isWindows = platform() === 'win32';
  const isMac = platform() === 'darwin';
  
  let command;
  if (isWindows) {
    command = `start ${url}`;
  } else if (isMac) {
    command = `open ${url}`;
  } else {
    command = `xdg-open ${url}`;
  }
  
  try {
    exec(command, (error) => {
      if (error) {
        console.error(`Failed to open browser: ${error.message}`);
        console.log(`Please manually open: ${url}`);
      } else {
        console.log(`Opened browser to: ${url}`);
      }
    });
  } catch (error) {
    console.error(`Failed to open browser: ${error.message}`);
    console.log(`Please manually open: ${url}`);
  }
}

// Graceful shutdown
function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('\nShutting down servers...');
  
  if (viteProcess) {
    viteProcess.kill('SIGTERM');
  }
  
  if (proxyProcess) {
    proxyProcess.kill('SIGTERM');
  }
  
  // Force kill after 5 seconds if processes don't exit gracefully
  setTimeout(() => {
    if (viteProcess) {
      viteProcess.kill('SIGKILL');
    }
    if (proxyProcess) {
      proxyProcess.kill('SIGKILL');
    }
    process.exit(0);
  }, 5000);
}

// Main startup function
async function main() {
  try {
    console.log('🚀 Starting TechPlusPOS Development Environment...\n');
    
    // Kill any existing processes on required ports
    console.log('🔧 Checking for existing processes...');
    await killProcessOnPort(VITE_PORT);
    await killProcessOnPort(PROXY_PORT);
    
    // Wait a moment for ports to be freed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start servers
    console.log('\n📡 Starting servers...');
    startViteServer();
    startProxyServer();
    
    // Wait for both ports to be ready
    console.log('\n⏳ Waiting for servers to be ready...');
    const viteReady = await waitForPort(VITE_PORT);
    const proxyReady = await waitForPort(PROXY_PORT);
    
    if (!viteReady || !proxyReady) {
      console.error('❌ Failed to start servers within timeout');
      process.exit(1);
    }
    
    console.log('\n✅ All servers are ready!');
    console.log(`🌐 Vite Dev Server: ${VITE_URL}`);
    console.log(`🔗 Proxy Server: ${PROXY_URL}`);
    
    // Open browser
    console.log('\n🌍 Opening browser...');
    await openBrowser(VITE_URL);
    
    console.log('\n🎉 Development environment is ready!');
    console.log('Press Ctrl+C to stop all servers.\n');
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown();
});

// Start the application
main(); 
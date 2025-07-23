const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting TechPlusPOS Browser Launcher...');

// Start the server process
const server = spawn('node', ['server/launcher.cjs'], { 
  detached: true, 
  stdio: 'ignore',
  cwd: process.cwd()
});

// Unref to allow the parent process to exit independently
server.unref();

console.log(`✅ Server started with PID: ${server.pid}`);

// Wait a moment for server to start, then open browser
setTimeout(() => {
  console.log('🌐 Opening browser to TechPlusPOS...');
  
  // Use a simple approach to open browser without ES modules
  const { exec } = require('child_process');
  
  // Try different commands to open browser
  const commands = [
    'start http://localhost:8000',  // Windows
    'xdg-open http://localhost:8000',  // Linux
    'open http://localhost:8000'  // macOS
  ];
  
  // Try Windows first
  exec('start http://localhost:8000', (error) => {
    if (error) {
      console.log('❌ Failed to open browser automatically');
      console.log('🌐 Please manually open: http://localhost:8000');
    } else {
      console.log('✅ Browser opened successfully!');
      console.log('📱 TechPlusPOS is now running in your browser');
      console.log('🔄 Server will continue running in the background');
      console.log('❌ Close this window when you want to stop the server');
    }
  });
}, 3000);

// Handle process exit
process.on('exit', () => {
  console.log('🛑 Launcher exiting...');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down...');
  if (server && !server.killed) {
    server.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down...');
  if (server && !server.killed) {
    server.kill('SIGTERM');
  }
  process.exit(0);
}); 
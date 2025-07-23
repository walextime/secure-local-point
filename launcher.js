const { spawn } = require('child_process');
const open = require('open');

console.log('🚀 Starting TechPlusPOS Browser Launcher...');

// Start the server process in detached mode
const server = spawn('node', ['server/launcher.cjs'], { 
  detached: true, 
  stdio: 'ignore',
  cwd: process.cwd()
});

// Unref to allow the parent process to exit independently
server.unref();

console.log(`✅ Server started with PID: ${server.pid}`);

// Wait a moment for server to start, then open browser
setTimeout(async () => {
  console.log('🌐 Opening browser to TechPlusPOS...');
  
  try {
    await open('http://localhost:8000');
    console.log('✅ Browser opened successfully!');
    console.log('📱 TechPlusPOS is now running in your browser');
    console.log('🔄 Server will continue running in the background');
    console.log('❌ Close this window when you want to stop the server');
  } catch (error) {
    console.log('❌ Failed to open browser automatically');
    console.log('🌐 Please manually open: http://localhost:8000');
  }
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
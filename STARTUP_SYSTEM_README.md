# TechPlusPOS Startup Wrapper System

This document describes the comprehensive startup wrapper system for TechPlusPOS, providing two distinct modes of operation with robust process management, port handling, and cross-platform compatibility.

## Overview

The startup system consists of two main components:

1. **Development Mode CLI** (`start.js`) - For development and testing
2. **Packaged Desktop App** (`main.js`) - For production Electron applications

## Features

### Cross-Platform Compatibility
- ✅ Windows (Windows 10/11)
- ✅ macOS (10.15+)
- ✅ Linux (Ubuntu 18.04+, CentOS 7+)

### Process Management
- 🔧 Automatic port conflict resolution
- 🚀 Child process spawning and monitoring
- 🛑 Graceful shutdown handling
- ⚡ Force kill fallback for unresponsive processes

### Port Management
- 📡 Port availability detection
- ⏳ Timeout-based waiting for server readiness
- 🔄 Automatic retry mechanisms
- 🚫 Port conflict resolution

### Error Handling
- ❌ Comprehensive error catching
- 🔄 Automatic crash recovery
- 📝 Detailed logging and debugging
- 🛡️ Security measures for external navigation

## Mode 1: Development Mode CLI

### Usage
```bash
# Start development environment
npm run dev:start

# Or directly
node start.js
```

### Features
- **Port Conflict Resolution**: Automatically kills processes on ports 8000 (Vite) and 8888 (proxy)
- **Server Startup**: Spawns Vite dev server and proxy server as child processes
- **Port Readiness**: Waits for both ports to be available before proceeding
- **Browser Launch**: Automatically opens default browser to frontend when ready
- **Graceful Shutdown**: Handles Ctrl+C and process termination signals
- **Error Recovery**: Exits with error if ports cannot be freed or servers fail to start

### Process Flow
1. **Port Cleanup**: Kills any existing processes on required ports
2. **Server Startup**: Spawns Vite and proxy servers
3. **Readiness Check**: Waits for both ports to be available
4. **Browser Launch**: Opens default browser to frontend
5. **Monitoring**: Continuously monitors child processes
6. **Shutdown**: Graceful cleanup on exit

### Cross-Platform Port Killing
- **Windows**: Uses `netstat` and `taskkill` commands
- **Unix-like**: Uses `lsof` and `kill` commands
- **Error Handling**: Gracefully handles missing processes

## Mode 2: Packaged Desktop App (Electron)

### Usage
```bash
# Start Electron app
npm run electron:start

# Or directly
electron .
```

### Features
- **Embedded Servers**: Backend and frontend servers run as child processes
- **UI Window Management**: BrowserWindow only shows after servers are ready
- **Process Lifecycle**: Manages child processes throughout app lifecycle
- **Clean Shutdown**: Proper cleanup on app quit or crash
- **IPC Communication**: Secure communication between main and renderer processes
- **Security Measures**: Prevents external navigation and new window creation

### Process Flow
1. **App Initialization**: Electron app starts
2. **Server Startup**: Spawns Vite and proxy servers as child processes
3. **Port Readiness**: Waits for both ports to be available
4. **Window Creation**: Creates BrowserWindow only after servers are ready
5. **UI Display**: Shows window and loads frontend
6. **Monitoring**: Continuously monitors child processes and app state
7. **Shutdown**: Graceful cleanup on app quit

### Security Features
- **Context Isolation**: Prevents direct Node.js access from renderer
- **Navigation Control**: Blocks external URL navigation
- **Window Control**: Prevents unauthorized window creation
- **Process Isolation**: Secure child process management

## File Structure

```
TechPlusPOS/
├── start.js                    # Development mode startup script
├── main.js                     # Electron main process entrypoint
├── proxy-backup.js            # Proxy server for backup functionality
├── vite.config.ts             # Vite configuration
├── package.json               # Project dependencies and scripts
├── server/                    # Server-side files
│   ├── launcher.cjs          # Production server launcher
│   ├── proxy.cjs             # Production proxy server
│   └── proxy.mjs             # ESM proxy server
├── src/                       # Frontend source code
│   ├── components/           # React components
│   ├── pages/               # Page components
│   ├── services/            # Business logic services
│   └── ...
├── dist/                     # Built frontend assets
├── public/                   # Static assets
└── assets/                   # App assets (icons, etc.)
```

## Configuration

### Port Configuration
Both modes use the same port configuration:
- **Vite Dev Server**: Port 8000
- **Proxy Server**: Port 8888
- **Timeout**: 30 seconds for port readiness
- **Check Interval**: 1 second between port checks

### Environment Variables
```bash
# Optional: Override default ports
VITE_PORT=8000
PROXY_PORT=8888

# Optional: Override allowed origins for CORS
ALLOWED_ORIGIN=http://localhost:8000
```

## Scripts

### Development Scripts
```json
{
  "dev:start": "node start.js",           # Development mode with process management
  "dev": "concurrently --kill-others \"vite --port 8000\" \"node proxy-backup.js\"",
  "dev:simple": "vite --port 8000",       # Simple Vite only
  "dev:separate": "start vite --port 8000 && start node proxy-backup.js"
}
```

### Production Scripts
```json
{
  "electron:start": "electron .",         # Start Electron app
  "build": "vite build",                  # Build frontend assets
  "build:exe": "npm run build && pkg server/launcher.cjs --targets node18-win-x64 --output TechPlusPOS.exe"
}
```

## Error Handling

### Development Mode
- **Port Conflicts**: Automatic resolution with process killing
- **Server Failures**: Detailed error messages and graceful exit
- **Browser Launch Failures**: Fallback to manual URL display
- **Process Crashes**: Automatic cleanup and exit

### Electron Mode
- **Server Failures**: Error dialogs and app restart
- **Window Failures**: Automatic window recreation
- **Process Crashes**: Graceful shutdown and cleanup
- **GPU Crashes**: Automatic app relaunch

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Manual port killing (Windows)
netstat -ano | findstr :8000
taskkill /F /PID <PID>

# Manual port killing (Unix)
lsof -ti:8000
kill -9 <PID>
```

#### Electron App Won't Start
1. Check if ports 8000 and 8888 are available
2. Verify all dependencies are installed
3. Check console for detailed error messages
4. Try running in development mode first

#### Development Mode Issues
1. Ensure Node.js and npm are properly installed
2. Check if required ports are blocked by firewall
3. Verify all dependencies are installed
4. Check console output for specific error messages

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm run dev:start

# Electron with developer tools
npm run electron:start -- --dev-tools
```

## Security Considerations

### Development Mode
- ✅ Process isolation
- ✅ Port conflict resolution
- ✅ Graceful error handling
- ✅ Cross-platform compatibility

### Electron Mode
- ✅ Context isolation enabled
- ✅ Navigation restrictions
- ✅ Window creation control
- ✅ Secure IPC communication
- ✅ Process lifecycle management

## Performance Optimization

### Development Mode
- **Parallel Startup**: Vite and proxy servers start simultaneously
- **Port Checking**: Efficient port availability detection
- **Process Monitoring**: Lightweight process monitoring

### Electron Mode
- **Lazy Loading**: Window only shows after servers are ready
- **Resource Management**: Proper cleanup of child processes
- **Memory Management**: Efficient process lifecycle management

## Future Enhancements

### Planned Features
- 🔄 Hot reload for configuration changes
- 📊 Process monitoring dashboard
- 🔧 Configuration file support
- 🌐 Network interface detection
- 📱 Mobile device support
- 🔒 Enhanced security features

### Potential Improvements
- **Auto-update system**: Automatic app updates
- **Crash reporting**: Detailed crash analytics
- **Performance monitoring**: Real-time performance metrics
- **Plugin system**: Extensible architecture
- **Multi-instance support**: Multiple app instances

## Support

For issues and questions:
1. Check the console output for detailed error messages
2. Verify all dependencies are properly installed
3. Ensure required ports are not blocked
4. Test in development mode before production
5. Review the troubleshooting section above

## License

This startup system is part of the TechPlusPOS application and follows the same licensing terms. 
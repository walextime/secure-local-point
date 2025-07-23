# TechPlusPOS Background Launcher

## Overview

This guide explains how to use the TechPlusPOS background launcher that runs the development servers in the background and automatically opens the web browser. The command prompt windows are minimized, providing a cleaner user experience.

## Available Launchers

### 1. Background Launcher (Recommended)
- **File**: `start-dev-background.bat`
- **Features**: Runs servers in background, auto-opens browser
- **Usage**: Double-click to launch

### 2. PowerShell Background Launcher
- **File**: `start-dev-background.ps1`
- **Features**: Advanced process management, server readiness detection
- **Usage**: Right-click → "Run with PowerShell"

### 3. Quick Launch
- **File**: `TechPlusPOS-Quick-Launch.bat`
- **Features**: Minimal launcher for desktop shortcuts
- **Usage**: Create desktop shortcut for one-click launch

### 4. Enhanced Simple Launcher
- **File**: `TechPlusPOS-Launcher-Simple.bat`
- **Features**: Full launcher with background servers
- **Usage**: Double-click to launch

## How It Works

### Background Process Management
1. **Port Clearing**: Kills any existing processes on ports 8000 and 8888
2. **Server Launch**: Starts Vite and proxy servers in minimized windows
3. **Browser Opening**: Automatically opens browser to `http://localhost:8000`
4. **Clean Exit**: Launcher exits after starting servers

### Server Configuration
- **Vite Server**: Runs on `http://localhost:8000` (React development server)
- **Proxy Server**: Runs on `http://localhost:8888` (Backup and API proxy)
- **Browser**: Opens automatically to the Vite server

## Usage Instructions

### Method 1: Background Launcher (Easiest)
```bash
# Double-click the file
start-dev-background.bat
```

### Method 2: PowerShell Launcher (Advanced)
```bash
# Right-click and "Run with PowerShell"
start-dev-background.ps1

# Or from command line
powershell -ExecutionPolicy Bypass -File start-dev-background.ps1
```

### Method 3: Quick Launch
```bash
# Double-click for quick start
TechPlusPOS-Quick-Launch.bat
```

### Method 4: Enhanced Simple Launcher
```bash
# Double-click for full launcher experience
TechPlusPOS-Launcher-Simple.bat
```

## Features

### ✅ Background Operation
- Servers run in minimized command windows
- No visible command prompts cluttering the desktop
- Clean user experience

### ✅ Automatic Browser Opening
- Browser opens automatically to `http://localhost:8000`
- Multiple fallback methods for browser opening
- Works with default browser

### ✅ Port Management
- Automatically clears ports 8000 and 8888
- Prevents port conflicts
- Graceful process termination

### ✅ Error Handling
- Checks for Node.js and npm installation
- Validates required files exist
- Provides clear error messages

### ✅ Process Monitoring (PowerShell)
- Waits for servers to be ready
- Tests server connectivity
- Provides detailed status updates

## File Structure

```
TechPlusPOS/
├── start-dev-background.bat      # Main background launcher
├── start-dev-background.ps1      # PowerShell background launcher
├── TechPlusPOS-Quick-Launch.bat  # Quick launch script
├── TechPlusPOS-Launcher-Simple.bat # Enhanced simple launcher
├── start-dev.bat                 # Original launcher (visible windows)
├── proxy-backup.js               # Proxy server
└── package.json                  # Project configuration
```

## Comparison of Launchers

| Feature | Background | PowerShell | Quick Launch | Simple |
|---------|------------|------------|--------------|---------|
| Background Servers | ✅ | ✅ | ✅ | ✅ |
| Auto Browser | ✅ | ✅ | ✅ | ✅ |
| Error Checking | ✅ | ✅ | ❌ | ✅ |
| Server Monitoring | ❌ | ✅ | ❌ | ❌ |
| Progress Display | ✅ | ✅ | ❌ | ✅ |
| Desktop Shortcut | ✅ | ❌ | ✅ | ✅ |

## Troubleshooting

### Issue: "Node.js not found"
**Solution**:
```bash
# Install Node.js from https://nodejs.org/
# Ensure it's added to PATH
```

### Issue: "Port already in use"
**Solution**:
- The launcher automatically clears ports
- If persistent, restart your computer
- Check for other applications using ports 8000/8888

### Issue: "Browser doesn't open"
**Solution**:
1. **Manual browser opening**:
   ```bash
   start http://localhost:8000
   ```

2. **Check server status**:
   - Open Task Manager
   - Look for "node" and "npx" processes
   - Verify they're running

3. **Alternative browser opening**:
   ```bash
   # Using PowerShell
   powershell -Command "Start-Process 'http://localhost:8000'"
   
   # Using explorer
   explorer "http://localhost:8000"
   ```

### Issue: "Servers not starting"
**Solution**:
1. **Check dependencies**:
   ```bash
   npm install
   ```

2. **Check file existence**:
   - Ensure `proxy-backup.js` exists
   - Ensure `package.json` exists

3. **Manual server start**:
   ```bash
   # Terminal 1
   npx vite --port 8000
   
   # Terminal 2
   node proxy-backup.js
   ```

### Issue: "Can't stop servers"
**Solution**:
1. **Using Task Manager**:
   - Press `Ctrl+Shift+Esc`
   - Find "node" and "npx" processes
   - End them

2. **Using PowerShell**:
   ```bash
   Stop-Process -Name "node","npx" -Force
   ```

3. **Using Command Line**:
   ```bash
   taskkill /F /IM node.exe
   taskkill /F /IM npx.cmd
   ```

## Advanced Usage

### Custom Browser
```bash
# Set default browser before launching
# Windows will use the default browser
```

### Custom Ports
```bash
# Edit the launcher files to change ports
# Default: Vite=8000, Proxy=8888
```

### Silent Mode (PowerShell)
```bash
# Run without user interaction
powershell -ExecutionPolicy Bypass -File start-dev-background.ps1 -Silent
```

### Desktop Shortcut
1. **Right-click** on `TechPlusPOS-Quick-Launch.bat`
2. **Send to** → **Desktop (create shortcut)**
3. **Double-click** the shortcut to launch

## Security Notes

- ✅ **Local Only**: Servers run on localhost only
- ✅ **No External Access**: No network exposure
- ✅ **Process Isolation**: Each server runs in separate process
- ✅ **Graceful Shutdown**: Proper cleanup on exit

## Performance Impact

- **Memory**: ~50-100MB per server process
- **CPU**: Minimal when idle
- **Startup Time**: 5-10 seconds for servers
- **Browser**: Uses default browser settings

## Best Practices

### For Development
1. **Use PowerShell launcher** for detailed feedback
2. **Monitor Task Manager** for process status
3. **Check browser console** for errors

### For Production
1. **Use Quick Launch** for simple deployment
2. **Create desktop shortcuts** for easy access
3. **Set up auto-start** if needed

### For Troubleshooting
1. **Use Task Manager** to monitor processes
2. **Check command windows** if servers don't start
3. **Restart launcher** if issues persist

---

**Status**: ✅ Complete and fully functional
**Last Updated**: 2025-01-20
**Tested**: Windows 10/11 
# TechPlusPOS Electron Desktop Application

## Overview

This setup creates a desktop application using Electron that runs the TechPlusPOS React app with a hidden background server. The application can be packaged as a Windows .exe installer with the favicon.ico as the application icon.

## Architecture

### Components
- **electron.js**: Main Electron process that spawns background server and creates desktop window
- **preload.js**: Safe IPC bridge between renderer and main processes
- **server/launcher.cjs**: Background server that runs silently
- **React App**: Frontend application loaded in Electron window

### Key Features
- ✅ **Hidden Background Server**: Server runs in detached mode, invisible to user
- ✅ **Desktop Window**: React app loads in native desktop window
- ✅ **Professional Icon**: Uses favicon.ico as application icon
- ✅ **Cross-Platform**: Supports Windows, macOS, and Linux
- ✅ **Secure**: Context isolation enabled, nodeIntegration disabled
- ✅ **Packaged**: Creates distributable .exe installer

## File Structure

```
TechPlusPOS/
├── electron.js              # Main Electron process
├── preload.js               # Safe IPC bridge
├── server/launcher.cjs      # Background server
├── src/                     # React application
├── public/favicon.ico       # Application icon
├── dist/                    # Built React app
└── package.json             # Configuration
```

## Development Workflow

### Prerequisites
```bash
# Install dependencies
npm install

# Install Electron dependencies
npm install electron electron-is-dev electron-builder wait-on --save-dev
```

### Development Commands

#### Start React Development Server
```bash
# Start React dev server only
npm run dev:simple

# Start with proxy server
npm run dev
```

#### Start Electron Development
```bash
# Start Electron with React dev server
npm run electron:dev

# Start Electron only (requires dev server running)
npm run electron
```

#### Build and Package
```bash
# Build React app
npm run build

# Package for development
npm run electron:pack

# Create distributable
npm run electron:dist

# Platform-specific builds
npm run electron:dist:win    # Windows .exe
npm run electron:dist:mac    # macOS .dmg
npm run electron:dist:linux  # Linux AppImage
```

## Configuration

### package.json Scripts
- **`electron`**: Start Electron app
- **`electron:dev`**: Start Electron with React dev server
- **`electron:build`**: Build React app and Electron
- **`electron:pack`**: Package for development
- **`electron:dist`**: Create distributable installer

### electron-builder Configuration
```json
{
  "build": {
    "appId": "com.techplus.pos",
    "productName": "TechPlusPOS",
    "icon": "public/favicon.ico",
    "win": {
      "target": "nsis",
      "icon": "public/favicon.ico"
    }
  }
}
```

## Security Features

### Context Isolation
- **Enabled**: Prevents direct access to Node.js APIs
- **Preload Script**: Safe IPC bridge for communication
- **Whitelisted Channels**: Only approved IPC channels allowed

### Node Integration
- **Disabled**: Renderer process cannot access Node.js
- **Safe File Operations**: Through preload script only
- **Controlled Permissions**: Limited system access

### External Links
- **Blocked**: External URLs are prevented
- **Localhost Only**: Only localhost URLs allowed
- **Window Controls**: Prevented new window creation

## Background Server

### Features
- **Detached Mode**: Runs independently of Electron
- **Silent Operation**: No visible console windows
- **Auto-Start**: Launches when Electron starts
- **Auto-Stop**: Terminates when Electron quits

### Configuration
```javascript
// Spawn server in detached mode
serverProcess = spawn('node', ['server/launcher.cjs'], {
  detached: true,
  stdio: 'ignore',
  cwd: process.cwd()
});
```

## Desktop Window

### Features
- **Native Window**: Looks and feels like desktop app
- **Responsive**: Adapts to window resizing
- **Menu Bar**: Standard application menu
- **Developer Tools**: Available in development

### Configuration
```javascript
mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  icon: path.join(__dirname, 'public/favicon.ico'),
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js')
  }
});
```

## IPC Communication

### Safe API
```javascript
// Exposed to renderer process
window.electronAPI = {
  getVersion: () => ipcRenderer.invoke('get-version'),
  getAppName: () => ipcRenderer.invoke('get-app-name'),
  reload: () => ipcRenderer.invoke('reload'),
  // ... more methods
};
```

### Usage in React
```javascript
// In React components
const version = await window.electronAPI.getVersion();
const appName = await window.electronAPI.getAppName();
```

## Packaging

### Windows (.exe)
```bash
npm run electron:dist:win
```
- Creates NSIS installer
- Includes favicon.ico as icon
- Desktop and Start Menu shortcuts
- Customizable installation directory

### macOS (.dmg)
```bash
npm run electron:dist:mac
```
- Creates DMG installer
- App Store compatible
- Native macOS experience

### Linux (AppImage)
```bash
npm run electron:dist:linux
```
- Creates AppImage
- Portable executable
- No installation required

## Distribution

### Windows
- **File**: `TechPlusPOS Setup.exe`
- **Size**: ~100-200MB
- **Installation**: Standard Windows installer
- **Icon**: favicon.ico

### Features
- ✅ **Professional Installer**: NSIS-based
- ✅ **Desktop Shortcut**: Automatic creation
- ✅ **Start Menu**: Application entry
- ✅ **Uninstall**: Standard Windows uninstall
- ✅ **Updates**: Support for auto-updates

## Troubleshooting

### Common Issues

#### "Electron not found"
```bash
# Install Electron
npm install electron --save-dev
```

#### "Background server not starting"
```bash
# Check server file exists
ls server/launcher.cjs

# Test server manually
node server/launcher.cjs
```

#### "App not loading"
```bash
# Check React build
npm run build

# Check dev server
npm run dev:simple
```

#### "Icon not showing"
```bash
# Verify icon file exists
ls public/favicon.ico

# Rebuild with icon
npm run electron:dist:win
```

### Development Tips

#### Debug Mode
```bash
# Start with DevTools
npm run electron:dev
```

#### Logging
```javascript
// In electron.js
console.log('Server PID:', serverProcess.pid);

// In preload.js
window.electronAPI.log('info', 'App started');
```

#### Hot Reload
```bash
# Development with hot reload
npm run electron:dev
```

## Best Practices

### Security
1. **Always use contextIsolation**: Prevents direct Node.js access
2. **Whitelist IPC channels**: Only allow necessary communication
3. **Validate file paths**: Prevent directory traversal attacks
4. **Block external URLs**: Prevent unwanted navigation

### Performance
1. **Lazy load components**: Reduce initial bundle size
2. **Optimize images**: Use appropriate formats and sizes
3. **Minimize dependencies**: Only include necessary packages
4. **Use production builds**: Optimize for distribution

### User Experience
1. **Show loading screen**: Prevent visual flash
2. **Handle errors gracefully**: Provide user feedback
3. **Save window state**: Remember user preferences
4. **Provide keyboard shortcuts**: Standard desktop shortcuts

## Advanced Configuration

### Custom Menu
```javascript
// In electron.js
const template = [
  {
    label: 'File',
    submenu: [
      { label: 'Reload', accelerator: 'CmdOrCtrl+R' },
      { label: 'Quit', accelerator: 'CmdOrCtrl+Q' }
    ]
  }
];
```

### Window State
```javascript
// Save window state
mainWindow.on('close', () => {
  // Save window bounds
  const bounds = mainWindow.getBounds();
  // Save to settings
});
```

### Auto-Updates
```javascript
// In main process
const { autoUpdater } = require('electron-updater');
autoUpdater.checkForUpdatesAndNotify();
```

---

**Status**: ✅ Complete and fully functional
**Last Updated**: 2025-01-20
**Tested**: Windows 10/11
**Icon**: favicon.ico 
# Tech Plus POS - Local Web App

This document explains how to convert the Electron POS app to a local web application that runs in your browser with a Windows .exe launcher.

## 🎯 Overview

The local web app version provides the same functionality as the Electron app but runs in your default browser:

- ✅ **Offline Operation**: Works completely offline using IndexedDB
- ✅ **Single Executable**: Double-click POS.exe to launch
- ✅ **Browser Integration**: Opens automatically in your default browser
- ✅ **Local Server**: Express server serves the React app locally
- ✅ **No Internet Required**: All functionality works offline

## 🚀 Quick Start

### Option 1: Use Pre-built Executable
1. Download `POS.exe`
2. Double-click to launch
3. Browser opens automatically at `http://localhost:3000`
4. Start using the Tech Plus POS!

### Option 2: Build from Source
1. Clone the repository
2. Run `build-exe.bat` (Windows) or follow manual steps below
3. Get your own `POS.exe` file

## 🛠️ Manual Build Process

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Windows 10/11 (for .exe creation)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build React App
```bash
npm run build
```

### Step 3: Create Executable
```bash
npm run build:exe
```

### Step 4: Test the App
```bash
# Test the server directly
npm start

# Or test the launcher
npm run start:launcher
```

## 📁 Project Structure

```
pos-system/
├── src/                    # React source code
├── dist/                   # Built React app (generated)
├── server/
│   ├── index.js           # Express server
│   └── launcher.js        # Main launcher (compiled to .exe)
├── public/                # Static assets
├── package.json           # Dependencies and scripts
├── build-exe.bat          # Windows build script
└── POS.exe               # Final executable (generated)
```

## 🔧 Configuration

### Port Configuration
The app runs on port 3000 by default. To change it:

1. Set environment variable: `PORT=8080`
2. Or modify `server/launcher.js` line 8

### Browser Configuration
The app automatically opens your default browser. To disable:
- Comment out the `openBrowser()` call in `server/launcher.js`

## 🎮 Usage

### Starting the App
1. **Double-click** `POS.exe`
2. **Wait** for the server to start (1-2 seconds)
3. **Browser opens** automatically to `http://localhost:3000`
4. **Start using** the Tech Plus POS

### Stopping the App
- **Close the browser tab** (server continues running)
- **Close the terminal window** (if visible)
- **Use Ctrl+C** in terminal to stop server
- **Right-click tray icon** → Exit (if tray is available)

### Offline Operation
- All data is stored in **IndexedDB** (browser database)
- No internet connection required for daily operations
- Backup features work when online
- App functions exactly like the Electron version

## 🔍 Troubleshooting

### Common Issues

1. **"Port already in use"**
   ```bash
   # Kill process on port 3000
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. **"Dist folder not found"**
   ```bash
   # Build the React app first
   npm run build
   ```

3. **"Browser doesn't open"**
   - Check if your default browser is set correctly
   - Try opening `http://localhost:3000` manually
   - Check Windows firewall settings

4. **"App doesn't work offline"**
   - Ensure you've visited the app at least once online
   - Check browser's IndexedDB storage
   - Clear browser cache and try again

### Debug Mode
Run the server in debug mode:
```bash
npm run start:launcher
```
This shows detailed logs and doesn't auto-open browser.

### Manual Server Start
```bash
# Start server only
npm start

# Open browser manually to http://localhost:3000
```

## 📦 Distribution

### Creating Distribution Package
1. Run the build process
2. Copy `POS.exe` to target machine
3. No additional files needed (everything is embedded)

### File Size
- **POS.exe**: ~50-100MB (includes Node.js runtime)
- **No dependencies**: Everything is bundled
- **Single file**: Easy to distribute

### Cross-Platform
While the .exe is Windows-specific, you can build for other platforms:
```bash
# Build for all platforms
npm run build:exe:all

# Creates: POS-win.exe, POS-linux, POS-macos
```

## 🔒 Security

### Local Operation
- **No external connections** for core functionality
- **Local server only** (localhost:3000)
- **IndexedDB storage** (browser sandboxed)
- **No file system access** (unlike Electron)

### Network Access
- **Backup features** require internet (Google Drive/Email)
- **Optional connectivity** for cloud sync
- **Core POS functions** work offline

## 🆚 Comparison: Electron vs Local Web App

| Feature | Electron | Local Web App |
|---------|----------|---------------|
| **Installation** | Complex setup | Single .exe file |
| **File Size** | Large (~200MB) | Smaller (~100MB) |
| **Startup Time** | Slower | Faster |
| **Memory Usage** | Higher | Lower |
| **File System Access** | Full access | Limited |
| **Browser Integration** | None | Native browser |
| **Updates** | Manual | Browser-based |
| **Security** | More permissions | Sandboxed |

## 🚀 Advanced Features

### Custom Port
```bash
# Set custom port
set PORT=8080
POS.exe
```

### Development Mode
```bash
# Run in development mode
npm run dev
# Then in another terminal
npm start
```

### Production Build
```bash
# Optimized production build
npm run build
npm run package
```

## 📝 Notes

- **First Run**: May take longer as it extracts embedded files
- **Antivirus**: Some antivirus software may flag the .exe initially
- **Firewall**: Windows may ask for network permissions
- **Browser**: Works best with Chrome, Firefox, Edge
- **Data**: All data is stored in browser's IndexedDB
- **Backup**: Use the backup features to export data regularly

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run in debug mode: `npm run start:launcher`
3. Check browser console for errors
4. Verify all prerequisites are installed
5. Try clearing browser cache and IndexedDB

The local web app provides the same robust POS functionality as the Electron version while being easier to distribute and use! 
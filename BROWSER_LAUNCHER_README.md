# 🌐 TechPlusPOS Browser Launcher

A lightweight executable that starts the TechPlusPOS server and automatically opens your default web browser to the application.

## 🚀 Features

- **✅ Single Executable**: No installation required
- **✅ Automatic Server Start**: Background server runs silently
- **✅ Browser Auto-Open**: Automatically opens default browser
- **✅ Cross-Platform**: Works on Windows, macOS, and Linux
- **✅ Lightweight**: Much smaller than Electron app
- **✅ Simple**: Just double-click to run

## 📁 Files

- **`TechPlusPOS-Browser.exe`** (36MB) - Windows executable
- **`launcher.js`** - Source code for the launcher
- **`package.json`** - Contains build script

## 🛠️ How It Works

1. **Server Launch**: Starts the Node.js server in background
2. **Browser Open**: Waits 3 seconds, then opens default browser
3. **Background Process**: Server continues running silently
4. **User Experience**: User sees only the browser window

## 🎯 Usage

### Windows
```bash
# Double-click the executable
TechPlusPOS-Browser.exe

# Or run from command line
.\TechPlusPOS-Browser.exe
```

### Build New Executable
```bash
# Build for Windows
npm run pkg-browser

# Build for multiple platforms
pkg launcher.js --targets node18-win-x64,node18-linux-x64,node18-macos-x64 --output TechPlusPOS-Browser
```

## 🔧 Technical Details

### Launcher Script (`launcher.js`)
```javascript
const { spawn } = require('child_process');
const open = require('open');

// Start server in background
const server = spawn('node', ['server/launcher.cjs'], { 
  detached: true, 
  stdio: 'ignore'
});

// Open browser after 3 seconds
setTimeout(() => {
  open('http://localhost:8000');
}, 3000);
```

### Package Configuration
```json
{
  "scripts": {
    "pkg-browser": "pkg launcher.js --targets node18-win-x64 --output TechPlusPOS-Browser.exe"
  }
}
```

## 📊 Comparison

| Feature | Browser Launcher | Electron App |
|---------|------------------|--------------|
| **Size** | 36MB | 106MB |
| **Startup** | Fast | Slower |
| **Memory** | Low | Higher |
| **UI** | Browser-based | Native desktop |
| **Distribution** | Single .exe | Installer |
| **Dependencies** | None | None |

## 🎯 Advantages

### ✅ Browser Launcher
- **Lightweight**: Much smaller file size
- **Familiar**: Uses existing browser
- **Fast**: Quick startup time
- **Simple**: No installation needed
- **Flexible**: Works with any browser

### ✅ Electron App
- **Native**: Desktop application feel
- **Integrated**: All-in-one experience
- **Offline**: Can work without internet
- **Professional**: Looks like native app

## 🚀 Distribution

### For End Users
1. **Download**: `TechPlusPOS-Browser.exe`
2. **Run**: Double-click to start
3. **Use**: Browser opens automatically
4. **Close**: Close browser when done

### For Developers
```bash
# Build new executable
npm run pkg-browser

# Test locally
node launcher.js

# Build for multiple platforms
pkg launcher.js --targets node18-win-x64,node18-linux-x64,node18-macos-x64
```

## 🔍 Troubleshooting

### Common Issues

1. **Browser doesn't open**
   - Check if port 8000 is available
   - Try manually opening `http://localhost:8000`

2. **Server fails to start**
   - Ensure Node.js is installed
   - Check if port 8000 is in use

3. **Executable doesn't run**
   - Check Windows Defender settings
   - Run as administrator if needed

### Debug Mode
```bash
# Run with verbose output
node launcher.js
```

## 📋 Requirements

- **Windows**: Windows 7 or later
- **Node.js**: Not required (bundled in executable)
- **Browser**: Any modern web browser
- **Port**: 8000 must be available

## 🎯 Use Cases

### Perfect For:
- **Quick Testing**: Fast startup for development
- **Lightweight Distribution**: Smaller file size
- **Browser Users**: Users prefer browser interface
- **Simple Deployment**: No installation required

### Consider Electron For:
- **Professional Look**: Native desktop appearance
- **Offline Features**: Advanced offline capabilities
- **Integrated Experience**: All-in-one application
- **Advanced Features**: Native system integration

## 🔄 Updates

To update the browser launcher:

1. **Modify**: Edit `launcher.js` if needed
2. **Rebuild**: Run `npm run pkg-browser`
3. **Distribute**: Share new `TechPlusPOS-Browser.exe`

## 📞 Support

If you encounter issues:

1. **Check Console**: Look for error messages
2. **Test Server**: Try `node server/launcher.cjs`
3. **Check Port**: Ensure port 8000 is free
4. **Browser**: Try opening `http://localhost:8000` manually

---

**🎉 The Browser Launcher provides a lightweight, fast alternative to the Electron app for users who prefer browser-based interfaces!** 
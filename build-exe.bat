@echo off
echo ========================================
echo    Tech Plus POS - Build & Package
echo ========================================
echo.

echo [1/5] Checking prerequisites...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)
echo ✅ Node.js found

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install npm first.
    pause
    exit /b 1
)
echo ✅ npm found

npx pkg --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pkg not found. Installing pkg...
    npm install -g pkg
    if %errorlevel% neq 0 (
        echo ❌ Failed to install pkg
        pause
        exit /b 1
    )
)
echo ✅ pkg found
echo.

echo [2/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

echo [3/5] Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build React app
    pause
    exit /b 1
)
echo ✅ React app built
echo.

echo [4/5] Creating executable...
if exist TechPlusPOS.exe (
    echo Removing old executable...
    del TechPlusPOS.exe
)

call npm run build:exe
if %errorlevel% neq 0 (
    echo ❌ Failed to create executable
    pause
    exit /b 1
)

if not exist TechPlusPOS.exe (
    echo ❌ Executable not created
    pause
    exit /b 1
)
echo ✅ Executable created: TechPlusPOS.exe
echo.

echo [5/5] Finalizing...
echo Creating distribution folder...
if not exist dist-package (
    mkdir dist-package
)

echo Copying files to distribution folder...
copy TechPlusPOS.exe dist-package\
copy README.md dist-package\ 2>nul
copy LICENSE dist-package\ 2>nul

echo Creating run script...
echo @echo off > dist-package\run.bat
echo echo Starting Tech Plus POS... >> dist-package\run.bat
echo TechPlusPOS.exe >> dist-package\run.bat
echo pause >> dist-package\run.bat

echo ✅ Finalization complete
echo.

echo ========================================
echo    🎉 Build Complete!
echo ========================================
echo.
echo 📁 Files created:
echo    - TechPlusPOS.exe (Main executable)
echo    - dist-package/ (Distribution folder)
echo.
echo 🚀 To run the app:
echo    1. Double-click TechPlusPOS.exe
echo    2. Or use: dist-package\run.bat
echo    3. Browser will open automatically
echo    4. App runs on http://techplus.pos:888
echo.
echo 📝 Features:
echo    - Automatic browser opening
echo    - Port conflict resolution
echo    - Graceful shutdown
echo    - System tray icon (if available)
echo    - Completely offline operation
echo.
echo 📦 Distribution:
echo    - Copy dist-package folder to target machine
echo    - No Node.js installation required
echo    - Self-contained executable
echo.
pause 
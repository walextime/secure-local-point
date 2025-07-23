@echo off
echo ========================================
echo    Tech Plus POS - Build with Icon
echo ========================================
echo.

echo [1/6] Checking prerequisites...
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

REM Check for resource hacker or similar tool for icon embedding
where rcedit >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  rcedit not found. Will create executable without icon embedding.
    echo    To add icon later, install rcedit: npm install -g rcedit
)
echo.

echo [2/6] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

echo [3/6] Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build React app
    pause
    exit /b 1
)
echo ✅ React app built
echo.

echo [4/6] Creating executable...
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

echo [5/6] Adding icon to executable...
REM Try to use rcedit if available
where rcedit >nul 2>&1
if %errorlevel% equ 0 (
    echo Adding favicon.ico as executable icon...
    rcedit TechPlusPOS.exe --set-icon public/favicon.ico
    if %errorlevel% equ 0 (
        echo ✅ Icon added successfully
    ) else (
        echo ⚠️  Failed to add icon with rcedit
    )
) else (
    echo ⚠️  rcedit not available. Executable created without custom icon.
    echo    To add icon later, install rcedit: npm install -g rcedit
    echo    Then run: rcedit TechPlusPOS.exe --set-icon public/favicon.ico
)
echo.

echo [6/6] Finalizing...
echo Creating distribution folder...
if not exist dist-package (
    mkdir dist-package
)

echo Copying files to distribution folder...
copy TechPlusPOS.exe dist-package\
copy public\favicon.ico dist-package\ 2>nul
copy README.md dist-package\ 2>nul
copy LICENSE dist-package\ 2>nul

echo Creating run script...
echo @echo off > dist-package\run.bat
echo echo Starting Tech Plus POS... >> dist-package\run.bat
echo TechPlusPOS.exe >> dist-package\run.bat
echo pause >> dist-package\run.bat

echo Creating icon installation script...
echo @echo off > dist-package\add-icon.bat
echo echo Installing rcedit... >> dist-package\add-icon.bat
echo npm install -g rcedit >> dist-package\add-icon.bat
echo echo Adding favicon.ico as executable icon... >> dist-package\add-icon.bat
echo rcedit TechPlusPOS.exe --set-icon favicon.ico >> dist-package\add-icon.bat
echo echo Icon added successfully! >> dist-package\add-icon.bat
echo pause >> dist-package\add-icon.bat

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
echo 🎨 To add icon to executable:
echo    1. Install rcedit: npm install -g rcedit
echo    2. Run: rcedit TechPlusPOS.exe --set-icon public/favicon.ico
echo    3. Or use: dist-package\add-icon.bat
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
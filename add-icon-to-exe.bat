@echo off
title TechPlusPOS Icon Adder
color 0A

echo.
echo ========================================
echo    TechPlusPOS Icon Adder
echo ========================================
echo.

REM Check if executable exists
echo [1/4] Checking executable...
if not exist "TechPlusPOS.exe" (
    echo ERROR: TechPlusPOS.exe not found.
    echo Please build the executable first using build-exe.bat
    echo.
    pause
    exit /b 1
)
echo ✓ TechPlusPOS.exe found

REM Check if icon file exists
echo [2/4] Checking icon file...
if not exist "public\favicon.ico" (
    echo ERROR: public\favicon.ico not found.
    echo Please ensure the favicon.ico file exists.
    echo.
    pause
    exit /b 1
)
echo ✓ favicon.ico found

REM Install rcedit if not available
echo [3/4] Installing rcedit...
rcedit --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing rcedit globally...
    npm install -g rcedit
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install rcedit.
        echo Please install Node.js and npm first.
        echo.
        pause
        exit /b 1
    )
)
echo ✓ rcedit available

REM Create backup
echo Creating backup...
if exist "TechPlusPOS.exe.backup" (
    del "TechPlusPOS.exe.backup"
)
copy "TechPlusPOS.exe" "TechPlusPOS.exe.backup"
echo ✓ Backup created: TechPlusPOS.exe.backup

REM Add icon to executable
echo [4/4] Adding icon to executable...
rcedit TechPlusPOS.exe --set-icon public/favicon.ico
if %errorlevel% neq 0 (
    echo ERROR: Failed to add icon to executable.
    echo.
    pause
    exit /b 1
)
echo ✓ Icon added successfully!

echo.
echo ========================================
echo    🎉 Icon Added Successfully!
echo ========================================
echo.
echo 📁 Files:
echo    - TechPlusPOS.exe (with favicon.ico icon)
echo    - TechPlusPOS.exe.backup (backup of original)
echo.
echo 🚀 To run:
echo    Double-click TechPlusPOS.exe
echo.
echo 🔄 To restore original:
echo    Copy TechPlusPOS.exe.backup to TechPlusPOS.exe
echo.
echo 📝 Note:
echo    The executable now has the favicon.ico as its icon
echo    in Windows Explorer and taskbar.
echo.
pause 
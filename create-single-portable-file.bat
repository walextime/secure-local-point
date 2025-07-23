@echo off
title TechPlusPOS Single Portable File Creator
color 0A

echo.
echo ========================================
echo    TechPlusPOS Single Portable File
echo ========================================
echo.

echo This script will create a single portable file that can be
echo sent to another PC and run without any dependencies.
echo.
echo The resulting file will be:
echo - Self-contained executable
echo - All dependencies bundled
echo - Works on any Windows PC
echo - No installation required
echo.
echo Press any key to continue...
pause >nul

echo.
echo [1/6] Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)
echo ✅ Node.js found

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install npm first.
    pause
    exit /b 1
)
echo ✅ npm found

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
echo [4/6] Creating portable executable...

REM Remove old executable if exists
if exist TechPlusPOS-Single.exe (
    del TechPlusPOS-Single.exe
)

REM Create portable executable
call npx pkg server/launcher.cjs --targets node18-win-x64 --output TechPlusPOS-Single.exe --public
if %errorlevel% neq 0 (
    echo ❌ Failed to create portable executable
    pause
    exit /b 1
)

if not exist TechPlusPOS-Single.exe (
    echo ❌ Portable executable not created
    pause
    exit /b 1
)
echo ✅ Portable executable created: TechPlusPOS-Single.exe

echo.
echo [5/6] Adding icon to executable...
rcedit --version >nul 2>&1
if %errorlevel% equ 0 (
    rcedit TechPlusPOS-Single.exe --set-icon public/favicon.ico
    if %errorlevel% equ 0 (
        echo ✅ Icon added successfully
    ) else (
        echo ⚠️ Failed to add icon with rcedit
    )
) else (
    echo Installing rcedit...
    npm install -g rcedit
    rcedit TechPlusPOS-Single.exe --set-icon public/favicon.ico
    if %errorlevel% equ 0 (
        echo ✅ Icon added successfully
    ) else (
        echo ⚠️ Failed to add icon
    )
)

echo.
echo [6/6] Creating distribution package...

REM Create distribution folder
if exist TechPlusPOS-Single-Package (
    rmdir /s /q TechPlusPOS-Single-Package
)
mkdir TechPlusPOS-Single-Package

REM Copy files
copy TechPlusPOS-Single.exe TechPlusPOS-Single-Package\
copy public\favicon.ico TechPlusPOS-Single-Package\ 2>nul
copy README.md TechPlusPOS-Single-Package\ 2>nul

REM Create launcher script
echo @echo off > TechPlusPOS-Single-Package\run.bat
echo title TechPlusPOS Single Portable >> TechPlusPOS-Single-Package\run.bat
echo color 0A >> TechPlusPOS-Single-Package\run.bat
echo. >> TechPlusPOS-Single-Package\run.bat
echo echo ======================================== >> TechPlusPOS-Single-Package\run.bat
echo echo    TechPlusPOS Single Portable >> TechPlusPOS-Single-Package\run.bat
echo echo ======================================== >> TechPlusPOS-Single-Package\run.bat
echo echo. >> TechPlusPOS-Single-Package\run.bat
echo echo This is a single portable file that includes: >> TechPlusPOS-Single-Package\run.bat
echo echo - All dependencies bundled >> TechPlusPOS-Single-Package\run.bat
echo echo - React app built-in >> TechPlusPOS-Single-Package\run.bat
echo echo - Server components included >> TechPlusPOS-Single-Package\run.bat
echo echo - No installation required >> TechPlusPOS-Single-Package\run.bat
echo echo - Works on any Windows PC >> TechPlusPOS-Single-Package\run.bat
echo echo. >> TechPlusPOS-Single-Package\run.bat
echo echo Starting TechPlusPOS... >> TechPlusPOS-Single-Package\run.bat
echo echo. >> TechPlusPOS-Single-Package\run.bat
echo echo Please wait while the application starts... >> TechPlusPOS-Single-Package\run.bat
echo echo. >> TechPlusPOS-Single-Package\run.bat
echo timeout /t 3 /nobreak ^>nul >> TechPlusPOS-Single-Package\run.bat
echo. >> TechPlusPOS-Single-Package\run.bat
echo TechPlusPOS-Single.exe >> TechPlusPOS-Single-Package\run.bat
echo. >> TechPlusPOS-Single-Package\run.bat
echo echo. >> TechPlusPOS-Single-Package\run.bat
echo echo Application closed. >> TechPlusPOS-Single-Package\run.bat
echo echo. >> TechPlusPOS-Single-Package\run.bat
echo pause >> TechPlusPOS-Single-Package\run.bat

REM Create README
echo # TechPlusPOS Single Portable Application > TechPlusPOS-Single-Package\README.md
echo. >> TechPlusPOS-Single-Package\README.md
echo ## Overview >> TechPlusPOS-Single-Package\README.md
echo This is a single portable file version of TechPlusPOS that can run on any Windows PC without installation. >> TechPlusPOS-Single-Package\README.md
echo. >> TechPlusPOS-Single-Package\README.md
echo ## Features >> TechPlusPOS-Single-Package\README.md
echo - No installation required >> TechPlusPOS-Single-Package\README.md
echo - Single executable file >> TechPlusPOS-Single-Package\README.md
echo - All dependencies included >> TechPlusPOS-Single-Package\README.md
echo - Works on any Windows PC >> TechPlusPOS-Single-Package\README.md
echo - Self-contained application >> TechPlusPOS-Single-Package\README.md
echo - Automatic browser opening >> TechPlusPOS-Single-Package\README.md
echo - Professional icon >> TechPlusPOS-Single-Package\README.md
echo. >> TechPlusPOS-Single-Package\README.md
echo ## Usage >> TechPlusPOS-Single-Package\README.md
echo 1. Double-click TechPlusPOS-Single.exe >> TechPlusPOS-Single-Package\README.md
echo 2. Or use run.bat for additional information >> TechPlusPOS-Single-Package\README.md
echo 3. Browser will open automatically >> TechPlusPOS-Single-Package\README.md
echo 4. Application runs on http://localhost:8000 >> TechPlusPOS-Single-Package\README.md
echo. >> TechPlusPOS-Single-Package\README.md
echo ## Distribution >> TechPlusPOS-Single-Package\README.md
echo Simply copy the TechPlusPOS-Single.exe file to any Windows PC. >> TechPlusPOS-Single-Package\README.md
echo No additional software installation required. >> TechPlusPOS-Single-Package\README.md

echo ✅ Distribution package created

echo.
echo ========================================
echo    🎉 Single Portable File Complete!
echo ========================================
echo.
echo 📁 Files created:
echo    - TechPlusPOS-Single.exe (Single portable executable)
echo    - TechPlusPOS-Single-Package/ (Distribution folder)
echo.
echo 🚀 To distribute:
echo    1. Copy TechPlusPOS-Single.exe to any Windows PC
echo    2. Double-click to run
echo    3. No installation required!
echo.
echo 📋 Features:
echo    - Single executable file
echo    - All dependencies bundled
echo    - Works on any Windows PC
echo    - No Node.js installation required
echo    - Automatic browser opening
echo    - Professional icon
echo.
echo 📦 Distribution:
echo    - TechPlusPOS-Single.exe (Main executable)
echo    - run.bat (Launcher script)
echo    - README.md (Instructions)
echo.
echo 🎯 To use on target PC:
echo    1. Copy TechPlusPOS-Single.exe to target PC
echo    2. Double-click to run
echo    3. Browser opens automatically
echo    4. Application runs on http://localhost:8000
echo.
pause 
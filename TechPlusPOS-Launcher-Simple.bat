@echo off
title TechPlusPOS Launcher
color 0A

echo.
echo ========================================
echo    TechPlusPOS Application Launcher
echo ========================================
echo.

REM Check if Node.js is installed
echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo ✓ Node.js found

REM Check if required files exist
echo [2/4] Checking required files...
if not exist "package.json" (
    echo ERROR: package.json not found.
    echo Please run this launcher from the TechPlusPOS directory.
    echo.
    pause
    exit /b 1
)
echo ✓ package.json found

if not exist "start-dev.bat" (
    echo ERROR: start-dev.bat not found.
    echo Please run this launcher from the TechPlusPOS directory.
    echo.
    pause
    exit /b 1
)
echo ✓ start-dev.bat found

REM Kill any existing processes on ports 8000 and 8888
echo [3/4] Clearing ports 8000 and 8888...
for %%P in (8000 8888) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P') do (
        echo Killing process on port %%P with PID %%a
        taskkill /PID %%a /F >nul 2>&1
    )
)
echo ✓ Ports cleared

REM Start the development servers
echo [4/4] Starting TechPlusPOS application...
echo.
echo Starting development servers in background...
echo Vite server will be available at: http://localhost:8000
echo Proxy server will be available at: http://localhost:8888
echo.
echo Please wait while the servers start...
echo.

REM Start servers in background
start /min "Vite Dev Server" cmd /c "npx vite --port 8000"
start /min "Proxy Server" cmd /c "node proxy-backup.js"

REM Wait for servers to start
timeout /t 5 /nobreak >nul

REM Open browser automatically
echo Opening browser automatically...
start "" "http://localhost:8000" 2>nul
if %errorlevel% neq 0 (
    echo Trying alternative browser opening method...
    powershell -Command "Start-Process 'http://localhost:8000'" 2>nul
    if %errorlevel% neq 0 (
        echo Trying explorer method...
        explorer "http://localhost:8000" 2>nul
    )
)

echo.
echo ========================================
echo    TechPlusPOS is now running!
echo ========================================
echo.
echo The application should open in your browser automatically.
echo If not, please visit: http://localhost:8000
echo.
echo To stop the servers, close the command windows that opened.
echo.
pause 
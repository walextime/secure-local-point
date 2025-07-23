@echo off
title TechPlusPOS Quick Launch
color 0A

echo.
echo ========================================
echo    TechPlusPOS Quick Launch
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found.
    echo Please run this from the TechPlusPOS directory.
    echo.
    pause
    exit /b 1
)

REM Kill any existing processes on ports 8000 and 8888
echo Clearing ports...
for %%P in (8000 8888) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P') do (
        taskkill /PID %%a /F >nul 2>&1
    )
)

REM Start servers in background
echo Starting servers in background...
start /min "Vite Server" cmd /c "npx vite --port 8000"
start /min "Proxy Server" cmd /c "node proxy-backup.js"

REM Wait for servers to start
echo Waiting for servers to start...
timeout /t 8 /nobreak >nul

REM Open browser
echo Opening browser...
start http://localhost:8000

echo.
echo ========================================
echo    🎉 TechPlusPOS is running!
echo ========================================
echo.
echo 🌐 Browser should open automatically
echo 📁 Servers running in background
echo.
echo ⚠️  To stop: Use Task Manager
echo.
timeout /t 2 /nobreak >nul
exit 
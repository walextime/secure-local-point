@echo off
title TechPlusPOS Background Launcher
color 0A

echo.
echo ========================================
echo    TechPlusPOS Background Launcher
echo ========================================
echo.

REM Kill any process using ports 8000 or 8888
echo [1/4] Clearing ports...
for %%P in (8000 8888) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P') do (
    echo Killing process on port %%P with PID %%a
    taskkill /PID %%a /F >nul 2>&1
  )
)
echo ✓ Ports cleared
echo.

REM Start Vite development server in background
echo [2/4] Starting Vite development server...
start /min "Vite Dev Server" cmd /c "npx vite --port 8000"
if %errorlevel% neq 0 (
    echo ❌ Failed to start Vite server
    pause
    exit /b 1
)
echo ✓ Vite server started in background
echo.

REM Start proxy server in background
echo [3/4] Starting proxy server...
start /min "Proxy Server" cmd /c "node proxy-backup.js"
if %errorlevel% neq 0 (
    echo ❌ Failed to start proxy server
    pause
    exit /b 1
)
echo ✓ Proxy server started in background
echo.

REM Wait for servers to start
echo [4/4] Waiting for servers to start...
echo Please wait while the servers initialize...
timeout /t 5 /nobreak >nul

REM Open browser automatically
echo Opening browser...
start http://localhost:8000

echo.
echo ========================================
echo    🎉 TechPlusPOS is now running!
echo ========================================
echo.
echo 📁 Servers running in background:
echo    - Vite server: http://localhost:8000
echo    - Proxy server: http://localhost:8888
echo.
echo 🌐 Browser should open automatically
echo If not, please visit: http://localhost:8000
echo.
echo 📋 To stop the servers:
echo    1. Open Task Manager (Ctrl+Shift+Esc)
echo    2. End processes named "Vite Dev Server" and "Proxy Server"
echo    3. Or close this window and restart
echo.
echo ⚠️  Note: Servers are running in background
echo    Command windows are minimized
echo.
timeout /t 3 /nobreak >nul
exit 
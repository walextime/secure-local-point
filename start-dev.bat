@echo off
REM Kill any process using ports 8000 or 8888
for %%P in (8000 8888) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P') do (
    echo Killing process on port %%P with PID %%a
    taskkill /PID %%a /F >nul 2>&1
  )
)
echo Starting development servers...
echo.
echo Starting Vite development server on port 8000...
start "Vite Dev Server" cmd /k "npx vite --port 8000"
echo.
echo Starting proxy server on port 8888...
start "Proxy Server" cmd /k "node proxy-backup.js"
echo.
echo Both servers are starting...
echo Vite server: http://localhost:8000
echo Proxy server: http://localhost:8888
echo.
echo Press any key to close this window...
pause >nul 
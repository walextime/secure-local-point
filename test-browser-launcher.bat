@echo off
echo 🌐 Testing TechPlusPOS Browser Launcher...
echo.

echo 📋 Checking if executable exists...
if exist "TechPlusPOS-Browser.exe" (
    echo ✅ TechPlusPOS-Browser.exe found
) else (
    echo ❌ TechPlusPOS-Browser.exe not found
    echo 📦 Building executable...
    npm run pkg-browser
)

echo.
echo 🚀 Starting TechPlusPOS Browser Launcher...
echo 📱 This will start the server and open your browser
echo ⏳ Please wait for the browser to open...
echo.

TechPlusPOS-Browser.exe

echo.
echo ✅ Browser launcher completed
echo 🌐 TechPlusPOS should now be running in your browser
echo 📍 URL: http://localhost:8000
echo.
pause 
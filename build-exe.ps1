# Tech Plus POS - Build & Package Script (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Tech Plus POS - Build & Package" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Node.js found" -ForegroundColor Green

# Check npm
if (-not (Test-Command "npm")) {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ npm found" -ForegroundColor Green

# Check pkg
try {
    $null = npx pkg --version
    Write-Host "✅ pkg found" -ForegroundColor Green
} catch {
    Write-Host "❌ pkg not found. Installing pkg..." -ForegroundColor Yellow
    npm install -g pkg
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install pkg" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✅ pkg installed" -ForegroundColor Green
}
Write-Host ""

Write-Host "[2/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

Write-Host "[3/5] Building React app..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build React app" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ React app built" -ForegroundColor Green
Write-Host ""

Write-Host "[4/5] Creating executable..." -ForegroundColor Yellow
if (Test-Path "TechPlusPOS.exe") {
    Write-Host "Removing old executable..." -ForegroundColor Yellow
    Remove-Item "TechPlusPOS.exe" -Force
}

npm run build:exe
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create executable" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "TechPlusPOS.exe")) {
    Write-Host "❌ Executable not created" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Executable created: TechPlusPOS.exe" -ForegroundColor Green
Write-Host ""

Write-Host "[5/5] Finalizing..." -ForegroundColor Yellow
Write-Host "Creating distribution folder..."
if (-not (Test-Path "dist-package")) {
    New-Item -ItemType Directory -Name "dist-package" | Out-Null
}

Write-Host "Copying files to distribution folder..."
Copy-Item "TechPlusPOS.exe" "dist-package\" -Force
if (Test-Path "README.md") { Copy-Item "README.md" "dist-package\" -Force }
if (Test-Path "LICENSE") { Copy-Item "LICENSE" "dist-package\" -Force }

Write-Host "Creating run script..."
$runScript = @"
@echo off
echo Starting Tech Plus POS...
TechPlusPOS.exe
pause
"@
$runScript | Out-File -FilePath "dist-package\run.bat" -Encoding ASCII

Write-Host "✅ Finalization complete" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   🎉 Build Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 Files created:" -ForegroundColor White
Write-Host "   - TechPlusPOS.exe (Main executable)" -ForegroundColor Gray
Write-Host "   - dist-package/ (Distribution folder)" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 To run the app:" -ForegroundColor White
Write-Host "   1. Double-click TechPlusPOS.exe" -ForegroundColor Gray
Write-Host "   2. Or use: dist-package\run.bat" -ForegroundColor Gray
Write-Host "   3. Browser will open automatically" -ForegroundColor Gray
Write-Host "   4. App runs on http://techplus.pos:888" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Features:" -ForegroundColor White
Write-Host "   - Automatic browser opening" -ForegroundColor Gray
Write-Host "   - Port conflict resolution" -ForegroundColor Gray
Write-Host "   - Graceful shutdown" -ForegroundColor Gray
Write-Host "   - System tray icon (if available)" -ForegroundColor Gray
Write-Host "   - Completely offline operation" -ForegroundColor Gray
Write-Host ""
Write-Host "📦 Distribution:" -ForegroundColor White
Write-Host "   - Copy dist-package folder to target machine" -ForegroundColor Gray
Write-Host "   - No Node.js installation required" -ForegroundColor Gray
Write-Host "   - Self-contained executable" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit" 
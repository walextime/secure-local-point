# TechPlusPOS Single Portable File Creator (Simple Version)
# This script creates a single file that can be sent to another PC and run fully

param(
    [switch]$Silent
)

# Set console title
$Host.UI.RawUI.WindowTitle = "TechPlusPOS Single Portable File Creator"

# Function to show progress
function Show-Progress {
    param(
        [string]$Message,
        [int]$Percent
    )
    
    Write-Host "[$Percent%] $Message" -ForegroundColor Green
}

# Function to show error
function Show-Error {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
    if (-not $Silent) {
        Read-Host "Press Enter to continue"
    }
    exit 1
}

# Function to show success
function Show-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

# Clear screen and show header
Clear-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    TechPlusPOS Single Portable File" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Show-Progress "Checking prerequisites..." 10
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Show-Error "Node.js is not installed or not in PATH. Please install Node.js from https://nodejs.org/"
    }
    Show-Success "Node.js found ($nodeVersion)"
} catch {
    Show-Error "Node.js is not installed or not in PATH. Please install Node.js from https://nodejs.org/"
}

try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Show-Error "npm is not installed or not in PATH. Please install npm with Node.js"
    }
    Show-Success "npm found ($npmVersion)"
} catch {
    Show-Error "npm is not installed or not in PATH. Please install npm with Node.js"
}

# Check for pkg
Show-Progress "Checking pkg..." 20
try {
    $pkgVersion = npx pkg --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Installing pkg..." -ForegroundColor Yellow
        npm install -g pkg
        if ($LASTEXITCODE -ne 0) {
            Show-Error "Failed to install pkg"
        }
    }
    Show-Success "pkg found"
} catch {
    Show-Error "Failed to check pkg installation"
}

# Install dependencies
Show-Progress "Installing dependencies..." 30
try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Show-Error "Failed to install dependencies"
    }
    Show-Success "Dependencies installed"
} catch {
    Show-Error "Failed to install dependencies"
}

# Build React app
Show-Progress "Building React app..." 50
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Show-Error "Failed to build React app"
    }
    Show-Success "React app built"
} catch {
    Show-Error "Failed to build React app"
}

# Create portable executable
Show-Progress "Creating portable executable..." 70
if (Test-Path "TechPlusPOS-Single.exe") {
    Remove-Item "TechPlusPOS-Single.exe" -Force
}

try {
    # Build with pkg including all assets
    & npx pkg server/launcher.cjs --targets node18-win-x64 --output TechPlusPOS-Single.exe --public
    if ($LASTEXITCODE -ne 0) {
        Show-Error "Failed to create portable executable"
    }
    
    if (-not (Test-Path "TechPlusPOS-Single.exe")) {
        Show-Error "Portable executable not created"
    }
    
    Show-Success "Portable executable created: TechPlusPOS-Single.exe"
} catch {
    Show-Error "Failed to create portable executable: $($_.Exception.Message)"
}

# Add icon to executable
Show-Progress "Adding icon to executable..." 80
try {
    $rceditVersion = rcedit --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        & rcedit TechPlusPOS-Single.exe --set-icon public/favicon.ico
        if ($LASTEXITCODE -eq 0) {
            Show-Success "Icon added successfully"
        } else {
            Write-Host "⚠️ Failed to add icon with rcedit" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ rcedit not available. Installing..." -ForegroundColor Yellow
        npm install -g rcedit
        & rcedit TechPlusPOS-Single.exe --set-icon public/favicon.ico
        if ($LASTEXITCODE -eq 0) {
            Show-Success "Icon added successfully"
        } else {
            Write-Host "⚠️ Failed to add icon" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠️ Could not add icon: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Create distribution package
Show-Progress "Creating distribution package..." 90
$distFolder = "TechPlusPOS-Single-Package"
if (Test-Path $distFolder) {
    Remove-Item $distFolder -Recurse -Force
}
New-Item -ItemType Directory -Path $distFolder | Out-Null

# Copy files to distribution folder
Copy-Item "TechPlusPOS-Single.exe" $distFolder\
Copy-Item "public/favicon.ico" $distFolder\ 2>$null
Copy-Item "README.md" $distFolder\ 2>$null

# Create launcher script
$launcherContent = @"
@echo off
title TechPlusPOS Single Portable
color 0A

echo.
echo ========================================
echo    TechPlusPOS Single Portable
echo ========================================
echo.
echo This is a single portable file that includes:
echo - All dependencies bundled
echo - React app built-in
echo - Server components included
echo - No installation required
echo - Works on any Windows PC
echo.
echo Starting TechPlusPOS...
echo.
echo Please wait while the application starts...
echo.
timeout /t 3 /nobreak >nul

TechPlusPOS-Single.exe

echo.
echo Application closed.
echo.
pause
"@

$launcherContent | Out-File -FilePath "$distFolder\run.bat" -Encoding ASCII

# Create README
$readmeContent = @"
# TechPlusPOS Single Portable Application

## Overview
This is a single portable file version of TechPlusPOS that can run on any Windows PC without installation.

## Features
- No installation required
- Single executable file
- All dependencies included
- Works on any Windows PC
- Self-contained application
- Automatic browser opening
- Professional icon

## Usage
1. Double-click TechPlusPOS-Single.exe
2. Or use run.bat for additional information
3. Browser will open automatically
4. Application runs on http://localhost:8000

## Distribution
Simply copy the TechPlusPOS-Single.exe file to any Windows PC.
No additional software installation required.

## System Requirements
- Windows 7/8/10/11 (64-bit)
- No Node.js installation required
- No npm installation required
- No additional dependencies

## Troubleshooting
- If the application doesn't start, try running as Administrator
- If browser doesn't open, manually visit http://localhost:8000
- If port is in use, the application will automatically find another port

## File Size
The executable is approximately 50-100MB and includes:
- Node.js runtime
- All npm dependencies
- React application
- Server components
- Static assets

## Security
- Runs only on localhost
- No network exposure
- No external connections
- Self-contained operation
"@

$readmeContent | Out-File -FilePath "$distFolder\README.md" -Encoding UTF8

Show-Progress "Finalizing..." 100
Show-Success "Distribution package created: $distFolder"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "    🎉 Single Portable File Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Files created:" -ForegroundColor White
Write-Host "   - TechPlusPOS-Single.exe (Single portable executable)" -ForegroundColor White
Write-Host "   - $distFolder/ (Distribution package)" -ForegroundColor White
Write-Host ""
Write-Host "🚀 To distribute:" -ForegroundColor White
Write-Host "   1. Copy TechPlusPOS-Single.exe to any Windows PC" -ForegroundColor White
Write-Host "   2. Double-click to run" -ForegroundColor White
Write-Host "   3. No installation required!" -ForegroundColor White
Write-Host ""
Write-Host "📋 Features:" -ForegroundColor White
Write-Host "   - Single executable file" -ForegroundColor White
Write-Host "   - All dependencies bundled" -ForegroundColor White
Write-Host "   - Works on any Windows PC" -ForegroundColor White
Write-Host "   - No Node.js installation required" -ForegroundColor White
Write-Host "   - Automatic browser opening" -ForegroundColor White
Write-Host "   - Professional icon" -ForegroundColor White
Write-Host ""
Write-Host "📦 Distribution:" -ForegroundColor White
Write-Host "   - TechPlusPOS-Single.exe (Main executable)" -ForegroundColor White
Write-Host "   - run.bat (Launcher script)" -ForegroundColor White
Write-Host "   - README.md (Instructions)" -ForegroundColor White
Write-Host ""
Write-Host "🎯 To use on target PC:" -ForegroundColor White
Write-Host "   1. Copy TechPlusPOS-Single.exe to target PC" -ForegroundColor White
Write-Host "   2. Double-click to run" -ForegroundColor White
Write-Host "   3. Browser opens automatically" -ForegroundColor White
Write-Host "   4. Application runs on http://localhost:8000" -ForegroundColor White
Write-Host ""

if (-not $Silent) {
    Read-Host "Press Enter to close"
} 
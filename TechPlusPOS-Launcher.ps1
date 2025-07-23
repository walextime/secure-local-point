# TechPlusPOS Launcher
# This script launches the TechPlusPOS application

param(
    [switch]$Silent
)

# Set console title
$Host.UI.RawUI.WindowTitle = "TechPlusPOS Launcher"

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
Write-Host "    TechPlusPOS Application Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Show-Progress "Checking Node.js installation..." 20
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Show-Error "Node.js is not installed or not in PATH. Please install Node.js from https://nodejs.org/"
    }
    Show-Success "Node.js found ($nodeVersion)"
} catch {
    Show-Error "Node.js is not installed or not in PATH. Please install Node.js from https://nodejs.org/"
}

# Check if npm is installed
Show-Progress "Checking npm installation..." 40
try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Show-Error "npm is not installed or not in PATH. Please install npm with Node.js"
    }
    Show-Success "npm found ($npmVersion)"
} catch {
    Show-Error "npm is not installed or not in PATH. Please install npm with Node.js"
}

# Check if required files exist
Show-Progress "Checking required files..." 60
if (-not (Test-Path "package.json")) {
    Show-Error "package.json not found. Please run this launcher from the TechPlusPOS directory."
}
Show-Success "package.json found"

if (-not (Test-Path "start-dev.bat")) {
    Show-Error "start-dev.bat not found. Please run this launcher from the TechPlusPOS directory."
}
Show-Success "start-dev.bat found"

# Kill any existing processes on ports 8000 and 8888
Show-Progress "Clearing ports 8000 and 8888..." 80
$ports = @(8000, 8888)
foreach ($port in $ports) {
    $processes = netstat -ano | Select-String ":$port\s" | ForEach-Object {
        ($_ -split '\s+')[-1]
    }
    foreach ($processId in $processes) {
        if ($processId -and $processId -ne "0") {
            Write-Host "Killing process on port $port with PID $processId" -ForegroundColor Yellow
            taskkill /PID $processId /F 2>$null
        }
    }
}
Show-Success "Ports cleared"

# Start the development servers
Show-Progress "Starting TechPlusPOS application..." 100
Write-Host ""
Write-Host "Starting development servers in background..." -ForegroundColor Cyan
Write-Host "Vite server will be available at: http://localhost:8000" -ForegroundColor White
Write-Host "Proxy server will be available at: http://localhost:8888" -ForegroundColor White
Write-Host ""
Write-Host "Please wait while the servers start..." -ForegroundColor Yellow
Write-Host ""

# Start servers in background
try {
    # Start Vite server in background
    $viteProcess = Start-Process -FilePath "npx" -ArgumentList "vite --port 8000" -WindowStyle Minimized -PassThru
    
    # Start proxy server in background
    $proxyProcess = Start-Process -FilePath "node" -ArgumentList "proxy-backup.js" -WindowStyle Minimized -PassThru
    
    # Wait for servers to start
    Start-Sleep -Seconds 5
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "    TechPlusPOS is now running!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "The application should open in your browser automatically." -ForegroundColor White
    Write-Host "If not, please visit: http://localhost:8000" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Server Status:" -ForegroundColor White
    Write-Host "   - Vite server: Running in background" -ForegroundColor White
    Write-Host "   - Proxy server: Running in background" -ForegroundColor White
    Write-Host ""
    Write-Host "🛑 To stop the servers:" -ForegroundColor Yellow
    Write-Host "   1. Use Task Manager to end the processes" -ForegroundColor White
    Write-Host "   2. Or run: Get-Process | Where-Object {$_.ProcessName -eq 'node'} | Stop-Process" -ForegroundColor White
    Write-Host ""
    
    # Open the application in default browser
    Start-Process "http://localhost:8000"
    
    if (-not $Silent) {
        Read-Host "Press Enter to close this window"
    }
} catch {
    Show-Error "Failed to start TechPlusPOS application: $($_.Exception.Message)"
} 
# TechPlusPOS Background Launcher
# This script launches the TechPlusPOS application with servers running in background

param(
    [switch]$Silent
)

# Set console title
$Host.UI.RawUI.WindowTitle = "TechPlusPOS Background Launcher"

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

# Function to kill processes on specific ports
function Kill-ProcessesOnPorts {
    param([int[]]$Ports)
    
    foreach ($port in $Ports) {
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
}

# Function to wait for server to be ready
function Wait-ForServer {
    param([string]$Url, [int]$TimeoutSeconds = 30)
    
    $startTime = Get-Date
    $timeout = $startTime.AddSeconds($TimeoutSeconds)
    
    Write-Host "Waiting for server at $Url..." -ForegroundColor Yellow
    
    while ((Get-Date) -lt $timeout) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Show-Success "Server is ready!"
                return $true
            }
        } catch {
            # Server not ready yet
        }
        
        Start-Sleep -Seconds 1
    }
    
    Show-Error "Server did not start within $TimeoutSeconds seconds"
    return $false
}

# Clear screen and show header
Clear-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    TechPlusPOS Background Launcher" -ForegroundColor Cyan
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

if (-not (Test-Path "proxy-backup.js")) {
    Show-Error "proxy-backup.js not found. Please run this launcher from the TechPlusPOS directory."
}
Show-Success "proxy-backup.js found"

# Kill any existing processes on ports 8000 and 8888
Show-Progress "Clearing ports 8000 and 8888..." 80
Kill-ProcessesOnPorts @(8000, 8888)
Show-Success "Ports cleared"

# Start the development servers in background
Show-Progress "Starting TechPlusPOS application..." 100
Write-Host ""
Write-Host "Starting development servers in background..." -ForegroundColor Cyan
Write-Host "Vite server will be available at: http://localhost:8000" -ForegroundColor White
Write-Host "Proxy server will be available at: http://localhost:8888" -ForegroundColor White
Write-Host ""
Write-Host "Please wait while the servers start..." -ForegroundColor Yellow
Write-Host ""

# Start Vite development server in background
try {
    $viteProcess = Start-Process -FilePath "npx" -ArgumentList "vite", "--port", "8000" -WindowStyle Minimized -PassThru
    Write-Host "✓ Vite server started (PID: $($viteProcess.Id))" -ForegroundColor Green
} catch {
    Show-Error "Failed to start Vite server: $($_.Exception.Message)"
}

# Start proxy server in background
try {
    $proxyProcess = Start-Process -FilePath "node" -ArgumentList "proxy-backup.js" -WindowStyle Minimized -PassThru
    Write-Host "✓ Proxy server started (PID: $($proxyProcess.Id))" -ForegroundColor Green
} catch {
    Show-Error "Failed to start proxy server: $($_.Exception.Message)"
}

# Wait for servers to start
Write-Host ""
Write-Host "Waiting for servers to be ready..." -ForegroundColor Yellow

# Wait for Vite server
if (Wait-ForServer "http://localhost:8000" -TimeoutSeconds 30) {
    # Open browser automatically
    Write-Host ""
    Write-Host "Opening browser..." -ForegroundColor Cyan
    try {
        Start-Process "http://localhost:8000"
        Write-Host "✓ Browser opened successfully" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Failed to open browser automatically" -ForegroundColor Yellow
        Write-Host "Please visit: http://localhost:8000" -ForegroundColor White
    }
} else {
    Show-Error "Failed to start servers within timeout period"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "    🎉 TechPlusPOS is now running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Servers running in background:" -ForegroundColor White
Write-Host "   - Vite server: http://localhost:8000" -ForegroundColor White
Write-Host "   - Proxy server: http://localhost:8888" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Browser should open automatically" -ForegroundColor White
Write-Host "If not, please visit: http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host "📋 To stop the servers:" -ForegroundColor Yellow
Write-Host "   1. Open Task Manager (Ctrl+Shift+Esc)" -ForegroundColor White
Write-Host "   2. End processes named 'node' and 'npx'" -ForegroundColor White
Write-Host "   3. Or run: Stop-Process -Name 'node','npx' -Force" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Note: Servers are running in background" -ForegroundColor Yellow
Write-Host "   Command windows are minimized" -ForegroundColor White
Write-Host ""

if (-not $Silent) {
    Read-Host "Press Enter to close this launcher"
} 
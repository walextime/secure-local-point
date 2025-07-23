# Add Icon to TechPlusPOS Executable
# This script adds the favicon.ico as the icon to the TechPlusPOS.exe

param(
    [string]$ExePath = "TechPlusPOS.exe",
    [string]$IconPath = "public/favicon.ico",
    [switch]$Force
)

# Set console title
$Host.UI.RawUI.WindowTitle = "TechPlusPOS Icon Adder"

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
    Read-Host "Press Enter to continue"
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
Write-Host "    TechPlusPOS Icon Adder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if executable exists
Show-Progress "Checking executable..." 20
if (-not (Test-Path $ExePath)) {
    Show-Error "Executable not found: $ExePath"
}
Show-Success "Executable found: $ExePath"

# Check if icon file exists
Show-Progress "Checking icon file..." 40
if (-not (Test-Path $IconPath)) {
    Show-Error "Icon file not found: $IconPath"
}
Show-Success "Icon file found: $IconPath"

# Check if rcedit is installed
Show-Progress "Checking rcedit..." 60
try {
    $rceditVersion = rcedit --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Show-Error "rcedit is not installed. Please install it first: npm install -g rcedit"
    }
    Show-Success "rcedit found"
} catch {
    Show-Error "rcedit is not installed. Please install it first: npm install -g rcedit"
}

# Create backup
Show-Progress "Creating backup..." 80
$backupPath = "$ExePath.backup"
if (Test-Path $backupPath) {
    Remove-Item $backupPath -Force
}
Copy-Item $ExePath $backupPath
Show-Success "Backup created: $backupPath"

# Add icon to executable
Show-Progress "Adding icon to executable..." 100
try {
    $result = & rcedit $ExePath --set-icon $IconPath 2>&1
    if ($LASTEXITCODE -eq 0) {
        Show-Success "Icon added successfully!"
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "    🎉 Icon Added Successfully!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "📁 Files:" -ForegroundColor White
        Write-Host "   - $ExePath (with favicon.ico icon)" -ForegroundColor White
        Write-Host "   - $backupPath (backup of original)" -ForegroundColor White
        Write-Host ""
        Write-Host "🚀 To run:" -ForegroundColor White
        Write-Host "   Double-click $ExePath" -ForegroundColor White
        Write-Host ""
        Write-Host "🔄 To restore original:" -ForegroundColor White
        Write-Host "   Copy $backupPath to $ExePath" -ForegroundColor White
        Write-Host ""
        
        # Test if executable still works
        Write-Host "🧪 Testing executable..." -ForegroundColor Yellow
        $testProcess = Start-Process $ExePath -PassThru -WindowStyle Hidden
        Start-Sleep -Seconds 3
        if ($testProcess -and -not $testProcess.HasExited) {
            $testProcess.Kill()
            Show-Success "Executable test passed!"
        } else {
            Write-Host "⚠️  Warning: Executable test failed. Check if it still works." -ForegroundColor Yellow
        }
        
    } else {
        Show-Error "Failed to add icon: $result"
    }
} catch {
    Show-Error "Failed to add icon: $($_.Exception.Message)"
}

Write-Host ""
Read-Host "Press Enter to close" 
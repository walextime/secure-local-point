# Kill any process using ports 8000 or 8888
$ports = @(8000, 8888)
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $procIds = $conns | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique
        foreach ($procId in $procIds) {
            try {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Write-Host "Killed process $procId on port $port" -ForegroundColor Red
            } catch {}
        }
    }
}

Write-Host "Starting development servers..." -ForegroundColor Green
Write-Host ""

Write-Host "Starting Vite development server on port 8000..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "npx" -ArgumentList "vite --port 8000"

Write-Host "Starting proxy server on port 8888..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "proxy-backup.js"

Write-Host ""
Write-Host "Both servers are starting..." -ForegroundColor Green
Write-Host "Vite server: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Proxy server: http://localhost:8888" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Red

# Keep the script running
while ($true) {
    Start-Sleep -Seconds 1
} 
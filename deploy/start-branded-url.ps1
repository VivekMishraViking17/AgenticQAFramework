# Branded free HTTPS URL via localtunnel: https://agenticqaframework.loca.lt

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir = Join-Path (Split-Path -Parent $Root) "app"
$Node = Join-Path $Root "node-portable\node.exe"
$LtScript = Join-Path $Root "lt-run.js"
$Subdomain = "agenticqaframework"
$CursorNode = "c:\Users\VivekMishra\AppData\Local\Programs\cursor\resources\app\resources\helpers\node.exe"

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

$serverNode = if (Test-Path $CursorNode) { $CursorNode } else { $Node }
Write-Host "Starting Agentic QE server..." -ForegroundColor Cyan
Start-Process -FilePath $serverNode -ArgumentList "server.js" -WorkingDirectory $AppDir -WindowStyle Hidden
Start-Sleep 2

Write-Host "Starting branded tunnel: https://${Subdomain}.loca.lt" -ForegroundColor Green
Write-Host "Keep this window open." -ForegroundColor DarkGray
& $Node $LtScript $Subdomain

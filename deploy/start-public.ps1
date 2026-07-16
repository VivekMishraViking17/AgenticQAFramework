# Start Agentic QE with public HTTPS URL (simplest hosting)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir = Join-Path (Split-Path -Parent $Root) "app"
$Cloudflared = Join-Path $Root "cloudflared.exe"
$Node = "c:\Users\VivekMishra\AppData\Local\Programs\cursor\resources\app\resources\helpers\node.exe"
if (-not (Test-Path $Node)) { $Node = (Get-Command node -ErrorAction SilentlyContinue).Source }

if (-not (Test-Path $Cloudflared)) {
  Write-Host "Downloading cloudflared..." -ForegroundColor Yellow
  Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/download/2026.7.2/cloudflared-windows-amd64.exe" `
    -OutFile $Cloudflared -UseBasicParsing
}

if (-not (Test-Path (Join-Path $AppDir ".env"))) {
  Copy-Item (Join-Path $AppDir ".env.example") (Join-Path $AppDir ".env")
  Write-Host "Created app\.env — set ACCESS_CODE before sharing." -ForegroundColor Yellow
}

Write-Host "Starting Agentic QE server..." -ForegroundColor Cyan
Start-Process -FilePath $Node -ArgumentList "server.js" -WorkingDirectory $AppDir -WindowStyle Hidden

Start-Sleep 2
Write-Host "Starting HTTPS tunnel..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Look for the https://....trycloudflare.com URL below." -ForegroundColor Green
Write-Host "Keep this window open. Press Ctrl+C to stop the tunnel." -ForegroundColor DarkGray
Write-Host ""

& $Cloudflared tunnel --url http://127.0.0.1:8080

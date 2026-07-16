# Start Agentic QE on custom domain: qeagenticframeworkvikingcloud.com
# Prerequisite: complete docs/CUSTOM-DOMAIN.md Steps 1-2 first

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir = Join-Path (Split-Path -Parent $Root) "app"
$Cloudflared = Join-Path $Root "cloudflared.exe"
$Config = Join-Path $Root "cloudflared-config.yml"
$Node = "c:\Users\VivekMishra\AppData\Local\Programs\cursor\resources\app\resources\helpers\node.exe"
if (-not (Test-Path $Node)) { $Node = (Get-Command node -ErrorAction SilentlyContinue).Source }

$credFile = Join-Path $env:USERPROFILE ".cloudflared\qe-agentic-vc.json"
if (-not (Test-Path $credFile)) {
  Write-Host ""
  Write-Host "Tunnel not set up yet." -ForegroundColor Red
  Write-Host "Follow: docs\CUSTOM-DOMAIN.md" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Quick start:" -ForegroundColor Cyan
  Write-Host "  cd $Root"
  Write-Host "  .\cloudflared.exe tunnel login"
  Write-Host "  .\cloudflared.exe tunnel create qe-agentic-vc"
  Write-Host "  .\cloudflared.exe tunnel route dns qe-agentic-vc qeagenticframeworkvikingcloud.com"
  exit 1
}

Write-Host "Starting Agentic QE server..." -ForegroundColor Cyan
Start-Process -FilePath $Node -ArgumentList "server.js" -WorkingDirectory $AppDir -WindowStyle Hidden
Start-Sleep 2

Write-Host "Starting tunnel: https://qeagenticframeworkvikingcloud.com" -ForegroundColor Green
Write-Host "Keep this window open." -ForegroundColor DarkGray
& $Cloudflared tunnel --config $Config run qe-agentic-vc

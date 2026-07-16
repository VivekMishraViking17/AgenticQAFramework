# One-click path to https://qeagenticframeworkvikingcloud.com (no IT)
# You only need a free Cloudflare account + ~$10 domain purchase (2 minutes).

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Cloudflared = Join-Path $Root "cloudflared.exe"

Write-Host ""
Write-Host "=== QE Agentic Framework VikingCloud — Custom Domain ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Step 1: Register domain (opens browser)" -ForegroundColor Yellow
Write-Host "  Domain: qeagenticframeworkvikingcloud.com (~`$10/year on Cloudflare)"
Write-Host ""
Start-Process "https://dash.cloudflare.com/sign-up"
Start-Sleep 2
Start-Process "https://domains.cloudflare.com/?query=qeagenticframeworkvikingcloud.com"

Write-Host "Complete signup + buy the domain in the browser window." -ForegroundColor Green
Write-Host "When done, press Enter here to continue tunnel setup..." -ForegroundColor Green
Read-Host

Write-Host ""
Write-Host "Step 2: Cloudflare login (browser opens)..." -ForegroundColor Yellow
& $Cloudflared tunnel login

Write-Host ""
Write-Host "Step 3: Create tunnel + DNS..." -ForegroundColor Yellow
& $Cloudflared tunnel create qe-agentic-vc 2>$null
& $Cloudflared tunnel route dns qe-agentic-vc qeagenticframeworkvikingcloud.com
& $Cloudflared tunnel route dns qe-agentic-vc www.qeagenticframeworkvikingcloud.com

Write-Host ""
Write-Host "Step 4: Update app config..." -ForegroundColor Yellow
$envFile = Join-Path (Split-Path -Parent $Root) "app\.env"
if (Test-Path $envFile) {
  (Get-Content $envFile -Raw) -replace 'PUBLIC_BASE_URL=.*', 'PUBLIC_BASE_URL=https://qeagenticframeworkvikingcloud.com' | Set-Content $envFile -NoNewline
}

Write-Host ""
Write-Host "DONE. Starting app + tunnel..." -ForegroundColor Green
Write-Host "Your URL: https://qeagenticframeworkvikingcloud.com" -ForegroundColor Green
Write-Host ""

& (Join-Path $Root "start-custom-domain.ps1")

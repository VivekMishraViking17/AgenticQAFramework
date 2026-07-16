# Start backend + HTTPS tunnel, sync docs/config.js, push to GitHub Pages

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$AppDir = Join-Path $Root "app"
$Deploy = Join-Path $Root "deploy"
$ConfigJs = Join-Path $Root "docs\config.js"
$Cloudflared = Join-Path $Deploy "cloudflared.exe"
$Git = "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
$CursorNode = "c:\Users\VivekMishra\AppData\Local\Programs\cursor\resources\app\resources\helpers\node.exe"
$Node = if (Test-Path $CursorNode) { $CursorNode } else { (Get-Command node -ErrorAction SilentlyContinue).Source }

function Test-Port8080 {
  try {
    Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/stories" -UseBasicParsing -TimeoutSec 3 | Out-Null
    return $true
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) { return $true }
    return $false
  }
}

if (-not (Test-Port8080)) {
  Write-Host "Starting Agentic QE server..." -ForegroundColor Cyan
  Start-Process -FilePath $Node -ArgumentList "server.js" -WorkingDirectory $AppDir -WindowStyle Hidden
  Start-Sleep 2
}

$existing = Get-Process cloudflared -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Cloudflare tunnel already running." -ForegroundColor Green
  $log = Get-ChildItem "$env:USERPROFILE\.cursor\projects\*\terminals\*.txt" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 20 |
    Where-Object { (Get-Content $_.FullName -Raw) -match "trycloudflare\.com" }
  if ($log) {
    if ((Get-Content $log.FullName -Raw) -match "https://([a-z0-9-]+)\.trycloudflare\.com") {
      $tunnelUrl = "https://$($Matches[1]).trycloudflare.com"
    }
  }
}

if (-not $tunnelUrl) {
  if (-not (Test-Path $Cloudflared)) {
    Write-Host "Downloading cloudflared..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/download/2026.7.2/cloudflared-windows-amd64.exe" `
      -OutFile $Cloudflared -UseBasicParsing
  }
  Write-Host "Starting Cloudflare tunnel (keep this window open)..." -ForegroundColor Cyan
  $proc = Start-Process -FilePath $Cloudflared -ArgumentList "tunnel","--url","http://127.0.0.1:8080" `
    -RedirectStandardOutput (Join-Path $Deploy "tunnel.log") `
    -RedirectStandardError (Join-Path $Deploy "tunnel.err.log") `
    -PassThru -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(45)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep 2
    $err = Get-Content (Join-Path $Deploy "tunnel.err.log") -ErrorAction SilentlyContinue -Raw
    if ($err -match "https://([a-z0-9-]+)\.trycloudflare\.com") {
      $tunnelUrl = "https://$($Matches[1]).trycloudflare.com"
      break
    }
  }
  if (-not $tunnelUrl) { throw "Could not read tunnel URL from cloudflared logs." }
}

Write-Host "Backend URL: $tunnelUrl" -ForegroundColor Green
$newLine = "window.API_BASE = `"$tunnelUrl`";"
$current = Get-Content $ConfigJs -Raw
if ($current -notmatch [regex]::Escape($tunnelUrl)) {
  Set-Content -Path $ConfigJs -Value $newLine -NoNewline
  Set-Location $Root
  & $Git add docs/config.js
  & $Git commit -m "Sync API_BASE to active Cloudflare tunnel URL"
  & $Git push origin main
  Write-Host "Pushed updated config.js to GitHub Pages." -ForegroundColor Green
} else {
  Write-Host "config.js already points at this tunnel." -ForegroundColor Gray
}

Write-Host ""
Write-Host "App URL:  https://vivekmishraviking17.github.io/AgenticQAFramework/" -ForegroundColor Green
Write-Host "Backend:  $tunnelUrl" -ForegroundColor Green

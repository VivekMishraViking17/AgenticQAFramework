param(
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir = Join-Path (Split-Path -Parent $Root) "app"
$EnvFile = Join-Path $AppDir ".env"

if (-not (Test-Path $EnvFile)) {
  Copy-Item (Join-Path $AppDir ".env.example") $EnvFile
  Write-Host "Created $EnvFile — edit AUTH and PUBLIC_BASE_URL before production use." -ForegroundColor Yellow
}

& (Join-Path $Root "open-firewall.ps1") -Port $Port

$lanIp = (
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -First 1
).IPAddress

Write-Host ""
Write-Host "=== VikingCloud Agentic QE Platform ===" -ForegroundColor Cyan
Write-Host "App directory: $AppDir"
if ($lanIp) {
  Write-Host "LAN URL:       http://${lanIp}:${Port}" -ForegroundColor Green
}
Write-Host "Local URL:     http://127.0.0.1:${Port}"
Write-Host ""
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

Set-Location $AppDir
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  $nodePath = "c:\Users\VivekMishra\AppData\Local\Programs\cursor\resources\app\resources\helpers\node.exe"
  if (Test-Path $nodePath) { & $nodePath server.js; exit }
  throw "Node.js not found. Install from https://nodejs.org"
}
& node server.js

# Deploy AgenticQAFramework to Render via API (after you create a free account once)
# Usage: save your API key to deploy\.render-api-key then run this script

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$KeyFile = Join-Path $Root ".render-api-key"

if (-not (Test-Path $KeyFile)) {
  Write-Host ""
  Write-Host "One step only you can do (60 seconds):" -ForegroundColor Yellow
  Write-Host "  1. https://dashboard.render.com/register → Sign up with GitHub"
  Write-Host "  2. https://dashboard.render.com/u/settings#api-keys → Create API Key"
  Write-Host "  3. Save the key to: $KeyFile"
  Write-Host ""
  Start-Process "https://dashboard.render.com/register"
  Start-Process "https://dashboard.render.com/u/settings#api-keys"
  exit 1
}

$apiKey = (Get-Content $KeyFile -Raw).Trim()
$headers = @{
  Authorization = "Bearer $apiKey"
  "Content-Type" = "application/json"
  Accept = "application/json"
}

Write-Host "Creating Render web service agenticqaframework..." -ForegroundColor Cyan

$body = @{
  type = "web_service"
  name = "agenticqaframework"
  repo = "https://github.com/VivekMishraViking17/AgenticQAFramework"
  branch = "main"
  rootDir = "app"
  runtime = "node"
  plan = "free"
  autoDeploy = "yes"
  buildCommand = "echo build-ok"
  startCommand = "node server.js"
  healthCheckPath = "/health"
  envVars = @(
    @{ key = "HOST"; value = "0.0.0.0" },
    @{ key = "AUTH_ENABLED"; value = "true" },
    @{ key = "AUTH_MODE"; value = "access_code" },
    @{ key = "ACCESS_CODE"; value = "VC-QE-2026" },
    @{ key = "ALLOWED_EMAIL_DOMAINS"; value = "vikingcloud.com" },
    @{ key = "PUBLIC_BASE_URL"; value = "https://agenticqaframework.onrender.com" }
  )
} | ConvertTo-Json -Depth 5

try {
  $existing = Invoke-RestMethod -Uri "https://api.render.com/v1/services?name=agenticqaframework" -Headers $headers -Method Get
  if ($existing -and $existing.Count -gt 0) {
    Write-Host "Service already exists: https://agenticqaframework.onrender.com" -ForegroundColor Green
    Start-Process "https://agenticqaframework.onrender.com"
    exit 0
  }
} catch { }

try {
  $result = Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Headers $headers -Method Post -Body $body
  Write-Host "Deploy started!" -ForegroundColor Green
  Write-Host "URL: https://agenticqaframework.onrender.com" -ForegroundColor Green
  Write-Host "Wait 3-5 min for Live status in Render dashboard."
  Start-Process "https://dashboard.render.com"
  Start-Process "https://agenticqaframework.onrender.com"
} catch {
  Write-Host "API error: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  Write-Host ""
  Write-Host "Fallback: use Blueprint manually:" -ForegroundColor Yellow
  Write-Host "  https://dashboard.render.com/blueprint/new"
  Start-Process "https://dashboard.render.com/blueprint/new"
}

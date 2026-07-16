# Get branded URL: https://agenticqaframework.onrender.com (FREE)

Write-Host ""
Write-Host "=== AgenticQAFramework — Branded Free URL ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target URL: https://agenticqaframework.onrender.com" -ForegroundColor Green
Write-Host ""
Write-Host "Step 1 — Create free GitHub repo (browser opens)" -ForegroundColor Yellow
Write-Host "  Name: AgenticQAFramework"
Write-Host "  Visibility: Public"
Write-Host ""
Start-Process "https://github.com/new?name=AgenticQAFramework&description=VikingCloud+Agentic+QE+Platform"

Read-Host "Press Enter after you created the empty GitHub repo"

Write-Host ""
Write-Host "Step 2 — Paste your GitHub repo URL (e.g. https://github.com/YOURUSER/AgenticQAFramework.git)" -ForegroundColor Yellow
$remote = Read-Host "Repo URL"

if ($remote) {
  $git = Join-Path $env:LOCALAPPDATA "Programs\Git\cmd\git.exe"
  Set-Location (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
  & $git remote remove origin 2>$null
  & $git remote add origin $remote
  & $git branch -M main
  Write-Host "Pushing code..." -ForegroundColor Cyan
  & $git push -u origin main
}

Write-Host ""
Write-Host "Step 3 — Deploy on Render (browser opens)" -ForegroundColor Yellow
Start-Process "https://dashboard.render.com/select-repo?type=blueprint"

Write-Host ""
Write-Host "On Render:" -ForegroundColor Green
Write-Host "  1. Connect GitHub → select AgenticQAFramework repo"
Write-Host "  2. Blueprint will detect render.yaml"
Write-Host "  3. Set ACCESS_CODE = VC-QE-2026"
Write-Host "  4. Deploy"
Write-Host ""
Write-Host "Your branded URL: https://agenticqaframework.onrender.com" -ForegroundColor Green
Write-Host ""

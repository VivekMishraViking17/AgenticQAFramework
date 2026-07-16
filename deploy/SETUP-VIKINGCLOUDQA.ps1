# Setup VikingCloudQA org + branded URL (you own it — no VikingCloud admin needed)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VikingCloudQA GitHub Organization" -ForegroundColor Cyan
Write-Host "  Target URL:" -ForegroundColor Green
Write-Host "  https://vikingcloudqa.github.io/agenticframework/" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This is YOUR org — does NOT touch official VikingCloud GitHub." -ForegroundColor Yellow
Write-Host ""

Write-Host "STEP 1 — Create org (browser opens)" -ForegroundColor White
Write-Host "  Name: VikingCloudQA" -ForegroundColor Green
Write-Host "  Plan: Free" -ForegroundColor Gray
Write-Host ""
Start-Process "https://github.com/organizations/plan?plan=free"
Read-Host "Press Enter after you created VikingCloudQA org"

Write-Host ""
Write-Host "STEP 2 — Transfer repo (browser opens)" -ForegroundColor White
Write-Host "  New owner: VikingCloudQA" -ForegroundColor Green
Write-Host ""
Start-Process "https://github.com/VivekMishraViking17/AgenticQAFramework/transfer"
Read-Host "Press Enter after transfer completed"

Write-Host ""
Write-Host "STEP 3 — Rename repo to agenticframework" -ForegroundColor White
Start-Process "https://github.com/VikingCloudQA/AgenticQAFramework/settings"
Read-Host "Press Enter after rename"

Write-Host ""
Write-Host "STEP 4 — Enable GitHub Pages (/docs)" -ForegroundColor White
Start-Process "https://github.com/VikingCloudQA/agenticframework/settings/pages"
Read-Host "Press Enter after Pages enabled"

Write-Host ""
Write-Host "Updating local git remote..." -ForegroundColor Cyan
$git = "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
Set-Location (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
& $git remote set-url origin https://github.com/VikingCloudQA/agenticframework.git 2>$null
& $git push -u origin main 2>&1 | Select-Object -Last 3

Write-Host ""
Write-Host "DONE! Open:" -ForegroundColor Green
Write-Host "https://vikingcloudqa.github.io/agenticframework/" -ForegroundColor Green
Start-Process "https://vikingcloudqa.github.io/agenticframework/"

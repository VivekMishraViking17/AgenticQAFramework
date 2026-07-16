# Enable GitHub Pages for VikingCloud/VikingCloudQA (one-time, ~30 seconds)

Write-Host ""
Write-Host "GitHub Pages is NOT enabled yet — that is why you get 404." -ForegroundColor Yellow
Write-Host ""
Write-Host "Open Settings -> Pages and set:" -ForegroundColor Cyan
Write-Host "  Source: Deploy from a branch" -ForegroundColor White
Write-Host "  Branch: gh-pages" -ForegroundColor Green
Write-Host "  Folder: / (root)" -ForegroundColor Green
Write-Host "  Click Save" -ForegroundColor White
Write-Host ""
Write-Host "Then wait 2 minutes and open:" -ForegroundColor Cyan
Write-Host "  https://vikingcloud.github.io/VikingCloudQA/" -ForegroundColor Green
Write-Host ""

Start-Process "https://github.com/VikingCloud/VikingCloudQA/settings/pages"
Start-Process "https://github.com/organizations/VikingCloud/settings/github_pages"

Write-Host "If Save is greyed out, ask a VikingCloud GitHub org admin to allow Pages." -ForegroundColor Yellow
Read-Host "Press Enter after you clicked Save"

Start-Process "https://vikingcloud.github.io/VikingCloudQA/"

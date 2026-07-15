# Initialize local git repository for Agentic QE Framework

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $Root

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
$git = if ($gitCmd) { $gitCmd.Source } else { $null }
if (-not $git) {
  $git = "C:\Program Files\Git\cmd\git.exe"
}
if (-not (Test-Path $git)) {
  $git = Join-Path $env:LOCALAPPDATA "Programs\Git\cmd\git.exe"
}
if (-not (Test-Path $git)) {
  throw "Git not found. Install from https://git-scm.com/download/win"
}

Set-Location $RepoRoot

if (-not (Test-Path ".git")) {
  & $git init -b main
  Write-Host "Initialized git repository at $RepoRoot" -ForegroundColor Green
} else {
  Write-Host "Git repository already exists." -ForegroundColor Yellow
}

& $git add -A
$status = & $git status --porcelain
if ($status) {
  & $git commit -m @"
Initial commit: VikingCloud Agentic QE Platform

- Node.js web app with Jira, XRay, Confluence integrations
- VC E2E process, CXO briefing, defect analysis, ROI dashboard
- Microsoft Entra ID auth for @vikingcloud.com users
- Deploy scripts for LAN hosting and Docker
"@
  Write-Host "Created initial commit." -ForegroundColor Green
} else {
  Write-Host "Nothing to commit." -ForegroundColor Yellow
}

Write-Host ""
& $git log -1 --oneline
Write-Host ""
Write-Host "Next: add remote and push" -ForegroundColor Cyan
Write-Host "  git remote add origin <your-github-or-gitlab-url>"
Write-Host "  git push -u origin main"

$node = "c:\Users\VivekMishra\AppData\Local\Programs\cursor\resources\app\resources\helpers\node.exe"
Set-Location $PSScriptRoot
Write-Host "Starting Agentic QE Platform at http://127.0.0.1:8080"
Write-Host "To host for VikingCloud users: ..\deploy\host.ps1" -ForegroundColor DarkGray
& $node server.js

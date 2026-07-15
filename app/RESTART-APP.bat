@echo off
title Agentic QE Platform - Restart
cd /d "%~dp0"
set NODE=node
where node >nul 2>&1 || set NODE=c:\Users\VivekMishra\AppData\Local\Programs\cursor\resources\app\resources\helpers\node.exe

echo Stopping any existing server on port 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo Starting Agentic QE Platform...
echo.
echo  URL: http://127.0.0.1:8080
echo  Path: %~dp0
echo.
start "" "http://127.0.0.1:8080"
"%NODE%" server.js
pause

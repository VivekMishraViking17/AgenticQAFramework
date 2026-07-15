@echo off
title Agentic QE Platform
cd /d "%~dp0"
set NODE=c:\Users\VivekMishra\AppData\Local\Programs\cursor\resources\app\resources\helpers\node.exe
if not exist "%NODE%" (
  echo Node not found. Install Node.js from https://nodejs.org or open via Cursor.
  pause
  exit /b 1
)
echo.
echo  Agentic QE Platform
echo  ===================
echo  Starting server...
echo.
start "" "http://127.0.0.1:8080"
"%NODE%" server.js
pause

@echo off
setlocal
title AI Recruiting Assistant
cd /d "%~dp0"
set "URL=http://localhost:3100"

where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js first.
  pause
  exit /b 1
)

if not exist "node_modules\next\dist\bin\next" (
  echo Dependencies are missing.
  echo Run npm.cmd install in this folder, then double-click this file again.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\open-when-ready.ps1" -Url "%URL%" -TimeoutSeconds 2 >nul 2>nul
if not errorlevel 1 (
  echo AI Recruiting Assistant is already running.
  echo Browser opened: %URL%
  pause
  exit /b 0
)

start "Open AI Recruiting Assistant" /MIN powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\open-when-ready.ps1" -Url "%URL%" -TimeoutSeconds 45

echo Starting AI Recruiting Assistant...
echo Browser will open automatically when the server is ready.
echo Keep this window open while using the app.
echo.
node "node_modules\next\dist\bin\next" start -p 3100
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo AI Recruiting Assistant server stopped. Exit code: %EXIT_CODE%
pause
exit /b %EXIT_CODE%

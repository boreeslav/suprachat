@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-bot.ps1" %*
set "EC=%ERRORLEVEL%"
pause
exit /b %EC%

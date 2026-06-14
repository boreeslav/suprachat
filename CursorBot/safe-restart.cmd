@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\safe-restart.ps1" %*
set "EC=%ERRORLEVEL%"
if %EC% EQU 2 (
  echo.
  echo [WARN] New version failed health check. Rolled back to previous build.
)
pause
exit /b %EC%

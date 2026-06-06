@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo SuperMessenger deploy
echo.
echo Settings file: tmp\deploy\deploy.env
if not exist "%~dp0tmp\deploy\deploy.env" (
    if exist "%~dp0tmp\deploy\deploy.env.example" (
        echo   Not found. Missing values will be prompted and saved to tmp\deploy\deploy.env
    ) else (
        echo   WARNING: tmp\deploy\deploy.env.example is missing
    )
) else (
    echo   Found. Only missing values will be prompted.
)
echo   Build artifacts: tmp\deploy\
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy\deploy.ps1" %*
set "EXITCODE=%ERRORLEVEL%"

echo.
if %EXITCODE% neq 0 (
    echo Deploy failed. Exit code: %EXITCODE%
) else (
    echo Deploy finished successfully.
)

echo.
pause
exit /b %EXITCODE%

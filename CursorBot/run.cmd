@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"
title CursorBot

set "RESTART_SEC=5"
set "BUILD_STAMP=dist\.build-stamp"

echo.
echo === CursorBot launcher ===
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js не найден. Установите Node.js 20+ и добавьте в PATH.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -p "process.versions.node.split('.')[0]"') do set "NODE_MAJOR=%%v"
if !NODE_MAJOR! LSS 20 (
  echo [ERROR] Нужен Node.js 20 или новее. Сейчас: 
  node -v
  pause
  exit /b 1
)

if not exist ".env" (
  echo [ERROR] Файл .env не найден. Скопируйте .env.example в .env и заполните.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\tsc.cmd" (
  echo [SETUP] Установка зависимостей...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install завершился с ошибкой.
    pause
    exit /b 1
  )
) else if exist "package-lock.json" (
  if not exist "node_modules\.package-lock.json" (
    echo [SETUP] Обновление зависимостей...
    call npm install
    if errorlevel 1 (
      echo [ERROR] npm install завершился с ошибкой.
      pause
      exit /b 1
    )
  ) else (
    for %%A in ("package-lock.json") do set "LOCK_TIME=%%~tA"
    for %%A in ("node_modules\.package-lock.json") do set "NM_LOCK_TIME=%%~tA"
    if "!LOCK_TIME!" GTR "!NM_LOCK_TIME!" (
      echo [SETUP] package-lock.json изменился — npm install...
      call npm install
      if errorlevel 1 (
        echo [ERROR] npm install завершился с ошибкой.
        pause
        exit /b 1
      )
    )
  )
)

call :NeedBuild NEED_BUILD
if "!NEED_BUILD!"=="1" (
  echo [BUILD] Сборка TypeScript...
  call npm run build
  if errorlevel 1 (
    echo [ERROR] Сборка не удалась.
    pause
    exit /b 1
  )
  echo ok> "%BUILD_STAMP%"
  echo [BUILD] Готово.
) else (
  echo [BUILD] Актуальная сборка, пропуск.
)

echo.
echo [RUN] Запуск бота. Ctrl+C — остановка. После сбоя — перезапуск через %RESTART_SEC% с.
echo.

:run_loop
call npm run start:supervised
set "EXIT_CODE=!ERRORLEVEL!"

if !EXIT_CODE! EQU 0 (
  echo.
  echo [STOP] Бот завершился штатно ^(код 0^).
  goto :end
)

echo.
echo [RESTART] Бот упал с кодом !EXIT_CODE!. Перезапуск через %RESTART_SEC% с...
echo         ^(Ctrl+C сейчас — выход без перезапуска^)
timeout /t %RESTART_SEC% /nobreak >nul
if errorlevel 1 goto :end

call :NeedBuild NEED_BUILD
if "!NEED_BUILD!"=="1" (
  echo [BUILD] Исходники изменились — пересборка...
  call npm run build
  if errorlevel 1 (
    echo [ERROR] Сборка не удалась, повтор через %RESTART_SEC% с...
    timeout /t %RESTART_SEC% /nobreak >nul
    goto :run_loop
  )
  echo ok> "%BUILD_STAMP%"
)

goto :run_loop

:end
echo.
pause
exit /b %EXIT_CODE%

:NeedBuild
set "%~1=0"
if not exist "dist\index.js" (
  set "%~1=1"
  exit /b 0
)
if not exist "%BUILD_STAMP%" (
  set "%~1=1"
  exit /b 0
)
for %%A in ("%BUILD_STAMP%") do set "STAMP_TIME=%%~tA"
for %%F in (src\*.ts src\**\*.ts) do (
  if exist "%%~fF" (
    for %%B in ("%%~fF") do (
      if "%%~tB" GTR "!STAMP_TIME!" (
        set "%~1=1"
        exit /b 0
      )
    )
  )
)
for %%A in ("package.json") do set "PKG_TIME=%%~tA"
if "!PKG_TIME!" GTR "!STAMP_TIME!" set "%~1=1"
for %%A in ("tsconfig.json") do set "TS_TIME=%%~tA"
if "!TS_TIME!" GTR "!STAMP_TIME!" set "%~1=1"
exit /b 0

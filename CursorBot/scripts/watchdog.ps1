# CursorBot watchdog - restarts bot after any non-zero exit code.
param(
    [int]$RestartSec = 5
)

$ErrorActionPreference = 'Continue'
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$pidFile = Join-Path $Root 'data\watchdog.pid'
New-Item -ItemType Directory -Force -Path (Split-Path $pidFile) | Out-Null

function Test-WatchdogAlreadyRunning {
    if (Test-Path $pidFile) {
        $existingPid = 0
        [void][int]::TryParse((Get-Content $pidFile -Raw).Trim(), [ref]$existingPid)
        if ($existingPid -gt 0 -and $existingPid -ne $PID) {
            $alive = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
            if ($alive) { return $existingPid }
        }
    }
    $others = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.ProcessId -ne $PID -and
            $_.CommandLine -and
            $_.CommandLine -like '*watchdog.ps1*' -and
            (
                $_.CommandLine -like "*$Root*" -or
                $_.CommandLine -like '*SuperMessenger\CursorBot*' -or
                $_.CommandLine -like '*scripts\watchdog.ps1*' -or
                $_.CommandLine -like '*scripts/watchdog.ps1*'
            )
        }
    if ($others) { return $others[0].ProcessId }
    return 0
}

$runningPid = Test-WatchdogAlreadyRunning
if ($runningPid -gt 0) {
    Write-Host ("[{0}] [watchdog] Уже запущен (PID {1}). Выход." -f (Get-Date -Format 'HH:mm:ss'), $runningPid)
    exit 0
}

Set-Content -Path $pidFile -Value $PID -Encoding ascii

function Write-Watchdog([string]$Message) {
    Write-Host ("[{0}] [watchdog] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message)
}

$stopFile = Join-Path $Root 'data\watchdog.stop'
if (Test-Path $stopFile) { Remove-Item $stopFile -Force -ErrorAction SilentlyContinue }

Write-Watchdog "Started (PID $PID). Ctrl+C to stop."

trap {
    Write-Watchdog 'Stopping watchdog...'
    if (Test-Path $pidFile) { Remove-Item $pidFile -Force -ErrorAction SilentlyContinue }
    break
}

while ($true) {
    if (Test-Path $stopFile) {
        Write-Watchdog 'watchdog.stop found - exit without restart.'
        Remove-Item $stopFile -Force -ErrorAction SilentlyContinue
        break
    }

    Write-Watchdog 'Starting bot...'
    & node dist/index.js
    $code = $LASTEXITCODE

    if ($code -eq 0) {
        Write-Watchdog 'Bot exited cleanly (code 0). Watchdog stops.'
        break
    }

    Write-Watchdog ("Bot crashed (code {0}). Restart in {1}s..." -f $code, $RestartSec)
    Start-Sleep -Seconds $RestartSec
}

if (Test-Path $pidFile) { Remove-Item $pidFile -Force -ErrorAction SilentlyContinue }

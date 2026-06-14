# CursorBot watchdog - restarts bot after any non-zero exit code.
param(
    [int]$RestartSec = 5
)

$ErrorActionPreference = 'Continue'
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$pidFile = Join-Path $Root 'data\watchdog.pid'
New-Item -ItemType Directory -Force -Path (Split-Path $pidFile) | Out-Null
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

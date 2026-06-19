# Intentional CursorBot stop.
# Creates data/watchdog.stop (both watchdog and the bot treat it as "do not restart"),
# then stops the watchdog and the bot process. While watchdog.stop exists the watchdog
# will not restart the bot; the autostart task will remove it on the next logon and
# bring the bot back up - this is by design.
param(
    [int]$StopTimeoutSec = 15
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

function Write-Step([string]$Message) {
    Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message) -ForegroundColor Cyan
}

$stopFile = Join-Path $Root 'data\watchdog.stop'
New-Item -ItemType Directory -Force -Path (Split-Path $stopFile) | Out-Null
Set-Content -Path $stopFile -Value '' -Encoding ascii
Write-Step "Created intentional-stop marker: $stopFile"

function Test-IsOurBotProcess([string]$CommandLine) {
    if (-not $CommandLine) { return $false }
    if ($CommandLine -notlike '*dist\index.js*' -and $CommandLine -notlike '*dist/index.js*') { return $false }
    return (
        $CommandLine -like "*$Root*" -or
        $CommandLine -like '*SuperMessenger\CursorBot*' -or
        $CommandLine -like '*SuperMessenger/CursorBot*'
    )
}

function Test-IsOurWatchdogProcess([string]$CommandLine) {
    if (-not $CommandLine) { return $false }
    if ($CommandLine -notlike '*watchdog.ps1*') { return $false }
    return (
        $CommandLine -like "*$Root*" -or
        $CommandLine -like '*SuperMessenger\CursorBot*' -or
        $CommandLine -like '*SuperMessenger/CursorBot*' -or
        $CommandLine -like '*scripts\watchdog.ps1*' -or
        $CommandLine -like '*scripts/watchdog.ps1*'
    )
}

function Get-Procs([scriptblock]$Match) {
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe' OR Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object { & $Match $_.CommandLine }
}

foreach ($wd in @(Get-Procs { param($c) Test-IsOurWatchdogProcess $c })) {
    Write-Step "Stopping watchdog PID $($wd.ProcessId)..."
    Stop-Process -Id $wd.ProcessId -Force -ErrorAction SilentlyContinue
}

$deadline = (Get-Date).AddSeconds($StopTimeoutSec)
foreach ($bot in @(Get-Procs { param($c) Test-IsOurBotProcess $c })) {
    Write-Step "Stopping bot PID $($bot.ProcessId)..."
    Stop-Process -Id $bot.ProcessId -ErrorAction SilentlyContinue
}
while ((Get-Date) -lt $deadline) {
    if (-not @(Get-Procs { param($c) Test-IsOurBotProcess $c }).Count) { break }
    Start-Sleep -Milliseconds 500
}
foreach ($bot in @(Get-Procs { param($c) Test-IsOurBotProcess $c })) {
    Stop-Process -Id $bot.ProcessId -Force -ErrorAction SilentlyContinue
}

foreach ($f in @('data\watchdog.pid', 'data\bot.pid')) {
    $p = Join-Path $Root $f
    if (Test-Path $p) { Remove-Item $p -Force -ErrorAction SilentlyContinue }
}

Write-Step 'CursorBot stopped.'

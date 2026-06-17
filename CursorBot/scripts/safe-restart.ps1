# Safe CursorBot restart: backup dist, build, graceful stop, health check, rollback on failure.
# Preserves data/state.json (Cursor sessions, lastInboxId, pending runs).

param(
    [int]$HealthTimeoutSec = 30,
    [int]$StopTimeoutSec = 15,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

function Write-Step([string]$Message) {
    Write-Host ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Message) -ForegroundColor Cyan
}

function Read-DotEnv([string]$Path) {
    $cfg = @{}
    if (-not (Test-Path $Path)) { return $cfg }
    Get-Content $Path | ForEach-Object {
        $t = $_.Trim()
        if ($t -and -not $t.StartsWith('#') -and $t.Contains('=')) {
            $p = $t.Split('=', 2)
            $cfg[$p[0].Trim()] = $p[1].Trim()
        }
    }
    return $cfg
}

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
    if (
        $CommandLine -like "*$Root*" -or
        $CommandLine -like '*SuperMessenger\CursorBot*' -or
        $CommandLine -like '*SuperMessenger/CursorBot*'
    ) {
        return $true
    }
    # run.cmd / npm: относительный путь scripts\watchdog.ps1 без полного Root в CLI
    return (
        $CommandLine -like '*scripts\watchdog.ps1*' -or
        $CommandLine -like '*scripts/watchdog.ps1*'
    )
}

function Get-BotProcesses {
    $found = @{}
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { Test-IsOurBotProcess $_.CommandLine } |
        ForEach-Object { $found[$_.ProcessId] = $_ }
    $botPidFile = Join-Path $Root 'data\bot.pid'
    if (Test-Path $botPidFile) {
        $botPid = 0
        [void][int]::TryParse((Get-Content $botPidFile -Raw).Trim(), [ref]$botPid)
        if ($botPid -gt 0 -and -not $found.ContainsKey($botPid)) {
            $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $botPid" -ErrorAction SilentlyContinue
            if ($proc) { $found[$botPid] = $proc }
        }
    }
    $found.Values
}

function Get-WatchdogProcesses {
    $found = @{}
    Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object { Test-IsOurWatchdogProcess $_.CommandLine } |
        ForEach-Object { $found[$_.ProcessId] = $_ }
    $watchdogPidFile = Join-Path $Root 'data\watchdog.pid'
    if (Test-Path $watchdogPidFile) {
        $watchdogPid = 0
        [void][int]::TryParse((Get-Content $watchdogPidFile -Raw).Trim(), [ref]$watchdogPid)
        if ($watchdogPid -gt 0 -and -not $found.ContainsKey($watchdogPid)) {
            $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $watchdogPid" -ErrorAction SilentlyContinue
            if ($proc) { $found[$watchdogPid] = $proc }
        }
    }
    $found.Values
}

function Stop-WatchdogGracefully {
    foreach ($proc in @(Get-WatchdogProcesses)) {
        Write-Step "Stopping watchdog PID $($proc.ProcessId)…"
        Stop-Process -Id $proc.ProcessId -ErrorAction SilentlyContinue
    }
    $pidFile = Join-Path $Root 'data\watchdog.pid'
    if (Test-Path $pidFile) { Remove-Item $pidFile -Force -ErrorAction SilentlyContinue }
}

function Get-BotProcess {
    Get-BotProcesses | Select-Object -First 1
}

function Send-OwnerNotification([string]$Kind) {
    if ([string]::IsNullOrWhiteSpace($Kind)) { return }

    $cli = Join-Path $Root 'dist\notify-owner-cli.js'
    if (-not (Test-Path $cli)) {
        Write-Step 'WARN: notify-owner-cli.js not found — skip owner notification'
        return
    }

    try {
        & node $cli $Kind
        if ($LASTEXITCODE -ne 0) {
            Write-Step "WARN: owner notification failed (exit $LASTEXITCODE)"
        }
    } catch {
        Write-Step "WARN: owner notification error: $_"
    }
}

function Test-BotHealth([hashtable]$Cfg) {
    if (-not $Cfg.SUPRA_BASE_URL -or -not $Cfg.SUPRA_BOT_LOGIN -or -not $Cfg.SUPRA_BOT_TOKEN) {
        throw 'Missing SUPRA_* vars in .env for health check'
    }
    $base = $Cfg.SUPRA_BASE_URL.Trim().TrimEnd('/')
    $login = [uri]::EscapeDataString($Cfg.SUPRA_BOT_LOGIN.Trim())
    $token = [uri]::EscapeDataString($Cfg.SUPRA_BOT_TOKEN.Trim())
    $uri = "$base/api/bot-api/me?login=$login&token=$token"
    $r = Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec 10
    if (-not $r.success) { throw "Health check failed: $($r.error)" }
}

function Stop-BotGracefully([int]$TimeoutSec) {
    $procs = @(Get-BotProcesses)
    if (-not $procs.Count) {
        Write-Step 'Bot process not running'
        return
    }

    foreach ($proc in $procs) {
        Write-Step "Stopping bot PID $($proc.ProcessId) (graceful)..."
        Stop-Process -Id $proc.ProcessId -ErrorAction SilentlyContinue
    }

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (-not @(Get-BotProcesses).Count) {
            Write-Step 'Bot stopped'
            return
        }
        Start-Sleep -Milliseconds 500
    }

    Write-Step 'Graceful stop timed out, force kill'
    foreach ($proc in @(Get-BotProcesses)) {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Start-BotDetached {
    if (@(Get-WatchdogProcesses).Count -gt 0) {
        Write-Step 'Watchdog already running — skip second start'
        return
    }
    $watchdog = Join-Path $Root 'scripts\watchdog.ps1'
    if (-not (Test-Path $watchdog)) {
        throw "watchdog.ps1 not found: $watchdog"
    }
    Start-Process -FilePath 'powershell.exe' `
        -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $watchdog `
        -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
}

if (-not (Test-Path '.env')) {
    throw '.env not found. Copy .env.example and configure first.'
}

$backupDir = $null
$distDir = Join-Path $Root 'dist'

if ($SkipBuild) {
    Write-Step 'Quick restart (без пересборки)'
} else {
    $backupDir = Join-Path $Root ('dist.backup.' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
    if (Test-Path $distDir) {
        Write-Step "Backup current dist -> $backupDir"
        Copy-Item $distDir $backupDir -Recurse -Force
    }

    Write-Step 'Building new version...'
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }
}

$envCfg = Read-DotEnv (Join-Path $Root '.env')
Stop-WatchdogGracefully
Stop-BotGracefully -TimeoutSec $StopTimeoutSec

Write-Step 'Starting bot (watchdog supervisor)…'
Start-BotDetached

$healthy = $false
$deadline = (Get-Date).AddSeconds($HealthTimeoutSec)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    try {
        Test-BotHealth $envCfg
        $healthy = $true
        break
    } catch {
        Write-Host "  waiting: $_" -ForegroundColor DarkGray
    }
}

if ($healthy) {
    Send-OwnerNotification 'restarted'
    $mode = if ($SkipBuild) { 'quick' } else { 'full' }
    Write-Step "Restart OK ($mode, health check passed). Watchdog supervises auto-recovery. data/state.json preserved."
    exit 0
}

if ($SkipBuild) {
    throw 'Health check failed after quick restart'
}

Write-Step 'Health check failed — rolling back dist and restarting previous version'
Stop-BotGracefully -TimeoutSec $StopTimeoutSec
if (Test-Path $backupDir) {
    if (Test-Path $distDir) { Remove-Item $distDir -Recurse -Force }
    Copy-Item $backupDir $distDir -Recurse -Force
    Start-BotDetached
    Start-Sleep -Seconds 3
    try {
        Test-BotHealth $envCfg
        Write-Step 'Rollback OK — previous version is running'
        exit 2
    } catch {
        throw "Rollback started but health check still failing: $_"
    }
}

throw 'Health check failed and no backup available'

# Safe CursorBot restart: backup dist, build, graceful stop, health check, rollback on failure.
# Preserves data/state.json (Cursor sessions, lastInboxId, pending runs).

param(
    [int]$HealthTimeoutSec = 30,
    [int]$StopTimeoutSec = 15
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

function Get-BotProcesses {
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.CommandLine -and
            $_.CommandLine -like "*$Root*" -and
            ($_.CommandLine -like '*dist\index.js*' -or $_.CommandLine -like '*CursorBot*')
        }
}

function Get-WatchdogProcesses {
    Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.CommandLine -and
            $_.CommandLine -like "*$Root*" -and
            $_.CommandLine -like '*watchdog.ps1*'
        }
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
    $watchdog = Join-Path $Root 'scripts\watchdog.ps1'
    if (-not (Test-Path $watchdog)) {
        throw "watchdog.ps1 not found: $watchdog"
    }
    Start-Process -FilePath 'powershell.exe' `
        -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $watchdog `
        -WorkingDirectory $Root -WindowStyle Minimized | Out-Null
}

if (-not (Test-Path '.env')) {
    throw '.env not found. Copy .env.example and configure first.'
}

$backupDir = Join-Path $Root ('dist.backup.' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$distDir = Join-Path $Root 'dist'

if (Test-Path $distDir) {
    Write-Step "Backup current dist -> $backupDir"
    Copy-Item $distDir $backupDir -Recurse -Force
}

Write-Step 'Building new version...'
& npm run build
if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }

$envCfg = Read-DotEnv (Join-Path $Root '.env')
Send-OwnerNotification 'restart'
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
    Write-Step 'Restart OK (health check passed). Watchdog supervises auto-recovery. data/state.json preserved.'
    exit 0
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

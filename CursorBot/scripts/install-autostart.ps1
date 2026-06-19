# Registers CursorBot autostart as a Scheduled Task.
#
# The task launches scripts/watchdog.ps1 in a hidden window at user logon, with
# auto-restart on failure. The watchdog in turn relaunches the node bot process after
# any non-zero exit code (including code 42 "restart requested by signal").
#
# This way the bot survives reboot / re-logon and does not depend on an open console
# window. Admin rights are NOT required (task lives in the current user profile,
# LogonType Interactive).
param(
    [string]$TaskName = 'CursorBot Watchdog',
    [switch]$Start
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$watchdog = Join-Path $Root 'scripts\watchdog.ps1'
if (-not (Test-Path $watchdog)) { throw "watchdog.ps1 not found: $watchdog" }

$userId = "$env:USERDOMAIN\$env:USERNAME"

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $watchdog) `
    -WorkingDirectory $Root

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $userId

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1)

$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName `
    -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
    -Description 'Autostart and supervisor for CursorBot. Starts the bot at logon and after a crash.' `
    -Force | Out-Null

Write-Host ("[autostart] Task '{0}' registered (trigger: at logon, restart on failure)." -f $TaskName) -ForegroundColor Green
Write-Host "[autostart] The bot will start automatically at the next logon." -ForegroundColor Green

if ($Start) {
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "[autostart] Task started now (-Start)." -ForegroundColor Green
} else {
    Write-Host ("[autostart] To start now: Start-ScheduledTask -TaskName '{0}' (or re-login)." -f $TaskName) -ForegroundColor DarkGray
}

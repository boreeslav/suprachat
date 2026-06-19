# Удаляет автозапуск CursorBot (Scheduled Task), созданный install-autostart.ps1.
param(
    [string]$TaskName = 'CursorBot Watchdog'
)

$ErrorActionPreference = 'Stop'

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $existing) {
    Write-Host ("[autostart] Задача '{0}' не найдена — нечего удалять." -f $TaskName) -ForegroundColor DarkGray
    return
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host ("[autostart] Задача '{0}' удалена." -f $TaskName) -ForegroundColor Green

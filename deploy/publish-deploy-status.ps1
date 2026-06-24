# Posts deploy progress to SuperMessenger chat via Bot API.
# Target: tmp/deploy/status-target.json (written by CursorBot on each incoming message).
# Uses one editable message (sendMessage once, then editMessage).
#
# Design notes (why this is shaped the way it is):
# - Status is published to the SAME prod server that is being redeployed. While the
#   container is rebuilding (docker compose up --build, 5-20 min) the API is down and
#   every call returns 404/502. To avoid request spam and noisy warnings:
#     * config is loaded ONCE (not re-read from disk on every call);
#     * during the remote rebuild we SUSPEND publishing (buffer text, send nothing);
#     * on the first network failure we go OFFLINE quietly (one short warn, then silent);
#     * a single FLUSH after the server is back delivers the final status.

function Get-DeployStatusTargetPath {
    if ($script:DeployRoot) {
        return Join-Path $script:DeployRoot 'tmp\deploy\status-target.json'
    }
    $root = Split-Path $PSScriptRoot -Parent
    return Join-Path $root 'tmp\deploy\status-target.json'
}

function Read-DeployStatusConfig {
    $targetPath = Get-DeployStatusTargetPath
    $cfg = @{
        BaseUrl = $env:SM_DEPLOY_STATUS_BASE_URL
        BotLogin = $env:SM_DEPLOY_STATUS_BOT_LOGIN
        BotToken = $env:SM_DEPLOY_STATUS_BOT_TOKEN
        ChatId = $env:SM_DEPLOY_STATUS_CHAT_ID
        UserLogin = $env:SM_DEPLOY_STATUS_USER_LOGIN
    }

    if (Test-Path $targetPath) {
        try {
            $json = Get-Content $targetPath -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($json.baseUrl) { $cfg.BaseUrl = [string]$json.baseUrl }
            if ($json.botLogin) { $cfg.BotLogin = [string]$json.botLogin }
            if ($json.botToken) { $cfg.BotToken = [string]$json.botToken }
            if ($json.chatId) { $cfg.ChatId = [string]$json.chatId }
            if ($json.userLogin) { $cfg.UserLogin = [string]$json.userLogin }
        } catch {
            Write-Host "  [status] WARN: cannot read $targetPath : $_" -ForegroundColor Yellow
        }
    }

    return $cfg
}

# Loads config once and resets all publisher state. Call at the start of a deploy.
function Reset-DeployStatusPublisher {
    $script:DeployStatusConfig = Read-DeployStatusConfig
    $script:DeployStatusMessageId = $null
    $script:DeployStatusChatId = $null
    $script:DeployStatusLastText = ''
    $script:DeployStatusPending = ''
    $script:DeployStatusSuspended = $false
    $script:DeployStatusOffline = $false

    $cfg = $script:DeployStatusConfig
    if ([string]::IsNullOrWhiteSpace($cfg.BaseUrl) -or
        [string]::IsNullOrWhiteSpace($cfg.BotLogin) -or
        [string]::IsNullOrWhiteSpace($cfg.BotToken)) {
        $script:DeployStatusEnabled = $false
    } elseif ([string]::IsNullOrWhiteSpace($cfg.UserLogin) -and [string]::IsNullOrWhiteSpace($cfg.ChatId)) {
        $script:DeployStatusEnabled = $false
    } else {
        $script:DeployStatusEnabled = $true
    }
}

# Single attempt, short timeout. Returns the response object, or $null on any failure.
# Does NOT print warnings - the caller decides how to surface offline state.
function Invoke-DeployStatusApi {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Endpoint,
        [Parameter(Mandatory = $true)]
        [hashtable]$Body
    )

    $cfg = $script:DeployStatusConfig
    $base = $cfg.BaseUrl.Trim().TrimEnd('/')
    $login = [uri]::EscapeDataString($cfg.BotLogin.Trim())
    $token = [uri]::EscapeDataString($cfg.BotToken.Trim())
    $uri = "$base/api/bot-api/$Endpoint?login=$login&token=$token"
    $jsonBody = $Body | ConvertTo-Json -Compress

    try {
        return Invoke-RestMethod -Uri $uri -Method Post -Body $jsonBody `
            -ContentType 'application/json; charset=utf-8' -TimeoutSec 8
    } catch {
        return $null
    }
}

# Sends (first call) or edits (subsequent) the single status message.
# Returns $true on success, $false on failure.
function Send-DeployStatusMessage {
    param([Parameter(Mandatory = $true)][string]$Text)

    $cfg = $script:DeployStatusConfig

    if ([string]::IsNullOrWhiteSpace($script:DeployStatusMessageId)) {
        $body = [ordered]@{ text = $Text }
        if (-not [string]::IsNullOrWhiteSpace($cfg.UserLogin)) {
            $body['userLogin'] = $cfg.UserLogin.Trim()
        } else {
            $body['chatId'] = $cfg.ChatId.Trim()
        }
        $resp = Invoke-DeployStatusApi -Endpoint 'sendMessage' -Body $body
        if ($resp -and $resp.success -and $resp.messageId) {
            $script:DeployStatusMessageId = [string]$resp.messageId
            if ($resp.chatId) { $script:DeployStatusChatId = [string]$resp.chatId }
            $script:DeployStatusLastText = $Text
            return $true
        }
        return $false
    }

    if ([string]::IsNullOrWhiteSpace($script:DeployStatusChatId)) { return $false }

    $editBody = @{
        chatId = $script:DeployStatusChatId
        messageId = $script:DeployStatusMessageId
        text = $Text
    }
    $resp = Invoke-DeployStatusApi -Endpoint 'editMessage' -Body $editBody
    if ($resp -and $resp.success) {
        $script:DeployStatusLastText = $Text
        return $true
    }
    return $false
}

function Publish-DeployStatus {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if (-not $script:DeployStatusEnabled) { return }
    if ([string]::IsNullOrWhiteSpace($Message)) { return }

    $text = $Message.Trim()
    if ($text -eq $script:DeployStatusLastText) { return }

    # Always remember the latest text so a later flush can deliver it.
    $script:DeployStatusPending = $text

    # While the server is rebuilding we buffer only - no network calls at all.
    if ($script:DeployStatusSuspended) { return }
    # Once we know the server is down, stay silent and just keep buffering.
    if ($script:DeployStatusOffline) { return }

    if (-not (Send-DeployStatusMessage $text)) {
        $script:DeployStatusOffline = $true
        Write-Host "  [status] offline - буферизую статус, отправлю после восстановления сервера" -ForegroundColor DarkGray
    }
}

# Enter the "quiet window": buffer status, send nothing. Use around remote rebuild.
function Suspend-DeployStatus {
    if (-not $script:DeployStatusEnabled) { return }
    $script:DeployStatusSuspended = $true
}

# Leave the quiet window and try to deliver the latest buffered status.
function Resume-DeployStatus {
    if (-not $script:DeployStatusEnabled) { return }
    $script:DeployStatusSuspended = $false
    $script:DeployStatusOffline = $false
    Flush-DeployStatus
}

# Deliver the latest buffered status in a single call (best-effort).
function Flush-DeployStatus {
    if (-not $script:DeployStatusEnabled) { return }
    $script:DeployStatusSuspended = $false
    $pending = $script:DeployStatusPending
    if ([string]::IsNullOrWhiteSpace($pending)) { return }
    if ($pending -eq $script:DeployStatusLastText) { return }
    if (Send-DeployStatusMessage $pending) {
        $script:DeployStatusOffline = $false
    }
}

function Send-DeployStatus {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Key,
        [object[]]$Args = @()
    )

    $templates = @{
        started = 'Деплой начат -> {0}'
        minify_client = 'Минификация клиентских скриптов (esbuild)...'
        vendor_build = 'Сборка vendor-бандлов (webcrypto, signalr)...'
        copy_sources = 'Копирование исходников в deploy-дерево...'
        release_version = 'Версия релиза: {0}'
        remote_wait = 'Удаленный деплой: Docker build может занять 5-20 мин...'
        archive_ready = 'Архив готов: {0} MB'
        archive_uploaded = 'Архив загружен на сервер'
        script_uploaded = 'Скрипт деплоя загружен на сервер'
        docker_built = 'Docker-образ собран'
        done = 'Деплой завершен: {0} (v{1})'
        failed = 'Деплой прерван: {0}'
    }

    if (-not $templates.ContainsKey($Key)) {
        Publish-DeployStatus $Key
        return
    }

    $template = $templates[$Key]
    if ($Args -and $Args.Count -gt 0) {
        Publish-DeployStatus ([string]::Format($template, $Args))
    } else {
        Publish-DeployStatus $template
    }
}

function Publish-RemoteDeployLine {
    param([string]$Line)

    if ([string]::IsNullOrWhiteSpace($Line)) { return }
    $text = $Line.Trim()

    # During the rebuild we only watch for the "image built" marker; everything else
    # is buffered by Publish-DeployStatus (which is suspended in this window anyway).
    if ($text -match 'Image .+ Built') {
        Send-DeployStatus docker_built
        return
    }
    if ($text -match '^\[\d{2}:\d{2}:\d{2}\] (.+)$') {
        Publish-DeployStatus ("[сервер] " + $Matches[1])
    }
}

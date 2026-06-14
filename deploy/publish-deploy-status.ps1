# Posts deploy progress to SuperMessenger chat via Bot API.
# Target: tmp/deploy/status-target.json (written by CursorBot on each incoming message).
# Uses one editable message (sendMessage once, then editMessage).

function Get-DeployStatusTargetPath {
    if ($script:DeployRoot) {
        return Join-Path $script:DeployRoot 'tmp\deploy\status-target.json'
    }
    $root = Split-Path $PSScriptRoot -Parent
    return Join-Path $root 'tmp\deploy\status-target.json'
}

function Get-DeployStatusConfig {
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

function Reset-DeployStatusPublisher {
    $script:DeployStatusMessageId = $null
    $script:DeployStatusChatId = $null
    $script:DeployStatusLastText = ''
}

function Invoke-DeployStatusApi {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Endpoint,
        [Parameter(Mandatory = $true)]
        [hashtable]$Body
    )

    $cfg = Get-DeployStatusConfig
    if ([string]::IsNullOrWhiteSpace($cfg.BaseUrl) -or
        [string]::IsNullOrWhiteSpace($cfg.BotLogin) -or
        [string]::IsNullOrWhiteSpace($cfg.BotToken)) {
        return $null
    }

    $base = $cfg.BaseUrl.Trim().TrimEnd('/')
    $login = [uri]::EscapeDataString($cfg.BotLogin.Trim())
    $token = [uri]::EscapeDataString($cfg.BotToken.Trim())
    $uri = "$base/api/bot-api/$Endpoint?login=$login&token=$token"
    $jsonBody = $Body | ConvertTo-Json -Compress

    $maxAttempts = 4
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        try {
            return Invoke-RestMethod -Uri $uri -Method Post -Body $jsonBody `
                -ContentType 'application/json; charset=utf-8' -TimeoutSec 20
        } catch {
            $msg = "$_"
            $retryable = $msg -match '502|503|504|429|timeout|timed out|connection'
            if (-not $retryable -or $attempt -eq $maxAttempts) {
                Write-Host "  [status] WARN: $Endpoint failed: $msg" -ForegroundColor Yellow
                return $null
            }
            Start-Sleep -Seconds (2 * $attempt)
        }
    }

    return $null
}

function Publish-DeployStatus {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if ([string]::IsNullOrWhiteSpace($Message)) { return }

    $text = $Message.Trim()
    if ($text -eq $script:DeployStatusLastText) { return }

    $cfg = Get-DeployStatusConfig
    $recipient = $null
    if (-not [string]::IsNullOrWhiteSpace($cfg.UserLogin)) {
        $recipient = @{ userLogin = $cfg.UserLogin.Trim() }
    } elseif (-not [string]::IsNullOrWhiteSpace($cfg.ChatId)) {
        $recipient = @{ chatId = $cfg.ChatId.Trim() }
    } else {
        return
    }

    if ([string]::IsNullOrWhiteSpace($script:DeployStatusMessageId)) {
        $body = [ordered]@{ text = $text }
        foreach ($key in $recipient.Keys) {
            $body[$key] = $recipient[$key]
        }
        $resp = Invoke-DeployStatusApi -Endpoint 'sendMessage' -Body $body
        if ($resp -and $resp.success -and $resp.messageId) {
            $script:DeployStatusMessageId = [string]$resp.messageId
            if ($resp.chatId) { $script:DeployStatusChatId = [string]$resp.chatId }
            $script:DeployStatusLastText = $text
        }
        return
    }

    if ([string]::IsNullOrWhiteSpace($script:DeployStatusChatId)) { return }

    $editBody = @{
        chatId = $script:DeployStatusChatId
        messageId = $script:DeployStatusMessageId
        text = $text
    }
    $resp = Invoke-DeployStatusApi -Endpoint 'editMessage' -Body $editBody
    if ($resp -and $resp.success) {
        $script:DeployStatusLastText = $text
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

    if ($text -match '^\[\d{2}:\d{2}:\d{2}\] (.+)$') {
        Publish-DeployStatus ("[сервер] " + $Matches[1])
        return
    }
    if ($text -match 'Image .+ Built') {
        Send-DeployStatus docker_built
    }
}

# SuperMessenger - deploy to remote Linux (Docker) with live PuTTY output
# Usage: .\deploy\deploy.ps1  or  deploy.cmd
# Settings: tmp\deploy\deploy.env (see tmp\deploy\deploy.env.example)
# Build artifacts: tmp\deploy\ (archive, staging tree, remote script)

param(
    [string]$ServerHost = '',
    [string]$ServerUser = '',
    [string]$ServerPassword = '',
    [int]$AppPort = 0,
    [string]$AdminLogin = '',
    [string]$AdminPassword = '',
    [string]$PublicUrl = '',
    [string]$Protocol = '',
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$DeployDir = $PSScriptRoot
$script:DeployRoot = $Root

. (Join-Path $DeployDir 'deploy.config.ps1')
. (Join-Path $DeployDir 'publish-deploy-status.ps1')

Write-Host ""
Write-Host "Loading deploy configuration..." -ForegroundColor DarkGray
$deployConfig = Import-DeployConfig

$ServerHost = Resolve-DeploySetting -Config $deployConfig -Name 'SM_DEPLOY_HOST' -ParamValue $ServerHost -Bound:$PSBoundParameters.ContainsKey('ServerHost')
$ServerUser = Resolve-DeploySetting -Config $deployConfig -Name 'SM_DEPLOY_USER' -ParamValue $ServerUser -Bound:$PSBoundParameters.ContainsKey('ServerUser')
$ServerPassword = Resolve-DeploySetting -Config $deployConfig -Name 'SM_DEPLOY_PASSWORD' -ParamValue $ServerPassword -Bound:$PSBoundParameters.ContainsKey('ServerPassword')
if (-not $PSBoundParameters.ContainsKey('AppPort') -or $AppPort -le 0) {
    $AppPort = [int]$deployConfig['SM_DEPLOY_APP_PORT']
}
$AdminLogin = Resolve-DeploySetting -Config $deployConfig -Name 'SM_DEPLOY_ADMIN_LOGIN' -ParamValue $AdminLogin -Bound:$PSBoundParameters.ContainsKey('AdminLogin')
$AdminPassword = Resolve-DeploySetting -Config $deployConfig -Name 'SM_DEPLOY_ADMIN_PASSWORD' -ParamValue $AdminPassword -Bound:$PSBoundParameters.ContainsKey('AdminPassword')
$PublicUrl = Resolve-DeploySetting -Config $deployConfig -Name 'SM_DEPLOY_PUBLIC_URL' -ParamValue $PublicUrl -Bound:$PSBoundParameters.ContainsKey('PublicUrl')
$Protocol = Resolve-DeploySetting -Config $deployConfig -Name 'SM_DEPLOY_PROTOCOL' -ParamValue $Protocol -Bound:$PSBoundParameters.ContainsKey('Protocol')

# Тип подключения клиента: http (legacy: node-forge, sessionStorage, без SW)
# или https (secure: native WebCrypto, персистентный шифрованный стор, Service Worker).
# Если явно не задан — определяется по схеме публичного URL, иначе 'auto' (решает браузер по isSecureContext).
$ClientProtocol = $Protocol.Trim().ToLowerInvariant()
if ([string]::IsNullOrWhiteSpace($ClientProtocol)) {
    if ($PublicUrl -match '^https://') { $ClientProtocol = 'https' }
    elseif ($PublicUrl -match '^http://') { $ClientProtocol = 'http' }
    else { $ClientProtocol = 'auto' }
}
if ($ClientProtocol -notin @('http', 'https', 'auto')) {
    throw "SM_DEPLOY_PROTOCOL must be http, https or auto (got '$ClientProtocol')"
}
Write-Host "  Client protocol mode: $ClientProtocol" -ForegroundColor DarkGray

if ([string]::IsNullOrWhiteSpace($ServerHost)) { throw 'Server host is required (SM_DEPLOY_HOST)' }
if ([string]::IsNullOrWhiteSpace($ServerUser)) { throw 'SSH user is required (SM_DEPLOY_USER)' }
if ([string]::IsNullOrWhiteSpace($ServerPassword)) { throw 'SSH password is required (SM_DEPLOY_PASSWORD)' }
if ($AppPort -le 0) { throw 'App port is required (SM_DEPLOY_APP_PORT)' }
if ([string]::IsNullOrWhiteSpace($AdminLogin)) { throw 'Admin login is required (SM_DEPLOY_ADMIN_LOGIN)' }
if ([string]::IsNullOrWhiteSpace($AdminPassword)) { throw 'Admin password is required (SM_DEPLOY_ADMIN_PASSWORD)' }

Write-Host "  Target: ${ServerUser}@${ServerHost}:${AppPort}" -ForegroundColor DarkGray
Send-DeployStatus started @("${ServerUser}@${ServerHost}:${AppPort}")

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Message) -ForegroundColor Cyan
    Publish-DeployStatus $Message
}

function Resolve-PuttyExe([string]$Name) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $paths = @(
        "${env:ProgramFiles}\PuTTY\$Name.exe",
        "${env:ProgramFiles(x86)}\PuTTY\$Name.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

function Install-Putty {
    Write-Step "PuTTY not found - installing via winget..."
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "Install PuTTY from https://www.putty.org/"
    }
    & winget install --id PuTTY.PuTTY -e --accept-package-agreements --accept-source-agreements
}

function Get-PlinkExtraArgs([string]$TargetHost) {
    $args = @()
    $hk = $env:SM_DEPLOY_HOSTKEY
    if ($TargetHost -eq $deployConfig['SM_DEPLOY_HOST_NEW'] -and -not [string]::IsNullOrWhiteSpace($deployConfig['SM_DEPLOY_HOSTKEY_NEW'])) {
        $hk = $deployConfig['SM_DEPLOY_HOSTKEY_NEW']
    }
    if (-not [string]::IsNullOrWhiteSpace($hk)) {
        $args += @('-hostkey', $hk)
    }
    return $args
}

function Invoke-Plink {
    param([string]$Plink, [string]$Remote, [string[]]$ExtraArgs, [string]$RemoteCmd)
    $base = @('-pw', $ServerPassword, '-batch') + $ExtraArgs
    if ($RemoteCmd) {
        return & $Plink @base $Remote $RemoteCmd 2>&1
    }
    return & $Plink @base $Remote 2>&1
}

function Ensure-PuttyHostKey([string]$Plink, [string]$Remote, [string[]]$ExtraArgs) {
    Write-Step "SSH host key check: $Remote"
    $null = Invoke-Plink -Plink $Plink -Remote $Remote -ExtraArgs $ExtraArgs -RemoteCmd 'echo ok'
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Accepting host key (first connect)..." -ForegroundColor Yellow
        cmd /c "echo y| `"$Plink`" -pw $ServerPassword $Remote exit" 2>$null
    }
}

function Invoke-ServerHttpCheck([string]$Plink, [string]$Remote, [string[]]$ExtraArgs, [string]$BashCommand, [string]$Label) {
    Invoke-Plink -Plink $Plink -Remote $Remote -ExtraArgs $ExtraArgs -RemoteCmd $BashCommand | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed on server (127.0.0.1:$AppPort)"
    }
}

function Build-ClientAssets([string]$MessengerDir) {
    $buildScript = Join-Path $MessengerDir "build-client-assets.ps1"
    if (-not (Test-Path $buildScript)) {
        throw "Client assets build script not found: $buildScript"
    }
    Write-Host "  Minifying client scripts (esbuild)..." -ForegroundColor DarkGray
    Send-DeployStatus minify_client
    & powershell -NoProfile -ExecutionPolicy Bypass -File $buildScript
    if ($LASTEXITCODE -ne 0) { throw "build-client-assets.ps1 failed: $LASTEXITCODE" }
    $minMessenger = Join-Path $MessengerDir "supra-messenger.min.js"
    if (-not (Test-Path $minMessenger)) { throw "Missing minified bundle: $minMessenger" }
    $kb = [math]::Round((Get-Item $minMessenger).Length / 1KB, 1)
    Write-Host "  supra-messenger.min.js: $kb KB" -ForegroundColor DarkGray
}

function Build-WebCryptoBundle([string]$MessengerDir) {
    $cryptoDir = $MessengerDir
    $buildScript = Join-Path $cryptoDir "build-webcrypto.ps1"
    if (-not (Test-Path $buildScript)) {
        throw "Web Crypto build script not found: $buildScript"
    }
    Write-Host "  Building vendor assets (webcrypto, signalr)..." -ForegroundColor DarkGray
    Send-DeployStatus vendor_build
    & powershell -NoProfile -ExecutionPolicy Bypass -File $buildScript
    if ($LASTEXITCODE -ne 0) { throw "build-webcrypto.ps1 failed: $LASTEXITCODE" }
    $bundle = Join-Path $cryptoDir "vendor\supra-webcrypto.bundle.js"
    if (-not (Test-Path $bundle)) { throw "Missing bundle: $bundle" }
    $signalr = Join-Path $cryptoDir "vendor\signalr.min.js"
    if (-not (Test-Path $signalr)) { throw "Missing SignalR bundle: $signalr" }
    $markdown = Join-Path $cryptoDir "vendor\supra-markdown.bundle.js"
    if (-not (Test-Path $markdown)) { throw "Missing Markdown bundle: $markdown" }
    $qrcode = Join-Path $cryptoDir "vendor\qrcode.min.js"
    if (-not (Test-Path $qrcode)) { throw "Missing QRCode bundle: $qrcode" }
    $kb = [math]::Round((Get-Item $bundle).Length / 1KB, 1)
    $signalrKb = [math]::Round((Get-Item $signalr).Length / 1KB, 1)
    $markdownKb = [math]::Round((Get-Item $markdown).Length / 1KB, 1)
    Write-Host "  Web Crypto bundle: $kb KB, SignalR: $signalrKb KB, Markdown: $markdownKb KB" -ForegroundColor DarkGray
}

function Copy-ProjectSources([string]$DestRoot) {
    Copy-Item (Join-Path $Root "Dockerfile") (Join-Path $DestRoot "Dockerfile") -Force
    Copy-Item (Join-Path $Root "docker-compose.yml") (Join-Path $DestRoot "docker-compose.yml") -Force
    $srcFrom = Join-Path $Root "src"
    $srcTo = Join-Path $DestRoot "src"
    New-Item -ItemType Directory -Path $srcTo -Force | Out-Null
    Write-Host "  Copying src/ (skip bin, obj, .vs)..."
    Send-DeployStatus copy_sources
    $null = robocopy $srcFrom $srcTo /E /XD bin obj .vs /NFL /NDL /NJH /NJS /NP
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed: $LASTEXITCODE" }
}

function Build-DeployTree([string]$BuildDir) {
    # node_modules только в src — собираем бандлы там, в tmp копируем готовое дерево для архива.
    $sourceMessenger = Join-Path $Root "src\SuperMessenger.Web\wwwroot\messenger"
    Build-WebCryptoBundle $sourceMessenger
    Build-ClientAssets $sourceMessenger
    Copy-ProjectSources $BuildDir
    $webProjectDir = Join-Path $BuildDir "src\SuperMessenger.Web"
    $releaseInfo = Update-DeployRelease -Root $Root -WebProjectDir $webProjectDir
    $script:DeployAppVersion = $releaseInfo.Version
    Send-DeployStatus release_version @($releaseInfo.Version)
    Update-AssetUrls $BuildDir -AppVersion $releaseInfo.Version
}

function Invoke-RemoteDeployStream {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Plink,
        [Parameter(Mandatory = $true)]
        [string]$Remote,
        [string[]]$ExtraArgs = @(),
        [Parameter(Mandatory = $true)]
        [string]$RemoteCmd
    )

    # Publish the "build may take 5-20 min" notice, THEN go quiet: the server is the
    # same host we publish status to, and it is down during the rebuild. No requests
    # are sent until Resume-DeployStatus is called after the container is back.
    Send-DeployStatus remote_wait
    Suspend-DeployStatus

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $Plink
    $argList = @('-pw', $ServerPassword, '-batch') + $ExtraArgs + @($Remote, $RemoteCmd)
    $psi.Arguments = ($argList | ForEach-Object {
        if ($_ -match '\s') { '"' + ($_ -replace '"', '""') + '"' } else { $_ }
    }) -join ' '
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $proc = [Diagnostics.Process]::Start($psi)
    if (-not $proc) { throw 'Failed to start plink for remote deploy' }

    while (-not $proc.StandardOutput.EndOfStream) {
        $line = $proc.StandardOutput.ReadLine()
        if ($null -eq $line) { continue }
        Write-Host $line
        Publish-RemoteDeployLine $line
    }

    $stderr = $proc.StandardError.ReadToEnd()
    if (-not [string]::IsNullOrWhiteSpace($stderr)) {
        foreach ($eline in ($stderr -split "`r?`n")) {
            if (-not $eline.Trim()) { continue }
            Write-Host $eline
            Publish-RemoteDeployLine $eline
        }
    }

    $proc.WaitForExit()
    return $proc.ExitCode
}

function Write-BuildManifest([string]$WwwRoot, [long]$BuildNumber, [string]$AppVersion) {
    $manifestPath = Join-Path $WwwRoot "build-manifest.json"
    $payload = [ordered]@{
        build = $BuildNumber
        swVersion = $BuildNumber
        appVersion = $AppVersion
        publishedAt = (Get-Date).ToUniversalTime().ToString('o')
    }
    $json = ($payload | ConvertTo-Json -Compress)
    [System.IO.File]::WriteAllText($manifestPath, $json, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  build-manifest.json: build=$BuildNumber appVersion=$AppVersion" -ForegroundColor DarkGray
}

function Update-AssetUrls([string]$DestRoot, [string]$AppVersion = '') {
    $www = Join-Path $DestRoot "src\SuperMessenger.Web\wwwroot"
    $cssPath = Join-Path $www "messenger\supra-messenger.css"
    $cryptoPath = Join-Path $www "messenger\vendor\supra-webcrypto.bundle.js"
    if (-not (Test-Path $cssPath)) { throw "Asset files missing: $cssPath" }
    if (-not (Test-Path $cryptoPath)) { throw "Web Crypto bundle missing: $cryptoPath" }
    $assetVer = (Get-FileHash $cssPath -Algorithm MD5).Hash.Substring(0, 12)
    $cryptoVer = (Get-FileHash $cryptoPath -Algorithm MD5).Hash.Substring(0, 12)

    $patchHtml = {
        param($path, $ver, $cryptoVer)
        if (-not (Test-Path $path)) { return }
        $html = [System.IO.File]::ReadAllText($path)
        $html = [regex]::Replace($html, '(href="/messenger/supra-messenger\.css)\?[^"]*(")', "`${1}?v=$ver`${2}")
        $html = [regex]::Replace($html, '(href="/messenger/app-script-cache\.js)\?[^"]*(")', "`${1}?v=$ver`${2}")
        $html = [regex]::Replace($html, '(href="/messenger/vendor/supra-webcrypto\.bundle\.js)\?[^"]*(")', "`${1}?v=$cryptoVer`${2}")
        $html = [regex]::Replace($html, '(href="/messenger/vendor/signalr\.min\.js)\?[^"]*(")', "`${1}?v=$ver`${2}")
        $html = [regex]::Replace($html, '(href="/messenger/supra-messenger\.js)\?[^"]*(")', "`${1}?v=$ver`${2}")
        $html = [regex]::Replace($html, '(src="/messenger/app-boot-timing\.js)\?[^"]*(")', "`${1}?v=$ver`${2}")
        $html = [regex]::Replace($html, '(src="/messenger/app-script-cache\.js)\?[^"]*(")', "`${1}?v=$ver`${2}")
        $html = [regex]::Replace($html, '(src="/messenger/app-splash\.js)\?[^"]*(")', "`${1}?v=$ver`${2}")
        $html = [regex]::Replace($html, '(src="/messenger/app-update-notifier\.js)\?[^"]*(")', "`${1}?v=$ver`${2}")
        $html = [regex]::Replace($html, '(src="/messenger/supra-messenger\.js)\?[^"]*(")', "`${1}?v=$ver`${2}")
        $html = [regex]::Replace($html, '(src="/messenger/supra-integration\.js)\?[^"]*(")', "`${1}?v=$ver`${2}")
        $html = [regex]::Replace($html, '(src="/messenger/supra-env\.js)\?[^"]*(")', "`${1}?v=$ver`${2}")
        $html = [regex]::Replace($html, '(src="/messenger/vendor/supra-webcrypto\.bundle\.js)\?[^"]*(")', "`${1}?v=$cryptoVer`${2}")
        $html = [regex]::Replace($html, '(src="/messenger/vendor/supra-webcrypto\.bundle\.js)(")', "`${1}?v=$cryptoVer`${2}")
        [System.IO.File]::WriteAllText($path, $html)
    }

    & $patchHtml (Join-Path $www "index.html") $assetVer $cryptoVer
    & $patchHtml (Join-Path $www "login.html") $assetVer $cryptoVer
    & $patchHtml (Join-Path $www "register.html") $assetVer $cryptoVer
    Write-Host "  Asset cache bust: css/js v=$assetVer, webcrypto v=$cryptoVer" -ForegroundColor DarkGray

    $scriptBuild = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

    $indexPath = Join-Path $www "index.html"
    if (Test-Path $indexPath) {
        $indexHtml = [System.IO.File]::ReadAllText($indexPath)
        $indexHtml = [regex]::Replace($indexHtml, '(<meta name="sm-build" content=")[^"]*(")', "`${1}$scriptBuild`${2}")
        $indexHtml = [regex]::Replace($indexHtml, "var proto = '[^']*';", "var proto = '$($script:ClientProtocol)';")
        # Bootstrap-скрипты должны bust'иться на каждый деплoy (не только при смене CSS-хеша).
        $bootstrapRe = '(?<prefix>(?:src|href)="/messenger/(?:app-boot-timing|app-update-notifier|app-script-cache|app-splash)\.js)\?[^"]*(")'
        # $1 — захваченная закрывающая кавычка; $2 в .NET — именованная группа prefix, не кавычка.
        $indexHtml = [regex]::Replace($indexHtml, $bootstrapRe, '${prefix}?v=' + $scriptBuild + '$1')
        [System.IO.File]::WriteAllText($indexPath, $indexHtml)
        Write-Host "  index.html sm-build: $scriptBuild, protocol: $ClientProtocol" -ForegroundColor DarkGray
    }

    foreach ($cacheName in @('app-script-cache.js', 'app-script-cache.min.js')) {
        $cachePath = Join-Path $www "messenger\$cacheName"
        if (-not (Test-Path $cachePath)) { continue }
        $js = [System.IO.File]::ReadAllText($cachePath)
        $js = [regex]::Replace($js, 'const BUILD_NUMBER = \d+;', "const BUILD_NUMBER = $scriptBuild;")
        [System.IO.File]::WriteAllText($cachePath, $js)
        Write-Host "  $cacheName build: $scriptBuild" -ForegroundColor DarkGray
    }

    # Версия кеша Service Worker = номеру сборки скриптов (старый кеш удаляется на activate)
    $swPath = Join-Path $www "sw.js"
    if (Test-Path $swPath) {
        $sw = [System.IO.File]::ReadAllText($swPath)
        $sw = [regex]::Replace($sw, 'const SW_VERSION = \d+;', "const SW_VERSION = $scriptBuild;")
        [System.IO.File]::WriteAllText($swPath, $sw)
        Write-Host "  Service Worker version: $scriptBuild" -ForegroundColor DarkGray
    }

    # Тип подключения клиента (secure/legacy выбор библиотек)
    $envPath = Join-Path $www "messenger\supra-env.js"
    if (Test-Path $envPath) {
        $envJs = [System.IO.File]::ReadAllText($envPath)
        $envJs = [regex]::Replace($envJs, "const DEPLOY_PROTOCOL = '[^']*';", "const DEPLOY_PROTOCOL = '$($script:ClientProtocol)';")
        [System.IO.File]::WriteAllText($envPath, $envJs)
        Write-Host "  supra-env protocol: $ClientProtocol" -ForegroundColor DarkGray
    }

    if (-not [string]::IsNullOrWhiteSpace($AppVersion)) {
        Write-BuildManifest $www $scriptBuild $AppVersion.Trim()
    }
}

function Build-RemoteScript([string]$OutPath) {
    $template = Get-Content (Join-Path $DeployDir "remote-deploy.sh") -Raw
    $script = $template `
        -replace '__REMOTE_DIR__', $RemoteDir `
        -replace '__ARCHIVE_NAME__', $ArchiveName `
        -replace '__APP_PORT__', "$AppPort" `
        -replace '__ADMIN_LOGIN__', $AdminLogin `
        -replace '__ADMIN_PASSWORD__', $AdminPassword `
        -replace '__PUBLIC_URL__', $PublicUrl `
        -replace '__SERVER_HOST__', $ServerHost
    [System.IO.File]::WriteAllText($OutPath, $script.Replace("`r`n", "`n"))
}

$RemoteDir = "/opt/supermessenger"
$ArchiveName = "supermessenger-deploy.tar.gz"
$TmpDeployDir = Join-Path $Root "tmp\deploy"
$BuildDir = Join-Path $TmpDeployDir "supermessenger-src"
$ArchivePath = Join-Path $TmpDeployDir $ArchiveName
$shPath = Join-Path $TmpDeployDir "sm-deploy.sh"

if (-not (Test-Path $TmpDeployDir)) {
    New-Item -ItemType Directory -Path $TmpDeployDir -Force | Out-Null
}

$script:DeployAppVersion = ''

Reset-DeployStatusPublisher

try {
if (-not $SkipBuild) {
Write-Step "Build deploy tree (tmp/deploy)"
. (Join-Path $DeployDir 'apply-release.ps1')
if (Test-Path $BuildDir) { Remove-Item $BuildDir -Recurse -Force }
New-Item -ItemType Directory -Path $BuildDir -Force | Out-Null
Build-DeployTree $BuildDir

Write-Step "Pack deploy archive"
Push-Location $BuildDir
tar -czf $ArchivePath *
Pop-Location
$archiveMb = [math]::Round((Get-Item $ArchivePath).Length / 1MB, 2)
Write-Host "  Archive size: $archiveMb MB (path: $ArchivePath)" -ForegroundColor DarkGray
Send-DeployStatus archive_ready @($archiveMb)
} else {
Write-Step "Reuse deploy archive (SkipBuild)"
if (-not (Test-Path $ArchivePath)) {
    throw "Deploy archive not found: $ArchivePath (run full deploy first)"
}
$archiveMb = [math]::Round((Get-Item $ArchivePath).Length / 1MB, 2)
Write-Host "  Archive size: $archiveMb MB (path: $ArchivePath)" -ForegroundColor DarkGray
}
Build-RemoteScript $shPath
$remote = "${ServerUser}@${ServerHost}"
$plinkExtra = Get-PlinkExtraArgs $ServerHost

$plink = Resolve-PuttyExe "plink"
$pscp = Resolve-PuttyExe "pscp"
if (-not $plink -or -not $pscp) {
    Install-Putty
    $plink = Resolve-PuttyExe "plink"
    $pscp = Resolve-PuttyExe "pscp"
}
if (-not $plink -or -not $pscp) { throw "plink/pscp not found after install" }
Write-Host "  plink: $plink" -ForegroundColor DarkGray
Write-Host "  pscp:  $pscp" -ForegroundColor DarkGray

Ensure-PuttyHostKey $plink $remote $plinkExtra

Write-Step "Upload archive"
& $pscp -pw $ServerPassword -batch @($plinkExtra) $ArchivePath "${remote}:/tmp/$ArchiveName"
if ($LASTEXITCODE -ne 0) { throw "pscp archive failed: $LASTEXITCODE" }
Send-DeployStatus archive_uploaded

Write-Step "Upload deploy script"
& $pscp -pw $ServerPassword -batch @($plinkExtra) $shPath "${remote}:/tmp/sm-deploy.sh"
if ($LASTEXITCODE -ne 0) { throw "pscp script failed: $LASTEXITCODE" }
Send-DeployStatus script_uploaded

Write-Step "Remote deploy (live output)"
Write-Host "  First Docker build: 5-20 min. Output streams below." -ForegroundColor Yellow
Write-Host ""

$remoteCmd = "chmod +x /tmp/sm-deploy.sh; bash /tmp/sm-deploy.sh"
$remoteExit = Invoke-RemoteDeployStream -Plink $plink -Remote $remote -ExtraArgs $plinkExtra -RemoteCmd $remoteCmd
if ($remoteExit -ne 0) { throw "plink deploy failed: $remoteExit" }

# Container is back up - leave the quiet window and deliver buffered status.
Resume-DeployStatus

function Invoke-ServerHttpCheckWithRetry {
    param(
        [string]$Plink,
        [string]$Remote,
        [string[]]$ExtraArgs,
        [string]$BashCommand,
        [string]$Label,
        [int]$Attempts = 8,
        [int]$DelaySec = 3
    )
    for ($i = 1; $i -le $Attempts; $i++) {
        try {
            Invoke-ServerHttpCheck $Plink $Remote $ExtraArgs $BashCommand $Label
            return
        } catch {
            if ($i -ge $Attempts) { throw $_ }
            Write-Host "  $Label not ready (attempt $i/$Attempts), retry in ${DelaySec}s..." -ForegroundColor Yellow
            Start-Sleep -Seconds $DelaySec
        }
    }
}

Write-Step "Verify HTTP"
# docker-compose binds APP_PORT to 127.0.0.1 only; checks must run on the server (or via PUBLIC_URL).
$serverAppBase = "http://127.0.0.1:${AppPort}"
Write-Host "  Docker publishes ${serverAppBase} (not ${ServerHost}:${AppPort} from this PC)" -ForegroundColor DarkGray

$cryptoPath = '/messenger/vendor/supra-webcrypto.bundle.js'
$cryptoCmd = 'f=$(mktemp); curl -sf --max-time 20 -o "$f" http://127.0.0.1:' + $AppPort + $cryptoPath + ' && test $(wc -c < "$f") -gt 50000 && grep -q SupraWebCryptoPolyfill "$f"; e=$?; rm -f "$f"; exit $e'
try {
    Invoke-ServerHttpCheckWithRetry $plink $remote $plinkExtra $cryptoCmd 'Web Crypto bundle'
    Write-Host "  OK ${serverAppBase}${cryptoPath}" -ForegroundColor Green
} catch {
    throw "Web Crypto bundle check failed: $_"
}

$loginCmd = 'curl -sf --max-time 20 -o /dev/null -w "%{http_code}" http://127.0.0.1:' + $AppPort + '/login.html | grep -q 200'
try {
    Invoke-ServerHttpCheckWithRetry $plink $remote $plinkExtra $loginCmd 'login.html'
    Write-Host "  OK ${serverAppBase}/login.html -> 200" -ForegroundColor Green
} catch {
    throw "login.html check failed: $_"
}

$cssPath = '/messenger/supra-messenger.css'
$cssGrep = 'grep -q mapp-modal-group-name-wrap "$f" && grep -q mapp-modal-tab--active "$f" && grep -q mc-action-menu-item "$f"'
$cssCmd = 'f=$(mktemp); curl -sf --max-time 20 -o "$f" http://127.0.0.1:' + $AppPort + $cssPath + ' && ' + $cssGrep + '; e=$?; rm -f "$f"; exit $e'
try {
    Invoke-ServerHttpCheckWithRetry $plink $remote $plinkExtra $cssCmd 'messenger CSS'
    Write-Host "  OK ${serverAppBase}${cssPath} (messenger styles verified)" -ForegroundColor Green
} catch {
    throw "CSS verification failed: $_"
}

if (-not [string]::IsNullOrWhiteSpace($PublicUrl)) {
    $pub = $PublicUrl.Trim().TrimEnd('/')
    Write-Host "  Checking public URL: $pub" -ForegroundColor DarkGray
    try {
        $pubLogin = Invoke-WebRequest -Uri "$pub/login.html" -UseBasicParsing -TimeoutSec 25
        Write-Host "  OK $pub/login.html -> $($pubLogin.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "  WARN: $pub not reachable from this PC (nginx/Let's Encrypt?): $_" -ForegroundColor Yellow
    }
}

$doneUrl = if (-not [string]::IsNullOrWhiteSpace($PublicUrl)) { $PublicUrl.Trim().TrimEnd('/') } else { "${serverAppBase} on ${ServerHost}" }
Write-Step "Done: $doneUrl"
Write-Host "  Admin: $AdminLogin"
$ver = if ($script:DeployAppVersion) { $script:DeployAppVersion } else { '?' }
Send-DeployStatus done @($doneUrl, $ver)
} catch {
    $err = $_.Exception.Message
    # Lift the quiet window so the failure status is actually delivered (best-effort).
    Resume-DeployStatus
    Send-DeployStatus failed @($err)
    Flush-DeployStatus
    throw
}

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
    [string]$Protocol = ''
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$DeployDir = $PSScriptRoot

. (Join-Path $DeployDir 'deploy.config.ps1')

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

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Message) -ForegroundColor Cyan
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

function Ensure-PuttyHostKey([string]$Plink, [string]$Remote) {
    Write-Step "SSH host key check: $Remote"
    $null = & $Plink -pw $ServerPassword -batch $Remote "echo ok" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Accepting host key (first connect)..." -ForegroundColor Yellow
        cmd /c "echo y| `"$Plink`" -pw $ServerPassword $Remote exit" 2>$null
    }
}

function Invoke-ServerHttpCheck([string]$Plink, [string]$Remote, [string]$BashCommand, [string]$Label) {
    & $Plink -pw $ServerPassword -batch $Remote $BashCommand 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "${Label} failed on server (127.0.0.1:${AppPort})"
    }
}

function Build-ClientAssets([string]$MessengerDir) {
    $buildScript = Join-Path $MessengerDir "build-client-assets.ps1"
    if (-not (Test-Path $buildScript)) {
        throw "Client assets build script not found: $buildScript"
    }
    Write-Host "  Minifying client scripts (esbuild)..." -ForegroundColor DarkGray
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
    & powershell -NoProfile -ExecutionPolicy Bypass -File $buildScript
    if ($LASTEXITCODE -ne 0) { throw "build-webcrypto.ps1 failed: $LASTEXITCODE" }
    $bundle = Join-Path $cryptoDir "vendor\supra-webcrypto.bundle.js"
    if (-not (Test-Path $bundle)) { throw "Missing bundle: $bundle" }
    $signalr = Join-Path $cryptoDir "vendor\signalr.min.js"
    if (-not (Test-Path $signalr)) { throw "Missing SignalR bundle: $signalr" }
    $kb = [math]::Round((Get-Item $bundle).Length / 1KB, 1)
    $signalrKb = [math]::Round((Get-Item $signalr).Length / 1KB, 1)
    Write-Host "  Web Crypto bundle: $kb KB, SignalR: $signalrKb KB" -ForegroundColor DarkGray
}

function Copy-ProjectSources([string]$DestRoot) {
    Copy-Item (Join-Path $Root "Dockerfile") (Join-Path $DestRoot "Dockerfile") -Force
    Copy-Item (Join-Path $Root "docker-compose.yml") (Join-Path $DestRoot "docker-compose.yml") -Force
    $srcFrom = Join-Path $Root "src"
    $srcTo = Join-Path $DestRoot "src"
    New-Item -ItemType Directory -Path $srcTo -Force | Out-Null
    Write-Host "  Copying src/ (skip bin, obj, .vs)..."
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
    Update-DeployRelease -Root $Root -WebProjectDir $webProjectDir
    Update-AssetUrls $BuildDir
}

function Update-AssetUrls([string]$DestRoot) {
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
        $indexHtml = [regex]::Replace($indexHtml, $bootstrapRe, "`${prefix}?v=$scriptBuild`${2}")
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
Build-RemoteScript $shPath
$remote = "${ServerUser}@${ServerHost}"

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

Ensure-PuttyHostKey $plink $remote

Write-Step "Upload archive"
& $pscp -pw $ServerPassword -batch $ArchivePath "${remote}:/tmp/$ArchiveName"
if ($LASTEXITCODE -ne 0) { throw "pscp archive failed: $LASTEXITCODE" }

Write-Step "Upload deploy script"
& $pscp -pw $ServerPassword -batch $shPath "${remote}:/tmp/sm-deploy.sh"
if ($LASTEXITCODE -ne 0) { throw "pscp script failed: $LASTEXITCODE" }

Write-Step "Remote deploy (live output)"
Write-Host "  First Docker build: 5-20 min. Output streams below." -ForegroundColor Yellow
Write-Host ""

$remoteCmd = "chmod +x /tmp/sm-deploy.sh; bash /tmp/sm-deploy.sh"
& $plink -pw $ServerPassword -batch $remote $remoteCmd
if ($LASTEXITCODE -ne 0) { throw "plink deploy failed: $LASTEXITCODE" }

Write-Step "Verify HTTP"
# docker-compose binds APP_PORT to 127.0.0.1 only; checks must run on the server (or via PUBLIC_URL).
$serverAppBase = "http://127.0.0.1:${AppPort}"
Write-Host "  Docker publishes ${serverAppBase} (not ${ServerHost}:${AppPort} from this PC)" -ForegroundColor DarkGray

$cryptoPath = '/messenger/vendor/supra-webcrypto.bundle.js'
$cryptoCmd = 'f=$(mktemp); curl -sf --max-time 20 -o "$f" http://127.0.0.1:' + $AppPort + $cryptoPath + ' && test $(wc -c < "$f") -gt 50000 && grep -q SupraWebCryptoPolyfill "$f"; e=$?; rm -f "$f"; exit $e'
try {
    Invoke-ServerHttpCheck $plink $remote $cryptoCmd 'Web Crypto bundle'
    Write-Host "  OK ${serverAppBase}${cryptoPath}" -ForegroundColor Green
} catch {
    throw "Web Crypto bundle check failed: $_"
}

$loginCmd = 'curl -sf --max-time 20 -o /dev/null -w "%{http_code}" http://127.0.0.1:' + $AppPort + '/login.html | grep -q 200'
try {
    Invoke-ServerHttpCheck $plink $remote $loginCmd 'login.html'
    Write-Host "  OK ${serverAppBase}/login.html -> 200" -ForegroundColor Green
} catch {
    throw "login.html check failed: $_"
}

$cssPath = '/messenger/supra-messenger.css'
$cssGrep = 'grep -q mapp-modal-group-name-wrap "$f" && grep -q mapp-modal-tab--active "$f" && grep -q mc-action-menu-item "$f"'
$cssCmd = 'f=$(mktemp); curl -sf --max-time 20 -o "$f" http://127.0.0.1:' + $AppPort + $cssPath + ' && ' + $cssGrep + '; e=$?; rm -f "$f"; exit $e'
try {
    Invoke-ServerHttpCheck $plink $remote $cssCmd 'messenger CSS'
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

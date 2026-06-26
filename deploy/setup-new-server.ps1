# Full setup of a new SuperMessenger server: HTTPS (copied cert), nginx, data restore.
# Old server keeps running until DNS switch.
# Usage: .\deploy\setup-new-server.ps1 [-SkipDeploy] [-ArchivePath path\to\backup.tar.gz]

param(
    [string]$ArchivePath = '',
    [switch]$SkipDeploy,
    [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$DeployDir = $PSScriptRoot
. (Join-Path $DeployDir 'deploy.config.ps1')
$cfg = Read-DeployEnvFile $script:DeployEnvPath
$Domain = Get-DeployDomain $cfg
if ([string]::IsNullOrWhiteSpace($Domain)) {
    throw 'Set SM_DEPLOY_DOMAIN or SM_DEPLOY_PUBLIC_URL in tmp\deploy\deploy.env (needed for nginx/Let''s Encrypt)'
}

$primaryHost = $cfg['SM_DEPLOY_HOST']
$primaryPass = $cfg['SM_DEPLOY_PASSWORD']
$primaryUser = if ($cfg['SM_DEPLOY_USER']) { $cfg['SM_DEPLOY_USER'] } else { 'root' }
$reserve = Get-DeployReserveSettings $cfg
$reserveHost = if ($null -ne $reserve) { $reserve.Host } else { $cfg['SM_DEPLOY_HOST_NEW'] }
$reservePass = if ($null -ne $reserve) { $reserve.Password } else { $cfg['SM_DEPLOY_PASSWORD_NEW'] }
$reserveUser = if ($null -ne $reserve) { $reserve.User } else { 'root' }
$appPort = [int]$cfg['SM_DEPLOY_APP_PORT']
$adminLogin = $cfg['SM_DEPLOY_ADMIN_LOGIN']
$adminPass = $cfg['SM_DEPLOY_ADMIN_PASSWORD']
$publicUrl = $cfg['SM_DEPLOY_PUBLIC_URL']

if ([string]::IsNullOrWhiteSpace($primaryHost) -or [string]::IsNullOrWhiteSpace($primaryPass)) {
    throw 'Set SM_DEPLOY_HOST and SM_DEPLOY_PASSWORD in tmp\deploy\deploy.env'
}

function Resolve-PuttyExe([string]$Name) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in @("${env:ProgramFiles}\PuTTY\$Name.exe", "${env:ProgramFiles(x86)}\PuTTY\$Name.exe")) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

$plink = Resolve-PuttyExe 'plink'
$pscp = Resolve-PuttyExe 'pscp'
if (-not $plink -or -not $pscp) { throw 'Install PuTTY (plink/pscp)' }

function Invoke-Primary([string]$Cmd) {
    $out = & $plink -pw $primaryPass -batch @((Get-PlinkHostKeyArgs $primaryHost)) "${primaryUser}@${primaryHost}" $Cmd 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Primary server failed ($LASTEXITCODE): $out" }
    return $out
}

function Invoke-Reserve([string]$Cmd) {
    if ([string]::IsNullOrWhiteSpace($reserveHost) -or [string]::IsNullOrWhiteSpace($reservePass)) {
        throw 'Reserve server is not configured'
    }
    $out = & $plink -pw $reservePass -batch @((Get-PlinkHostKeyArgs $reserveHost)) "${reserveUser}@${reserveHost}" $Cmd 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Reserve server failed ($LASTEXITCODE): $out" }
    return $out
}

function Get-PlinkHostKeyArgs([string]$TargetHost) {
    $hk = Get-DeployHostKey -Config $cfg -TargetHost $TargetHost
    if ([string]::IsNullOrWhiteSpace($hk)) { return @() }
    return @('-hostkey', $hk)
}

Write-Host ""
Write-Host "=== SuperMessenger: setup primary server ${primaryHost} ===" -ForegroundColor Cyan
Write-Host "  Domain: $Domain (cert copy; DNS switch later)" -ForegroundColor DarkGray
if (-not [string]::IsNullOrWhiteSpace($reserveHost)) {
    Write-Host "  Reserve server: ${reserveHost}" -ForegroundColor DarkGray
}

if (-not $SkipBackup -and [string]::IsNullOrWhiteSpace($ArchivePath)) {
    Write-Host ""
    Write-Host "[1] Backup from reserve server..." -ForegroundColor Cyan
    if (-not [string]::IsNullOrWhiteSpace($reserveHost)) {
        & (Join-Path $DeployDir 'backup-data.ps1') -ServerHost $reserveHost -ServerUser $reserveUser -ServerPassword $reservePass
    } else {
        & (Join-Path $DeployDir 'backup-data.ps1')
    }
    $latest = Get-ChildItem (Join-Path $Root 'tmp\backups') -Filter 'supermessenger-data-*.tar.gz' |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) { throw 'No backup archive found' }
    $ArchivePath = $latest.FullName
    Write-Host "  Using: $ArchivePath" -ForegroundColor DarkGray
}

if (-not $SkipDeploy) {
    Write-Host ""
    Write-Host "[2] Deploy application to primary server (Docker build may take 5-20 min)..." -ForegroundColor Cyan
    & (Join-Path $DeployDir 'deploy.ps1') `
        -ServerHost $primaryHost `
        -ServerUser $primaryUser `
        -ServerPassword $primaryPass `
        -AppPort $appPort `
        -AdminLogin $adminLogin `
        -AdminPassword $adminPass `
        -PublicUrl $publicUrl
}

Write-Host ""
Write-Host "[3] Install nginx on primary server..." -ForegroundColor Cyan
Invoke-Primary "export DEBIAN_FRONTEND=noninteractive; apt-get update -qq; apt-get install -y -qq nginx certbot" | ForEach-Object { Write-Host "  $_" }

Write-Host ""
Write-Host "[4] Copy Let's Encrypt certificates reserve -> primary..." -ForegroundColor Cyan
$certScript = @'
set -e
DOMAIN='__DOMAIN__'
OLD='__OLD__'
NEW='__NEW__'
PASS='__PASS__'
apt-get install -y -qq sshpass >/dev/null 2>&1 || true
TMP=/tmp/le-copy-$$.tar.gz
tar czf "$TMP" -C /etc/letsencrypt .
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no "$TMP" "root@${NEW}:/tmp/le-copy.tar.gz"
rm -f "$TMP"
'@
$certScript = $certScript.Replace('__DOMAIN__', $Domain).Replace('__OLD__', $reserveHost).Replace('__NEW__', $primaryHost).Replace('__PASS__', $primaryPass)
$localCert = Join-Path $env:TEMP "sm-cert-copy.sh"
[System.IO.File]::WriteAllText($localCert, $certScript.Replace("`r`n", "`n"), [Text.UTF8Encoding]::new($false))
& $pscp -pw $reservePass -batch @((Get-PlinkHostKeyArgs $reserveHost)) $localCert "${reserveUser}@${reserveHost}:/tmp/sm-cert-copy.sh"
Invoke-Reserve "bash /tmp/sm-cert-copy.sh; rm -f /tmp/sm-cert-copy.sh"
Remove-Item $localCert -Force

$leRestore = @'
#!/bin/bash
set -e
mkdir -p /etc/letsencrypt
tar xzf /tmp/le-copy.tar.gz -C /etc/letsencrypt
rm -f /tmp/le-copy.tar.gz
chmod -R go-rwx /etc/letsencrypt/archive /etc/letsencrypt/live 2>/dev/null || true
if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
  curl -sS https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf -o /etc/letsencrypt/options-ssl-nginx.conf
  openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
fi
echo CERT_OK
'@
$leRestorePath = Join-Path $env:TEMP 'sm-le-restore.sh'
[System.IO.File]::WriteAllText($leRestorePath, $leRestore.Replace("`r`n", "`n"), [Text.UTF8Encoding]::new($false))
& $pscp -pw $primaryPass -batch @((Get-PlinkHostKeyArgs $primaryHost)) $leRestorePath "${primaryUser}@${primaryHost}:/tmp/sm-le-restore.sh"
Remove-Item $leRestorePath -Force
Invoke-Primary "bash /tmp/sm-le-restore.sh; rm -f /tmp/sm-le-restore.sh" | ForEach-Object { Write-Host "  $_" }

Write-Host ""
Write-Host "[5] Configure nginx on primary server..." -ForegroundColor Cyan
$nginxResolved = Resolve-NginxConfigForDeploy -Domain $Domain -DeployDir $DeployDir
try {
    & $pscp -pw $primaryPass -batch @((Get-PlinkHostKeyArgs $primaryHost)) $nginxResolved.Path "${primaryUser}@${primaryHost}:/etc/nginx/sites-available/supermessenger.conf"
} finally {
    if ($nginxResolved.IsTemporary) {
        Remove-Item $nginxResolved.Path -Force -ErrorAction SilentlyContinue
    }
}
$nginxEnable = @'
#!/bin/bash
set -e
ln -sf /etc/nginx/sites-available/supermessenger.conf /etc/nginx/sites-enabled/supermessenger.conf
rm -f /etc/nginx/sites-enabled/default
mkdir -p /var/www/certbot
nginx -t
systemctl enable nginx
systemctl restart nginx
echo NGINX_OK
'@
$nginxEnablePath = Join-Path $env:TEMP 'sm-nginx-enable.sh'
[System.IO.File]::WriteAllText($nginxEnablePath, $nginxEnable.Replace("`r`n", "`n"), [Text.UTF8Encoding]::new($false))
& $pscp -pw $primaryPass -batch @((Get-PlinkHostKeyArgs $primaryHost)) $nginxEnablePath "${primaryUser}@${primaryHost}:/tmp/sm-nginx-enable.sh"
Remove-Item $nginxEnablePath -Force
Invoke-Primary "bash /tmp/sm-nginx-enable.sh; rm -f /tmp/sm-nginx-enable.sh" | ForEach-Object { Write-Host "  $_" }

if (-not [string]::IsNullOrWhiteSpace($ArchivePath)) {
    Write-Host ""
    Write-Host "[6] Restore user data (sessions, messages, files)..." -ForegroundColor Cyan
    & (Join-Path $DeployDir 'restore-data.ps1') -ArchivePath $ArchivePath -ServerHost $primaryHost -ServerUser $primaryUser -ServerPassword $primaryPass
}

Write-Host ""
Write-Host "[7] Verify primary server..." -ForegroundColor Cyan
Invoke-Primary "curl -sf -o /dev/null -w 'app %{http_code}\n' http://127.0.0.1:8080/login.html; curl -sfk -o /dev/null -w 'https %{http_code}\n' https://127.0.0.1/login.html -H 'Host: ${Domain}'" | ForEach-Object { Write-Host "  $_" }

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "  Primary:  https://${Domain}/  -> ${primaryHost}" -ForegroundColor White
if (-not [string]::IsNullOrWhiteSpace($reserveHost)) {
    Write-Host "  Reserve:  ${reserveHost}" -ForegroundColor White
}

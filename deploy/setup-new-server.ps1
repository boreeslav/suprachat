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
$Domain = 'messenger.example.com'

. (Join-Path $DeployDir 'deploy.config.ps1')
$cfg = Read-DeployEnvFile $script:DeployEnvPath

$oldHost = $cfg['SM_DEPLOY_HOST']
$oldPass = $cfg['SM_DEPLOY_PASSWORD']
$newHost = $cfg['SM_DEPLOY_HOST_NEW']
$newPass = $cfg['SM_DEPLOY_PASSWORD_NEW']
$newUser = if ($cfg['SM_DEPLOY_USER_NEW']) { $cfg['SM_DEPLOY_USER_NEW'] } else { 'root' }
$appPort = [int]$cfg['SM_DEPLOY_APP_PORT']
$adminLogin = $cfg['SM_DEPLOY_ADMIN_LOGIN']
$adminPass = $cfg['SM_DEPLOY_ADMIN_PASSWORD']
$publicUrl = $cfg['SM_DEPLOY_PUBLIC_URL']
$hostKey = 'SHA256:REDACTED_HOSTKEY'

if ([string]::IsNullOrWhiteSpace($newHost) -or [string]::IsNullOrWhiteSpace($newPass)) {
    throw 'Set SM_DEPLOY_HOST_NEW and SM_DEPLOY_PASSWORD_NEW in tmp\deploy\deploy.env'
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

function Invoke-New([string]$Cmd) {
    $out = & $plink -pw $newPass -batch -hostkey $hostKey "${newUser}@${newHost}" $Cmd 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Remote failed ($LASTEXITCODE): $out" }
    return $out
}

function Invoke-Old([string]$Cmd) {
    $out = & $plink -pw $oldPass -batch "root@${oldHost}" $Cmd 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Old server failed ($LASTEXITCODE): $out" }
    return $out
}

Write-Host ""
Write-Host "=== SuperMessenger: setup new server ${newHost} ===" -ForegroundColor Cyan
Write-Host "  Domain: $Domain (cert copy; DNS switch later)" -ForegroundColor DarkGray
Write-Host "  Old server stays live: ${oldHost}" -ForegroundColor DarkGray

if (-not $SkipBackup -and [string]::IsNullOrWhiteSpace($ArchivePath)) {
    Write-Host ""
    Write-Host "[1] Backup from old server..." -ForegroundColor Cyan
    & (Join-Path $DeployDir 'backup-data.ps1')
    $latest = Get-ChildItem (Join-Path $Root 'tmp\backups') -Filter 'supermessenger-data-*.tar.gz' |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) { throw 'No backup archive found' }
    $ArchivePath = $latest.FullName
    Write-Host "  Using: $ArchivePath" -ForegroundColor DarkGray
}

if (-not $SkipDeploy) {
    Write-Host ""
    Write-Host "[2] Deploy application to new server (Docker build may take 5-20 min)..." -ForegroundColor Cyan
    & (Join-Path $DeployDir 'deploy.ps1') `
        -ServerHost $newHost `
        -ServerUser $newUser `
        -ServerPassword $newPass `
        -AppPort $appPort `
        -AdminLogin $adminLogin `
        -AdminPassword $adminPass `
        -PublicUrl $publicUrl
}

Write-Host ""
Write-Host "[3] Install nginx on new server..." -ForegroundColor Cyan
Invoke-New "export DEBIAN_FRONTEND=noninteractive; apt-get update -qq; apt-get install -y -qq nginx certbot" | ForEach-Object { Write-Host "  $_" }

Write-Host ""
Write-Host "[4] Copy Let's Encrypt certificates old -> new..." -ForegroundColor Cyan
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
$certScript = $certScript.Replace('__DOMAIN__', $Domain).Replace('__OLD__', $oldHost).Replace('__NEW__', $newHost).Replace('__PASS__', $newPass)
$localCert = Join-Path $env:TEMP "sm-cert-copy.sh"
[System.IO.File]::WriteAllText($localCert, $certScript.Replace("`r`n", "`n"), [Text.UTF8Encoding]::new($false))
& $pscp -pw $oldPass -batch $localCert "root@${oldHost}:/tmp/sm-cert-copy.sh"
Invoke-Old "bash /tmp/sm-cert-copy.sh; rm -f /tmp/sm-cert-copy.sh"
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
& $pscp -pw $newPass -batch -hostkey $hostKey $leRestorePath "root@${newHost}:/tmp/sm-le-restore.sh"
Remove-Item $leRestorePath -Force
Invoke-New "bash /tmp/sm-le-restore.sh; rm -f /tmp/sm-le-restore.sh" | ForEach-Object { Write-Host "  $_" }

Write-Host ""
Write-Host "[5] Configure nginx on new server..." -ForegroundColor Cyan
$nginxConf = Join-Path $DeployDir 'nginx\supermessenger.conf'
& $pscp -pw $newPass -batch -hostkey $hostKey $nginxConf "root@${newHost}:/etc/nginx/sites-available/supermessenger.conf"
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
& $pscp -pw $newPass -batch -hostkey $hostKey $nginxEnablePath "root@${newHost}:/tmp/sm-nginx-enable.sh"
Remove-Item $nginxEnablePath -Force
Invoke-New "bash /tmp/sm-nginx-enable.sh; rm -f /tmp/sm-nginx-enable.sh" | ForEach-Object { Write-Host "  $_" }

if (-not [string]::IsNullOrWhiteSpace($ArchivePath)) {
    Write-Host ""
    Write-Host "[6] Restore user data (sessions, messages, files)..." -ForegroundColor Cyan
    & (Join-Path $DeployDir 'restore-data.ps1') -ArchivePath $ArchivePath -ServerHost $newHost -ServerUser $newUser -ServerPassword $newPass
}

Write-Host ""
Write-Host "[7] Verify new server..." -ForegroundColor Cyan
Invoke-New "curl -sf -o /dev/null -w 'app %{http_code}\n' http://127.0.0.1:8080/login.html; curl -sfk -o /dev/null -w 'https %{http_code}\n' https://127.0.0.1/login.html -H 'Host: ${Domain}'" | ForEach-Object { Write-Host "  $_" }

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "  Old (live DNS):  https://${Domain}/  -> ${oldHost}" -ForegroundColor White
Write-Host "  New (ready):     https://${newHost}/  (cert for ${Domain}; test with Host header or /etc/hosts)" -ForegroundColor White
Write-Host "  After DNS A-record -> ${newHost}, users keep sessions (dpkeys copied)." -ForegroundColor White

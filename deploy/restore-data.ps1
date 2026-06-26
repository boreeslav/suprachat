# SuperMessenger - restore user data backup to remote server (Docker volume /app/data)
# Usage: .\deploy\restore-data.ps1 -ArchivePath tmp\backups\supermessenger-data-....tar.gz
#   or:  .\deploy\restore-data.ps1 -ArchivePath ... -ServerHost your-server.example.com -ServerPassword pass
# Uses tmp\deploy\deploy.env for connection unless overridden.

param(
    [Parameter(Mandatory = $true)]
    [string]$ArchivePath,
    [string]$ServerHost = '',
    [string]$ServerUser = '',
    [string]$ServerPassword = '',
    [switch]$UseNewServer
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$DeployDir = $PSScriptRoot
$script:DeployRoot = $Root

. (Join-Path $DeployDir 'deploy.config.ps1')

function Resolve-RestoreSetting([hashtable]$Config, [string]$Name, [string]$ParamValue, [bool]$Bound, [string]$Default = '') {
    if ($Bound -and -not [string]::IsNullOrWhiteSpace($ParamValue)) { return $ParamValue }
    if ($Config.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace($Config[$Name])) { return $Config[$Name] }
    $env = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($env)) { return $env }
    return $Default
}

if (-not (Test-Path $ArchivePath)) { throw "Archive not found: $ArchivePath" }

Write-Host ""
Write-Host "Loading deploy configuration..." -ForegroundColor DarkGray
$deployConfig = Read-DeployEnvFile $script:DeployEnvPath

if ($UseNewServer) {
    $ServerHost = Resolve-RestoreSetting $deployConfig 'SM_DEPLOY_HOST_NEW' $ServerHost $PSBoundParameters.ContainsKey('ServerHost')
    $ServerUser = Resolve-RestoreSetting $deployConfig 'SM_DEPLOY_USER_NEW' $ServerUser $PSBoundParameters.ContainsKey('ServerUser') 'root'
    $ServerPassword = Resolve-RestoreSetting $deployConfig 'SM_DEPLOY_PASSWORD_NEW' $ServerPassword $PSBoundParameters.ContainsKey('ServerPassword')
} else {
    $ServerHost = Resolve-RestoreSetting $deployConfig 'SM_DEPLOY_HOST' $ServerHost $PSBoundParameters.ContainsKey('ServerHost')
    $ServerUser = Resolve-RestoreSetting $deployConfig 'SM_DEPLOY_USER' $ServerUser $PSBoundParameters.ContainsKey('ServerUser') 'root'
    $ServerPassword = Resolve-RestoreSetting $deployConfig 'SM_DEPLOY_PASSWORD' $ServerPassword $PSBoundParameters.ContainsKey('ServerPassword')
}

if ([string]::IsNullOrWhiteSpace($ServerHost)) { throw 'Server host is required' }
if ([string]::IsNullOrWhiteSpace($ServerPassword)) { throw 'SSH password is required' }

$RemoteDir = "/opt/supermessenger"
$remote = "${ServerUser}@${ServerHost}"
$archiveName = [IO.Path]::GetFileName($ArchivePath)
$remoteArchive = "/tmp/$archiveName"

function Resolve-PuttyExe([string]$Name) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in @("${env:ProgramFiles}\PuTTY\$Name.exe", "${env:ProgramFiles(x86)}\PuTTY\$Name.exe")) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

$plink = Resolve-PuttyExe "plink"
$pscp = Resolve-PuttyExe "pscp"
if (-not $plink -or -not $pscp) { throw "plink/pscp not found (install PuTTY)" }

$hostKey = Resolve-RestoreSetting $deployConfig 'SM_DEPLOY_HOSTKEY_NEW' '' $false
if ([string]::IsNullOrWhiteSpace($hostKey) -and $ServerHost -eq 'your-server.example.com') {
    $hostKey = 'SHA256:REDACTED_HOSTKEY'
}
$plinkArgs = @('-pw', $ServerPassword, '-batch')
if (-not [string]::IsNullOrWhiteSpace($hostKey)) { $plinkArgs += @('-hostkey', $hostKey) }

Write-Host "  Target: ${remote}" -ForegroundColor DarkGray
$null = & $plink @plinkArgs $remote "echo ok" 2>&1

$remoteScript = @'
set -e
cd __REMOTE_DIR__
ARCHIVE="__REMOTE_ARCHIVE__"
CID=$(docker compose ps -q supermessenger 2>/dev/null || true)
if [ -z "$CID" ]; then
  echo "Starting stack to ensure volume exists..."
  docker compose up -d
  sleep 5
  CID=$(docker compose ps -q supermessenger)
fi
if [ -z "$CID" ]; then echo "ERROR: supermessenger container not running" >&2; exit 1; fi
echo "Stopping container for safe restore..."
docker compose stop supermessenger
CID=$(docker compose ps -aq supermessenger | head -n1)
VOL=$(docker inspect "$CID" --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Name}}{{end}}{{end}}')
if [ -z "$VOL" ]; then echo "ERROR: data volume not found" >&2; exit 1; fi
echo "Restoring into volume $VOL ..."
docker run --rm -v "$VOL":/data -v /tmp:/backup alpine sh -c "rm -rf /data/* /data/.[!.]* 2>/dev/null || true; tar xzf /backup/$(basename "$ARCHIVE") -C /data --strip-components=1"
echo "Starting container..."
docker compose up -d
sleep 3
curl -sf -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8080/login.html || true
echo "RESTORE_OK"
'@
$remoteScript = $remoteScript.Replace('__REMOTE_DIR__', $RemoteDir).Replace('__REMOTE_ARCHIVE__', $remoteArchive).Replace("`r`n", "`n")
$localScript = Join-Path ([IO.Path]::GetTempPath()) "sm-restore-$(Get-Date -Format 'yyyyMMddHHmmss').sh"
[System.IO.File]::WriteAllText($localScript, $remoteScript, [Text.UTF8Encoding]::new($false))

$pscpArgs = @('-pw', $ServerPassword, '-batch')
if (-not [string]::IsNullOrWhiteSpace($hostKey)) { $pscpArgs += @('-hostkey', $hostKey) }

Write-Host ""
Write-Host "[1/3] Upload archive ($archiveName)..." -ForegroundColor Cyan
& $pscp @pscpArgs $ArchivePath "${remote}:$remoteArchive"
if ($LASTEXITCODE -ne 0) { throw "pscp upload failed: $LASTEXITCODE" }

Write-Host ""
Write-Host "[2/3] Upload restore script..." -ForegroundColor Cyan
$remoteScriptPath = "/tmp/sm-restore.sh"
& $pscp @pscpArgs $localScript "${remote}:$remoteScriptPath"
Remove-Item $localScript -Force -ErrorAction SilentlyContinue
if ($LASTEXITCODE -ne 0) { throw "pscp script failed: $LASTEXITCODE" }

Write-Host ""
Write-Host "[3/3] Restore data on server..." -ForegroundColor Cyan
$out = & $plink @plinkArgs $remote "chmod +x $remoteScriptPath; bash $remoteScriptPath; rm -f $remoteScriptPath $remoteArchive" 2>&1
$out | ForEach-Object { Write-Host "  $_" }
if ($LASTEXITCODE -ne 0 -or -not ($out -match 'RESTORE_OK')) {
    throw "Remote restore failed (exit $LASTEXITCODE)"
}

Write-Host ""
Write-Host "Done. Data restored on ${remote}" -ForegroundColor Green

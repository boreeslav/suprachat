# SuperMessenger - backup user data from remote server (Docker volume /app/data)
# Usage: .\deploy\backup-data.ps1   (uses tmp\deploy\deploy.env for connection)
#   or:  .\deploy\backup-data.ps1 -ServerHost host -ServerUser root -ServerPassword pass
# Output: tmp\backups\supermessenger-data-<timestamp>.tar.gz
#
# Backs up EVERYTHING under the container's /app/data (messages, uploaded files,
# avatars, branding, push keys, user preferences, data-protection keys) - i.e. all
# user content, NOT the source code.

param(
    [string]$ServerHost = '',
    [string]$ServerUser = '',
    [string]$ServerPassword = '',
    [string]$OutDir = '',
    [switch]$KeepRemote
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$DeployDir = $PSScriptRoot
$script:DeployRoot = $Root

. (Join-Path $DeployDir 'deploy.config.ps1')

# Resolve a setting from explicit param, then tmp\deploy\deploy.env, then environment
# variable. Unlike Import-DeployConfig this never prompts (safe for non-interactive use).
function Resolve-BackupSetting([hashtable]$Config, [string]$Name, [string]$ParamValue, [bool]$Bound, [string]$Default = '') {
    if ($Bound -and -not [string]::IsNullOrWhiteSpace($ParamValue)) { return $ParamValue }
    if ($Config.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace($Config[$Name])) { return $Config[$Name] }
    $env = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($env)) { return $env }
    return $Default
}

Write-Host ""
Write-Host "Loading deploy configuration (tmp\deploy\deploy.env)..." -ForegroundColor DarkGray
$deployConfig = Read-DeployEnvFile $script:DeployEnvPath

$ServerHost = Resolve-BackupSetting $deployConfig 'SM_DEPLOY_HOST' $ServerHost $PSBoundParameters.ContainsKey('ServerHost')
$ServerUser = Resolve-BackupSetting $deployConfig 'SM_DEPLOY_USER' $ServerUser $PSBoundParameters.ContainsKey('ServerUser') 'root'
$ServerPassword = Resolve-BackupSetting $deployConfig 'SM_DEPLOY_PASSWORD' $ServerPassword $PSBoundParameters.ContainsKey('ServerPassword')

if ([string]::IsNullOrWhiteSpace($ServerHost)) { throw 'Server host is required (SM_DEPLOY_HOST)' }
if ([string]::IsNullOrWhiteSpace($ServerUser)) { throw 'SSH user is required (SM_DEPLOY_USER)' }
if ([string]::IsNullOrWhiteSpace($ServerPassword)) { throw 'SSH password is required (SM_DEPLOY_PASSWORD)' }

if ([string]::IsNullOrWhiteSpace($OutDir)) {
    $OutDir = Join-Path $Root 'tmp\backups'
}
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

$RemoteDir = "/opt/supermessenger"
$remote = "${ServerUser}@${ServerHost}"

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

Write-Host "  Target: ${remote} (dir ${RemoteDir})" -ForegroundColor DarkGray

# Accept host key on first connect (non-fatal if already cached)
$null = & $plink -pw $ServerPassword -batch $remote "echo ok" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Accepting host key (first connect)..." -ForegroundColor Yellow
    cmd /c "echo y| `"$plink`" -pw $ServerPassword $remote exit" 2>$null
}

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$remoteFile = "/tmp/supermessenger-data-$ts.tar.gz"
$remoteScriptPath = "/tmp/sm-backup-$ts.sh"

# Remote: archive the whole /app/data from the running container; fall back to the
# named Docker volume if the container is not running.
$remoteScript = @'
set -e
cd __REMOTE_DIR__
OUT="__REMOTE_FILE__"
CID=$(docker compose ps -q supermessenger 2>/dev/null || true)
if [ -n "$CID" ]; then
  echo "source: running container $CID (/app/data)"
  docker exec "$CID" tar czf - -C /app data > "$OUT"
else
  VOL=$(docker volume ls --format '{{.Name}}' | grep -E 'supermessenger[-_]data' | head -n1)
  if [ -z "$VOL" ]; then echo "ERROR: no running container and no data volume found" >&2; exit 1; fi
  echo "source: docker volume $VOL"
  docker run --rm -v "$VOL":/data:ro -v /tmp:/backup alpine \
    tar czf "/backup/$(basename "$OUT")" -C /data .
fi
SIZE=$(wc -c < "$OUT")
echo "BACKUP_OK $OUT $SIZE"
'@
$remoteScript = $remoteScript.Replace('__REMOTE_DIR__', $RemoteDir).Replace('__REMOTE_FILE__', $remoteFile).Replace("`r`n", "`n")

$localScript = Join-Path $OutDir "sm-backup-$ts.sh"
[System.IO.File]::WriteAllText($localScript, $remoteScript, [Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "[1/3] Creating archive on server..." -ForegroundColor Cyan
& $pscp -pw $ServerPassword -batch $localScript "${remote}:$remoteScriptPath" 2>&1 | ForEach-Object { Write-Host "  $_" }
if ($LASTEXITCODE -ne 0) { throw "Failed to upload backup script (exit $LASTEXITCODE)" }
Remove-Item $localScript -Force -ErrorAction SilentlyContinue

$out = & $plink -pw $ServerPassword -batch $remote "bash $remoteScriptPath; rm -f $remoteScriptPath" 2>&1
$out | ForEach-Object { Write-Host "  $_" }
if ($LASTEXITCODE -ne 0 -or -not ($out -match 'BACKUP_OK')) {
    throw "Remote backup failed (exit $LASTEXITCODE)"
}

$localFile = Join-Path $OutDir "supermessenger-data-$ts.tar.gz"
Write-Host ""
Write-Host "[2/3] Downloading to $localFile ..." -ForegroundColor Cyan
& $pscp -pw $ServerPassword -batch "${remote}:$remoteFile" $localFile
if ($LASTEXITCODE -ne 0) { throw "pscp download failed: $LASTEXITCODE" }

if (-not $KeepRemote) {
    Write-Host ""
    Write-Host "[3/3] Removing temp archive on server..." -ForegroundColor Cyan
    & $plink -pw $ServerPassword -batch $remote "rm -f $remoteFile" 2>&1 | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host ""
    Write-Host "[3/3] Keeping remote archive: $remoteFile" -ForegroundColor DarkGray
}

$mb = [math]::Round((Get-Item $localFile).Length / 1MB, 2)
Write-Host ""
Write-Host "Done. Backup saved: $localFile ($mb MB)" -ForegroundColor Green

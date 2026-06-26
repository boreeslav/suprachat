# Deploy SuperMessenger to primary and new server (one build, two uploads).
# Usage: .\deploy\deploy-all.ps1

param(
    [string]$PublicUrl = '',
    [string]$Protocol = ''
)

$ErrorActionPreference = 'Stop'
$DeployDir = $PSScriptRoot

. (Join-Path $DeployDir 'deploy.config.ps1')
$cfg = Read-DeployEnvFile $script:DeployEnvPath

$primaryHost = $cfg['SM_DEPLOY_HOST']
$newHost = $cfg['SM_DEPLOY_HOST_NEW']
$newUser = if ($cfg['SM_DEPLOY_USER_NEW']) { $cfg['SM_DEPLOY_USER_NEW'] } else { $cfg['SM_DEPLOY_USER'] }
$newPass = $cfg['SM_DEPLOY_PASSWORD_NEW']

if ([string]::IsNullOrWhiteSpace($primaryHost)) {
    throw 'SM_DEPLOY_HOST is required in tmp\deploy\deploy.env'
}
if ([string]::IsNullOrWhiteSpace($newHost) -or [string]::IsNullOrWhiteSpace($newPass)) {
    throw 'SM_DEPLOY_HOST_NEW and SM_DEPLOY_PASSWORD_NEW are required in tmp\deploy\deploy.env'
}

$shared = @{}
if ($PSBoundParameters.ContainsKey('PublicUrl')) { $shared['PublicUrl'] = $PublicUrl }
if ($PSBoundParameters.ContainsKey('Protocol')) { $shared['Protocol'] = $Protocol }

Write-Host ''
Write-Host '=== Deploy to primary server: ' -NoNewline -ForegroundColor Cyan
Write-Host $primaryHost -ForegroundColor White
& (Join-Path $DeployDir 'deploy.ps1') @shared
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host '=== Deploy to new server: ' -NoNewline -ForegroundColor Cyan
Write-Host $newHost -ForegroundColor White
& (Join-Path $DeployDir 'deploy.ps1') @shared -SkipBuild `
    -ServerHost $newHost `
    -ServerUser $newUser `
    -ServerPassword $newPass
exit $LASTEXITCODE

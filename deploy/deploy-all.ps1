# Deploy SuperMessenger: primary server always, reserve server on confirmation.
# Usage: .\deploy\deploy-all.ps1
#   -SkipReserve     — do not ask, skip reserve
#   -IncludeReserve  — deploy to reserve without asking (non-interactive)

param(
    [string]$PublicUrl = '',
    [string]$Protocol = '',
    [switch]$SkipReserve,
    [switch]$IncludeReserve,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$DeployDir = $PSScriptRoot

. (Join-Path $DeployDir 'deploy.config.ps1')
$cfg = Read-DeployEnvFile $script:DeployEnvPath

$primaryHost = $cfg['SM_DEPLOY_HOST']
$reserve = Get-DeployReserveSettings $cfg

if ([string]::IsNullOrWhiteSpace($primaryHost)) {
    throw 'SM_DEPLOY_HOST is required in tmp\deploy\deploy.env'
}

$shared = @{}
if ($PSBoundParameters.ContainsKey('PublicUrl')) { $shared['PublicUrl'] = $PublicUrl }
if ($PSBoundParameters.ContainsKey('Protocol')) { $shared['Protocol'] = $Protocol }
if ($SkipBuild) { $shared['SkipBuild'] = $true }

Write-Host ''
Write-Host '=== Deploy to primary server: ' -NoNewline -ForegroundColor Cyan
Write-Host $primaryHost -ForegroundColor White
& (Join-Path $DeployDir 'deploy.ps1') @shared
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($null -eq $reserve -or [string]::IsNullOrWhiteSpace($reserve.Host)) {
    Write-Host ''
    Write-Host 'Reserve server is not configured (SM_DEPLOY_HOST_RESERVE).' -ForegroundColor DarkGray
    exit 0
}

$deployReserve = $false
if ($IncludeReserve) {
    $deployReserve = $true
} elseif ($SkipReserve) {
    $deployReserve = $false
} else {
    Write-Host ''
    $prompt = "Deploy to reserve server $($reserve.Host)? (y/N)"
    $answer = Read-Host $prompt
    $deployReserve = $answer -match '^[yY]'
}

if (-not $deployReserve) {
    Write-Host ''
    Write-Host 'Reserve deploy skipped.' -ForegroundColor DarkGray
    exit 0
}

Write-Host ''
Write-Host '=== Deploy to reserve server: ' -NoNewline -ForegroundColor Cyan
Write-Host $reserve.Host -ForegroundColor White
& (Join-Path $DeployDir 'deploy.ps1') @shared -SkipBuild `
    -ServerHost $reserve.Host `
    -ServerUser $reserve.User `
    -ServerPassword $reserve.Password
exit $LASTEXITCODE

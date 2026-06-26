$script:DeployRoot = Split-Path $PSScriptRoot -Parent
$script:DeployTmpDir = Join-Path $script:DeployRoot 'tmp\deploy'
$script:DeployEnvPath = Join-Path $script:DeployTmpDir 'deploy.env'

$script:DeployConfigKeys = @(
    @{ Name = 'SM_DEPLOY_HOST'; Prompt = 'Server host (IP or domain)'; Required = $true; Sensitive = $false; Default = '' }
    @{ Name = 'SM_DEPLOY_USER'; Prompt = 'SSH user'; Required = $true; Sensitive = $false; Default = 'root' }
    @{ Name = 'SM_DEPLOY_PASSWORD'; Prompt = 'SSH password'; Required = $true; Sensitive = $true; Default = '' }
    @{ Name = 'SM_DEPLOY_APP_PORT'; Prompt = 'App port'; Required = $true; Sensitive = $false; Default = '80' }
    @{ Name = 'SM_DEPLOY_ADMIN_LOGIN'; Prompt = 'Admin login'; Required = $true; Sensitive = $false; Default = 'admin' }
    @{ Name = 'SM_DEPLOY_ADMIN_PASSWORD'; Prompt = 'Admin password'; Required = $true; Sensitive = $true; Default = '' }
    @{ Name = 'SM_DEPLOY_PUBLIC_URL'; Prompt = ''; Required = $false; Sensitive = $false; Default = '' }
    @{ Name = 'SM_DEPLOY_PROTOCOL'; Prompt = ''; Required = $false; Sensitive = $false; Default = '' }
)

function Ensure-DeployTmpDir {
    if (-not (Test-Path $script:DeployTmpDir)) {
        New-Item -ItemType Directory -Path $script:DeployTmpDir -Force | Out-Null
    }
}

function Read-DeployEnvValue([string]$Raw) {
    $value = $Raw.Trim()
    if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
        $value = $value.Substring(1, $value.Length - 2).Replace('""', '"')
    }
    return $value
}

function Read-DeployEnvFile([string]$Path) {
    $config = @{}
    if (-not (Test-Path $Path)) { return $config }
    foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
        $eq = $trimmed.IndexOf('=')
        if ($eq -lt 1) { continue }
        $name = $trimmed.Substring(0, $eq).Trim()
        $value = Read-DeployEnvValue $trimmed.Substring($eq + 1)
        $config[$name] = $value
    }
    return $config
}

function Save-DeployEnvFile([hashtable]$Config) {
    Ensure-DeployTmpDir
    $lines = @(
        '# SuperMessenger deploy configuration (local only, not committed)',
        '# Path: tmp/deploy/deploy.env',
        ''
    )
    foreach ($key in $script:DeployConfigKeys) {
        $name = $key.Name
        $val = $Config[$name]
        if ($null -eq $val) { $val = '' }
        if ($val -match '[#\r\n]' -or ($val -match '\s' -and $val -notmatch '^\S+$')) {
            $val = '"' + ($val -replace '"', '""') + '"'
        }
        $lines += "$name=$val"
    }
    $text = ($lines -join [Environment]::NewLine) + [Environment]::NewLine
    [System.IO.File]::WriteAllText($script:DeployEnvPath, $text, [Text.UTF8Encoding]::new($false))
}

function Read-DeploySecret([string]$Prompt) {
    $secure = Read-Host $Prompt -AsSecureString
    if ($secure.Length -eq 0) { return '' }
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

function Import-DeployConfig {
    Ensure-DeployTmpDir
    $config = Read-DeployEnvFile $script:DeployEnvPath
    $updated = $false

    foreach ($key in $script:DeployConfigKeys) {
        $name = $key.Name
        $value = $config[$name]
        if ([string]::IsNullOrWhiteSpace($value)) {
            $value = [Environment]::GetEnvironmentVariable($name)
        }
        if ([string]::IsNullOrWhiteSpace($value) -and -not [string]::IsNullOrWhiteSpace($key.Default)) {
            $value = $key.Default
        }
        if ([string]::IsNullOrWhiteSpace($value) -and $key.Required) {
            if ($key.Sensitive) {
                $value = Read-DeploySecret $key.Prompt
            } else {
                $value = Read-Host $key.Prompt
            }
            $updated = $true
        }
        if (-not $key.Required -and [string]::IsNullOrWhiteSpace($value)) {
            $value = ''
        }
        if ($key.Required -and [string]::IsNullOrWhiteSpace($value)) {
            throw "Required deploy setting missing: $name (expected in tmp\deploy\deploy.env)"
        }
        $config[$name] = $value
        Set-Item -Path "env:$name" -Value $value
    }

    if ($updated -or -not (Test-Path $script:DeployEnvPath)) {
        Save-DeployEnvFile $config
        Write-Host "  Saved deploy settings to tmp\deploy\deploy.env" -ForegroundColor DarkGray
    }

    return $config
}

function Resolve-DeploySetting {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Config,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [AllowEmptyString()]
        [string]$ParamValue = '',
        [switch]$Bound
    )
    if ($Bound -and -not [string]::IsNullOrWhiteSpace($ParamValue)) {
        return $ParamValue
    }
    $fromConfig = $Config[$Name]
    if ($null -ne $fromConfig) {
        return $fromConfig
    }
    return ''
}

function Get-DeployReserveHost([hashtable]$Config) {
    $reserveHost = $Config['SM_DEPLOY_HOST_RESERVE']
    if ([string]::IsNullOrWhiteSpace($reserveHost)) { $reserveHost = $Config['SM_DEPLOY_HOST_NEW'] }
    return $reserveHost
}

function Get-DeployReserveSettings([hashtable]$Config) {
    $reserveHost = Get-DeployReserveHost $Config
    if ([string]::IsNullOrWhiteSpace($reserveHost)) { return $null }

    $user = $Config['SM_DEPLOY_USER_RESERVE']
    if ([string]::IsNullOrWhiteSpace($user)) { $user = $Config['SM_DEPLOY_USER_NEW'] }
    if ([string]::IsNullOrWhiteSpace($user)) { $user = $Config['SM_DEPLOY_USER'] }
    if ([string]::IsNullOrWhiteSpace($user)) { $user = 'root' }

    $password = $Config['SM_DEPLOY_PASSWORD_RESERVE']
    if ([string]::IsNullOrWhiteSpace($password)) { $password = $Config['SM_DEPLOY_PASSWORD_NEW'] }

    $hostKey = $Config['SM_DEPLOY_HOSTKEY_RESERVE']
    if ([string]::IsNullOrWhiteSpace($hostKey)) { $hostKey = $Config['SM_DEPLOY_HOSTKEY_NEW'] }

    return @{
        Host = $reserveHost
        User = $user
        Password = $password
        HostKey = $hostKey
    }
}

function Get-DeployHostKey([hashtable]$Config, [string]$TargetHost) {
    if ($TargetHost -eq $Config['SM_DEPLOY_HOST'] -and -not [string]::IsNullOrWhiteSpace($Config['SM_DEPLOY_HOSTKEY'])) {
        return $Config['SM_DEPLOY_HOSTKEY']
    }
    $reserve = Get-DeployReserveSettings $Config
    if ($null -ne $reserve -and $TargetHost -eq $reserve.Host -and -not [string]::IsNullOrWhiteSpace($reserve.HostKey)) {
        return $reserve.HostKey
    }
    $envKey = [Environment]::GetEnvironmentVariable('SM_DEPLOY_HOSTKEY')
    if (-not [string]::IsNullOrWhiteSpace($envKey)) { return $envKey }
    return ''
}

function Normalize-DeployDomain([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
    $domain = $Value.Trim()
    if ($domain -match '^https?://') {
        try {
            $uri = [Uri]$domain
            if ($uri.Host) { return $uri.Host }
        } catch {}
    }
    $domain = $domain -replace '^https?://', ''
    $domain = ($domain -split '[/:]', 2)[0]
    return $domain.Trim().TrimEnd('.')
}

function Get-DeployDomain([hashtable]$Config) {
    $domain = Normalize-DeployDomain $Config['SM_DEPLOY_DOMAIN']
    if (-not [string]::IsNullOrWhiteSpace($domain)) { return $domain }
    return Normalize-DeployDomain $Config['SM_DEPLOY_PUBLIC_URL']
}

function Resolve-NginxConfigForDeploy {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Domain,
        [Parameter(Mandatory = $true)]
        [string]$DeployDir
    )
    $localConf = Join-Path $DeployDir 'nginx\supermessenger.conf'
    if (Test-Path $localConf) {
        return @{ Path = $localConf; IsTemporary = $false }
    }
    $exampleConf = Join-Path $DeployDir 'nginx\supermessenger.conf.example'
    if (-not (Test-Path $exampleConf)) {
        throw 'nginx config missing: copy deploy\nginx\supermessenger.conf.example to deploy\nginx\supermessenger.conf, or set SM_DEPLOY_DOMAIN in tmp\deploy\deploy.env'
    }
    $text = [System.IO.File]::ReadAllText($exampleConf)
    if ($text -notmatch 'YOUR_DOMAIN') {
        throw 'deploy\nginx\supermessenger.conf.example must contain YOUR_DOMAIN placeholder'
    }
    $text = $text.Replace('YOUR_DOMAIN', $Domain)
    $tempPath = Join-Path $env:TEMP ("sm-nginx-{0}.conf" -f [Guid]::NewGuid().ToString('N').Substring(0, 8))
    [System.IO.File]::WriteAllText($tempPath, $text.Replace("`r`n", "`n"), [Text.UTF8Encoding]::new($false))
    return @{ Path = $tempPath; IsTemporary = $true }
}

# Готовит deploy-branding.json и увеличивает номер сборки перед деплоем.
# Формат версии: 1.1 (базовая линия), далее 1.1.1, 1.1.2, ...

function Get-ReleaseVersionString {
    param(
        [int]$Major,
        [int]$Minor,
        [int]$Patch
    )
    if ($Patch -le 0) {
        return "$Major.$Minor"
    }
    return "$Major.$Minor.$Patch"
}

function Update-DeployRelease {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Root
    )

    $releasePath = Join-Path $Root 'deploy\release.json'
    $pendingPath = Join-Path $Root 'deploy\pending-changelog.txt'
    $brandingPath = Join-Path $Root 'deploy\branding.json'
    $outPath = Join-Path $Root 'src\SuperMessenger.Web\deploy-branding.json'

    if (-not (Test-Path $releasePath)) { throw "Missing $releasePath" }
    if (-not (Test-Path $brandingPath)) { throw "Missing $brandingPath" }

    $release = Get-Content $releasePath -Raw -Encoding UTF8 | ConvertFrom-Json

    # Migrate legacy release.json { buildNumber: N } -> 1.N as patch
    if ($null -ne $release.buildNumber -and $null -eq $release.patch) {
        $legacyBuild = [int]$release.buildNumber
        $release = [pscustomobject]@{
            major = 1
            minor = 1
            patch = $legacyBuild
        }
    }

    $major = if ($null -ne $release.major) { [int]$release.major } else { 1 }
    $minor = if ($null -ne $release.minor) { [int]$release.minor } else { 1 }
    $patch = if ($null -ne $release.patch) { [int]$release.patch } else { 0 }

    $patch += 1
    $version = Get-ReleaseVersionString -Major $major -Minor $minor -Patch $patch

    $items = @()
    if (Test-Path $pendingPath) {
        $items = @(Get-Content $pendingPath -Encoding UTF8 |
            ForEach-Object { $_.Trim() } |
            Where-Object { $_ -ne '' -and -not $_.StartsWith('#') })
    }
    if ($items.Count -eq 0) {
        Write-Host '  Changelog: (empty — entry will not be added)' -ForegroundColor DarkYellow
    }

    $deployBranding = [ordered]@{
        appVersion = $version
    }
    if ($items.Count -gt 0) {
        $deployBranding.changelogEntry = [ordered]@{
            version = $version
            date = (Get-Date -Format 'yyyy-MM-dd')
            items = $items
        }
    }

    $savedRelease = [ordered]@{
        major = $major
        minor = $minor
        patch = $patch
    }

    $json = $deployBranding | ConvertTo-Json -Depth 5
    [System.IO.File]::WriteAllText($outPath, $json, [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllText($releasePath, ($savedRelease | ConvertTo-Json -Depth 3), [System.Text.UTF8Encoding]::new($false))

    $pendingHeader = "# Changelog items before deploy (one per line). Lines starting with # are ignored.`n`n"
    [System.IO.File]::WriteAllText($pendingPath, $pendingHeader, [System.Text.UTF8Encoding]::new($false))

    Write-Host "  Release version: $version (patch $patch)" -ForegroundColor DarkGray
    Write-Host "  Changelog items:" -ForegroundColor DarkGray
    foreach ($item in $items) {
        Write-Host "    - $item" -ForegroundColor DarkGray
    }

    return @{
        Version = $version
        Patch = $patch
        ChangelogItems = $items
    }
}

# Build supra-webcrypto.bundle.js (forge) for HTTP / IP origins.
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
. (Join-Path $here 'npm-invoke.ps1')
Push-Location $here
try {
    if (-not (Test-Path 'node_modules\node-forge')) {
        Write-Host '[webcrypto] npm install...'
        $code = Invoke-Npm install
        if ($code -ne 0) { throw "npm install failed (exit $code)" }
    }
    New-Item -ItemType Directory -Path 'vendor' -Force | Out-Null
    Write-Host '[webcrypto] browserify (node-forge)...'
    & npx browserify supra-webcrypto-polyfill-entry.cjs -o vendor/supra-webcrypto.bundle.js -s SupraWebCryptoPolyfill --no-deprecation
    if ($LASTEXITCODE -ne 0) { throw "browserify failed: $LASTEXITCODE" }
    $out = Join-Path $here 'vendor\supra-webcrypto.bundle.js'
    if (-not (Test-Path $out)) { throw "Missing $out" }
    if ((Get-Item $out).Length -lt 50000) { throw 'Bundle too small' }
    if (-not (Select-String -Path $out -Pattern 'SupraWebCryptoPolyfill' -Quiet)) {
        throw 'Bundle missing global export'
    }
    if (Select-String -Path $out -Pattern 'Dynamic require of' -Quiet) {
        throw 'Bundle contains broken dynamic require shim'
    }
    $kb = [math]::Round((Get-Item $out).Length / 1KB, 1)
    Write-Host "[webcrypto] OK vendor/supra-webcrypto.bundle.js (${kb} KB)" -ForegroundColor Green

    $signalrSrc = Join-Path $here 'node_modules\@microsoft\signalr\dist\browser\signalr.min.js'
    if (-not (Test-Path $signalrSrc)) {
        Write-Host '[vendor] npm install @microsoft/signalr...'
        $code = Invoke-Npm install '@microsoft/signalr@8.0.7' --no-save
        if ($code -ne 0) { throw "npm install @microsoft/signalr failed (exit $code)" }
    }
    if (-not (Test-Path $signalrSrc)) { throw "Missing SignalR bundle: $signalrSrc" }
    $signalrOut = Join-Path $here 'vendor\signalr.min.js'
    Copy-Item $signalrSrc $signalrOut -Force
    if ((Get-Item $signalrOut).Length -lt 10000) { throw 'SignalR bundle too small' }
    $signalrKb = [math]::Round((Get-Item $signalrOut).Length / 1KB, 1)
    Write-Host "[vendor] OK vendor/signalr.min.js (${signalrKb} KB)" -ForegroundColor Green
} finally {
    Pop-Location
}

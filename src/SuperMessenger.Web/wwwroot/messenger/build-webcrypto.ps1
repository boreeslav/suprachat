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

    if (-not (Test-Path 'node_modules\markdown-it') -or -not (Test-Path 'node_modules\dompurify')) {
        Write-Host '[markdown] npm install markdown-it dompurify...'
        $code = Invoke-Npm install 'markdown-it@14.1.0' 'dompurify@3.2.6' --no-save
        if ($code -ne 0) { throw "npm install markdown-it dompurify failed (exit $code)" }
    }
    $esbuildPkg = Join-Path $here 'node_modules\esbuild\package.json'
    if (-not (Test-Path $esbuildPkg)) {
        Write-Host '[markdown] npm install esbuild...'
        $code = Invoke-Npm install esbuild@0.25.5 --no-save
        if ($code -ne 0) { throw "npm install esbuild failed (exit $code)" }
    }
    Write-Host '[markdown] esbuild (markdown-it + dompurify)...'
    & npx esbuild supra-markdown-entry.cjs `
        --bundle `
        --format=iife `
        --global-name=SupraMarkdown `
        --outfile=vendor/supra-markdown.bundle.js `
        --target=es2020 `
        --legal-comments=none
    if ($LASTEXITCODE -ne 0) { throw "esbuild markdown bundle failed: $LASTEXITCODE" }
    $mdOut = Join-Path $here 'vendor\supra-markdown.bundle.js'
    if (-not (Test-Path $mdOut)) { throw "Missing $mdOut" }
    if ((Get-Item $mdOut).Length -lt 20000) { throw 'Markdown bundle too small' }
    if (-not (Select-String -Path $mdOut -Pattern 'SupraMarkdown' -Quiet)) {
        throw 'Markdown bundle missing global export'
    }
    $mdKb = [math]::Round((Get-Item $mdOut).Length / 1KB, 1)
    Write-Host "[markdown] OK vendor/supra-markdown.bundle.js (${mdKb} KB)" -ForegroundColor Green

    if (-not (Test-Path 'node_modules\qrcode\lib\browser.js')) {
        Write-Host '[vendor] npm install qrcode...'
        $code = Invoke-Npm install 'qrcode@1.5.4' --no-save
        if ($code -ne 0) { throw "npm install qrcode failed (exit $code)" }
    }
    if (-not (Test-Path $esbuildPkg)) {
        Write-Host '[qrcode] npm install esbuild...'
        $code = Invoke-Npm install esbuild@0.25.5 --no-save
        if ($code -ne 0) { throw "npm install esbuild failed (exit $code)" }
    }
    Write-Host '[qrcode] esbuild (node-qrcode browser)...'
    & npx esbuild node_modules/qrcode/lib/browser.js `
        --bundle `
        --format=iife `
        --global-name=QRCode `
        --outfile=vendor/qrcode.min.js `
        --minify `
        --target=es2020 `
        --legal-comments=none
    if ($LASTEXITCODE -ne 0) { throw "esbuild qrcode bundle failed: $LASTEXITCODE" }
    $qrOut = Join-Path $here 'vendor\qrcode.min.js'
    if (-not (Test-Path $qrOut)) { throw "Missing $qrOut" }
    if ((Get-Item $qrOut).Length -lt 5000) { throw 'QRCode bundle too small' }
    if (-not (Select-String -Path $qrOut -Pattern 'toCanvas' -Quiet)) {
        throw 'QRCode bundle missing toCanvas'
    }
    $qrKb = [math]::Round((Get-Item $qrOut).Length / 1KB, 1)
    Write-Host "[qrcode] OK vendor/qrcode.min.js (${qrKb} KB)" -ForegroundColor Green
} finally {
    Pop-Location
}

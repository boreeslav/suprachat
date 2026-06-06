# Minify large client scripts for faster parse on mobile (deploy / release build).
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
. (Join-Path $here 'npm-invoke.ps1')
Push-Location $here
try {
    $targets = @(
        'app-boot-timing.js',
        'supra-messenger.js',
        'supra-integration.js',
        'supra-crypto.js',
        'supra-auth-crypto.js',
        'supra-secure-store.js',
        'supra-qr.js',
        'supra-push.js',
        'supra-master-unlock.js',
        'app-splash.js',
        'app-script-cache.js',
        'app-branding.js',
        'file-uploader.js'
    )

    $env:NODE_OPTIONS = '--max-old-space-size=8192'

    $esbuildPkg = Join-Path $here 'node_modules\esbuild\package.json'
    if (-not (Test-Path $esbuildPkg)) {
        Write-Host '[client-assets] npm install esbuild...'
        $code = Invoke-Npm install esbuild@0.25.5 --no-save
        if ($code -ne 0) { throw "npm install esbuild failed (exit $code)" }
        if (-not (Test-Path $esbuildPkg)) { throw 'esbuild not found after npm install' }
    } else {
        Write-Host '[client-assets] esbuild ok'
    }

    $runner = Join-Path $here 'minify-runner.cjs'
    @"
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const targets = $(($targets | ConvertTo-Json -Compress));
const cwd = process.cwd();
let failed = false;

for (const name of targets) {
  const src = path.join(cwd, name);
  if (!fs.existsSync(src)) {
    console.log('skip ' + name + ' (missing)');
    continue;
  }
  const out = src.replace(/\.js$/, '.min.js');
  const srcKb = (fs.statSync(src).size / 1024).toFixed(1);
  process.stdout.write('  minify ' + name + ' (' + srcKb + ' KB)... ');
  try {
    esbuild.buildSync({
      entryPoints: [src],
      outfile: out,
      minify: true,
      // Native private fields (#) — без downlevel в WeakMap (ломается в PWA при повторной загрузке).
      target: 'es2022',
      legalComments: 'none',
    });
    const outKb = (fs.statSync(out).size / 1024).toFixed(1);
    const pct = Math.round(100 - (outKb / srcKb * 100));
    console.log('-> ' + path.basename(out) + ' (' + outKb + ' KB, -' + pct + '%)');
  } catch (err) {
    failed = true;
    console.error('\\n  FAILED ' + name + ': ' + (err && err.message ? err.message : err));
  }
}

if (failed) process.exit(1);
"@ | Set-Content -Path $runner -Encoding UTF8

    Write-Host '[client-assets] minifying...'
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & node $runner 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $prevEap
    Remove-Item $runner -Force -ErrorAction SilentlyContinue

    $text = ($output | Out-String).Trim()
    if ($text) { Write-Host $text }

    if ($exitCode -ne 0) {
        throw "minify failed (exit $exitCode)"
    }
} finally {
    Pop-Location
}

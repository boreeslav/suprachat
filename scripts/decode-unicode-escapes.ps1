# Decode \uXXXX escape sequences into readable UTF-8 characters in text files.
#
# Correctness notes:
#  - Surrogate pairs (emoji, e.g. \ud83d\ude00) are decoded to a single character.
#  - Only REAL escapes are decoded: a \u preceded by an even number of backslashes.
#    Sequences like \\u0421 (escaped backslash + literal text, common when a JSON
#    string itself contains nested JSON) are left untouched so the file stays valid.
#  - JSON-significant characters stay escaped by default: control chars (< 0x20),
#    the quote (") and the backslash (\). This keeps JSON files valid. Use -DecodeAll
#    to force-decode them too (can break JSON).
#  - Binary files (images, audio, fonts) are skipped unless -AllFiles is given.
#
# Usage:
#   .\scripts\decode-unicode-escapes.ps1
#   .\scripts\decode-unicode-escapes.ps1 -Path "C:\path\to\folder"
#   .\scripts\decode-unicode-escapes.ps1 -AllFiles

param(
    [string]$Path = "C:\tsroot\SuperMessenger\tmp\backups\data",
    [string[]]$Extensions = @('.json', '.txt', '.md', '.html', '.htm', '.css', '.js', '.xml', '.svg', '.csv', '.log', '.bak'),
    [switch]$AllFiles,
    [switch]$DecodeAll
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $Path)) { throw "Path not found: $Path" }

$script:keepEscaped = -not $DecodeAll.IsPresent

# A real escape = \u not preceded by an odd run of backslashes. The lookbehind
# anchors the match at a "clean" boundary, then (?:\\\\)* captures any pairs of
# escaped backslashes that precede the real escape (they are kept as-is).
$pairRe = [regex]'(?<!\\)((?:\\\\)*)\\u([dD][89abAB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})'
$singleRe = [regex]'(?<!\\)((?:\\\\)*)\\u([0-9a-fA-F]{4})'

$pairEval = [System.Text.RegularExpressions.MatchEvaluator] {
    param($m)
    $pre = $m.Groups[1].Value
    $hi = [Convert]::ToInt32($m.Groups[2].Value, 16)
    $lo = [Convert]::ToInt32($m.Groups[3].Value, 16)
    $cp = (($hi - 0xD800) * 0x400) + ($lo - 0xDC00) + 0x10000
    return $pre + [char]::ConvertFromUtf32($cp)
}

$singleEval = [System.Text.RegularExpressions.MatchEvaluator] {
    param($m)
    $code = [Convert]::ToInt32($m.Groups[2].Value, 16)
    if ($script:keepEscaped -and ($code -lt 0x20 -or $code -eq 0x22 -or $code -eq 0x5C)) {
        return $m.Value
    }
    return $m.Groups[1].Value + [string][char]$code
}

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$files = Get-ChildItem -Path $Path -Recurse -File
$changedFiles = 0
$totalReplacements = 0
$skipped = 0

foreach ($f in $files) {
    if (-not $AllFiles -and ($Extensions -notcontains $f.Extension.ToLowerInvariant())) {
        $skipped++
        continue
    }

    $text = [System.IO.File]::ReadAllText($f.FullName, $utf8NoBom)
    $before = $text
    $text = $pairRe.Replace($text, $pairEval)
    $text = $singleRe.Replace($text, $singleEval)
    if ($text -ceq $before) { continue }

    [System.IO.File]::WriteAllText($f.FullName, $text, $utf8NoBom)
    $changedFiles++

    # Count decoded sequences (approximate: matches that actually changed length/content).
    $n = ($before.Length - $text.Length)
    $totalReplacements++
    Write-Host ("  changed -> {0}" -f $f.FullName.Substring($Path.Length).TrimStart('\'))
}

Write-Host ""
Write-Host ("Done. Files changed: {0}, files skipped (binary/other): {1}" -f $changedFiles, $skipped) -ForegroundColor Green

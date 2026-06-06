# Invoke npm without PowerShell treating stderr warnings as terminating errors.
function Invoke-Npm {
    param(
        [Parameter(Mandatory, ValueFromRemainingArguments)]
        [string[]]$NpmArgs
    )
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & npm @NpmArgs 2>&1 | ForEach-Object {
            if ($_ -is [System.Management.Automation.ErrorRecord]) {
                $text = if ($_.Exception) { $_.Exception.Message } else { "$_" }
                if ($text.Trim()) { Write-Host $text -ForegroundColor DarkGray }
            } elseif ("$_".Trim()) {
                Write-Host "$_" -ForegroundColor DarkGray
            }
        }
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

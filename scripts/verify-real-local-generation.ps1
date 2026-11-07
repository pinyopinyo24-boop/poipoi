# Real Qwen/Ollama matrix verification in a disposable Git worktree.
# Does not merge, checkout, build an APK, or apply generated changes.
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$branch = 'fix/generation-diagnostics-20261107'
$work = Join-Path $env:TEMP ('poipoi-real-generation-' + [guid]::NewGuid().ToString('N'))
$save = Join-Path $env:TEMP ('PoiPoiRealGenerationResult-' + [guid]::NewGuid().ToString('N'))
$created = $false
$linked = $false
$exitCode = 1
Push-Location $repo
try {
    git fetch origin $branch
    if ($LASTEXITCODE -ne 0) { throw 'Cannot fetch verification source' }
    git worktree add --detach $work "origin/$branch"
    if ($LASTEXITCODE -ne 0) { throw 'Cannot create disposable worktree' }
    $created = $true
    $modules = Join-Path $repo 'node_modules'
    if (!(Test-Path -LiteralPath $modules -PathType Container)) { throw 'Missing root node_modules' }
    New-Item -ItemType Junction -Path (Join-Path $work 'node_modules') -Target $modules -ErrorAction Stop | Out-Null
    $linked = $true
    Push-Location $work
    try {
        node --import tsx scripts/probe-local-code-generation-matrix.mjs
        $exitCode = $LASTEXITCODE
    }
    finally { Pop-Location }
    $reports = Join-Path $work 'data\code-generation-verification'
    if (Test-Path -LiteralPath $reports) {
        $latest = Get-ChildItem -LiteralPath $reports -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latest) {
            Copy-Item -LiteralPath $latest.FullName -Destination $save -Recurse -ErrorAction Stop
            $summaryFile = Join-Path $save 'summary.json'
            if (Test-Path -LiteralPath $summaryFile) {
                $summary = Get-Content -LiteralPath $summaryFile -Raw -Encoding UTF8 | ConvertFrom-Json
                $summary.results | Format-Table id,status,modelResponses,seconds,error -Wrap
                $count = @($summary.results | Where-Object { $_.status -eq 'passed' }).Count
                Write-Host ("ACTUAL LOCAL GENERATION: {0}/{1}" -f $count, @($summary.results).Count)
            }
            Write-Host "SAVED REPORT: $save"
        }
    }
    if ($exitCode -ne 0) { Write-Host 'REAL_LOCAL_GENERATION_FAILED (no generated files applied)' -ForegroundColor Red }
}
finally {
    if ($created) {
        if ($linked) {
            $junction = Join-Path $work 'node_modules'
            if (Test-Path -LiteralPath $junction) {
                # On Windows remove only the directory link, not its target.
                [System.IO.Directory]::Delete($junction)
            }
        }
        git worktree remove --force $work
        if ($LASTEXITCODE -ne 0) { Write-Warning "Disposable worktree cleanup needs attention: $work" }
    }
    Pop-Location
}

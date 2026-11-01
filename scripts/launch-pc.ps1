param([switch]$InstallShortcut)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

if ($InstallShortcut) {
    $desktop = [Environment]::GetFolderPath('Desktop')
    $linkPath = Join-Path $desktop 'ポイポイ.lnk'
    $target = Join-Path $root 'PoiPoi.cmd'
    $shell = New-Object -ComObject WScript.Shell
    if (Test-Path -LiteralPath $linkPath) {
        $existing = $shell.CreateShortcut($linkPath)
        if ($existing.TargetPath -ne $target) {
            throw '同じ名前のショートカットがあります。既存のものは変更しませんでした。'
        }
    }
    $link = $shell.CreateShortcut($linkPath)
    $link.TargetPath = $target
    $link.WorkingDirectory = $root
    $link.Description = 'ポイポイ（AZ）を起動'
    $link.Save()
    Write-Host 'デスクトップに「ポイポイ」を設置しました。ダブルクリックで起動できます。' -ForegroundColor Green
    exit 0
}

# A per-folder mutex prevents simultaneous clicks from launching two servers.
$hasher = [Security.Cryptography.SHA256]::Create()
$hash = [BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($root.ToLowerInvariant()))).Replace('-', '')
$hasher.Dispose()
$mutex = New-Object Threading.Mutex($false, "Local\PoiPoiLauncher_$hash")
$locked = $false
function Test-PoiPoiReady {
    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2
        return ($health.status -eq 'ok' -and $null -ne $health.runtime -and $null -ne $health.startupMetrics)
    } catch { return $false }
}
try {
    try { $locked = $mutex.WaitOne(0) }
    catch [Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) {
        Write-Host 'ポイポイは起動中です。画面が開くまでお待ちください。'
        for ($i = 0; $i -lt 120; $i++) {
            if (Test-PoiPoiReady) { Start-Process 'http://127.0.0.1:3000/streaming'; exit 0 }
            Start-Sleep -Seconds 1
        }
        throw '起動を確認できませんでした。ポイポイの起動ウィンドウを確認してください。'
    }
    if (Test-PoiPoiReady) { Start-Process 'http://127.0.0.1:3000/streaming'; exit 0 }
    if (@(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).Count -gt 0) {
        throw '3000番ポートが使用中です。既存のプログラムは停止しませんでした。'
    }
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    if (-not (Test-Path -LiteralPath (Join-Path $root 'node_modules\tsx\package.json'))) {
        throw '起動に必要な依存ファイルがありません。セットアップを確認してください。'
    }
    Write-Host 'ポイポイを起動しています。準備ができると会話画面が開きます。'
    Write-Host 'このウィンドウは起動中そのままにしてください。'
    $previousNodeEnv = $env:NODE_ENV
    try {
        $env:NODE_ENV = 'development'
        $server = Start-Process -FilePath $node -ArgumentList @('--import', 'tsx', '--watch', 'server/_core/index.ts') -WorkingDirectory $root -NoNewWindow -PassThru
    } finally { $env:NODE_ENV = $previousNodeEnv }
    $ready = $false
    for ($i = 0; $i -lt 120; $i++) {
        if ($server.HasExited) { throw "起動に失敗しました。上のエラーをご確認ください（終了コード：$($server.ExitCode)）。" }
        if (Test-PoiPoiReady) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if ($ready) { Start-Process 'http://127.0.0.1:3000/streaming' }
    else { Write-Warning '起動に時間がかかっています。上の表示を確認してください。準備後は http://127.0.0.1:3000/streaming を開けます。' }
    $server.WaitForExit()
    if ($server.ExitCode -ne 0) { throw "ポイポイが終了しました（終了コード：$($server.ExitCode)）。" }
} finally {
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}

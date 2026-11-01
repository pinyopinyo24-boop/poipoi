param([switch]$Start)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$repoRoot = Split-Path -Parent $PSScriptRoot
$installRoot = Join-Path $env:LOCALAPPDATA 'PoiPoi\image-engine'
$marker = Join-Path $installRoot 'poipoi-install.txt'
$headers = @{ 'User-Agent' = 'PoiPoi-PC-Image-Setup' }

# Reuse a running compatible engine; never stop another application.
try {
    $null = Invoke-RestMethod 'http://127.0.0.1:7860/sdapi/v1/sd-models' -TimeoutSec 3
    Write-Host 'Image engine already connected on port 7860.' -ForegroundColor Green
    return
} catch { }
if (@(Get-NetTCPConnection -LocalPort 7860 -State Listen -ErrorAction SilentlyContinue).Count -gt 0) {
    throw 'Port 7860 is occupied by another application. Nothing was stopped.'
}
if ((Test-Path -LiteralPath $installRoot) -and -not (Test-Path -LiteralPath $marker)) {
    throw 'The image-engine folder already exists without a PoiPoi installation marker. Nothing was overwritten.'
}
if (Test-Path -LiteralPath $marker) {
    if (([IO.File]::ReadAllText($marker)).Trim() -ne 'POIPOI_IMAGE_ENGINE_V1') { throw 'Unrecognized installation marker.' }
} else {
    $drive = Get-PSDrive -Name ([IO.Path]::GetPathRoot($installRoot).Substring(0, 1))
    if ($drive.Free -lt 20GB) { throw 'At least 20 GB of free space is required for download and extraction.' }
    $null = New-Item -ItemType Directory -Path $installRoot -Force
    [IO.File]::WriteAllText($marker, 'POIPOI_IMAGE_ENGINE_V1')
}
Get-Command curl.exe -ErrorAction Stop | Out-Null
function Get-Download([string]$Url, [string]$Destination, [long]$Size = 0, [string]$Sha256 = '') {
    if (Test-Path -LiteralPath $Destination) {
        $item = Get-Item -LiteralPath $Destination
        if ($Size -eq 0 -or $item.Length -eq $Size) {
            if (-not $Sha256 -or (Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash -eq $Sha256) { return }
        }
        throw "An existing download has an unexpected size or hash: $Destination"
    }
    $partial = $Destination + '.part'
    if ($Size -gt 0 -and (Test-Path -LiteralPath $partial) -and (Get-Item -LiteralPath $partial).Length -eq $Size) {
        if (-not $Sha256 -or (Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash -eq $Sha256) {
            Move-Item -LiteralPath $partial -Destination $Destination
            return
        }
        throw 'The retained partial download has an unexpected checksum.'
    }
    $downloaded = $false
    for ($attempt = 1; $attempt -le 20; $attempt++) {
        $retained = 0
        if (Test-Path -LiteralPath $partial) { $retained = (Get-Item -LiteralPath $partial).Length }
        if ($Size -gt 0 -and $retained -gt $Size) { throw "Retained data exceeds expected download size: $partial" }
        # A connection may fail just after the final bytes reached disk.
        if ($Size -gt 0 -and $retained -eq $Size) {
            $downloaded = $true
            break
        }
        Write-Host ("Download attempt {0}/20; retained {1:N1} MB." -f $attempt, ($retained / 1MB))
        # Each attempt resumes from the CURRENT length. Avoid curl's internal
        # retry handling here so data received before an interruption is retained.
        & curl.exe --fail --location --connect-timeout 20 --speed-limit 1024 --speed-time 60 --continue-at - --output $partial $Url
        $downloadExit = $LASTEXITCODE
        if ($downloadExit -eq 0) {
            $downloaded = $true
            break
        }
        if ($downloadExit -eq 33 -or $downloadExit -eq 36 -or $downloadExit -eq 60) {
            throw "Resume or certificate validation failed (curl $downloadExit). Partial data was retained: $partial"
        }
        if ($attempt -lt 20) {
            Write-Warning ("Transfer interrupted (curl {0}). Reconnecting in 5 seconds. Partial data is retained." -f $downloadExit)
            Start-Sleep -Seconds 5
        }
    }
    if (-not $downloaded) { throw "Download failed after 20 attempts. Partial data was retained for retry: $partial" }
    if ($Size -gt 0 -and (Get-Item -LiteralPath $partial).Length -ne $Size) { throw 'Download size mismatch.' }
    if ($Sha256 -and (Get-FileHash -LiteralPath $partial -Algorithm SHA256).Hash -ne $Sha256) { throw 'Download checksum mismatch.' }
    Move-Item -LiteralPath $partial -Destination $Destination
}
$cache = Join-Path $installRoot 'downloads'
$unpacked = Join-Path $installRoot 'unpacked'
$null = New-Item -ItemType Directory -Path $cache -Force
$null = New-Item -ItemType Directory -Path $unpacked -Force
$release = Invoke-RestMethod 'https://api.github.com/repos/lllyasviel/stable-diffusion-webui-forge/releases/tags/latest' -Headers $headers -TimeoutSec 30
$asset = @($release.assets | Where-Object { $_.name -eq 'webui_forge_cu121_torch231.7z' })
if ($asset.Count -ne 1) { throw 'The official Forge package could not be identified. No substitute package was selected.' }
$archive = Join-Path $cache $asset[0].name
$digest = ''
if ($asset[0].digest -match '^sha256:([0-9a-f]{64})$') { $digest = $Matches[1] }
Write-Host 'Downloading the official Forge runtime package...'
Get-Download $asset[0].browser_download_url $archive $asset[0].size $digest
$extractor = Join-Path $cache '7zr.exe'
Get-Download 'https://www.7-zip.org/a/7zr.exe' $extractor
$launchers = @(Get-ChildItem -LiteralPath $unpacked -Filter 'run.bat' -File -Depth 3)
if ($launchers.Count -eq 0) {
    & $extractor x $archive ("-o" + $unpacked) -y -bso0 -bsp1
    if ($LASTEXITCODE -ne 0) { throw 'Package extraction failed.' }
    $launchers = @(Get-ChildItem -LiteralPath $unpacked -Filter 'run.bat' -File -Depth 3)
}
if ($launchers.Count -ne 1) { throw 'The Forge launcher could not be identified uniquely.' }
$engineRoot = $launchers[0].DirectoryName
$updatedMarker = Join-Path $installRoot 'forge-updated.txt'
if (-not (Test-Path -LiteralPath $updatedMarker)) {
    $update = Join-Path $engineRoot 'update.bat'
    if (-not (Test-Path -LiteralPath $update)) { throw 'The official update script is missing.' }
    Push-Location -LiteralPath $engineRoot
    try {
        & $update
        if ($LASTEXITCODE -ne 0) { throw 'Forge update failed.' }
    } finally { Pop-Location }
    [IO.File]::WriteAllText($updatedMarker, 'Updated by the official package script.')
}
$modelInfo = Invoke-RestMethod 'https://huggingface.co/api/models/stable-diffusion-v1-5/stable-diffusion-v1-5?blobs=true' -TimeoutSec 30
$modelFile = 'v1-5-pruned-emaonly.safetensors'
$entry = @($modelInfo.siblings | Where-Object { $_.rfilename -eq $modelFile })
if ($entry.Count -ne 1 -or $entry[0].lfs.sha256 -notmatch '^[0-9a-f]{64}$') { throw 'The SD 1.5 model checksum could not be verified from its published metadata.' }
$modelDir = Join-Path $engineRoot 'webui\models\Stable-diffusion'
$null = New-Item -ItemType Directory -Path $modelDir -Force
$modelPath = Join-Path $modelDir $modelFile
Write-Host 'Downloading the SD 1.5 model (about 4.3 GB)...'
$modelUrl = 'https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5/resolve/' + $modelInfo.sha + '/' + $modelFile
Get-Download $modelUrl $modelPath $entry[0].lfs.size $entry[0].lfs.sha256
if ($modelPath -match '[%&|<>^!\r\n]') { throw 'The installation path contains unsupported batch characters.' }
$configPath = Join-Path $engineRoot 'webui\webui-user.bat'
if (-not (Test-Path -LiteralPath $configPath)) { throw 'The engine launch configuration is missing.' }
$config = [IO.File]::ReadAllText($configPath)
$pattern = '(?im)^set\s+COMMANDLINE_ARGS=[^\r\n]*'
if (-not [regex]::IsMatch($config, $pattern)) { throw 'The engine launch configuration format is not recognized.' }
$argsLine = 'set COMMANDLINE_ARGS=--api --nowebui --port 7860 --ckpt "' + $modelPath + '"'
$config = [regex]::Replace($config, $pattern, [Text.RegularExpressions.MatchEvaluator]{ param($match) $argsLine })
[IO.File]::WriteAllText($configPath, $config, (New-Object Text.UTF8Encoding($false)))
$launcher = Join-Path $installRoot 'Start-PoiPoi-Images.cmd'
$batch = '@echo off' + "`r`n" + 'cd /d "' + $engineRoot + '"' + "`r`n" + 'call run.bat' + "`r`n"
[IO.File]::WriteAllText($launcher, $batch, [Text.Encoding]::ASCII)
Write-Host "Image engine prepared: $launcher" -ForegroundColor Green
if ($Start) {
    Start-Process -FilePath $launcher -WorkingDirectory $engineRoot
    Write-Host 'The engine launch window was opened. Wait for http://127.0.0.1:7860 before requesting an image in PoiPoi.'
} else { Write-Host 'The engine was not started. Run the displayed launcher when ready.' }
Write-Host 'No PoiPoi build, restart or image-generation test was run.'

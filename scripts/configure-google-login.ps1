$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
$content = if (Test-Path -LiteralPath $envFile) { [IO.File]::ReadAllText($envFile) } else { '' }
$clientId = (Read-Host 'Google OAuthクライアントID').Trim()
if ($clientId -notmatch '^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$') { throw 'クライアントIDの形式を確認してください。' }
$secureSecret = Read-Host 'Google OAuthクライアントシークレット（非表示）' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
try { $clientSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).Trim() }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
if ($clientSecret -notmatch '^[A-Za-z0-9._~-]+$') { throw 'クライアントシークレットの形式を確認してください。' }
$updates = [ordered]@{
    GOOGLE_CLIENT_ID = $clientId
    GOOGLE_CLIENT_SECRET = $clientSecret
    GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/oauth/google/callback'
}
if ($content -notmatch '(?m)^\s*(?:export\s+)?JWT_SECRET\s*=') {
    $bytes = New-Object byte[] 48
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $updates.JWT_SECRET = [Convert]::ToBase64String($bytes)
}
foreach ($entry in $updates.GetEnumerator()) {
    $pattern = '(?m)^\s*(?:export\s+)?' + [regex]::Escape($entry.Key) + '\s*=[^\r\n]*'
    $line = $entry.Key + '=' + $entry.Value
    if ([regex]::IsMatch($content, $pattern)) {
        $replacementLine = $line
        $content = [regex]::Replace($content, $pattern, [Text.RegularExpressions.MatchEvaluator]{ param($match) $replacementLine })
    } else { $content = $content.TrimEnd() + "`r`n" + $line + "`r`n" }
}
# Keep a backup; credentials are never printed or committed.
if (Test-Path -LiteralPath $envFile) {
    $backup = $envFile + '.google-backup-' + [Guid]::NewGuid().ToString('N')
    Copy-Item -LiteralPath $envFile -Destination $backup
}
$temp = $envFile + '.' + [Guid]::NewGuid().ToString('N') + '.tmp'
try {
    [IO.File]::WriteAllText($temp, $content, (New-Object Text.UTF8Encoding($false)))
    Move-Item -LiteralPath $temp -Destination $envFile -Force
} finally { if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp } }
$clientSecret = $null
Write-Host 'Google接続設定を保存しました。データベース設定は変更していません。' -ForegroundColor Green
Write-Host '設定反映にはサーバーの起動し直しが必要です。このスクリプトは再起動しません。'
Write-Host '既存のJWT_SECRETが32文字未満の場合は、Googleボタンは無効のままです。'

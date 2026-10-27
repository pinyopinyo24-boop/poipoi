$file = (Resolve-Path ".\server\core\PoipoiEvolveCLI.ts").Path
$text = [System.IO.File]::ReadAllText($file)

$old = @"
  const aiChanges = extractJson(aiText);

  if (
    aiChanges.some(
      change =>
        change.filePath.replace(/\\/g, "/") !== targetPath
    )
  ) {
    throw new Error(
      "AIが対象外ファイルを変更しようとしました"
    );
  }

  if (!Array.isArray(aiChanges)) {
    throw new Error("AIの変更候補が配列ではありません。自己進化を中止します");
  }
"@

$new = @"
  const aiChanges = extractJson(aiText);

  if (!Array.isArray(aiChanges)) {
    throw new Error("AIの変更候補が配列ではありません。自己進化を中止します");
  }

  if (
    aiChanges.some(
      change =>
        change === null ||
        typeof change !== "object" ||
        Array.isArray(change) ||
        typeof change.filePath !== "string" ||
        change.filePath.replace(/\\/g, "/") !== targetPath
    )
  ) {
    throw new Error(
      "AIが対象外ファイルまたは不正な変更候補を返しました"
    );
  }
"@

$old = $old.TrimEnd()
$new = $new.TrimEnd()

if ([regex]::Matches($text, [regex]::Escape($old)).Count -ne 1) {
    throw "対象コードが一意に一致しません。ファイルは変更していません。"
}

$updated = $text.Replace($old, $new)

$encoding = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($file, $updated, $encoding)

Write-Output "配列検証と変更候補検証を修正しました。"

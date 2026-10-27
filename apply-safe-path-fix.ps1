$file = (Resolve-Path ".\server\core\CodeEvolutionEngine.ts").Path
$text = [System.IO.File]::ReadAllText($file)
$newline = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }

$oldImport = 'import fs from "fs/promises";'
$newImport = $oldImport + $newline + 'import fsSync from "fs";'

$oldFunction = @"
  private resolveSafePath(filePath: string): string {
    const root = path.resolve(this.projectRoot);
    const absolutePath = path.resolve(root, filePath);

    if (
      absolutePath !== root &&
      !absolutePath.startsWith(root + path.sep)
    ) {
      throw new Error(
        "プロジェクト外への変更は禁止されています: " + filePath
      );
    }

    return absolutePath;
  }
"@.TrimEnd()

$newFunction = @"
  private resolveSafePath(filePath: string): string {
    const root = path.resolve(this.projectRoot);
    const absolutePath = path.resolve(root, filePath);

    if (
      absolutePath !== root &&
      !absolutePath.startsWith(root + path.sep)
    ) {
      throw new Error(
        "プロジェクト外への変更は禁止されています: " + filePath
      );
    }

    let realRoot: string;
    let realAbsolute: string;

    try {
      realRoot = fsSync.realpathSync(root);
      realAbsolute = fsSync.realpathSync(absolutePath);
    } catch {
      throw new Error(
        "変更対象の実体パスを確認できません: " + filePath
      );
    }

    const relativePath = path.relative(realRoot, realAbsolute);

    if (
      relativePath === ".." ||
      relativePath.startsWith(".." + path.sep) ||
      path.isAbsolute(relativePath)
    ) {
      throw new Error(
        "実体パスがプロジェクト外です: " + filePath
      );
    }

    return realAbsolute;
  }
"@.TrimEnd()

if ([regex]::Matches($text, [regex]::Escape($oldImport)).Count -ne 1) {
    throw "import の一致数が1ではありません。ファイルは変更していません。"
}
if ([regex]::Matches($text, [regex]::Escape($oldFunction)).Count -ne 1) {
    throw "関数の一致数が1ではありません。ファイルは変更していません。"
}

$updated = $text.Replace($oldImport, $newImport)
$updated = $updated.Replace($oldFunction, $newFunction)

$hadBom = $text.Length -gt 0 -and [int]$text[0] -eq 0xFEFF
if ($hadBom) { $updated = [char]0xFEFF + $updated }

$encoding = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($file, $updated, $encoding)

Write-Output "修正を書き込みました。"

# FaceFusion v3.6.1 ハイブリッド実装 - テスト計画と検証

## テスト概要

このドキュメントは、FaceFusion v3.6.1 ハイブリッド処理システムの完全なテスト計画と検証手順を記載しています。

---

## 1. ユニットテスト

### 1.1 ファイルアップロード機能

**テストケース**: `uploadSourceImage`

```typescript
describe('FaceFusionHybrid - uploadSourceImage', () => {
  it('should upload source image successfully', async () => {
    const response = await trpc.facefusionHybrid.uploadSourceImage.mutate({
      filename: 'test.jpg',
      fileData: base64Data,
      mimeType: 'image/jpeg',
    });
    
    expect(response.success).toBe(true);
    expect(response.fileId).toBeDefined();
  });

  it('should reject invalid base64 data', async () => {
    expect(() => {
      trpc.facefusionHybrid.uploadSourceImage.mutate({
        filename: 'test.jpg',
        fileData: 'invalid-base64!@#$',
        mimeType: 'image/jpeg',
      });
    }).toThrow();
  });
});
```

### 1.2 ファイル取得機能

**テストケース**: `getUploadedFiles`

```typescript
describe('FaceFusionHybrid - getUploadedFiles', () => {
  it('should return empty array when no files uploaded', async () => {
    const files = await trpc.facefusionHybrid.getUploadedFiles.query();
    expect(Array.isArray(files)).toBe(true);
  });

  it('should return uploaded files with metadata', async () => {
    // Upload a file first
    await trpc.facefusionHybrid.uploadSourceImage.mutate({...});
    
    const files = await trpc.facefusionHybrid.getUploadedFiles.query();
    expect(files.length).toBeGreaterThan(0);
    expect(files[0]).toHaveProperty('id');
    expect(files[0]).toHaveProperty('filename');
    expect(files[0]).toHaveProperty('type');
  });
});
```

### 1.3 ファイル削除機能

**テストケース**: `deleteFile`

```typescript
describe('FaceFusionHybrid - deleteFile', () => {
  it('should delete file successfully', async () => {
    const uploadResult = await trpc.facefusionHybrid.uploadSourceImage.mutate({...});
    
    const deleteResult = await trpc.facefusionHybrid.deleteFile.mutate({
      fileId: uploadResult.fileId,
    });
    
    expect(deleteResult.success).toBe(true);
  });

  it('should throw error for non-existent file', async () => {
    expect(() => {
      trpc.facefusionHybrid.deleteFile.mutate({
        fileId: 'non-existent-id',
      });
    }).toThrow();
  });
});
```

---

## 2. 統合テスト

### 2.1 ファイルアップロード → ダウンロード フロー

**テストシナリオ**:
1. ソース画像をアップロード
2. ターゲット動画をアップロード
3. ファイル一覧を取得
4. 結果ファイルをアップロード
5. 結果ファイルをダウンロード
6. ダウンロードしたファイルの整合性を確認

**テストコード**:

```typescript
describe('FaceFusionHybrid - End-to-End Flow', () => {
  it('should complete full upload-download cycle', async () => {
    // Step 1: Upload source image
    const sourceResult = await trpc.facefusionHybrid.uploadSourceImage.mutate({
      filename: 'source.jpg',
      fileData: sourceBase64,
      mimeType: 'image/jpeg',
    });
    expect(sourceResult.success).toBe(true);
    const sourceFileId = sourceResult.fileId;

    // Step 2: Upload target video
    const targetResult = await trpc.facefusionHybrid.uploadTargetVideo.mutate({
      filename: 'target.mp4',
      fileData: targetBase64,
      mimeType: 'video/mp4',
    });
    expect(targetResult.success).toBe(true);
    const targetFileId = targetResult.fileId;

    // Step 3: Get file list
    const files = await trpc.facefusionHybrid.getUploadedFiles.query();
    expect(files.length).toBeGreaterThanOrEqual(2);

    // Step 4: Upload result
    const resultUpload = await trpc.facefusionHybrid.uploadResult.mutate({
      filename: 'result.mp4',
      fileData: resultBase64,
      mimeType: 'video/mp4',
      sourceFileId,
      targetFileId,
    });
    expect(resultUpload.success).toBe(true);
    const resultFileId = resultUpload.fileId;

    // Step 5: Download result
    const downloadResult = await trpc.facefusionHybrid.downloadResult.query({
      fileId: resultFileId,
    });
    expect(downloadResult.fileData).toBeDefined();
    expect(downloadResult.filename).toBe('result.mp4');

    // Step 6: Verify file integrity
    const downloadedBuffer = Buffer.from(downloadResult.fileData, 'base64');
    expect(downloadedBuffer.length).toBeGreaterThan(0);
  });
});
```

---

## 3. UI テスト

### 3.1 ファイルアップロードタブ

**テストシナリオ**:

| # | テスト項目 | 期待結果 |
|---|----------|--------|
| 1 | ソース画像をドラッグ&ドロップ | ファイルが選択される |
| 2 | ターゲット動画をドラッグ&ドロップ | ファイルが選択される |
| 3 | 「ソース画像をアップロード」ボタンをクリック | ファイルがアップロードされる |
| 4 | 「ターゲット動画をアップロード」ボタンをクリック | ファイルがアップロードされる |
| 5 | アップロード中にボタンをクリック | ボタンが無効化される |
| 6 | 不正なファイル形式を選択 | エラーメッセージが表示される |

### 3.2 処理方法タブ

**テストシナリオ**:

| # | テスト項目 | 期待結果 |
|---|----------|--------|
| 1 | 処理手順が表示される | 5つのステップが表示される |
| 2 | ローカルスクリプトコマンドが表示される | 正しいコマンドが表示される |
| 3 | Google Colab ボタンをクリック | 外部リンクが開く |
| 4 | Runpod ボタンをクリック | 外部リンクが開く |

### 3.3 ファイル管理タブ

**テストシナリオ**:

| # | テスト項目 | 期待結果 |
|---|----------|--------|
| 1 | ファイルがアップロードされていない | 「ファイルがアップロードされていません」が表示される |
| 2 | ファイルがアップロードされている | ファイル一覧が表示される |
| 3 | 「更新」ボタンをクリック | ファイル一覧が更新される |
| 4 | ダウンロードボタンをクリック | ファイルがダウンロードされる |

---

## 4. ローカルスクリプト テスト

### 4.1 スクリプト実行テスト

**テストシナリオ**:

```bash
# Test 1: Check FaceFusion installation
python3 facefusion_local_processor.py --info

# Expected output:
# {
#   "installed": true,
#   "path": "/home/user/facefusion",
#   "version": "FaceFusion 3.6.1"
# }

# Test 2: Process with default settings
python3 facefusion_local_processor.py \
  --source test_source.jpg \
  --target test_target.mp4 \
  --output test_result.mp4

# Expected: Processing completes successfully

# Test 3: Process with custom quality
python3 facefusion_local_processor.py \
  --source test_source.jpg \
  --target test_target.mp4 \
  --output test_result.mp4 \
  --quality 25

# Expected: Processing completes with lower quality

# Test 4: Process with different model
python3 facefusion_local_processor.py \
  --source test_source.jpg \
  --target test_target.mp4 \
  --output test_result.mp4 \
  --model simswap_256

# Expected: Processing completes with simswap model
```

### 4.2 エラーハンドリング テスト

**テストシナリオ**:

```bash
# Test 1: Missing source file
python3 facefusion_local_processor.py \
  --source nonexistent.jpg \
  --target test_target.mp4 \
  --output test_result.mp4

# Expected: Error message about missing source file

# Test 2: Missing target file
python3 facefusion_local_processor.py \
  --source test_source.jpg \
  --target nonexistent.mp4 \
  --output test_result.mp4

# Expected: Error message about missing target file

# Test 3: Invalid FaceFusion path
python3 facefusion_local_processor.py \
  --source test_source.jpg \
  --target test_target.mp4 \
  --output test_result.mp4 \
  --facefusion-path /invalid/path

# Expected: Error message about FaceFusion not found
```

---

## 5. パフォーマンス テスト

### 5.1 処理時間測定

**テスト環境**: GTX 1650, 48GB RAM

| 動画長 | 品質 | 予想処理時間 | 実測時間 | 差分 |
|-------|------|-----------|--------|-----|
| 10秒 | 18 | 3-5分 | - | - |
| 30秒 | 18 | 10-15分 | - | - |
| 1分 | 18 | 30-50分 | - | - |
| 10秒 | 25 | 1-2分 | - | - |

### 5.2 メモリ使用量測定

**テスト内容**:
- 処理開始時のメモリ使用量
- ピーク時のメモリ使用量
- 処理終了後のメモリ解放状況

**期待結果**:
- ピーク使用量が 4GB VRAM 以下
- 処理後にメモリが適切に解放される

---

## 6. 互換性テスト

### 6.1 ファイル形式テスト

**ソース画像形式**:
- [ ] JPEG
- [ ] PNG
- [ ] WebP
- [ ] BMP

**ターゲット動画形式**:
- [ ] MP4
- [ ] WebM
- [ ] MOV
- [ ] AVI

### 6.2 OS 互換性テスト

- [ ] Windows 10/11
- [ ] macOS 10.14+
- [ ] Ubuntu 18.04+
- [ ] CentOS 7+

---

## 7. セキュリティ テスト

### 7.1 ファイルアップロード セキュリティ

**テストシナリオ**:

| # | テスト項目 | 期待結果 |
|---|----------|--------|
| 1 | 大きなファイル（>1GB）をアップロード | 適切に処理または拒否される |
| 2 | 悪意のあるファイル名 | ファイル名がサニタイズされる |
| 3 | 実行可能ファイルをアップロード | 拒否される |
| 4 | 複数のファイルを同時アップロード | 順序が保証される |

### 7.2 データ保護

**テストシナリオ**:

| # | テスト項目 | 期待結果 |
|---|----------|--------|
| 1 | 一時ファイルの削除 | 処理後に削除される |
| 2 | ファイルのアクセス権限 | 適切に設定される |
| 3 | 個人情報の露出 | ログに個人情報が記録されない |

---

## 8. ドキュメント テスト

### 8.1 セットアップガイド検証

- [ ] Windows セットアップ手順が正確
- [ ] macOS セットアップ手順が正確
- [ ] Linux セットアップ手順が正確
- [ ] トラブルシューティングが役立つ

### 8.2 ユーザーガイド検証

- [ ] 基本的な使用方法が明確
- [ ] オプション説明が完全
- [ ] 例が実行可能

---

## 9. テスト実行チェックリスト

### 実行前

- [ ] テスト環境が準備できている
- [ ] テストデータが準備できている
- [ ] テストツールがインストールされている

### 実行中

- [ ] 各テストケースが実行される
- [ ] 結果が記録される
- [ ] 失敗したテストが特定される

### 実行後

- [ ] テスト結果が集計される
- [ ] レポートが作成される
- [ ] 問題が修正される

---

## 10. 既知の制限事項

1. **メモリ制限**: サンドボックスは 2GB RAM のため、直接処理は不可
2. **処理時間**: 長い動画（>5分）は処理時間が長くなる可能性
3. **GPU 依存**: NVIDIA GPU が必須（CPU のみでは非常に遅い）
4. **モデルサイズ**: 初回実行時にモデルをダウンロード（数GB）

---

## 11. テスト結果報告

テスト完了後、以下の情報を記録してください:

```markdown
# テスト結果報告

**実行日**: YYYY-MM-DD
**実行者**: [名前]
**環境**: [OS、GPU、RAM など]

## テスト結果

### ユニットテスト
- 合格: X / X

### 統合テスト
- 合格: X / X

### UI テスト
- 合格: X / X

### パフォーマンステスト
- 平均処理時間: X 分
- ピークメモリ使用量: X GB

## 問題点

1. [問題1]
2. [問題2]

## 推奨事項

1. [推奨1]
2. [推奨2]
```

---

**最終更新**: 2026年7月7日

# FaceFusion v3.6.1 Google Colab 統合 - テスト計画

このドキュメントは、Google Colab 統合機能の完全なテスト計画を記載しています。

---

## 1. ユニットテスト

### 1.1 Colab ノートブック生成

**テストケース**: `generateColabNotebook`

```typescript
describe('colabIntegration - generateColabNotebook', () => {
  it('should generate valid Colab notebook', async () => {
    const response = await trpc.colabIntegration.generateNotebook.mutate({
      quality: 18,
      model: 'inswapper_128',
    });

    expect(response.success).toBe(true);
    expect(response.notebook).toBeDefined();
    expect(response.notebookJSON).toBeDefined();
    expect(response.notebook.nbformat).toBe(4);
    expect(response.notebook.cells.length).toBeGreaterThan(0);
  });

  it('should include all required cells', async () => {
    const response = await trpc.colabIntegration.generateNotebook.mutate({
      quality: 18,
      model: 'inswapper_128',
    });

    const cellTypes = response.notebook.cells.map(c => c.cell_type);
    expect(cellTypes).toContain('markdown');
    expect(cellTypes).toContain('code');
  });

  it('should validate quality parameter', async () => {
    expect(() => {
      trpc.colabIntegration.generateNotebook.mutate({
        quality: 100, // Invalid: > 51
        model: 'inswapper_128',
      });
    }).toThrow();
  });

  it('should support different models', async () => {
    const models = ['inswapper_128', 'simswap_256', 'blendswap_256'];
    
    for (const model of models) {
      const response = await trpc.colabIntegration.generateNotebook.mutate({
        quality: 18,
        model,
      });
      expect(response.success).toBe(true);
    }
  });
});
```

### 1.2 推奨設定取得

**テストケース**: `getRecommendedSettings`

```typescript
describe('colabIntegration - getRecommendedSettings', () => {
  it('should return models list', async () => {
    const response = await trpc.colabIntegration.getRecommendedSettings.query();
    
    expect(response.models).toBeDefined();
    expect(Array.isArray(response.models)).toBe(true);
    expect(response.models.length).toBeGreaterThan(0);
    
    response.models.forEach(model => {
      expect(model.id).toBeDefined();
      expect(model.name).toBeDefined();
      expect(model.description).toBeDefined();
    });
  });

  it('should return quality presets', async () => {
    const response = await trpc.colabIntegration.getRecommendedSettings.query();
    
    expect(response.qualityPresets).toBeDefined();
    expect(Array.isArray(response.qualityPresets)).toBe(true);
    expect(response.qualityPresets.length).toBeGreaterThan(0);
    
    response.qualityPresets.forEach(preset => {
      expect(preset.name).toBeDefined();
      expect(preset.value).toBeDefined();
      expect(preset.estimatedTime).toBeDefined();
    });
  });

  it('should return GPU types', async () => {
    const response = await trpc.colabIntegration.getRecommendedSettings.query();
    
    expect(response.gpuTypes).toBeDefined();
    expect(Array.isArray(response.gpuTypes)).toBe(true);
    expect(response.gpuTypes.length).toBeGreaterThan(0);
    
    response.gpuTypes.forEach(gpu => {
      expect(gpu.id).toBeDefined();
      expect(gpu.name).toBeDefined();
      expect(gpu.vram).toBeDefined();
    });
  });
});
```

### 1.3 ノートブックダウンロード

**テストケース**: `downloadNotebook`

```typescript
describe('colabIntegration - downloadNotebook', () => {
  it('should return downloadable notebook', async () => {
    const response = await trpc.colabIntegration.downloadNotebook.query({
      quality: 18,
      model: 'inswapper_128',
    });

    expect(response.success).toBe(true);
    expect(response.filename).toBe('FaceFusion_v3.6.1.ipynb');
    expect(response.content).toBeDefined();
    expect(response.mimeType).toBe('application/json');
  });

  it('should return valid JSON content', async () => {
    const response = await trpc.colabIntegration.downloadNotebook.query({
      quality: 18,
      model: 'inswapper_128',
    });

    const parsed = JSON.parse(response.content);
    expect(parsed.nbformat).toBe(4);
    expect(Array.isArray(parsed.cells)).toBe(true);
  });
});
```

---

## 2. UI テスト

### 2.1 CloudProcessingTab コンポーネント

**テストシナリオ**:

| # | テスト項目 | 期待結果 |
|---|----------|--------|
| 1 | CloudProcessingTab がレンダリングされる | コンポーネントが表示される |
| 2 | 「Google Colab の利点」セクションが表示される | 4つの利点が表示される |
| 3 | モデル選択ドロップダウンが表示される | 複数のモデルが選択可能 |
| 4 | 品質スライダーが表示される | 0-51の範囲で調整可能 |
| 5 | 品質プリセットボタンが表示される | 「高品質」「標準品質」「低品質」が表示される |
| 6 | GPU 情報が表示される | Tesla T4, P100, V100 の情報が表示される |
| 7 | 「🚀 Google Colab で処理を開始」ボタンが表示される | ボタンがクリック可能 |
| 8 | 「📥 ノートブックをダウンロード」ボタンが表示される | ボタンがクリック可能 |

### 2.2 モデル選択機能

**テストシナリオ**:

```
1. CloudProcessingTab を開く
2. モデル選択ドロップダウンをクリック
3. 異なるモデルを選択
4. 選択したモデルが表示される
5. 「🚀 Google Colab で処理を開始」ボタンをクリック
6. 選択したモデルでノートブックが生成される
```

### 2.3 品質設定機能

**テストシナリオ**:

```
1. CloudProcessingTab を開く
2. 品質スライダーを操作（0 → 51）
3. スライダーの値が更新される
4. 品質プリセットボタンをクリック
5. スライダーが対応する値に更新される
6. 「🚀 Google Colab で処理を開始」ボタンをクリック
7. 選択した品質でノートブックが生成される
```

---

## 3. 統合テスト

### 3.1 Colab ノートブック生成 → ダウンロード フロー

**テストシナリオ**:

```
1. CloudProcessingTab を開く
2. モデル: InSwapper 128、品質: 18 を選択
3. 「📥 ノートブックをダウンロード」ボタンをクリック
4. FaceFusion_v3.6.1.ipynb がダウンロードされる
5. ダウンロードしたファイルが有効な Jupyter ノートブック形式である
6. ノートブックに以下のセルが含まれている:
   - GPU 確認セル
   - FaceFusion インストールセル
   - ファイルアップロードセル
   - 処理実行セル
   - ダウンロードセル
```

### 3.2 WebUI → Colab → ダウンロード フロー

**テストシナリオ**:

```
1. FaceFusionHybrid ページを開く
2. 「ファイルアップロード」タブでソース画像とターゲット動画をアップロード
3. 「クラウド処理」タブに切り替え
4. 処理設定を選択
5. 「🚀 Google Colab で処理を開始」ボタンをクリック
6. 新しいブラウザタブで Google Colab が開く
7. ノートブックをインポート
8. 各セルを順番に実行
9. 処理が完了
10. result.mp4 がダウンロードされる
11. ダウンロードしたファイルが有効な動画ファイルである
```

---

## 4. モバイル UI テスト

### 4.1 Android スマートフォン対応

**テスト環境**: Android 12+、Chrome ブラウザ

**テストシナリオ**:

| # | テスト項目 | 期待結果 |
|---|----------|--------|
| 1 | FaceFusionHybrid ページが表示される | レスポンシブデザインで正しく表示される |
| 2 | タブが表示される | 4つのタブが表示される |
| 3 | ファイルアップロード機能が動作する | ファイル選択ダイアログが表示される |
| 4 | CloudProcessingTab が表示される | すべての要素が表示される |
| 5 | ボタンがクリック可能である | タッチで反応する |
| 6. スクロール機能が動作する | スムーズにスクロール可能 |
| 7 | 「🚀 Google Colab で処理を開始」ボタンをクリック | Google Colab が新しいタブで開く |

---

## 5. エラーハンドリング テスト

### 5.1 無効な入力値

**テストシナリオ**:

```
1. 無効な品質値（-1 または 52）を入力
   → エラーメッセージが表示される

2. 無効なモデル名を入力
   → エラーメッセージが表示される

3. ネットワークエラーが発生
   → エラーメッセージが表示される
   → ユーザーが再試行可能
```

### 5.2 ノートブック生成エラー

**テストシナリオ**:

```
1. ノートブック生成中にエラーが発生
   → エラーメッセージが表示される
   → ユーザーが再試行可能

2. ダウンロード中にエラーが発生
   → エラーメッセージが表示される
   → ユーザーが再試行可能
```

---

## 6. パフォーマンス テスト

### 6.1 ノートブック生成速度

**テスト内容**:

| テスト項目 | 期待値 | 実測値 |
|----------|-------|-------|
| ノートブック生成時間 | < 1秒 | - |
| ノートブックサイズ | < 100KB | - |
| JSON パース時間 | < 100ms | - |

### 6.2 UI レスポンス

**テスト内容**:

| テスト項目 | 期待値 | 実測値 |
|----------|-------|-------|
| タブ切り替え時間 | < 300ms | - |
| ボタンクリック反応 | < 100ms | - |
| スライダー操作反応 | < 50ms | - |

---

## 7. ブラウザ互換性テスト

**テスト対象ブラウザ**:

- [ ] Chrome 最新版
- [ ] Firefox 最新版
- [ ] Safari 最新版
- [ ] Edge 最新版
- [ ] Chrome Mobile（Android）
- [ ] Safari Mobile（iOS）

**テストシナリオ**:

各ブラウザで以下を確認:
1. CloudProcessingTab が正しくレンダリングされる
2. すべてのボタンがクリック可能
3. ドロップダウンが正常に動作
4. スライダーが正常に動作
5. ファイルダウンロードが正常に動作

---

## 8. セキュリティ テスト

### 8.1 入力値検証

**テストシナリオ**:

```
1. XSS 攻撃を試みる
   → サニタイズされて無害化される

2. 大きなデータを入力
   → 適切に処理または拒否される

3. 悪意のあるファイル名
   → サニタイズされる
```

### 8.2 データ保護

**テストシナリオ**:

```
1. ノートブック内に個人情報が含まれない
2. ダウンロードされたファイルが安全
3. セッション情報が保護されている
```

---

## 9. テスト実行チェックリスト

### 実行前

- [ ] テスト環境が準備できている
- [ ] テストツールがインストールされている
- [ ] テストデータが準備できている
- [ ] ドキュメントが最新版

### 実行中

- [ ] 各テストケースが実行される
- [ ] 結果が記録される
- [ ] 失敗したテストが特定される
- [ ] スクリーンショットが取得される

### 実行後

- [ ] テスト結果が集計される
- [ ] レポートが作成される
- [ ] 問題が修正される
- [ ] 修正が再テストされる

---

## 10. テスト結果報告テンプレート

```markdown
# Google Colab 統合テスト結果報告

**実行日**: YYYY-MM-DD
**実行者**: [名前]
**環境**: [OS、ブラウザ、デバイス]

## テスト結果サマリー

### ユニットテスト
- 合格: X / X

### UI テスト
- 合格: X / X

### 統合テスト
- 合格: X / X

### モバイル テスト
- 合格: X / X

### パフォーマンステスト
- 平均ノートブック生成時間: X ms
- 平均 UI レスポンス時間: X ms

## 問題点

1. [問題1]
2. [問題2]

## 推奨事項

1. [推奨1]
2. [推奨2]

## 署名

実行者: ________________
日付: ________________
```

---

**最終更新**: 2026年7月7日

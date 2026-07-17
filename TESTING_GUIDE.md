# ポイポイ テスティングガイド

## テスト戦略

ポイポイプロジェクトのテストは、以下の3つのカテゴリに分類されます。

### 1. 通常テスト (Unit & Integration Tests)

**目的**: コア機能の正確性を検証

**実行対象ファイル**:
- `server/auth.logout.test.ts` - 認証機能
- `server/integration.test.ts` - 統合機能

**テスト数**: 25テスト

**実行時間**: 3.03秒

**実行コマンド**:
```bash
npm test
pnpm test
```

**CI実行**: ✅ **実行する**

**本番前実行**: ✅ **必須**

**成功基準**: 100%成功

---

### 2. 外部APIテスト (External Integration Tests)

**目的**: 外部APIとの統合を検証

**実行対象ファイル**:
- `server/agent.test.ts` - AIエージェント統合
- `server/evolution-and-generation.test.ts` - 進化・生成機能
- `server/faceswap.test.ts` - 顔交換機能

**テスト数**: 40+ テスト

**実行時間**: 120秒以上（タイムアウトの可能性あり）

**実行コマンド**:
```bash
npm run test:external
pnpm test:external
```

**CI実行**: ⏭️ **スキップ** (オプション)

**本番前実行**: ✅ **推奨** (ステージング環境で実行)

**成功基準**: 100%成功（ただし、外部API可用性に依存）

**注意事項**:
- 外部LLM APIへの依存
- ネットワーク遅延の影響
- API レート制限の考慮
- タイムアウト設定: 30秒/テスト

---

## テスト実行方法

### 通常テストのみ実行（推奨）

```bash
# 開発環境
npm test

# CI/CD環境
npm run test:ci
```

### 外部APIテストを含める

```bash
# ローカル開発（ステージング環境）
npm run test:all

# 本番前チェック
npm run test:pre-production
```

### 特定のテストファイルを実行

```bash
# 認証テストのみ
npm run test -- server/auth.logout.test.ts

# 統合テストのみ
npm run test -- server/integration.test.ts

# 外部APIテストのみ
npm run test -- server/agent.test.ts
```

---

## テスト設定

### vitest.config.ts

```typescript
test: {
  environment: "node",
  include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
  exclude: ["**/faceswap.test.ts", "**/agent.test.ts", "**/evolution-and-generation.test.ts"],
  testTimeout: 30000,
}
```

### 外部APIテスト用設定

```typescript
test: {
  environment: "node",
  include: ["**/faceswap.test.ts", "**/agent.test.ts", "**/evolution-and-generation.test.ts"],
  testTimeout: 120000,
}
```

---

## CI/CD パイプライン

### GitHub Actions (推奨)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'pnpm'
      
      # 通常テスト（必須）
      - run: npm test
      
      # 外部APIテスト（オプション、ステージング環境のみ）
      - if: github.ref == 'refs/heads/main'
        run: npm run test:external
```

---

## テスト結果の解釈

### 成功時

```
Test Files  2 passed (2)
Tests  25 passed (25)
Duration  3.03s
```

**判定**: ✅ **Production Ready**

### 失敗時

```
Test Files  1 failed | 1 passed
Tests  1 failed | 24 passed
```

**対応**:
1. 失敗したテストを確認
2. エラーメッセージを分析
3. コード修正
4. テスト再実行

### タイムアウト時

```
Terminated (timeout)
```

**原因**: 外部API応答遅延

**対応**:
1. ネットワーク接続確認
2. API可用性確認
3. タイムアウト値調整
4. ステージング環境で再実行

---

## テスト品質基準

| 項目 | 基準 | 現在 |
|------|------|------|
| テスト成功率 | 100% | ✅ 100% |
| カバレッジ | 80%+ | ⏳ 測定中 |
| 実行時間 | <10秒 | ✅ 3.03秒 |
| 外部APIテスト | 100% | ✅ 100% |

---

## トラブルシューティング

### テストがタイムアウトする

**原因**: 外部API応答遅延

**解決策**:
```bash
# タイムアウト値を増やす
npm run test -- --testTimeout=60000

# 外部APIテストをスキップ
npm test
```

### 特定のテストが失敗する

**原因**: 環境設定不足

**解決策**:
```bash
# 環境変数確認
echo $DATABASE_URL
echo $JWT_SECRET

# 依存関係再インストール
pnpm install

# テスト再実行
npm test
```

### ビルドが失敗する

**原因**: TypeScript エラー

**解決策**:
```bash
# 型チェック
npm run typecheck

# ビルド
npm run build
```

---

## ベストプラクティス

1. **ローカル開発**
   - `npm test` で通常テストを実行
   - コミット前に成功確認

2. **プルリクエスト**
   - CI で自動実行
   - 全テスト成功を確認

3. **本番デプロイ前**
   - `npm run test:pre-production` で全テスト実行
   - 外部APIテストもステージング環境で実行

4. **本番環境**
   - 外部APIテストは定期的に実行
   - 監視・アラート設定

---

## 参考資料

- [Vitest Documentation](https://vitest.dev/)
- [Jest Testing Guide](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)

---

**最終更新**: 2026年7月16日

**バージョン**: 1.0.0

**ステータス**: Production Ready ✅

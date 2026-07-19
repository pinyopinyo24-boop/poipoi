# PoiPoi 本番デプロイメントガイド

## 概要

このガイドは、PoiPoi アプリケーションを Render または Railway などの外部ホスティングサービスにデプロイするための手順を説明します。

---

## 前提条件

- Node.js 22.x 以上
- pnpm 10.4.1 以上
- Git リポジトリ (GitHub, GitLab, Bitbucket など)
- Render または Railway アカウント
- MySQL/PostgreSQL データベース

---

## デプロイメント対象ファイル

### 新規追加ファイル

| ファイル | 用途 |
|---------|------|
| `Dockerfile` | Docker イメージビルド定義 |
| `.dockerignore` | Docker ビルド時の除外ファイル |
| `render.yaml` | Render デプロイメント設定 |
| `railway.json` | Railway デプロイメント設定 |
| `DEPLOYMENT_GUIDE.md` | このガイド |

### 修正ファイル

| ファイル | 変更内容 |
|---------|---------|
| `server/_core/index.ts` | PORT 環境変数対応 |

---

## 環境変数一覧

### 必須環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `NODE_ENV` | 実行環境 | `production` |
| `PORT` | リッスンポート | `3000` |
| `DATABASE_URL` | データベース接続文字列 | `mysql://user:pass@host:3306/dbname` |
| `JWT_SECRET` | JWT 署名キー | `your-secret-key-here` |

### Manus LLM 統合 (オプション)

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `BUILT_IN_FORGE_API_URL` | Manus Forge API URL | `https://forge.manus.ai` |
| `BUILT_IN_FORGE_API_KEY` | Manus Forge API キー | `your-api-key-here` |
| `VITE_FRONTEND_FORGE_API_URL` | フロント用 Forge API URL | `https://forge.manus.ai` |
| `VITE_FRONTEND_FORGE_API_KEY` | フロント用 API キー | `your-frontend-key-here` |

### オプション環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `VITE_APP_ID` | アプリケーション ID | - |
| `VITE_APP_TITLE` | アプリケーション名 | PoiPoi |
| `VITE_APP_LOGO` | ロゴ URL | - |

---

## Render へのデプロイ

### ステップ 1: GitHub にコードをプッシュ

```bash
git add .
git commit -m "STEP95: Add deployment configuration for Render/Railway"
git push origin main
```

### ステップ 2: Render ダッシュボードで新規サービス作成

1. [Render ダッシュボード](https://dashboard.render.com) にアクセス
2. **New +** → **Web Service** をクリック
3. GitHub リポジトリを接続
4. 以下の設定を入力:

| 設定項目 | 値 |
|---------|-----|
| **Name** | `poipoi-api` |
| **Environment** | `Docker` |
| **Region** | `Singapore` (またはご希望の地域) |
| **Branch** | `main` |

### ステップ 3: 環境変数を設定

Render ダッシュボードの **Environment** セクションで以下を設定:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=<your-database-url>
JWT_SECRET=<generate-random-string>
BUILT_IN_FORGE_API_URL=https://forge.manus.ai
BUILT_IN_FORGE_API_KEY=<your-manus-api-key>
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai
VITE_FRONTEND_FORGE_API_KEY=<your-frontend-api-key>
```

### ステップ 4: デプロイ実行

1. **Create Web Service** をクリック
2. ビルドとデプロイが自動的に開始
3. ビルド完了後、サービス URL が表示される

### ステップ 5: 本番 API URL を確認

デプロイ完了後、以下の URL が生成されます:

```
https://poipoi-api.onrender.com
```

---

## Railway へのデプロイ

### ステップ 1: GitHub にコードをプッシュ

```bash
git add .
git commit -m "STEP95: Add deployment configuration for Render/Railway"
git push origin main
```

### ステップ 2: Railway CLI をインストール

```bash
npm install -g @railway/cli
```

### ステップ 3: Railway にログイン

```bash
railway login
```

### ステップ 4: 新規プロジェクト作成

```bash
railway init
```

### ステップ 5: 環境変数を設定

```bash
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=<your-database-url>
railway variables set JWT_SECRET=<generate-random-string>
railway variables set BUILT_IN_FORGE_API_URL=https://forge.manus.ai
railway variables set BUILT_IN_FORGE_API_KEY=<your-manus-api-key>
railway variables set VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai
railway variables set VITE_FRONTEND_FORGE_API_KEY=<your-frontend-api-key>
```

### ステップ 6: デプロイ実行

```bash
railway up
```

### ステップ 7: 本番 API URL を確認

```bash
railway open
```

---

## Android アプリの API URL 更新

デプロイ完了後、Android アプリの API URL を更新します:

### 方法 1: MobileAPIConnector.ts を更新

```typescript
// mobile/src/services/MobileAPIConnector.ts
constructor(baseURL: string = 'https://poipoi-api.onrender.com') {
  // または Railway の場合
  // constructor(baseURL: string = 'https://poipoi-api-production.up.railway.app') {
```

### 方法 2: app.json を更新

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://poipoi-api.onrender.com"
    }
  }
}
```

### ステップ 3: APK を再ビルド

```bash
cd mobile
eas build --platform android --profile preview
```

---

## デプロイメント後の確認

### ヘルスチェック

```bash
curl https://poipoi-api.onrender.com/health
```

期待される応答:

```json
{
  "status": "ok",
  "timestamp": "2026-07-19T12:00:00.000Z"
}
```

### tRPC エンドポイント確認

```bash
curl -X POST https://poipoi-api.onrender.com/api/trpc/chat.processMessage \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "userId": "test-user",
      "sessionId": "test-session",
      "message": "こんにちは"
    }
  }'
```

---

## トラブルシューティング

### ビルドエラー

**問題**: Docker ビルド時に `npm ERR!` が発生

**解決策**:
1. `pnpm-lock.yaml` がリポジトリに含まれていることを確認
2. `package.json` の依存関係を確認
3. ローカルで `npm run build` を実行して確認

### データベース接続エラー

**問題**: `DATABASE_URL` エラー

**解決策**:
1. 環境変数が正しく設定されていることを確認
2. データベースが外部からアクセス可能か確認
3. ファイアウォール設定を確認

### LLM API エラー

**問題**: `BUILT_IN_FORGE_API_KEY` エラー

**解決策**:
1. API キーが正しく設定されていることを確認
2. Manus Forge API が利用可能か確認
3. API キーの有効期限を確認

---

## 本番環境での推奨設定

### セキュリティ

- ✅ HTTPS を使用 (Render/Railway が自動対応)
- ✅ JWT_SECRET を強力なランダム文字列に設定
- ✅ データベースのアクセス制限を設定
- ✅ API キーを環境変数で管理

### パフォーマンス

- ✅ CDN を使用 (Render/Railway が自動対応)
- ✅ キャッシング戦略を実装
- ✅ ログレベルを `info` に設定

### 監視

- ✅ ヘルスチェックエンドポイントを監視
- ✅ エラーログを確認
- ✅ パフォーマンスメトリクスを記録

---

## ロールバック手順

### Render でのロールバック

1. Render ダッシュボードで該当サービスを選択
2. **Deployments** タブをクリック
3. 前のデプロイメントを選択
4. **Redeploy** をクリック

### Railway でのロールバック

```bash
railway rollback
```

---

## 関連リソース

- [Render ドキュメント](https://render.com/docs)
- [Railway ドキュメント](https://docs.railway.app)
- [Docker ドキュメント](https://docs.docker.com)
- [Express.js ドキュメント](https://expressjs.com)

---

## サポート

問題が発生した場合は、以下をご確認ください:

1. ログを確認 (Render/Railway ダッシュボード)
2. 環境変数が正しく設定されているか確認
3. ローカルで `npm run build` と `npm start` を実行して確認
4. GitHub Issues でサポートを依頼

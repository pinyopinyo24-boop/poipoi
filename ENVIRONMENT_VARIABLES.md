# PoiPoi 環境変数リファレンス

## 概要

このドキュメントは、PoiPoi アプリケーションで使用される全ての環境変数を説明します。

---

## サーバー環境変数

### 実行環境

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|----------|------|
| `NODE_ENV` | ✅ | `development` | 実行環境 (`development`, `production`, `staging`) |
| `PORT` | ❌ | `3000` | リッスンポート (Render/Railway で自動設定) |

### データベース

| 変数名 | 必須 | デフォルト | 説明 | 例 |
|--------|------|----------|------|-----|
| `DATABASE_URL` | ✅ | - | データベース接続文字列 | `mysql://user:pass@host:3306/dbname` |

**MySQL 接続文字列形式:**
```
mysql://[user]:[password]@[host]:[port]/[database]
```

**PostgreSQL 接続文字列形式:**
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

### 認証・セキュリティ

| 変数名 | 必須 | デフォルト | 説明 | 推奨値 |
|--------|------|----------|------|--------|
| `JWT_SECRET` | ✅ | `local-secret-key` | JWT 署名キー | 32文字以上のランダム文字列 |

**生成方法:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Manus LLM 統合

### API キー

| 変数名 | 必須 | デフォルト | 説明 | 取得方法 |
|--------|------|----------|------|---------|
| `BUILT_IN_FORGE_API_URL` | ✅ | - | Manus Forge API URL | `https://forge.manus.ai` |
| `BUILT_IN_FORGE_API_KEY` | ✅ | - | Manus Forge API キー | Manus ダッシュボード |
| `VITE_FRONTEND_FORGE_API_URL` | ✅ | - | フロント用 Forge API URL | `https://forge.manus.ai` |
| `VITE_FRONTEND_FORGE_API_KEY` | ✅ | - | フロント用 API キー | Manus ダッシュボード |

**取得手順:**
1. [Manus ダッシュボード](https://manus.im) にアクセス
2. Settings → API Keys をクリック
3. 新規キーを生成またはコピー

---

## フロントエンド環境変数

### アプリケーション情報

| 変数名 | 必須 | デフォルト | 説明 | 例 |
|--------|------|----------|------|-----|
| `VITE_APP_ID` | ❌ | - | アプリケーション ID | `2Coz6KdDCScsycd4tpN6Yo` |
| `VITE_APP_TITLE` | ❌ | `PoiPoi` | アプリケーション名 | `Poイポイ - 次世代生産管理` |
| `VITE_APP_LOGO` | ❌ | - | ロゴ画像 URL | `https://example.com/logo.png` |

### OAuth 設定

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|----------|------|
| `VITE_OAUTH_PORTAL_URL` | ❌ | `https://manus.im` | OAuth ポータル URL |

### 分析

| 変数名 | 必須 | デフォルト | 説明 |
|--------|------|----------|------|
| `VITE_ANALYTICS_ENDPOINT` | ❌ | - | 分析エンドポイント |
| `VITE_ANALYTICS_WEBSITE_ID` | ❌ | - | 分析用ウェブサイト ID |

---

## Android モバイルアプリ設定

### app.json 内の設定

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://poipoi-api.onrender.com",
      "apiTimeout": 30000,
      "buildNumber": "1",
      "releaseChannel": "beta"
    }
  }
}
```

| 設定項目 | 説明 | 例 |
|---------|------|-----|
| `apiBaseUrl` | バックエンド API URL | `https://poipoi-api.onrender.com` |
| `apiTimeout` | API タイムアウト (ms) | `30000` |
| `buildNumber` | ビルド番号 | `1` |
| `releaseChannel` | リリースチャネル | `beta`, `production` |

---

## 環境別設定例

### 開発環境 (ローカル)

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://root:password@localhost:3306/poipoi_dev
JWT_SECRET=local-dev-secret-key
BUILT_IN_FORGE_API_URL=https://forge.manus.ai
BUILT_IN_FORGE_API_KEY=your-dev-api-key
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai
VITE_FRONTEND_FORGE_API_KEY=your-dev-frontend-key
VITE_APP_TITLE=PoiPoi (Dev)
```

### ステージング環境 (Render)

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:pass@staging-db.example.com:3306/poipoi_staging
JWT_SECRET=<32-char-random-string>
BUILT_IN_FORGE_API_URL=https://forge.manus.ai
BUILT_IN_FORGE_API_KEY=your-staging-api-key
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai
VITE_FRONTEND_FORGE_API_KEY=your-staging-frontend-key
VITE_APP_TITLE=PoiPoi (Staging)
```

### 本番環境 (Render/Railway)

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:pass@prod-db.example.com:3306/poipoi_prod
JWT_SECRET=<32-char-random-string>
BUILT_IN_FORGE_API_URL=https://forge.manus.ai
BUILT_IN_FORGE_API_KEY=your-prod-api-key
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai
VITE_FRONTEND_FORGE_API_KEY=your-prod-frontend-key
VITE_APP_TITLE=Poイポイ - 次世代生産管理 & AIクリエイティブプラットフォーム
```

---

## 環境変数の設定方法

### ローカル開発

`.env.local` ファイルを作成:

```bash
cp .env.example .env.local
# .env.local を編集
```

### Render

1. Render ダッシュボード → サービス選択
2. **Environment** タブ
3. **Add Environment Variable** をクリック
4. キーと値を入力

### Railway

```bash
railway variables set KEY=value
```

### Docker (ローカルテスト)

```bash
docker run -e NODE_ENV=production \
  -e DATABASE_URL=mysql://... \
  -e JWT_SECRET=... \
  poipoi:latest
```

---

## セキュリティベストプラクティス

### ✅ 推奨事項

- ✅ `JWT_SECRET` は 32 文字以上のランダム文字列に設定
- ✅ API キーは環境変数で管理 (コードに含めない)
- ✅ 本番環境では `NODE_ENV=production` に設定
- ✅ 定期的に API キーをローテーション
- ✅ `.env` ファイルを `.gitignore` に追加

### ❌ 避けるべき事項

- ❌ API キーをコードに埋め込む
- ❌ `.env` ファイルをリポジトリにコミット
- ❌ 開発環境の秘密を本番環境で再利用
- ❌ 秘密をログに出力

---

## トラブルシューティング

### 環境変数が読み込まれない

**原因**: 環境変数が設定されていない、または名前が違う

**解決策**:
```bash
# 環境変数を確認
env | grep BUILT_IN_FORGE
env | grep DATABASE_URL

# サーバーログで確認
# [LLM KEY CHECK] BUILT_IN_FORGE_API_KEY is configured
```

### API キーエラー

**原因**: API キーが無効または期限切れ

**解決策**:
1. Manus ダッシュボードで API キーを確認
2. 新しいキーを生成
3. 環境変数を更新
4. サーバーを再起動

### データベース接続エラー

**原因**: DATABASE_URL が正しくない

**解決策**:
```bash
# 接続文字列を確認
echo $DATABASE_URL

# ローカルでテスト
mysql -h [host] -u [user] -p [password] -D [database]
```

---

## 関連リソース

- [Express.js 環境変数](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js process.env](https://nodejs.org/api/process.html#process_process_env)
- [Render 環境変数](https://render.com/docs/environment-variables)
- [Railway 環境変数](https://docs.railway.app/guides/variables)

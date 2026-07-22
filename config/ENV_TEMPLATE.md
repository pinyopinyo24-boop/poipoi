# PoiPoi Portable Configuration Template

このファイルは `.env` ファイルの設定テンプレートです。

## セットアップ手順

1. `.env.example` を `.env` にコピー
2. 以下の設定項目を編集
3. `npm run check` で設定を確認

## 必須設定項目

### Server Configuration

```
LOCAL_SERVER_URL=http://localhost:3000
CLOUD_SERVER_URL=https://poipoi.manus.space
HYBRID_MODE=auto
```

### Database Configuration

```
DATABASE_URL=mysql://user:password@localhost:3306/poipoi
```

### Authentication

```
JWT_SECRET=your-secret-key-here-change-in-production
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://oauth.manus.space
VITE_OAUTH_PORTAL_URL=https://oauth.manus.space/portal
```

## AI Provider APIs (必須)

### OpenAI

```
OPENAI_API_KEY=sk-...
```

取得方法: https://platform.openai.com/api-keys

### Google Gemini

```
GEMINI_API_KEY=...
```

取得方法: https://makersuite.google.com/app/apikey

### Anthropic Claude (オプション)

```
CLAUDE_API_KEY=sk-ant-...
```

取得方法: https://console.anthropic.com/

## Manus Built-in APIs

```
BUILT_IN_FORGE_API_URL=https://api.manus.space
BUILT_IN_FORGE_API_KEY=your-manus-api-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.space
VITE_FRONTEND_FORGE_API_KEY=your-frontend-api-key
```

## Application Configuration

```
VITE_APP_TITLE=PoiPoi - 次世代生産管理 & AIクリエイティブプラットフォーム
VITE_APP_LOGO=https://example.com/logo.png
```

## Analytics

```
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.space
VITE_ANALYTICS_WEBSITE_ID=your-website-id
```

## Owner Information

```
OWNER_NAME=Your Name
OWNER_OPEN_ID=your-open-id
```

## Hybrid Sync Configuration

```
SYNC_AUTO_ENABLED=true
SYNC_INTERVAL=30000
SYNC_TARGETS=conversation,memory,learning,settings,production
SYNC_CONFLICT_STRATEGY=merge
```

## Health Check Configuration

```
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
MAX_RETRIES=3
```

## Logging Configuration

```
LOG_LEVEL=info
LOG_DIR=./logs
```

## Development Configuration

```
NODE_ENV=development
PORT=3000
DEBUG=false
```

## セキュリティ注意事項

⚠️ **重要**:
- API キーを絶対に公開しないでください
- `.env` ファイルを Git にコミットしないでください
- 本番環境では強力なパスワードを設定してください
- 定期的に API キーをローテーションしてください

## トラブルシューティング

### API キーが見つからないエラー

1. `.env` ファイルが存在するか確認
2. API キーが正しく設定されているか確認
3. 余分なスペースがないか確認
4. `npm run check` で設定を確認

### 接続エラー

1. `LOCAL_SERVER_URL` と `CLOUD_SERVER_URL` が正しいか確認
2. ネットワーク接続を確認
3. ファイアウォール設定を確認
4. ポート 3000 が使用可能か確認

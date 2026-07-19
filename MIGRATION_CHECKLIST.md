# PoiPoi Manus → 外部ホスティング移行チェックリスト

## 概要

このチェックリストは、PoiPoi アプリケーションを Manus 仮設環境から Render/Railway などの外部ホスティングサービスへ移行する際の手順を示します。

---

## Phase 1: 準備段階

### ✅ 前提条件確認

- [ ] GitHub アカウントを持っている
- [ ] Render または Railway アカウントを持っている
- [ ] MySQL/PostgreSQL データベースが利用可能
- [ ] Manus API キーを取得している
- [ ] ローカル環境で `npm run build` が成功している

### ✅ コード準備

- [x] Dockerfile を作成 (`/Dockerfile`)
- [x] .dockerignore を作成 (`/.dockerignore`)
- [x] render.yaml を作成 (`/render.yaml`)
- [x] railway.json を作成 (`/railway.json`)
- [x] DEPLOYMENT_GUIDE.md を作成
- [x] ENVIRONMENT_VARIABLES.md を作成
- [x] server/_core/index.ts を PORT 環境変数対応に更新
- [ ] GitHub にコードをプッシュ

### ✅ ドキュメント確認

- [ ] DEPLOYMENT_GUIDE.md を読了
- [ ] ENVIRONMENT_VARIABLES.md を読了
- [ ] 環境変数リストを準備

---

## Phase 2: Render へのデプロイ (推奨)

### ✅ Step 1: GitHub にプッシュ

```bash
cd /path/to/poipoi
git add .
git commit -m "STEP95: Add deployment configuration for Render/Railway"
git push origin main
```

- [ ] コミット完了
- [ ] GitHub に反映確認

### ✅ Step 2: Render ダッシュボード設定

1. [Render ダッシュボード](https://dashboard.render.com) にアクセス
2. **New +** → **Web Service** をクリック
3. GitHub リポジトリを接続

- [ ] GitHub リポジトリ接続完了
- [ ] リポジトリが表示される

### ✅ Step 3: サービス設定

| 設定項目 | 値 |
|---------|-----|
| **Name** | `poipoi-api` |
| **Environment** | `Docker` |
| **Region** | `Singapore` (またはご希望の地域) |
| **Branch** | `main` |
| **Dockerfile Path** | `./Dockerfile` |

- [ ] サービス名を入力
- [ ] Docker を選択
- [ ] リージョンを選択
- [ ] ブランチを確認

### ✅ Step 4: 環境変数設定

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
VITE_APP_ID=<your-app-id>
VITE_APP_TITLE=Poイポイ - 次世代生産管理 & AIクリエイティブプラットフォーム
```

- [ ] NODE_ENV を設定
- [ ] PORT を設定
- [ ] DATABASE_URL を設定
- [ ] JWT_SECRET を生成・設定
- [ ] Manus API キーを設定
- [ ] アプリケーション情報を設定

### ✅ Step 5: デプロイ実行

1. **Create Web Service** をクリック
2. ビルドとデプロイが自動的に開始
3. ビルド完了を待つ (5-10 分)

- [ ] デプロイ開始
- [ ] ビルド完了
- [ ] サービス URL が表示される

### ✅ Step 6: 本番 API URL 確認

Render ダッシュボードで以下の情報を確認:

```
Service URL: https://poipoi-api.onrender.com
```

- [ ] サービス URL を記録
- [ ] ヘルスチェック実行: `curl https://poipoi-api.onrender.com/health`

---

## Phase 3: Railway へのデプロイ (代替案)

### ✅ Step 1: Railway CLI インストール

```bash
npm install -g @railway/cli
```

- [ ] CLI インストール完了

### ✅ Step 2: Railway にログイン

```bash
railway login
```

- [ ] ログイン完了

### ✅ Step 3: プロジェクト初期化

```bash
railway init
```

- [ ] プロジェクト初期化完了

### ✅ Step 4: 環境変数設定

```bash
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=<your-database-url>
railway variables set JWT_SECRET=<generate-random-string>
railway variables set BUILT_IN_FORGE_API_URL=https://forge.manus.ai
railway variables set BUILT_IN_FORGE_API_KEY=<your-manus-api-key>
railway variables set VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai
railway variables set VITE_FRONTEND_FORGE_API_KEY=<your-frontend-api-key>
```

- [ ] 全ての環境変数を設定

### ✅ Step 5: デプロイ実行

```bash
railway up
```

- [ ] デプロイ開始
- [ ] ビルド完了

### ✅ Step 6: 本番 API URL 確認

```bash
railway open
```

- [ ] サービス URL を確認・記録

---

## Phase 4: Android アプリ更新

### ✅ Step 1: API URL を更新

**MobileAPIConnector.ts を更新:**

```typescript
// mobile/src/services/MobileAPIConnector.ts
constructor(baseURL: string = 'https://poipoi-api.onrender.com') {
  // または Railway の場合
  // constructor(baseURL: string = 'https://poipoi-api-production.up.railway.app') {
```

- [ ] MobileAPIConnector.ts を更新

**app.json を更新:**

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://poipoi-api.onrender.com"
    }
  }
}
```

- [ ] app.json を更新

### ✅ Step 2: ローカルビルド確認

```bash
npm run build
```

- [ ] ビルド成功確認
- [ ] TypeScript エラーなし確認

### ✅ Step 3: APK 再ビルド

```bash
cd mobile
eas build --platform android --profile preview
```

- [ ] EAS Build 開始
- [ ] ビルド完了待機 (10-20 分)
- [ ] APK ダウンロード

### ✅ Step 4: 実機テスト

1. Android 実機に APK をインストール
2. PoiPoi アプリを起動
3. 「こんにちは」を送信
4. AI の返答を確認

- [ ] アプリ起動成功
- [ ] メッセージ送信成功
- [ ] AI 返答受信成功
- [ ] エラーなし確認

---

## Phase 5: 本番環境検証

### ✅ ヘルスチェック

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

- [ ] ヘルスチェック成功

### ✅ tRPC エンドポイント確認

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

- [ ] tRPC エンドポイント動作確認

### ✅ ログ確認

Render/Railway ダッシュボードでログを確認:

- [ ] エラーログなし
- [ ] [LLM REQUEST] ログ確認
- [ ] [LLM RESPONSE] ログ確認

### ✅ パフォーマンス確認

- [ ] レスポンス時間 < 2 秒
- [ ] CPU 使用率 < 50%
- [ ] メモリ使用率 < 60%

---

## Phase 6: クリーンアップ

### ✅ Manus 仮設 URL 削除

- [ ] MobileAPIConnector.ts から古い URL を削除
- [ ] app.json から古い URL を削除

### ✅ ドキュメント更新

- [ ] README.md に本番 API URL を記載
- [ ] チーム内に本番 URL を共有
- [ ] 移行完了を報告

### ✅ バックアップ

- [ ] Manus チェックポイントをバックアップ
- [ ] 本番データベースをバックアップ
- [ ] 本番 API URL を安全に保管

---

## トラブルシューティング

### ビルドエラーが発生

**症状**: Docker ビルド時に `npm ERR!` が表示される

**対応**:
1. ローカルで `npm run build` を実行して確認
2. `pnpm-lock.yaml` がリポジトリに含まれていることを確認
3. Render ダッシュボードでビルドログを確認

- [ ] 原因特定
- [ ] 修正実行
- [ ] 再ビルド

### API 接続エラー

**症状**: Android アプリで「Network Error」が表示される

**対応**:
1. API URL が正しいか確認
2. ヘルスチェック実行: `curl https://poipoi-api.onrender.com/health`
3. ファイアウォール設定を確認

- [ ] API URL 確認
- [ ] ヘルスチェック成功
- [ ] 実機テスト再実行

### データベース接続エラー

**症状**: サーバーログに `DATABASE_URL` エラーが表示される

**対応**:
1. DATABASE_URL が正しく設定されているか確認
2. データベースが外部からアクセス可能か確認
3. ファイアウォール設定を確認

- [ ] DATABASE_URL 確認
- [ ] DB アクセス確認
- [ ] サーバー再起動

---

## 完了チェック

### ✅ 全フェーズ完了

- [ ] Phase 1: 準備段階 完了
- [ ] Phase 2 または 3: デプロイ完了
- [ ] Phase 4: Android アプリ更新完了
- [ ] Phase 5: 本番環境検証完了
- [ ] Phase 6: クリーンアップ完了

### ✅ 最終確認

- [ ] 本番 API URL が固定 URL に変更
- [ ] Android 実機から接続可能
- [ ] AI 返答が正常に動作
- [ ] ログに [LLM REQUEST] と [LLM RESPONSE] が記録
- [ ] エラーなし

---

## 関連ドキュメント

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 詳細なデプロイメント手順
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - 環境変数リファレンス
- [Render ドキュメント](https://render.com/docs)
- [Railway ドキュメント](https://docs.railway.app)

---

## サポート

問題が発生した場合は、以下をご確認ください:

1. ログを確認 (Render/Railway ダッシュボード)
2. 環境変数が正しく設定されているか確認
3. ローカルで `npm run build` と `npm start` を実行して確認
4. DEPLOYMENT_GUIDE.md のトラブルシューティングセクションを参照

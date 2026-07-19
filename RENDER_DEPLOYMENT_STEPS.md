# Render へのデプロイメント手順 (STEP 96)

## 概要

このドキュメントは、PoiPoi API サーバーを Render の無料環境へデプロイするための詳細な手順を説明します。

---

## 前提条件

- GitHub アカウント
- Render アカウント (https://render.com)
- MySQL/PostgreSQL データベース (Render 無料 PostgreSQL または外部 DB)
- Manus API キー

---

## Step 1: GitHub にコードをプッシュ

```bash
cd /path/to/poipoi
git add .
git commit -m "STEP96: Fix Dockerfile and render.yaml for Render deployment"
git push origin main
```

**確認:**
- [ ] GitHub にコミットが反映されている

---

## Step 2: Render ダッシュボードにアクセス

1. https://dashboard.render.com にアクセス
2. GitHub アカウントでログイン (または Render アカウント作成)

**確認:**
- [ ] Render ダッシュボードが表示される

---

## Step 3: 新規 Web Service を作成

1. **New +** ボタンをクリック
2. **Web Service** を選択

**確認:**
- [ ] Web Service 作成画面が表示される

---

## Step 4: GitHub リポジトリを接続

1. **Connect a repository** をクリック
2. GitHub リポジトリを選択 (PoiPoi)
3. **Connect** をクリック

**確認:**
- [ ] リポジトリが接続される

---

## Step 5: サービス設定

以下の設定を入力:

| 設定項目 | 値 |
|---------|-----|
| **Name** | `poipoi-api` |
| **Environment** | `Node` |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Region** | `Singapore` (またはご希望の地域) |
| **Plan** | `Free` |

**確認:**
- [ ] サービス名を入力
- [ ] Environment を Node に設定
- [ ] Build/Start コマンドを確認

---

## Step 6: 環境変数を設定

**Environment** セクションで以下を設定:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=<32文字以上のランダム文字列>
BUILT_IN_FORGE_API_URL=https://forge.manus.ai
BUILT_IN_FORGE_API_KEY=<your-manus-api-key>
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai
VITE_FRONTEND_FORGE_API_KEY=<your-frontend-api-key>
VITE_APP_ID=<your-app-id>
VITE_APP_TITLE=Poイポイ - 次世代生産管理 & AIクリエイティブプラットフォーム
```

**JWT_SECRET 生成:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**確認:**
- [ ] 全ての環境変数を設定
- [ ] JWT_SECRET を生成・設定

---

## Step 7: PostgreSQL データベースを作成 (オプション)

Render の無料 PostgreSQL を使用する場合:

1. **New +** → **PostgreSQL** をクリック
2. 以下の設定を入力:

| 設定項目 | 値 |
|---------|-----|
| **Name** | `poipoi-db` |
| **Database** | `poipoi` |
| **User** | `poipoi` |
| **Region** | `Singapore` |
| **Plan** | `Free` |

3. **Create Database** をクリック
4. 接続文字列をコピー
5. Web Service の `DATABASE_URL` に貼り付け

**確認:**
- [ ] PostgreSQL が作成される
- [ ] DATABASE_URL が設定される

---

## Step 8: デプロイを実行

1. **Create Web Service** をクリック
2. ビルドとデプロイが自動的に開始
3. ビルド完了を待つ (5-10 分)

**確認:**
- [ ] デプロイが開始される
- [ ] ビルドログが表示される

---

## Step 9: デプロイ完了を確認

ビルド完了後、以下の情報が表示されます:

```
Service URL: https://poipoi-api.onrender.com
```

**確認:**
- [ ] Service URL が表示される
- [ ] Status が "Live" になっている

---

## Step 10: ヘルスチェック実行

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

**確認:**
- [ ] ヘルスチェック成功 (200 OK)

---

## Step 11: API エンドポイント確認

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

**確認:**
- [ ] API が応答する
- [ ] LLM レスポンスが返される

---

## Step 12: Android アプリの API URL を更新

### MobileAPIConnector.ts を更新

```typescript
// mobile/src/services/MobileAPIConnector.ts
export class MobileAPIConnector {
  private baseURL: string;

  constructor(baseURL: string = 'https://poipoi-api.onrender.com') {
    this.baseURL = baseURL;
    // ...
  }
}
```

### app.json を更新

```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://poipoi-api.onrender.com"
    }
  }
}
```

**確認:**
- [ ] MobileAPIConnector.ts を更新
- [ ] app.json を更新

---

## Step 13: APK を再ビルド

```bash
cd mobile
eas build --platform android --profile preview
```

**確認:**
- [ ] EAS Build 開始
- [ ] ビルド完了待機 (10-20 分)

---

## Step 14: 実機テスト

1. Android 実機に APK をインストール
2. PoiPoi アプリを起動
3. 「こんにちは」を送信
4. AI の返答を確認

**確認:**
- [ ] アプリ起動成功
- [ ] メッセージ送信成功
- [ ] AI 返答受信成功

---

## トラブルシューティング

### ビルドエラー

**症状**: Build failed

**対応**:
1. Render ダッシュボードでビルドログを確認
2. エラーメッセージを確認
3. 環境変数が正しく設定されているか確認

### API 接続エラー

**症状**: Network Error (実機から)

**対応**:
1. ヘルスチェック実行: `curl https://poipoi-api.onrender.com/health`
2. API URL が正しいか確認
3. 環境変数が正しく設定されているか確認

### データベース接続エラー

**症状**: Database connection failed

**対応**:
1. DATABASE_URL が正しいか確認
2. PostgreSQL が起動しているか確認
3. ファイアウォール設定を確認

---

## 本番 API URL

```
https://poipoi-api.onrender.com
```

このURL を以下の場所で使用:
- MobileAPIConnector.ts
- app.json
- Android APK ビルド

---

## 関連ドキュメント

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)
- [Render ドキュメント](https://render.com/docs)

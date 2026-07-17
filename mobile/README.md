# PoiPoi Mobile App

次世代生産管理 & AIクリエイティブプラットフォーム - モバイルアプリ版

## 概要

PoiPoi Mobile Appは、React Native/Expoを使用してAndroidスマートフォンで利用できるモバイルアプリケーションです。

## 機能

### Phase 1: 基本実装
- ✅ Mobile Appディレクトリ構造
- ✅ Backend API接続確認
- ✅ Chat画面基本実装
- ✅ MobileAPIConnector実装
- ✅ LocalCacheService実装

### Phase 2: UI実装 (予定)
- 水色グラデーションUI
- ポイポイキャラクター表示
- チャット履歴表示

### Phase 3: 機能実装 (予定)
- Voice AI UI接続
- ファイル添付機能
- カメラ入力機能

## 技術スタック

- **フレームワーク**: React Native 0.74 + Expo 51
- **言語**: TypeScript 5.3
- **状態管理**: Zustand
- **API通信**: Axios
- **ローカルストレージ**: AsyncStorage
- **テスト**: Vitest + Jest
- **UI**: React Native + Tailwind CSS (NativeWind)

## ディレクトリ構造

```
mobile/
├── src/
│   ├── screens/
│   │   └── ChatScreen.tsx          # チャット画面
│   ├── services/
│   │   ├── MobileAPIConnector.ts   # Backend API接続
│   │   └── LocalCacheService.ts    # ローカルキャッシュ
│   ├── components/                 # 再利用可能なコンポーネント
│   ├── hooks/                      # カスタムフック
│   ├── store/                      # Zustand状態管理
│   ├── types/                      # TypeScript型定義
│   ├── utils/                      # ユーティリティ関数
│   └── App.tsx                     # メインアプリコンポーネント
├── assets/                         # 画像・フォント等
├── app.json                        # Expo設定
├── package.json                    # 依存関係
├── tsconfig.json                   # TypeScript設定
├── vitest.config.ts                # Vitest設定
└── README.md                       # このファイル
```

## セットアップ

### 前提条件
- Node.js 18+
- npm または pnpm
- Expo CLI

### インストール

```bash
cd mobile
pnpm install
```

### 開発サーバー起動

```bash
# Expoデベロップメントサーバー
pnpm start

# Android
pnpm android

# iOS
pnpm ios

# Web
pnpm web
```

### テスト実行

```bash
# テスト実行
pnpm test

# ウォッチモード
pnpm test:watch

# カバレッジ
pnpm test:coverage
```

### ビルド

```bash
# TypeScript型チェック
pnpm type-check

# Lint
pnpm lint
```

## API接続

### MobileAPIConnector

Backend APIとの通信を管理します。

```typescript
import MobileAPIConnector from '@services/MobileAPIConnector';

const connector = new MobileAPIConnector('http://localhost:3000');

// 接続確認
const isConnected = await connector.checkConnectivity();

// セッション作成
const sessionResponse = await connector.createSession();

// チャットメッセージ送信
const chatResponse = await connector.sendChatMessage({
  message: 'こんにちは',
  sessionId: sessionResponse.data?.sessionId,
});
```

### LocalCacheService

ローカルストレージ管理を行います。

```typescript
import LocalCacheService from '@services/LocalCacheService';

// チャット履歴を保存
await LocalCacheService.saveChatHistory(sessionId, messages);

// チャット履歴を取得
const messages = await LocalCacheService.getChatHistory(sessionId);

// ユーザー設定を保存
await LocalCacheService.saveUserSettings(settings);
```

## テスト

### MobileAPIConnector Tests (30個)
- 初期化テスト (4個)
- 接続確認テスト (3個)
- セッション管理テスト (5個)
- チャットメッセージテスト (7個)
- 音声メッセージテスト (4個)
- ファイルアップロードテスト (5個)
- キャッシュテスト (3個)
- エラーハンドリングテスト (4個)
- リトライテスト (2個)
- 統合テスト (2個)
- ゲッターテスト (2個)

### LocalCacheService Tests (25個)
- 基本的なキャッシュ操作テスト (5個)
- チャット履歴キャッシュテスト (4個)
- ユーザー設定キャッシュテスト (2個)
- セッション情報キャッシュテスト (3個)
- ファイルメタデータキャッシュテスト (3個)
- キャッシュ統計テスト (2個)
- エラーハンドリングテスト (2個)
- TTL (Time To Live) テスト (2個)

**合計: 55個のテスト**

## 環境変数

`.env` ファイルで設定します:

```env
API_BASE_URL=http://localhost:3000
API_TIMEOUT=30000
CACHE_TTL=300000
```

## トラブルシューティング

### 接続エラー
- Backend APIが起動しているか確認
- API_BASE_URLが正しいか確認
- ファイアウォール設定を確認

### キャッシュエラー
- AsyncStorageの権限を確認
- デバイスのストレージ容量を確認
- キャッシュをクリア: `LocalCacheService.clearAll()`

### テスト失敗
- 依存関係を再インストール: `pnpm install`
- キャッシュをクリア: `pnpm test --clearCache`

## 今後の予定

- [ ] Phase 2: UI実装
- [ ] Phase 3: 機能実装
- [ ] Voice AI統合
- [ ] ファイル添付機能
- [ ] カメラ入力機能
- [ ] Notification Service
- [ ] オフラインサポート
- [ ] Push Notification

## ライセンス

MIT

## 開発者

PoiPoi Development Team

## サポート

問題が発生した場合は、GitHubのIssueを作成してください。

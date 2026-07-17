# PoiPoi Beta Android Build Guide

## 概要

このガイドでは、PoiPoi BetaをAndroid端末で動作させるための手順を説明します。

## 前提条件

- Node.js 16以上
- npm または yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Expo アカウント (https://expo.dev)

## ビルド手順

### 1. 環境準備

```bash
cd mobile
npm install
```

### 2. ビルドタイプの選択

#### 開発ビルド (Development)
```bash
./build-android.sh development
```
- 開発用APK
- デバッグ情報含む
- 高速ビルド

#### プレビュービルド (Preview)
```bash
./build-android.sh preview
```
- テスト用APK
- 本番に近い環境
- 推奨: ベータテスト用

#### 本番ビルド (Production)
```bash
./build-android.sh production
```
- 本番用AAB (Android App Bundle)
- 最適化済み
- Google Play配布用

### 3. ビルド実行

```bash
# プレビュービルド実行
eas build --platform android --profile preview

# または開発ビルド
eas build --platform android --profile development
```

### 4. ビルド進捗確認

https://expo.dev/builds でビルド進捗を確認できます。

## APK インストール

### 方法1: QRコードでインストール

1. ビルド完了後、Expo Dashboardに表示されるQRコードをスキャン
2. Android端末でExpo Goアプリを使用してスキャン
3. アプリが自動的にインストール

### 方法2: 直接ダウンロード

1. ビルド完了後、Expo Dashboardからダウンロードリンクを取得
2. `adb install app.apk` でインストール

```bash
# ダウンロード
wget <build-url>/app.apk

# インストール
adb install app.apk
```

### 方法3: Expo Goアプリ

1. Android端末にExpo Goアプリをインストール
2. Expo Dashboardのプロジェクトを開く
3. QRコードをスキャン

## 動作確認チェックリスト

### 起動確認
- [ ] アプリが正常に起動する
- [ ] ホーム画面が表示される
- [ ] エラーが表示されない

### Chat機能
- [ ] Chat画面に遷移できる
- [ ] メッセージが送受信できる
- [ ] AI Provider選択が動作する

### AI Provider機能
- [ ] AI Provider Selection画面に遷移できる
- [ ] プロバイダー一覧が表示される
- [ ] プロバイダー比較が動作する
- [ ] プロバイダー切り替えができる

### ファイル処理
- [ ] File Processing画面に遷移できる
- [ ] ファイル選択ダイアログが開く
- [ ] ファイルアップロードが動作する
- [ ] 処理結果が表示される

### 製造AI Dashboard
- [ ] Manufacturing AI Dashboard画面に遷移できる
- [ ] グラフが表示される
- [ ] AI分析が実行できる
- [ ] 結果が表示される

### パフォーマンス
- [ ] 画面遷移が滑らか
- [ ] レスポンスが高速
- [ ] メモリ使用量が適切
- [ ] バッテリー消費が適切

## トラブルシューティング

### ビルド失敗

```bash
# キャッシュクリア
eas build --platform android --profile preview --clear-cache

# 詳細ログ表示
eas build --platform android --profile preview --verbose
```

### インストール失敗

```bash
# 既存アプリをアンインストール
adb uninstall com.poipoi.beta

# 再度インストール
adb install app.apk
```

### アプリクラッシュ

```bash
# ログ確認
adb logcat | grep PoiPoi

# デバッグビルドで実行
./build-android.sh development
```

## 設定ファイル

### app.json
- アプリ名: PoiPoi Beta
- バージョン: 0.1.0
- パッケージ名: com.poipoi.mobile
- 権限: Camera, Microphone, Storage, Internet

### eas.json
- Development: APK (デバッグ用)
- Preview: APK (テスト用)
- Production: AAB (本番用)

### AndroidManifest.xml
- インターネット接続
- カメラアクセス
- マイクアクセス
- ストレージアクセス
- 通知権限 (Android 13+)

## 本番リリース

### Google Play配布

1. 本番ビルド実行
   ```bash
   ./build-android.sh production
   ```

2. Google Play Consoleにアップロード
   - AABファイルをアップロード
   - ストア情報を入力
   - テスト配布

3. 内部テスト
   - テスターを招待
   - フィードバック収集

4. 段階的ロールアウト
   - 5% → 10% → 25% → 50% → 100%

## 参考資料

- [Expo Documentation](https://docs.expo.dev)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Android Manifest Reference](https://developer.android.com/guide/topics/manifest/manifest-intro)
- [Google Play Console](https://play.google.com/console)

## サポート

問題が発生した場合:
1. [Expo Discord](https://discord.gg/expo) でサポートを受ける
2. [GitHub Issues](https://github.com/expo/expo/issues) で報告
3. ログを確認: `adb logcat`

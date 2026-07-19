# PoiPoi v1.0 Android Studio セットアップガイド

## 概要

このドキュメントは、PoiPoi v1.0 Androidプロジェクトを開発PCのAndroid Studioでビルド・実行するための完全なセットアップガイドです。

## 必須環境

### ハードウェア要件

| 項目 | 最小要件 | 推奨 |
|------|---------|------|
| CPU | Intel i5 / AMD Ryzen 5 | Intel i7 / AMD Ryzen 7 |
| RAM | 8GB | 16GB以上 |
| ディスク | 50GB (SSD推奨) | 100GB以上 (SSD必須) |
| ネットワーク | 10Mbps | 50Mbps以上 |

### ソフトウェア要件

| ツール | バージョン | ダウンロード |
|--------|-----------|-----------|
| Android Studio | 2024.1以上 | https://developer.android.com/studio |
| Java Development Kit (JDK) | 21.0.10以上 | https://www.oracle.com/java/technologies/downloads/ |
| Android SDK | API 34 | Android Studio内で自動インストール |
| Build Tools | 34.0.0 | Android Studio内で自動インストール |
| Gradle | 8.3.0 | プロジェクト内に含まれる |
| Git | 2.40以上 | https://git-scm.com/downloads |

## インストール手順

### 1. Java Development Kit (JDK) のインストール

#### Windows
```bash
# Oracle JDK 21をダウンロード
# https://www.oracle.com/java/technologies/downloads/#java21

# インストーラーを実行
# インストール後、環境変数を設定
setx JAVA_HOME "C:\Program Files\Java\jdk-21"
setx PATH "%PATH%;%JAVA_HOME%\bin"

# 確認
java -version
```

#### macOS
```bash
# Homebrewでインストール
brew install openjdk@21

# 環境変数を設定
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 確認
java -version
```

#### Linux (Ubuntu)
```bash
# OpenJDK 21をインストール
sudo apt-get update
sudo apt-get install openjdk-21-jdk

# 確認
java -version
```

### 2. Android Studio のインストール

#### Windows/macOS/Linux
1. https://developer.android.com/studio にアクセス
2. Android Studioをダウンロード
3. インストーラーを実行
4. セットアップウィザードに従う
5. Android SDK をインストール

### 3. Android SDK のセットアップ

Android Studioを起動後:

1. **SDK Manager を開く**
   - Tools → SDK Manager

2. **以下をインストール**
   - Android SDK Platform 34
   - Android SDK Build-Tools 34.0.0
   - Android Emulator (オプション)
   - Android SDK Platform-Tools

3. **SDK Pathを確認**
   - Windows: `C:\Users\<username>\AppData\Local\Android\sdk`
   - macOS: `~/Library/Android/sdk`
   - Linux: `~/Android/sdk`

### 4. 環境変数の設定

#### Windows (PowerShell)
```powershell
$env:ANDROID_HOME = "C:\Users\<username>\AppData\Local\Android\sdk"
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:PATH += ";$env:ANDROID_HOME\tools;$env:ANDROID_HOME\platform-tools"
```

#### macOS/Linux (Bash/Zsh)
```bash
export ANDROID_HOME=$HOME/Android/sdk
export JAVA_HOME=/usr/libexec/java_home -v 21
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

## PoiPoi プロジェクトのセットアップ

### 1. プロジェクトのクローン

```bash
git clone <repository-url> poipoi
cd poipoi
```

### 2. Android Studio で開く

1. Android Studio を起動
2. File → Open
3. `poipoi/android` ディレクトリを選択
4. Open as Project

### 3. Gradle の同期

1. Android Studio が自動的にGradleを同期
2. 初回同期は3-5分かかる場合があります
3. 同期完了後、プロジェクトがビルド可能になります

## プロジェクト構造

```
android/
├── app/                          # アプリケーションモジュール
│   ├── build.gradle              # アプリビルド設定
│   ├── proguard-rules.pro        # ProGuard最適化ルール
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml
│           ├── java/
│           │   └── com/poipoi/app/
│           │       ├── MainActivity.kt
│           │       ├── services/
│           │       ├── providers/
│           │       └── receivers/
│           └── res/
│               ├── layout/
│               ├── drawable/
│               ├── values/
│               └── xml/
├── build.gradle                  # トップレベルビルド設定
├── settings.gradle               # プロジェクト構成
├── gradle.properties             # Gradle設定
├── gradle/
│   └── wrapper/
│       └── gradle-wrapper.properties
└── keystore/
    └── poipoi.keystore           # 署名キー
```

## ビルド設定

### build.gradle (app)

**主要設定:**
- compileSdkVersion: 34
- targetSdkVersion: 34
- minSdkVersion: 21
- versionCode: 1
- versionName: 1.0.0

**署名設定:**
- Debug: 自動生成
- Release: poipoi.keystore

**最適化:**
- ProGuard: 有効
- R8: 有効
- リソース削除: 有効

## ビルド手順

### Debug APK のビルド

```bash
# コマンドラインから
cd android
./gradlew assembleDebug

# または Android Studio から
# Build → Build Bundle(s) / APK(s) → Build APK(s)
```

**出力:** `app/build/outputs/apk/debug/app-debug.apk`

### Release APK のビルド

```bash
# コマンドラインから
cd android
./gradlew assembleRelease

# または Android Studio から
# Build → Build Bundle(s) / APK(s) → Build Bundle(s)
```

**出力:** `app/build/outputs/apk/release/app-release.apk`

### Android App Bundle (AAB) のビルド

```bash
# コマンドラインから
cd android
./gradlew bundleRelease

# または Android Studio から
# Build → Build Bundle(s) / APK(s) → Build Bundle(s)
```

**出力:** `app/build/outputs/bundle/release/app-release.aab`

## トラブルシューティング

### Gradle同期エラー

**症状:** "Failed to sync Gradle"

**解決方法:**
```bash
cd android
./gradlew clean
./gradlew sync
```

### ビルドエラー: "SDK location not found"

**解決方法:**
1. File → Project Structure
2. SDK Location を確認
3. Android SDK のパスを設定

### メモリ不足エラー

**解決方法:**
```bash
# gradle.properties に追加
org.gradle.jvmargs=-Xmx4096m
```

### キャッシュクリア

```bash
cd android
./gradlew clean
rm -rf .gradle
rm -rf build
./gradlew sync
```

## 依存関係

### 主要ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| React Native | 0.73.0 | ネイティブブリッジ |
| AndroidX | Latest | Android互換性 |
| Kotlin | 1.9.20 | 言語 |
| Material Design | 1.11.0 | UIコンポーネント |

### ネットワーク要件

ビルド時に以下のリポジトリからダウンロード:
- Google Maven Repository
- Maven Central Repository
- JCenter (レガシー)

## 署名設定

### Release キーストア

**ファイル:** `android/keystore/poipoi.keystore`

**設定:**
- Alias: poipoi-key
- Password: (セキュアに保管)
- Validity: 365 days

### 署名の確認

```bash
keytool -list -v -keystore android/keystore/poipoi.keystore
```

## パフォーマンス最適化

### ProGuard 設定

`android/app/proguard-rules.pro` に最適化ルールが定義されています。

**最適化内容:**
- コード難読化
- 不要コード削除
- リソース削除
- DEX最適化

### ビルド時間短縮

```bash
# gradle.properties に追加
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.daemon=true
```

## テスト実行

### ユニットテスト

```bash
cd android
./gradlew test
```

### インストルメンテーションテスト

```bash
cd android
./gradlew connectedAndroidTest
```

## デバイステスト

### APK をデバイスにインストール

```bash
# Debug APK
adb install app/build/outputs/apk/debug/app-debug.apk

# Release APK
adb install app/build/outputs/apk/release/app-release.apk
```

### デバイスログを確認

```bash
adb logcat
```

### デバイス情報を確認

```bash
adb devices
adb shell getprop ro.build.version.release
```

## Google Play 配布準備

### 必須項目

1. **アプリ署名:** Release APK は署名済み
2. **バージョン:** versionCode と versionName を設定
3. **マニフェスト:** AndroidManifest.xml を確認
4. **アイコン:** app/src/main/res/mipmap に配置
5. **スクリーンショット:** Google Play Console で設定

### AAB のアップロード

1. Google Play Console にアクセス
2. アプリを選択
3. Release → Production
4. AAB ファイルをアップロード
5. リリース前チェックリストを確認
6. リリース

## 参考リンク

- [Android Developer Documentation](https://developer.android.com/docs)
- [Android Studio User Guide](https://developer.android.com/studio/intro)
- [Gradle Documentation](https://gradle.org/documentation/)
- [Google Play Console](https://play.google.com/console)

## サポート

問題が発生した場合:

1. ログを確認: `Build → Show Log in Explorer`
2. キャッシュをクリア: `./gradlew clean`
3. Gradle を再同期: `File → Sync Now`
4. Android Studio を再起動

---

**最終更新:** 2026-07-16
**PoiPoi バージョン:** 1.0.0
**対応 Android:** API 21-34

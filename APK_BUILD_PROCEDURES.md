# PoiPoi v1.0 APK ビルド手順書

## 概要

このドキュメントは、PoiPoi v1.0のAPK/AABを生成するための詳細な手順を記載しています。

## 前提条件

以下が完了していることを確認してください:

- [ ] ENVIRONMENT_REQUIREMENTS.md の全要件を満たしている
- [ ] ANDROID_STUDIO_SETUP_GUIDE.md でセットアップが完了している
- [ ] Android Studio で android プロジェクトが開かれている
- [ ] Gradle が同期済み
- [ ] デバイス/エミュレーターが接続されている (オプション)

## ビルド前チェック

### 1. 環境確認

```bash
# JDK バージョン確認
java -version
# 出力: openjdk version "21.0.10" 以上

# Gradle バージョン確認
cd android
./gradlew --version
# 出力: Gradle 8.3.0

# Android SDK 確認
echo $ANDROID_HOME
# 出力: /path/to/Android/sdk
```

### 2. プロジェクト確認

```bash
# プロジェクトディレクトリ確認
cd android
ls -la

# 必須ファイル確認
- build.gradle ✓
- settings.gradle ✓
- gradle.properties ✓
- app/build.gradle ✓
- app/src/main/AndroidManifest.xml ✓
```

### 3. ディスク容量確認

```bash
# ディスク空き容量確認
df -h

# 必要: 5GB以上
```

### 4. メモリ確認

```bash
# 利用可能メモリ確認
free -h  # Linux
vm_stat  # macOS
wmic OS get TotalVisibleMemorySize  # Windows

# 推奨: 8GB以上
```

## ビルド手順

### Phase 1: キャッシュクリア

```bash
cd android

# Gradle キャッシュクリア
./gradlew clean

# 出力例:
# > Task :app:clean
# BUILD SUCCESSFUL in 5s
```

**所要時間:** 1-2分

### Phase 2: Debug APK ビルド

#### コマンドライン実行

```bash
cd android
./gradlew assembleDebug

# 出力例:
# > Task :app:assembleDebug
# BUILD SUCCESSFUL in 2m 30s
```

**所要時間:** 2-5分 (初回は5-10分)

#### Android Studio から実行

1. Build メニューを開く
2. Build Bundle(s) / APK(s) → Build APK(s)
3. ビルド完了を待つ

**出力ファイル:**
```
app/build/outputs/apk/debug/app-debug.apk
```

**ファイルサイズ:** 50-60MB

#### インストール

```bash
# デバイスに接続
adb devices

# インストール
adb install app/build/outputs/apk/debug/app-debug.apk

# 出力例:
# Success
```

### Phase 3: Release APK ビルド

#### コマンドライン実行

```bash
cd android
./gradlew assembleRelease

# 出力例:
# > Task :app:assembleRelease
# BUILD SUCCESSFUL in 3m 45s
```

**所要時間:** 3-8分

#### Android Studio から実行

1. Build メニューを開く
2. Build Bundle(s) / APK(s) → Build APK(s)
3. Release variant を選択
4. ビルド完了を待つ

**出力ファイル:**
```
app/build/outputs/apk/release/app-release.apk
```

**ファイルサイズ:** 20-30MB (最適化後)

#### 署名確認

```bash
# APK 署名確認
jarsigner -verify -verbose app/build/outputs/apk/release/app-release.apk

# 出力例:
# jar verified.
# This jar contains entries whose certificate chain is not validated.
```

#### インストール

```bash
# デバイスに接続
adb devices

# インストール
adb install app/build/outputs/apk/release/app-release.apk

# 出力例:
# Success
```

### Phase 4: Android App Bundle (AAB) ビルド

#### コマンドライン実行

```bash
cd android
./gradlew bundleRelease

# 出力例:
# > Task :app:bundleRelease
# BUILD SUCCESSFUL in 4m 15s
```

**所要時間:** 4-10分

#### Android Studio から実行

1. Build メニューを開く
2. Build Bundle(s) / APK(s) → Build Bundle(s)
3. Release variant を選択
4. ビルド完了を待つ

**出力ファイル:**
```
app/build/outputs/bundle/release/app-release.aab
```

**ファイルサイズ:** 18-25MB

#### Google Play Console へのアップロード

1. Google Play Console にアクセス
2. アプリを選択
3. Release → Production
4. Create new release
5. AAB ファイルをアップロード
6. リリース前チェックリストを確認
7. Release ボタンをクリック

## ビルド成果物

### Debug APK

| 項目 | 値 |
|------|-----|
| ファイル名 | app-debug.apk |
| パス | app/build/outputs/apk/debug/ |
| サイズ | 50-60MB |
| 署名 | Debug keystore |
| 用途 | 開発・テスト |
| 配布 | 不可 |

### Release APK

| 項目 | 値 |
|------|-----|
| ファイル名 | app-release.apk |
| パス | app/build/outputs/apk/release/ |
| サイズ | 20-30MB |
| 署名 | poipoi.keystore |
| 用途 | 本番配布 |
| 配布 | Google Play / 直接配布 |

### Android App Bundle (AAB)

| 項目 | 値 |
|------|-----|
| ファイル名 | app-release.aab |
| パス | app/build/outputs/bundle/release/ |
| サイズ | 18-25MB |
| 署名 | poipoi.keystore |
| 用途 | Google Play 配布 |
| 配布 | Google Play のみ |

## ビルド検証

### APK 情報確認

```bash
# APK 情報表示
aapt dump badging app/build/outputs/apk/release/app-release.apk

# 出力例:
# package: name='com.poipoi.app' versionCode='1' versionName='1.0.0'
# sdkVersion:'21'
# targetSdkVersion:'34'
```

### APK サイズ確認

```bash
# ファイルサイズ確認
ls -lh app/build/outputs/apk/release/app-release.apk

# 出力例:
# -rw-r--r-- 1 user group 25M Jul 16 21:00 app-release.apk
```

### SHA256 ハッシュ生成

```bash
# SHA256 生成
sha256sum app/build/outputs/apk/release/app-release.apk

# 出力例:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2 app-release.apk
```

### APK 署名検証

```bash
# 署名詳細確認
jarsigner -verify -verbose -certs app/build/outputs/apk/release/app-release.apk

# 出力例:
# sm  2048 2024-07-16 21:00:00 +0900
# CN=PoiPoi, O=PoiPoi, C=JP
# [証明書は有効です]
```

## デバイステスト

### インストール確認

```bash
# デバイス一覧
adb devices

# インストール
adb install app/build/outputs/apk/debug/app-debug.apk

# 確認
adb shell pm list packages | grep poipoi
```

### 起動確認

```bash
# アプリ起動
adb shell am start -n com.poipoi.app/.MainActivity

# ログ確認
adb logcat | grep poipoi
```

### 機能テスト

#### チャット機能
- [ ] メッセージ送受信
- [ ] 会話メモリ保持
- [ ] 音声入力

#### ファイル解析
- [ ] PDF 解析
- [ ] Excel 解析
- [ ] 画像解析

#### その他
- [ ] カメラ機能
- [ ] クラウド同期
- [ ] 設定変更

### パフォーマンステスト

```bash
# メモリ使用量確認
adb shell dumpsys meminfo com.poipoi.app

# CPU 使用率確認
adb shell top -n 1 | grep poipoi

# バッテリー消費確認
adb shell dumpsys batterystats com.poipoi.app
```

## トラブルシューティング

### ビルドエラー

#### "Build failed"

```bash
# キャッシュクリア
./gradlew clean

# 再ビルド
./gradlew assembleDebug
```

#### "Gradle sync failed"

```bash
# Gradle キャッシュクリア
rm -rf ~/.gradle/caches

# 再同期
./gradlew sync
```

#### "Out of memory"

```bash
# gradle.properties を編集
org.gradle.jvmargs=-Xmx8192m

# 再ビルド
./gradlew clean
./gradlew assembleDebug
```

### インストールエラー

#### "INSTALL_FAILED_VERSION_DOWNGRADE"

```bash
# 既存アプリをアンインストール
adb uninstall com.poipoi.app

# 再インストール
adb install app/build/outputs/apk/debug/app-debug.apk
```

#### "INSTALL_FAILED_INSUFFICIENT_STORAGE"

- デバイスのストレージを確認
- 不要なアプリを削除
- キャッシュをクリア

### 実行エラー

#### "App crashes on startup"

```bash
# ログ確認
adb logcat | grep "FATAL"

# デバッガーで実行
./gradlew installDebug
./gradlew connectedDebugAndroidTest
```

## ビルド最適化

### ビルド時間短縮

```bash
# gradle.properties に追加
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.daemon=true
org.gradle.jvmargs=-Xmx4096m
```

### APK サイズ削減

```bash
# build.gradle に設定
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Google Play 配布

### 前提条件

- [ ] Google Play Developer Account
- [ ] AAB ファイル生成済み
- [ ] アプリ署名済み
- [ ] プライバシーポリシー作成済み
- [ ] スクリーンショット準備済み

### 配布手順

1. Google Play Console にアクセス
2. Create app
3. アプリ詳細を入力
4. Release → Production
5. Create new release
6. AAB ファイルをアップロード
7. リリース前チェックリストを確認
8. Release ボタンをクリック

**所要時間:** 2-4時間 (審査)

## チェックリスト

ビルド完了確認:

- [ ] Debug APK ビルド成功
- [ ] Release APK ビルド成功
- [ ] AAB ビルド成功
- [ ] APK 署名確認済み
- [ ] SHA256 ハッシュ生成済み
- [ ] ファイルサイズ確認済み
- [ ] デバイスインストール成功
- [ ] アプリ起動確認済み
- [ ] 機能テスト完了
- [ ] パフォーマンステスト完了

## 参考リンク

- [Android Developer - Build and Run](https://developer.android.com/studio/run)
- [Android Developer - Build Variants](https://developer.android.com/studio/build/build-variants)
- [Google Play Console - Upload APKs](https://support.google.com/googleplay/android-developer/answer/9859152)
- [Gradle - Android Plugin](https://developer.android.com/studio/releases/gradle-plugin)

---

**最終更新:** 2026-07-16
**PoiPoi バージョン:** 1.0.0
**対応 Android:** API 21-34

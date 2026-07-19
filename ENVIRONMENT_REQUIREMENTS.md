# PoiPoi v1.0 環境要件書

## 概要

このドキュメントは、PoiPoi v1.0をビルド・実行するために必要な環境要件を詳細に記載しています。

## システム要件

### ハードウェア

| 項目 | 最小要件 | 推奨要件 |
|------|---------|---------|
| プロセッサ | Intel Core i5 / AMD Ryzen 5 | Intel Core i7 / AMD Ryzen 7 |
| メモリ (RAM) | 8GB | 16GB以上 |
| ストレージ | 50GB (SSD) | 100GB以上 (SSD) |
| ネットワーク | 10Mbps | 50Mbps以上 |

### オペレーティングシステム

| OS | バージョン | 対応状況 |
|----|-----------|---------|
| Windows | 10/11 | ✅ 完全対応 |
| macOS | 12以上 | ✅ 完全対応 |
| Linux (Ubuntu) | 20.04 LTS以上 | ✅ 完全対応 |

## ソフトウェア要件

### 1. Java Development Kit (JDK)

**必須:** JDK 21.0.10以上

```bash
# バージョン確認
java -version

# 出力例
openjdk version "21.0.10" 2024-01-16
OpenJDK Runtime Environment (build 21.0.10+11-Ubuntu-0ubuntu0.24.04.1)
OpenJDK 64-Bit Server VM (build 21.0.10+11-Ubuntu-0ubuntu0.24.04.1, mixed mode, sharing)
```

**インストール方法:**

- **Windows:** Oracle JDK 21 インストーラー
- **macOS:** `brew install openjdk@21`
- **Linux:** `sudo apt-get install openjdk-21-jdk`

### 2. Android Studio

**必須:** 2024.1以上

**機能:**
- Gradle統合
- Android SDK Manager
- エミュレーター
- デバッガー
- プロファイラー

**ダウンロード:** https://developer.android.com/studio

### 3. Android SDK

**必須コンポーネント:**

| コンポーネント | バージョン | 用途 |
|-------------|-----------|------|
| Platform | API 34 | ターゲットプラットフォーム |
| Build Tools | 34.0.0 | APKビルド |
| Platform Tools | Latest | ADB/Fastboot |
| NDK | 25.1.8937393 | ネイティブコード |
| Emulator | Latest | エミュレーション |

**インストール場所:**
- Windows: `C:\Users\<username>\AppData\Local\Android\sdk`
- macOS: `~/Library/Android/sdk`
- Linux: `~/Android/sdk`

### 4. Gradle

**バージョン:** 8.3.0 (プロジェクトに含まれる)

**Gradle Wrapper:**
```bash
./gradlew --version

# 出力例
Gradle 8.3.0
```

### 5. Kotlin

**バージョン:** 1.9.20

**用途:** Androidアプリケーション開発

### 6. Git

**バージョン:** 2.40以上

```bash
git --version

# 出力例
git version 2.43.0
```

## 環境変数設定

### Windows (PowerShell)

```powershell
# JDK
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-21", "User")

# Android SDK
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\<username>\AppData\Local\Android\sdk", "User")

# PATH
$path = [Environment]::GetEnvironmentVariable("PATH", "User")
$path += ";C:\Program Files\Java\jdk-21\bin"
$path += ";C:\Users\<username>\AppData\Local\Android\sdk\tools"
$path += ";C:\Users\<username>\AppData\Local\Android\sdk\platform-tools"
[Environment]::SetEnvironmentVariable("PATH", $path, "User")
```

### macOS/Linux (Bash/Zsh)

```bash
# ~/.bashrc または ~/.zshrc に追加

export JAVA_HOME=/usr/libexec/java_home -v 21
export ANDROID_HOME=$HOME/Android/sdk
export PATH=$PATH:$JAVA_HOME/bin:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

## ディスク容量要件

| 項目 | 容量 |
|------|------|
| Android SDK | 10-15GB |
| Gradle キャッシュ | 2-3GB |
| ビルド出力 | 1-2GB |
| IDE (Android Studio) | 2-3GB |
| **合計** | **20-25GB** |

**推奨:** 50GB以上の空き容量

## ネットワーク要件

### 初回セットアップ時

- **ダウンロード:** 5-10GB
- **時間:** 30分-1時間 (50Mbps接続)

### ビルド時

- **ダウンロード:** 100-500MB (依存関係)
- **時間:** 5-10分

### 必要なリポジトリ

- Google Maven Repository
- Maven Central Repository
- JCenter (レガシー)

## ビルド要件

### メモリ要件

| 操作 | 必要メモリ |
|------|----------|
| Gradle同期 | 2GB |
| Debug APKビルド | 2-3GB |
| Release APKビルド | 2-3GB |
| AABビルド | 2-3GB |

**推奨:** 16GB以上のRAM

### CPU要件

| 操作 | 推奨CPU |
|------|--------|
| Gradle同期 | 4コア以上 |
| ビルド | 8コア以上 |

### ストレージ要件

| 操作 | 必要容量 |
|------|---------|
| ビルド出力 | 1-2GB |
| キャッシュ | 2-3GB |
| 一時ファイル | 1-2GB |

## 依存関係

### Androidライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| AndroidX | Latest | 互換性ライブラリ |
| Material Design | 1.11.0 | UIコンポーネント |
| Jetpack Compose | Latest | UI フレームワーク |
| React Native | 0.73.0 | ネイティブブリッジ |

### ビルドツール

| ツール | バージョン |
|--------|-----------|
| Gradle | 8.3.0 |
| Kotlin Gradle Plugin | 1.9.20 |
| Android Gradle Plugin | 8.2.0 |

## デバイス要件

### 対応Android バージョン

| バージョン | API | 対応状況 |
|-----------|-----|---------|
| Android 5.0 (Lollipop) | 21 | ✅ 対応 |
| Android 6.0 (Marshmallow) | 23 | ✅ 対応 |
| Android 7.0 (Nougat) | 24 | ✅ 対応 |
| Android 8.0 (Oreo) | 26 | ✅ 対応 |
| Android 9.0 (Pie) | 28 | ✅ 対応 |
| Android 10 | 29 | ✅ 対応 |
| Android 11 | 30 | ✅ 対応 |
| Android 12 | 31 | ✅ 対応 |
| Android 13 | 33 | ✅ 対応 |
| Android 14 | 34 | ✅ 対応 |

### 推奨デバイス

| メーカー | モデル | 推奨度 |
|---------|--------|--------|
| Samsung | Galaxy S20以上 | ⭐⭐⭐⭐⭐ |
| Google | Pixel 4以上 | ⭐⭐⭐⭐⭐ |
| OnePlus | 8以上 | ⭐⭐⭐⭐ |
| Xiaomi | 11以上 | ⭐⭐⭐⭐ |

## ビルド設定

### gradle.properties

```properties
# JVM設定
org.gradle.jvmargs=-Xmx4096m

# ビルド設定
android.useAndroidX=true
android.enableJetifier=true

# 最適化
android.enableR8=true
android.enableProguardInReleaseBuilds=true

# パフォーマンス
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.daemon=true
```

### build.gradle (app)

```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.poipoi.app"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }
    
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## トラブルシューティング

### よくある問題と解決方法

| 問題 | 原因 | 解決方法 |
|------|------|---------|
| "SDK location not found" | Android SDK パスが設定されていない | ANDROID_HOME を設定 |
| "Gradle sync failed" | ネットワーク接続エラー | キャッシュをクリア、再試行 |
| "Out of memory" | メモリ不足 | org.gradle.jvmargs を増加 |
| "Build timeout" | ビルド時間が長い | Gradle daemon を有効化 |

## チェックリスト

セットアップ完了確認:

- [ ] JDK 21.0.10以上がインストール済み
- [ ] JAVA_HOME が設定済み
- [ ] Android Studio 2024.1以上がインストール済み
- [ ] Android SDK API 34がインストール済み
- [ ] Build Tools 34.0.0がインストール済み
- [ ] ANDROID_HOME が設定済み
- [ ] Git 2.40以上がインストール済み
- [ ] ディスク容量が50GB以上確保済み
- [ ] ネットワーク接続が確認済み
- [ ] `java -version` で JDK バージョンが表示される
- [ ] `gradle --version` で Gradle バージョンが表示される
- [ ] `adb devices` でデバイスが認識される

## 参考リンク

- [Android Developer - System Requirements](https://developer.android.com/studio/install)
- [Oracle Java - Installation Guide](https://docs.oracle.com/en/java/javase/21/install/overview.html)
- [Gradle - Installation](https://gradle.org/install/)
- [Android SDK Platform Releases](https://developer.android.com/studio/releases/platforms)

---

**最終更新:** 2026-07-16
**PoiPoi バージョン:** 1.0.0
**対応プラットフォーム:** Windows, macOS, Linux

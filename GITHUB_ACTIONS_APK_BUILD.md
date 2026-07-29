# GitHub Actions APK Build ガイド

## 📋 概要

GitHub Actions を使用して、Expo EAS Build の制限を回避し、Release APK を自動生成します。

**トリガー:**
- `main` ブランチへの Push（自動実行）
- GitHub UI から手動実行（workflow_dispatch）

---

## 🔑 必要な Secrets 設定

GitHub リポジトリの Settings → Secrets and variables → Actions で以下を設定してください:

| Secret 名 | 値 | 説明 |
|----------|-----|------|
| `MYAPP_UPLOAD_STORE_FILE` | `../keystore/poipoi-release.keystore` | Keystore ファイルパス |
| `MYAPP_UPLOAD_STORE_PASSWORD` | `poipoi123` | Keystore パスワード |
| `MYAPP_UPLOAD_KEY_ALIAS` | `poipoi` | キーエイリアス |
| `MYAPP_UPLOAD_KEY_PASSWORD` | `poipoi123` | キーパスワード |
| `EXPO_PUBLIC_API_URL` | `https://poipoi-api.onrender.com` | API ベース URL |

---

## 🚀 実行方法

### 方法 1: Push で自動実行

```bash
git push origin main
```

GitHub Actions が自動的に実行されます。

### 方法 2: 手動実行

1. GitHub リポジトリを開く
2. **Actions** タブをクリック
3. **Android APK Build** をクリック
4. **Run workflow** をクリック
5. `build_type` を選択（debug / release）
6. **Run workflow** をクリック

---

## 📦 Artifact 取得方法

### GitHub Web UI から取得

1. https://github.com/pinyopinyo24-boop/poipoi/actions
2. **Android APK Build** をクリック
3. 最新の実行をクリック
4. **Artifacts** セクションから **PoiPoi-APK** をクリック
5. **app-release.apk** をダウンロード

### CLI から取得

```bash
# GitHub CLI をインストール
gh auth login

# 最新の APK をダウンロード
gh run download -n PoiPoi-APK -D ./apk
```

---

## 🔧 Workflow ステップ詳細

### Phase 1-3: 環境セットアップ
- Ubuntu Latest
- Node.js v24
- Java 17 (temurin)
- Android SDK

### Phase 4-5: 依存関係インストール
- npm ci（package-lock.json 存在時）
- npm install（package-lock.json 未存在時）

### Phase 6: Expo Prebuild
- android フォルダが未存在の場合のみ実行
- ネイティブファイル自動生成

### Phase 7: Gradle ビルド
- Release APK: `./gradlew assembleRelease`
- Debug APK: `./gradlew assembleDebug`

### Phase 8: Artifacts アップロード
- 30 日間保存
- APK 検証ログ付き

---

## ⚠️ トラブルシューティング

### エラー: "SDK location not found"

**原因**: `local.properties` が生成されていない

**解決策**: Workflow で自動生成されます

```yaml
- name: Create local.properties
  run: echo "sdk.dir=$ANDROID_HOME" > mobile/android/local.properties
```

### エラー: "Keystore not found"

**原因**: Secrets が設定されていない

**解決策**: GitHub Secrets に以下を設定

```
MYAPP_UPLOAD_STORE_FILE=../keystore/poipoi-release.keystore
MYAPP_UPLOAD_STORE_PASSWORD=poipoi123
MYAPP_UPLOAD_KEY_ALIAS=poipoi
MYAPP_UPLOAD_KEY_PASSWORD=poipoi123
```

### エラー: "Gradle build failed"

**原因**: React Native バージョン不一致

**解決策**: `android/app/build.gradle` で確認

```gradle
implementation 'com.facebook.react:react-android:0.74.0'
```

### エラー: "Java version mismatch"

**原因**: Java バージョンが Java 17 でない

**解決策**: `android/app/build.gradle` で確認

```gradle
compileOptions {
  sourceCompatibility JavaVersion.VERSION_17
  targetCompatibility JavaVersion.VERSION_17
}
```

---

## 📊 ビルド時間

| タイプ | 初回 | 2 回目以降 |
|--------|------|----------|
| Debug APK | 10-15 分 | 5-8 分 |
| Release APK | 15-25 分 | 8-12 分 |

※ Expo prebuild が必要な場合は +5-10 分

---

## 🔐 セキュリティ

### Keystore ファイル

- **保存場所**: `android/keystore/poipoi-release.keystore`
- **Git 管理**: `.gitignore` で除外
- **Secrets**: GitHub Secrets で環境変数化

### API キー

- **保存場所**: GitHub Secrets
- **参照方法**: `${{ secrets.EXPO_PUBLIC_API_URL }}`
- **本番環境**: 環境変数から読み込み

---

## ✅ チェックリスト

- [ ] GitHub Secrets 設定完了
- [ ] Keystore ファイル作成完了
- [ ] Workflow ファイル確認
- [ ] Push して自動実行確認
- [ ] APK ダウンロード確認

---

**最終更新**: 2026-07-21  
**ステータス**: 運用中

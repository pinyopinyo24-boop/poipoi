# FaceFusion v3.6.1 ローカル処理ガイド

ポイポイの顔入れ替え機能は、**ハイブリッド処理方式**を採用しています。WebUIでファイルをアップロードし、あなたのローカルマシンで高速処理を実行します。

## 📋 目次

1. [システム要件](#システム要件)
2. [セットアップ手順](#セットアップ手順)
3. [使用方法](#使用方法)
4. [トラブルシューティング](#トラブルシューティング)
5. [クラウド処理オプション](#クラウド処理オプション)

---

## システム要件

### 最小要件
- **OS**: Windows 10/11, macOS 10.14+, Linux (Ubuntu 18.04+)
- **Python**: 3.8以上
- **RAM**: 8GB以上（推奨: 16GB以上）
- **ディスク**: 10GB以上の空き容量

### 推奨スペック（あなたのマシン）
- **GPU**: NVIDIA GTX 1650 4GB VRAM ✅
- **RAM**: 48GB ✅
- **CPU**: Intel i7/Ryzen 7以上

---

## セットアップ手順

### ステップ1: FaceFusionをインストール

#### Windows の場合

```powershell
# PowerShell を管理者権限で開く

# リポジトリをクローン
git clone https://github.com/facefusion/facefusion.git C:\facefusion

# ディレクトリに移動
cd C:\facefusion

# 依存関係をインストール
python -m pip install -r requirements.txt -q

# インストール確認
python facefusion.py --help
```

#### macOS の場合

```bash
# ホームディレクトリにクローン
git clone https://github.com/facefusion/facefusion.git ~/facefusion

# ディレクトリに移動
cd ~/facefusion

# 依存関係をインストール
python3 -m pip install -r requirements.txt -q

# インストール確認
python3 facefusion.py --help
```

#### Linux (Ubuntu) の場合

```bash
# 必要なパッケージをインストール
sudo apt-get update
sudo apt-get install -y python3-pip python3-dev

# リポジトリをクローン
git clone https://github.com/facefusion/facefusion.git ~/facefusion

# ディレクトリに移動
cd ~/facefusion

# 依存関係をインストール
pip3 install -r requirements.txt -q

# インストール確認
python3 facefusion.py --help
```

### ステップ2: ローカル処理スクリプトをダウンロード

ポイポイのWebUIから `facefusion_local_processor.py` をダウンロードするか、以下のコマンドで取得:

```bash
# Windows
curl -o facefusion_local_processor.py https://your-poipoi-url/facefusion_local_processor.py

# macOS/Linux
curl -O https://your-poipoi-url/facefusion_local_processor.py
chmod +x facefusion_local_processor.py
```

### ステップ3: 動作確認

```bash
# Windows
python facefusion_local_processor.py --info

# macOS/Linux
python3 facefusion_local_processor.py --info
```

出力例:
```json
{
  "installed": true,
  "path": "/home/user/facefusion",
  "version": "FaceFusion 3.6.1"
}
```

---

## 使用方法

### 基本的な使用方法

#### ステップ1: WebUIでファイルをアップロード

1. ポイポイを開く
2. 「♻️ FaceFusion」ボタンをクリック
3. 「ファイルアップロード」タブで:
   - ソース画像（顔を入れ替える元の顔）をアップロード
   - ターゲット動画（顔を入れ替える先の動画）をアップロード

### ステップ2: ローカルで処理実行

```bash
# Windows
python facefusion_local_processor.py ^
  --source source.jpg ^
  --target target.mp4 ^
  --output result.mp4

# macOS/Linux
python3 facefusion_local_processor.py \
  --source source.jpg \
  --target target.mp4 \
  --output result.mp4
```

### ステップ3: 結果をアップロード

1. WebUIの「ファイル管理」タブで結果動画をアップロード
2. 「ダウンロード」ボタンで最終結果を取得

---

## 詳細オプション

### 品質設定

```bash
# 高品質（処理時間が長い）
python3 facefusion_local_processor.py \
  --source source.jpg \
  --target target.mp4 \
  --output result.mp4 \
  --quality 10

# 標準品質（推奨）
python3 facefusion_local_processor.py \
  --source source.jpg \
  --target target.mp4 \
  --output result.mp4 \
  --quality 18

# 低品質（処理時間が短い）
python3 facefusion_local_processor.py \
  --source source.jpg \
  --target target.mp4 \
  --output result.mp4 \
  --quality 25
```

### モデル選択

```bash
# inswapper_128（推奨、高速）
python3 facefusion_local_processor.py \
  --source source.jpg \
  --target target.mp4 \
  --output result.mp4 \
  --model inswapper_128

# simswap_256（高品質）
python3 facefusion_local_processor.py \
  --source source.jpg \
  --target target.mp4 \
  --output result.mp4 \
  --model simswap_256
```

### FaceFusionパスを指定

```bash
# Windows
python facefusion_local_processor.py \
  --source source.jpg \
  --target target.mp4 \
  --output result.mp4 \
  --facefusion-path C:\facefusion

# macOS/Linux
python3 facefusion_local_processor.py \
  --source source.jpg \
  --target target.mp4 \
  --output result.mp4 \
  --facefusion-path ~/facefusion
```

---

## トラブルシューティング

### 問題: FaceFusionが見つからない

**症状**: `FaceFusionが見つかりません` というエラー

**解決方法**:
1. FaceFusionがインストールされているか確認
2. `--facefusion-path` で明示的にパスを指定
3. デフォルトパス（`~/facefusion`）にインストール

```bash
python3 facefusion_local_processor.py \
  --source source.jpg \
  --target target.mp4 \
  --output result.mp4 \
  --facefusion-path /path/to/facefusion
```

### 問題: メモリ不足エラー

**症状**: `CUDA out of memory` または `MemoryError`

**解決方法**:
1. 他のアプリケーションを閉じる
2. 品質を下げる（`--quality 25` など）
3. 動画を短くする（最初の数秒だけ処理）

### 問題: GPU が使用されていない

**症状**: 処理が非常に遅い（CPU のみで実行されている）

**解決方法**:
1. NVIDIA ドライバを最新版に更新
2. CUDA ツールキットをインストール
3. cuDNN をインストール

```bash
# Ubuntu の場合
sudo apt-get install nvidia-driver-latest-dkms
sudo apt-get install nvidia-cuda-toolkit
```

### 問題: 出力ファイルが破損している

**症状**: 出力動画が再生できない

**解決方法**:
1. ソース画像とターゲット動画の形式を確認
2. 出力パスが正しいか確認
3. ディスク容量が十分か確認

```bash
# ファイル情報を確認
ffprobe source.jpg
ffprobe target.mp4
```

### 問題: 顔が正しく検出されない

**症状**: 顔が入れ替わらない、または不自然な結果

**解決方法**:
1. ソース画像の顔がはっきり見えているか確認
2. 異なるモデルを試す（`--model simswap_256` など）
3. 顔の角度が正面に近いか確認

---

## パフォーマンス最適化

### GTX 1650 での推定処理時間

| 動画長 | 品質 | 処理時間 |
|-------|------|---------|
| 10秒 | 高（10） | 5-10分 |
| 10秒 | 標準（18） | 3-5分 |
| 10秒 | 低（25） | 1-2分 |
| 1分 | 標準（18） | 30-50分 |

### 処理時間を短縮するコツ

1. **品質を下げる**: `--quality 25` で処理時間を50%削減
2. **短い動画で試す**: 最初は10秒以下の動画で確認
3. **バッチ処理**: 複数の動画を連続処理
4. **メモリ最適化**: 他のアプリケーションを閉じる

---

## クラウド処理オプション

ローカルマシンで処理できない場合、クラウドサービスを利用できます。

### Google Colab（無料）

1. [Google Colab](https://colab.research.google.com) を開く
2. 以下のコードセルを実行:

```python
# FaceFusion をインストール
!git clone https://github.com/facefusion/facefusion.git /content/facefusion
%cd /content/facefusion
!pip install -r requirements.txt -q

# ファイルをアップロード
from google.colab import files
print("ソース画像をアップロード:")
source = files.upload()
print("ターゲット動画をアップロード:")
target = files.upload()

# 処理実行
!python facefusion.py headless-run \
  --source-paths {list(source.keys())[0]} \
  --target-path {list(target.keys())[0]} \
  --output-path result.mp4 \
  --face-swapper-model inswapper_128 \
  --processors face_swapper

# 結果をダウンロード
files.download('result.mp4')
```

### Runpod（有料、高速）

1. [Runpod.io](https://www.runpod.io) にサインアップ
2. GPU インスタンスを起動（推奨: RTX 4090）
3. ターミナルで以下を実行:

```bash
git clone https://github.com/facefusion/facefusion.git
cd facefusion
pip install -r requirements.txt -q

python facefusion.py headless-run \
  --source-paths source.jpg \
  --target-path target.mp4 \
  --output-path result.mp4 \
  --face-swapper-model inswapper_128
```

---

## よくある質問

### Q: 著作権に関する懸念があります

**A**: FaceFusion は技術ツールです。使用方法はユーザーの責任です。著作権のあるコンテンツの無断使用は避けてください。

### Q: 処理結果の品質を改善できますか？

**A**: 以下の方法を試してください:
- より高品質なソース画像を使用
- 異なるモデルを試す（`simswap_256` など）
- 品質設定を上げる（`--quality 10` など）

### Q: バッチ処理は可能ですか？

**A**: はい、複数の動画を処理できます:

```bash
for video in *.mp4; do
  python3 facefusion_local_processor.py \
    --source source.jpg \
    --target "$video" \
    --output "result_${video}"
done
```

### Q: 処理を中断できますか？

**A**: はい、`Ctrl+C` で中断できます。ただし、出力ファイルは不完全になります。

---

## サポート

問題が発生した場合:

1. [トラブルシューティング](#トラブルシューティング) セクションを確認
2. FaceFusion の [GitHub Issues](https://github.com/facefusion/facefusion/issues) を検索
3. ポイポイのサポートに連絡

---

## ライセンス

FaceFusion は MIT ライセンスの下で公開されています。
詳細は [FaceFusion リポジトリ](https://github.com/facefusion/facefusion) を参照してください。

---

**最終更新**: 2026年7月7日
**FaceFusion バージョン**: 3.6.1

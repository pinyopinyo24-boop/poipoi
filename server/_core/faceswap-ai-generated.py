はい、承知いたしました。PIL/Pillowのみを使用し、numpy, opencv, face_recognitionなどの外部ライブラリを使わずに、顔入れ替え処理を行うPythonプログラムを作成します。

ただし、PIL/Pillowのみで顔検出やアフィン変換を高度に行うのは非常に困難です。特に、顔検出は色と形状ベースのシンプルなものに限定され、一般的な顔検出ライブラリのような精度は期待できません。また、アフィン変換も手動で計算する必要があり、顔の向きやサイズが大きく異なる場合には自然な合成は難しいことをご了承ください。

ここでは、以下の前提で実装します。

*   **顔検出**: 肌色（ここでは比較的明るい肌色を想定）と、ある程度の楕円形に近い領域を顔とみなします。非常にシンプルな検出であり、誤検出や検出漏れが多く発生する可能性があります。
*   **顔交換**: ソース画像の検出された顔領域を切り取り、ターゲット画像の検出された顔領域に貼り付けます。アフィン変換は、検出された顔領域のバウンディングボックスを基準に、単純な拡大縮小と移動で合わせます。回転は考慮しません。
*   **ブレンド**: 貼り付けた顔の境界をぼかすことで、ある程度の自然さを出します。

以下のコードは、あくまでPIL/Pillowのみで顔入れ替えを行うための「概念実証」であり、実用的な精度や汎用性はありません。

```python
from PIL import Image, ImageDraw, ImageFilter
import os

class FaceSwapper:
    def __init__(self):
        pass

    def _detect_simple_face(self, image_path, min_face_size_ratio=0.1, max_face_size_ratio=0.8):
        """
        PIL/Pillowのみで、非常にシンプルな肌色ベースの顔検出を行います。
        この検出は非常に限定的で、多くの誤検出や検出漏れが発生します。
        顔のバウンディングボックス (left, top, right, bottom) を返します。
        """
        try:
            img = Image.open(image_path).convert("RGB")
        except FileNotFoundError:
            raise FileNotFoundError(f"画像ファイルが見つかりません: {image_path}")
        except Exception as e:
            raise IOError(f"画像の読み込み中にエラーが発生しました: {image_path} - {e}")

        width, height = img.size
        pixels = img.load()

        # 肌色の範囲を定義 (R, G, B)
        # これは非常に一般的な肌色の範囲であり、多様な肌色には対応できません
        min_skin_color = (180, 100, 80)
        max_skin_color = (255, 200, 180)

        skin_pixels = []
        for y in range(height):
            for x in range(width):
                r, g, b = pixels[x, y]
                if (min_skin_color[0] <= r <= max_skin_color[0] and
                    min_skin_color[1] <= g <= max_skin_color[1] and
                    min_skin_color[2] <= b <= max_skin_color[2]):
                    skin_pixels.append((x, y))

        if not skin_pixels:
            return None # 顔が見つからない

        # 肌色ピクセルの最小・最大座標からバウンディングボックスを計算
        min_x = min(p[0] for p in skin_pixels)
        max_x = max(p[0] for p in skin_pixels)
        min_y = min(p[1] for p in skin_pixels)
        max_y = max(p[1] for p in skin_pixels)

        face_width = max_x - min_x
        face_height = max_y - min_y

        # 顔のサイズが画像全体の一定割合内にあるかチェック
        if not (width * min_face_size_ratio <= face_width <= width * max_face_size_ratio and
                height * min_face_size_ratio <= face_height <= height * max_face_size_ratio):
            return None # サイズが適切でないため顔とみなさない

        # アスペクト比が顔に近いかチェック (簡易的)
        if not (0.7 <= face_width / face_height <= 1.3):
            return None # アスペクト比が顔らしくない

        # 検出された領域を少し広げる (顔の輪郭を含めるため)
        padding_x = int(face_width * 0.1)
        padding_y = int(face_height * 0.1)
        
        final_min_x = max(0, min_x - padding_x)
        final_min_y = max(0, min_y - padding_y)
        final_max_x = min(width, max_x + padding_x)
        final_max_y = min(height, max_y + padding_y)

        return (final_min_x, final_min_y, final_max_x, final_max_y)

    def _blend_faces(self, target_img, source_face_img, target_face_bbox, blend_radius=20):
        """
        ソースの顔画像をターゲット画像にブレンドして貼り付けます。
        """
        # ターゲットの顔領域の中心を計算
        tx_center = (target_face_bbox[0] + target_face_bbox[2]) // 2
        ty_center = (target_face_bbox[1] + target_face_bbox[3]) // 2

        # ソースの顔画像をターゲットの顔領域のサイズにリサイズ
        target_face_width = target_face_bbox[2] - target_face_bbox[0]
        target_face_height = target_face_bbox[3] - target_face_bbox[1]
        
        resized_source_face = source_face_img.resize((target_face_width, target_face_height), Image.LANCZOS)

        # マスクを作成
        mask = Image.new('L', resized_source_face.size, 0)
        draw = ImageDraw.Draw(mask)
        # 楕円形のマスクを作成
        draw.ellipse((0, 0, resized_source_face.width, resized_source_face.height), fill=255)
        
        # マスクをぼかす
        blurred_mask = mask.filter(ImageFilter.GaussianBlur(blend_radius))

        # 貼り付け位置を計算
        paste_x = target_face_bbox[0]
        paste_y = target_face_bbox[1]

        # ターゲット画像にソースの顔画像を貼り付け
        target_img.paste(resized_source_face, (paste_x, paste_y), blurred_mask)
        return target_img

    def swap_faces(self, source_image_path, target_image_path, output_path):
        """
        ソース画像の顔をターゲット画像の顔に置き換え、結果をファイルに保存します。
        """
        print(f"処理開始: ソース={source_image_path}, ターゲット={target_image_path}, 出力={output_path}")

        # 1. ソース画像の顔を検出
        print("ソース画像の顔を検出中...")
        source_face_bbox = self._detect_simple_face(source_image_path)
        if source_face_bbox is None:
            raise ValueError(f"ソース画像 {source_image_path} から顔を検出できませんでした。")
        print(f"ソース顔検出: {source_face_bbox}")

        # 2. ターゲット画像の顔を検出
        print("ターゲット画像の顔を検出中...")
        target_face_bbox = self._detect_simple_face(target_image_path)
        if target_face_bbox is None:
            raise ValueError(f"ターゲット画像 {target_image_path} から顔を検出できませんでした。")
        print(f"ターゲット顔検出: {target_face_bbox}")

        # 3. ソース画像を開き、顔領域を抽出
        try:
            source_img = Image.open(source_image_path).convert("RGB")
        except Exception as e:
            raise IOError(f"ソース画像の読み込み中にエラーが発生しました: {source_image_path} - {e}")
        
        source_face_img = source_img.crop(source_face_bbox)
        print("ソース顔を抽出しました。")

        # 4. ターゲット画像を開く
        try:
            target_img = Image.open(target_image_path).convert("RGB")
        except Exception as e:
            raise IOError(f"ターゲット画像の読み込み中にエラーが発生しました: {target_image_path} - {e}")

        # 5. 顔をブレンドして貼り付け
        print("顔をブレンドして貼り付け中...")
        # ブレンド半径はターゲットの顔の短い方の辺の約10%程度に設定
        blend_radius = min(target_face_bbox[2] - target_face_bbox[0], target_face_bbox[3] - target_face_bbox[1]) // 10
        if blend_radius < 5: blend_radius = 5 # 最小値
        
        result_img = self._blend_faces(target_img, source_face_img, target_face_bbox, blend_radius=blend_radius)
        print("顔の貼り付けが完了しました。")

        # 6. 結果を保存
        try:
            result_img.save(output_path)
            print(f"処理済み画像を保存しました: {output_path}")
        except Exception as e:
            raise IOError(f"結果画像の保存中にエラーが発生しました: {output_path} - {e}")

# --- 使用例 ---
if __name__ == "__main__":
    # テスト用の画像ファイルを用意してください。
    # 例:
    # source.jpg (顔が写っている画像)
    # target.jpg (顔が写っている画像)
    
    # 実行前に、以下のパスを実際の画像ファイルに合わせて変更してください。
    SOURCE_IMAGE = "source.jpg"  # ソース画像パス
    TARGET_IMAGE = "target.jpg"  # ターゲット画像パス
    OUTPUT_IMAGE = "output_swapped_face.jpg" # 出力画像パス

    # テスト用のダミー画像を作成 (実際の画像に置き換えてください)
    if not os.path.exists(SOURCE_IMAGE):
        print(f"'{SOURCE_IMAGE}' が見つかりません。ダミー画像を作成します。")
        dummy_source = Image.new('RGB', (300, 400), color = 'blue')
        draw_s = ImageDraw.Draw(dummy_source)
        # ソースの顔 (肌色っぽい楕円)
        draw_s.ellipse((80, 100, 220, 250), fill=(220, 150, 120), outline='black')
        draw_s.ellipse((120, 150, 140, 170), fill='white') # 左目
        draw_s.ellipse((160, 150, 180, 170), fill='white') # 右目
        draw_s.line((140, 200, 160, 200), fill='black', width=2) # 鼻
        draw_s.arc((120, 220, 180, 240), 0, 180, fill='black', width=2) # 口
        dummy_source.save(SOURCE_IMAGE)
        print(f"'{SOURCE_IMAGE}' を作成しました。")

    if not os.path.exists(TARGET_IMAGE):
        print(f"'{TARGET_IMAGE}' が見つかりません。ダミー画像を作成します。")
        dummy_target = Image.new('RGB', (500, 600), color = 'green')
        draw_t = ImageDraw.Draw(dummy_target)
        # ターゲットの顔 (肌色っぽい楕円)
        draw_t.ellipse((150, 200, 350, 450), fill=(200, 130, 100), outline='black')
        draw_t.ellipse((200, 250, 230, 280), fill='white') # 左目
        draw_t.ellipse((270, 250, 300, 280), fill='white') # 右目
        draw_t.line((240, 320, 260, 320), fill='black', width=3) # 鼻
        draw_t.arc((200, 380, 300, 420), 0, 180, fill='black', width=3) # 口
        dummy_target.save(TARGET_IMAGE)
        print(f"'{TARGET_IMAGE}' を作成しました。")

    swapper = FaceSwapper()
    try:
        swapper.swap_faces(SOURCE_IMAGE, TARGET_IMAGE, OUTPUT_IMAGE)
        print("\n顔入れ替え処理が正常に完了しました。")
    except Exception as e:
        print(f"\nエラーが発生しました: {e}")
        print("PIL/Pillowのみでの顔検出は非常に困難です。")
        print("より良い結果を得るには、OpenCVやface_recognitionなどのライブラリの使用を検討してください。")

    # 検出された顔領域を可視化するオプション (デバッグ用)
    def visualize_face_detection(image_path, output_path):
        try:
            img = Image.open(image_path).convert("RGB")
            swapper = FaceSwapper()
            bbox = swapper._detect_simple_face(image_path)
            if bbox:
                draw = ImageDraw.Draw(img)
                draw.rectangle(bbox, outline="red", width=3)
                img.save(output_path)
                print(f"顔検出結果を保存しました: {output_path}")
            else:
                print(f"画像 {image_path} で顔を検出できませんでした。")
        except Exception as e:
            print(f"顔検出の可視化中にエラーが発生しました: {e}")

    # visualize_face_detection(SOURCE_IMAGE, "source_detected.jpg")
    # visualize_face_detection(TARGET_IMAGE, "target_detected.jpg")
```

### コードの説明と注意点

1.  **`FaceSwapper` クラス**:
    *   `_detect_simple_face(self, image_path, ...)`:
        *   **肌色検出**: `min_skin_color` と `max_skin_color` で定義されたRGB範囲内のピクセルを肌色とみなします。この範囲は非常に限定的であり、様々な肌色や照明条件下ではうまく機能しません。
        *   **バウンディングボックス計算**: 検出された肌色ピクセルの最小・最大座標から矩形領域を計算します。
        *   **サイズ・アスペクト比フィルタリング**: 画像全体に対する顔のサイズが極端に小さすぎたり大きすぎたりしないか、またアスペクト比が顔として妥当な範囲にあるかをチェックします。これにより、ノイズや背景の肌色っぽい領域をある程度除外しようとします。
        *   **パディング**: 検出された領域をわずかに広げ、顔の輪郭をより良く捉えようとします。
        *   **限界**: この方法は非常に原始的で、顔以外の肌色の物体（手など）を誤検出したり、顔が検出されなかったりする可能性が非常に高いです。顔の向き、照明、背景の複雑さなどに非常に弱いです。
    *   `_blend_faces(self, target_img, source_face_img, target_face_bbox, blend_radius)`:
        *   **リサイズ**: ソースの顔画像をターゲットの顔領域のサイズに合わせてリサイズします。
        *   **マスク作成**: 楕円形のマスクを作成し、`ImageFilter.GaussianBlur` でぼかします。これにより、貼り付けた顔の境界が自然にブレンドされます。`blend_radius` はぼかしの強度を制御します。
        *   **貼り付け**: `target_img.paste()` メソッドにぼかしたマスクを渡して、顔画像を貼り付けます。
    *   `swap_faces(self, source_image_path, target_image_path, output_path)`:
        *   メインの処理フローを制御します。
        *   各ステップでエラーハンドリングを行い、ファイルが見つからない場合や画像処理中に問題が発生した場合に適切なエラーメッセージを返します。

2.  **`if __name__ == "__main__":` ブロック**:
    *   プログラムを直接実行した際のテストコードです。
    *   `SOURCE_IMAGE` と `TARGET_IMAGE` を実際の画像ファイルパスに置き換えてください。
    *   テスト用に、画像ファイルが存在しない場合にシンプルなダミー画像を生成する
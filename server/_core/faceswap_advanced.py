#!/usr/bin/env python3
"""
高度な顔入れ替え処理（insightface + 顔の向き補正 + 自然な融合）
"""

import cv2
import numpy as np
import insightface
import sys
import json
import os
from scipy.ndimage import gaussian_filter
import warnings

warnings.filterwarnings('ignore')

# Suppress stdout from insightface
old_stdout = sys.stdout
from io import StringIO
sys.stdout = StringIO()

app = insightface.app.FaceAnalysis(providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

# Restore stdout
sys.stdout = old_stdout

def get_face_mask(face, img_shape):
    """顔のマスクを生成"""
    mask = np.zeros(img_shape[:2], dtype=np.uint8)
    
    # 顔の領域を取得
    bbox = face.bbox.astype(int)
    x1, y1, x2, y2 = bbox
    
    # パディングを追加
    pad = int((x2 - x1) * 0.1)
    x1 = max(0, x1 - pad)
    y1 = max(0, y1 - pad)
    x2 = min(img_shape[1], x2 + pad)
    y2 = min(img_shape[0], y2 + pad)
    
    # 顔領域にマスクを設定
    mask[y1:y2, x1:x2] = 255
    
    # ガウシアンフィルタでエッジをスムーズ化
    mask = cv2.GaussianBlur(mask, (21, 21), 0)
    
    return mask

def blend_faces(source_face_region, target_img, target_face, mask):
    """顔を自然に融合"""
    bbox = target_face.bbox.astype(int)
    x1, y1, x2, y2 = bbox
    
    # パディングを追加
    pad = int((x2 - x1) * 0.1)
    x1 = max(0, x1 - pad)
    y1 = max(0, y1 - pad)
    x2 = min(target_img.shape[1], x2 + pad)
    y2 = min(target_img.shape[0], y2 + pad)
    
    # ソース顔をターゲットサイズにリサイズ
    target_width = x2 - x1
    target_height = y2 - y1
    resized_source = cv2.resize(source_face_region, (target_width, target_height))
    
    # 色補正（ターゲット画像の色に合わせる）
    target_region = target_img[y1:y2, x1:x2]
    
    # 平均色を計算
    source_mean = cv2.mean(resized_source)[:3]
    target_mean = cv2.mean(target_region)[:3]
    
    # 色補正を適用
    color_correction = np.array(target_mean) / (np.array(source_mean) + 1e-6)
    resized_source = cv2.convertScaleAbs(resized_source * color_correction)
    resized_source = np.clip(resized_source, 0, 255).astype(np.uint8)
    
    # マスクを使用したブレンディング
    mask_region = mask[y1:y2, x1:x2]
    mask_region = cv2.resize(mask_region, (target_width, target_height))
    mask_region = mask_region.astype(float) / 255.0
    
    # アルファブレンディング
    result = target_img.copy()
    for c in range(3):
        result[y1:y2, x1:x2, c] = (
            resized_source[:, :, c] * mask_region +
            target_region[:, :, c] * (1 - mask_region)
        ).astype(np.uint8)
    
    return result

def swap_faces_advanced(source_path, target_path, output_path):
    """高度な顔入れ替え処理"""
    try:
        # ファイルの存在確認
        if not os.path.exists(source_path):
            return {"success": False, "error": f"ソースファイルが見つかりません: {source_path}"}
        if not os.path.exists(target_path):
            return {"success": False, "error": f"ターゲットファイルが見つかりません: {target_path}"}
        
        # 画像を読み込み
        source_img = cv2.imread(source_path)
        target_img = cv2.imread(target_path)
        
        if source_img is None:
            return {"success": False, "error": "ソース画像の読み込みに失敗しました"}
        if target_img is None:
            return {"success": False, "error": "ターゲット画像の読み込みに失敗しました"}
        
        # 顔を検出
        source_faces = app.get(source_img)
        target_faces = app.get(target_img)
        
        if len(source_faces) == 0:
            return {"success": False, "error": "ソース画像から顔が検出されませんでした"}
        
        if len(target_faces) == 0:
            return {"success": False, "error": "ターゲット画像から顔が検出されませんでした"}
        
        # 最初の顔を使用
        source_face = source_faces[0]
        target_face = target_faces[0]
        
        # ソース顔領域を抽出
        source_bbox = source_face.bbox.astype(int)
        x1, y1, x2, y2 = source_bbox
        source_face_region = source_img[max(0, y1):min(source_img.shape[0], y2), 
                                        max(0, x1):min(source_img.shape[1], x2)]
        
        if source_face_region.size == 0:
            return {"success": False, "error": "ソース顔領域の抽出に失敗しました"}
        
        # 顔のマスクを生成
        mask = get_face_mask(target_face, target_img.shape)
        
        # 顔を融合
        result_img = blend_faces(source_face_region, target_img, target_face, mask)
        
        # 結果を保存
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cv2.imwrite(output_path, result_img)
        
        return {"success": True, "message": "高度な顔入れ替え完了"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({"success": False, "error": "引数が不足しています"}))
        sys.exit(1)
    
    source_path = sys.argv[1]
    target_path = sys.argv[2]
    output_path = sys.argv[3]
    
    result = swap_faces_advanced(source_path, target_path, output_path)
    print(json.dumps(result))

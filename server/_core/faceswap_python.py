#!/usr/bin/env python3
"""
顔入れ替え処理（insightfaceを使用）
Node.jsサーバーから呼び出される
"""

import cv2
import numpy as np
import insightface
import sys
import json
import os

# モデルの初期化（静かに実行）
import warnings
import sys
from io import StringIO

warnings.filterwarnings('ignore')

# Suppress stdout from insightface
old_stdout = sys.stdout
sys.stdout = StringIO()

app = insightface.app.FaceAnalysis(providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

# Restore stdout
sys.stdout = old_stdout

def swap_faces(source_path, target_path, output_path):
    """顔入れ替え処理"""
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
        
        # 顔の領域を抽出
        source_bbox = source_face.bbox.astype(int)
        target_bbox = target_face.bbox.astype(int)
        
        # ソース顔領域を抽出
        x1, y1, x2, y2 = source_bbox
        source_face_region = source_img[max(0, y1):min(source_img.shape[0], y2), 
                                        max(0, x1):min(source_img.shape[1], x2)]
        
        if source_face_region.size == 0:
            return {"success": False, "error": "ソース顔領域の抽出に失敗しました"}
        
        # ターゲット顔領域のサイズに合わせてリサイズ
        target_x1, target_y1, target_x2, target_y2 = target_bbox
        target_width = max(1, target_x2 - target_x1)
        target_height = max(1, target_y2 - target_y1)
        
        resized_source_face = cv2.resize(source_face_region, (target_width, target_height))
        
        # ターゲット画像に合成
        result_img = target_img.copy()
        result_img[max(0, target_y1):min(result_img.shape[0], target_y2),
                   max(0, target_x1):min(result_img.shape[1], target_x2)] = resized_source_face
        
        # 結果を保存
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cv2.imwrite(output_path, result_img)
        
        return {"success": True, "message": "顔入れ替え完了"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({"success": False, "error": "引数が不足しています"}))
        sys.exit(1)
    
    source_path = sys.argv[1]
    target_path = sys.argv[2]
    output_path = sys.argv[3]
    
    result = swap_faces(source_path, target_path, output_path)
    print(json.dumps(result))

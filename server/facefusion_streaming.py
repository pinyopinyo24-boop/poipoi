#!/usr/bin/env python3
"""
メモリ効率的な顔入れ替え処理 - ストリーミング方式
フレームをメモリに保持せず、逐次処理
"""

import cv2
import numpy as np
import os
import sys
import argparse
import onnxruntime as ort
import gc

parser = argparse.ArgumentParser(description='Memory-efficient face swap')
parser.add_argument('--source', type=str, default='/home/ubuntu/upload/1000019335.jpg', help='Source face image')
parser.add_argument('--target', type=str, default='/tmp/target_60fps.mp4', help='Target video')
parser.add_argument('--output', type=str, default='/tmp/face_swap_streaming.mp4', help='Output video')
args = parser.parse_args()

print("="*70)
print("🎬 メモリ効率的な顔入れ替え処理")
print("="*70)
print(f"Source: {args.source}")
print(f"Target: {args.target}")
print(f"Output: {args.output}")

try:
    # モデルを読み込み
    print("\n[準備] モデルを読み込み中...")
    model_dir = os.path.expanduser('~/.insightface/models/buffalo_l')
    
    det_sess = ort.InferenceSession(os.path.join(model_dir, 'det_10g.onnx'), 
                                   providers=['CPUExecutionProvider'])
    rec_sess = ort.InferenceSession(os.path.join(model_dir, 'w600k_r50.onnx'),
                                   providers=['CPUExecutionProvider'])
    swap_sess = ort.InferenceSession(os.path.join(model_dir, 'inswapper_128.onnx'),
                                    providers=['CPUExecutionProvider'])
    print("  ✓ Models loaded")
    
    # ソース画像を読み込み
    source_image = cv2.imread(args.source)
    if source_image is None:
        print(f"❌ Failed to load source image: {args.source}")
        exit(1)
    
    # ソース顔の特徴を抽出
    print("  Extracting source face embedding...")
    source_resized = cv2.resize(source_image, (112, 112))
    source_resized = source_resized.astype(np.float32)
    source_resized = (source_resized - 127.5) / 128.0
    source_resized = np.transpose(source_resized, (2, 0, 1))
    source_resized = np.expand_dims(source_resized, 0)
    
    rec_input_name = rec_sess.get_inputs()[0].name
    rec_output_name = rec_sess.get_outputs()[0].name
    source_embedding = rec_sess.run([rec_output_name], {rec_input_name: source_resized})[0]
    print(f"  ✓ Source embedding extracted")
    
    # ソース画像をメモリから削除
    del source_image, source_resized
    gc.collect()
    
    # 動画を開く
    print("\n[ステップ1] 動画を読み込み中...")
    cap = cv2.VideoCapture(args.target)
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print(f"  動画情報: {width}x{height}, {fps}fps, {total_frames}フレーム")
    
    # 出力動画を作成
    print("\n[ステップ2] 顔入れ替え処理中...")
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(args.output, fourcc, fps, (width, height))
    
    frame_num = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        try:
            # 顔検出
            frame_resized = cv2.resize(frame, (640, 640))
            frame_norm = frame_resized.astype(np.float32)
            frame_norm = (frame_norm - 127.5) / 128.0
            frame_norm = np.transpose(frame_norm, (2, 0, 1))
            frame_norm = np.expand_dims(frame_norm, 0)
            
            det_input_name = det_sess.get_inputs()[0].name
            det_output_name = det_sess.get_outputs()[0].name
            
            detections = det_sess.run([det_output_name], {det_input_name: frame_norm})[0]
            
            # 検出結果から顔領域を抽出
            if len(detections) > 0:
                det = detections[0]
                bbox = det[:4]
                conf = det[4]
                
                if conf > 0.5:  # 信頼度閾値
                    # バウンディングボックスをスケール
                    scale_x = frame.shape[1] / 640
                    scale_y = frame.shape[0] / 640
                    
                    x1 = int(bbox[0] * scale_x)
                    y1 = int(bbox[1] * scale_y)
                    x2 = int(bbox[2] * scale_x)
                    y2 = int(bbox[3] * scale_y)
                    
                    x1 = max(0, x1)
                    y1 = max(0, y1)
                    x2 = min(frame.shape[1], x2)
                    y2 = min(frame.shape[0], y2)
                    
                    # 顔領域を抽出
                    face_region = frame[y1:y2, x1:x2].copy()
                    
                    if face_region.shape[0] > 0 and face_region.shape[1] > 0:
                        # 顔領域をリサイズ (128x128)
                        face_resized = cv2.resize(face_region, (128, 128))
                        face_norm = face_resized.astype(np.float32)
                        face_norm = (face_norm - 127.5) / 128.0
                        face_norm = np.transpose(face_norm, (2, 0, 1))
                        face_norm = np.expand_dims(face_norm, 0)
                        
                        # inswapperで顔を入れ替え
                        swap_input_names = [inp.name for inp in swap_sess.get_inputs()]
                        swap_output_name = swap_sess.get_outputs()[0].name
                        
                        swap_inputs = {
                            swap_input_names[0]: face_norm,
                            swap_input_names[1]: source_embedding
                        }
                        
                        swapped_face = swap_sess.run([swap_output_name], swap_inputs)[0]
                        
                        # 出力を正規化
                        swapped_face = np.squeeze(swapped_face, 0)
                        swapped_face = np.transpose(swapped_face, (1, 2, 0))
                        swapped_face = (swapped_face * 128.0 + 127.5).astype(np.uint8)
                        
                        # リサイズして元のサイズに戻す
                        swapped_face_resized = cv2.resize(swapped_face, (x2 - x1, y2 - y1))
                        
                        # フレームに配置
                        frame[y1:y2, x1:x2] = swapped_face_resized
                        
                        # メモリクリア
                        del face_region, face_resized, face_norm, swapped_face, swapped_face_resized
        
        except Exception as e:
            print(f"  Warning: Frame {frame_num} processing failed: {e}")
        
        # フレームを出力
        out.write(frame)
        
        # 進捗表示
        if (frame_num + 1) % 100 == 0:
            print(f"  処理中: {frame_num + 1}/{total_frames} フレーム")
        
        frame_num += 1
        
        # 定期的にメモリをクリア
        if frame_num % 50 == 0:
            gc.collect()
    
    cap.release()
    out.release()
    
    print(f"\n✅ 処理完了: {frame_num}フレームを処理")
    print(f"✅ 出力: {args.output}")
    print("\n" + "="*70)
    print("🎉 顔入れ替え処理が完了しました！")
    print("="*70)

except Exception as e:
    print(f"❌ エラーが発生しました: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

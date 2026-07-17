#!/usr/bin/env python3
"""
Full Video Face Swap with Improved Algorithm
Applies the refined face swap to all frames
"""

import sys
import json
import cv2
import os
import subprocess
import numpy as np
import warnings
from pathlib import Path

warnings.filterwarnings('ignore')

try:
    from insightface.app import FaceAnalysis
except ImportError:
    print(json.dumps({"success": False, "error": "insightface not installed"}))
    sys.exit(1)

def swap_face_in_frame(source_face_rect, source_landmarks_local, frame, target_face):
    """Swap face in a single frame using improved algorithm"""
    try:
        target_landmarks = target_face.landmark_2d_106
        
        if target_landmarks is None:
            return None
        
        # Extract target face region
        tx1, ty1, tx2, ty2 = target_face.bbox.astype(int)
        padding = 40
        tx1 = max(0, tx1 - padding)
        ty1 = max(0, ty1 - padding)
        tx2 = min(frame.shape[1], tx2 + padding)
        ty2 = min(frame.shape[0], ty2 + padding)
        
        target_region_h = ty2 - ty1
        target_region_w = tx2 - tx1
        
        # Create mask for source face
        src_mask = np.zeros(source_face_rect.shape[:2], dtype=np.uint8)
        pts = np.array(source_landmarks_local[:50], dtype=np.int32)
        hull = cv2.convexHull(pts)
        cv2.fillPoly(src_mask, [hull], 255)
        src_mask = cv2.GaussianBlur(src_mask, (51, 51), 0)
        
        # Apply mask to source face
        face_rect_masked = source_face_rect.copy()
        mask_3ch = cv2.merge([src_mask.astype(np.float32)/255.0] * 3)
        face_rect_masked = (source_face_rect.astype(np.float32) * mask_3ch).astype(np.uint8)
        
        # Warp face using affine transformation
        src_pts = np.float32([
            source_landmarks_local[33],   # nose
            source_landmarks_local[38],   # left eye
            source_landmarks_local[88],   # right eye
        ])
        
        target_landmarks_local = target_landmarks - np.array([tx1, ty1])
        dst_pts = np.float32([
            target_landmarks_local[33],
            target_landmarks_local[38],
            target_landmarks_local[88],
        ])
        
        matrix = cv2.getAffineTransform(src_pts, dst_pts)
        
        # Warp both face and mask
        warped_face = cv2.warpAffine(
            face_rect_masked,
            matrix,
            (target_region_w, target_region_h),
            borderMode=cv2.BORDER_REFLECT
        )
        
        warped_src_mask = cv2.warpAffine(
            src_mask,
            matrix,
            (target_region_w, target_region_h),
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=0
        )
        
        # Create target mask
        target_mask = np.zeros((target_region_h, target_region_w), dtype=np.uint8)
        pts = np.array(target_landmarks_local[:50], dtype=np.int32)
        hull = cv2.convexHull(pts)
        cv2.fillPoly(target_mask, [hull], 255)
        
        # Combine masks
        combined_mask = np.minimum(warped_src_mask, target_mask)
        combined_mask = cv2.GaussianBlur(combined_mask, (71, 71), 0)
        
        # Get target region
        target_region = frame[ty1:ty2, tx1:tx2].copy()
        
        # Blend
        mask_float = combined_mask.astype(np.float32) / 255.0
        mask_3ch = cv2.merge([mask_float, mask_float, mask_float])
        
        blended = (warped_face.astype(np.float32) * mask_3ch + 
                  target_region.astype(np.float32) * (1 - mask_3ch)).astype(np.uint8)
        
        # Place back
        output = frame.copy()
        output[ty1:ty2, tx1:tx2] = blended
        
        return output
        
    except Exception as e:
        return None

def process_video(source_image_path, video_path, output_video_path, fps=24):
    """Process entire video with face swap"""
    try:
        # Initialize
        app = FaceAnalysis(providers=['CPUExecutionProvider'])
        app.prepare(ctx_id=0, det_size=(640, 640))
        
        # Extract source face
        source_img = cv2.imread(source_image_path)
        if source_img is None:
            return {"success": False, "error": "Failed to read source image"}
        
        source_faces = app.get(source_img)
        if len(source_faces) == 0:
            return {"success": False, "error": "No face in source image"}
        
        source_face = source_faces[0]
        source_landmarks = source_face.landmark_2d_106
        
        if source_landmarks is None:
            return {"success": False, "error": "Source landmarks not available"}
        
        # Extract source face rectangle
        x1, y1, x2, y2 = source_face.bbox.astype(int)
        padding = 40
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(source_img.shape[1], x2 + padding)
        y2 = min(source_img.shape[0], y2 + padding)
        
        source_face_rect = source_img[y1:y2, x1:x2].copy()
        source_landmarks_local = source_landmarks - np.array([x1, y1])
        
        # Create temp directory for frames
        temp_dir = f"/tmp/faceswap_video_{os.getpid()}"
        os.makedirs(temp_dir, exist_ok=True)
        
        # Extract frames from video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"success": False, "error": "Failed to open video"}
        
        frame_count = 0
        processed_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            frame_path = os.path.join(temp_dir, f"frame_{frame_count:04d}.png")
            
            # Detect faces in frame
            frame_faces = app.get(frame)
            if len(frame_faces) > 0:
                # Swap face
                output_frame = swap_face_in_frame(
                    source_face_rect,
                    source_landmarks_local,
                    frame,
                    frame_faces[0]
                )
                
                if output_frame is not None:
                    cv2.imwrite(frame_path, output_frame)
                    processed_count += 1
                else:
                    cv2.imwrite(frame_path, frame)
            else:
                cv2.imwrite(frame_path, frame)
        
        cap.release()
        
        if frame_count == 0:
            return {"success": False, "error": "No frames in video"}
        
        # Reconstruct video from frames
        frame_pattern = os.path.join(temp_dir, "frame_%04d.png")
        
        cmd = [
            'ffmpeg',
            '-y',
            '-framerate', str(fps),
            '-i', frame_pattern,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-crf', '23',
            output_video_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            return {"success": False, "error": f"FFmpeg error: {result.stderr}"}
        
        # Cleanup
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        return {
            "success": True,
            "output": output_video_path,
            "frames_processed": frame_count,
            "faces_swapped": processed_count
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({"success": False, "error": "Usage: python3 face-swap-full-video.py <source_image> <video> <output>"}))
        sys.exit(1)
    
    source_image_path = sys.argv[1]
    video_path = sys.argv[2]
    output_video_path = sys.argv[3]
    
    result = process_video(source_image_path, video_path, output_video_path)
    print(json.dumps(result))

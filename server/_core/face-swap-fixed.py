#!/usr/bin/env python3
"""
Face Swap with Fixed Landmark Normalization
Ensures all landmarks stay within image bounds
"""

import sys
import json
import cv2
import os
import subprocess
import numpy as np
import warnings

warnings.filterwarnings('ignore')

try:
    from insightface.app import FaceAnalysis
except ImportError:
    print(json.dumps({"success": False, "error": "insightface not installed"}))
    sys.exit(1)

def normalize_landmarks(landmarks, image_shape):
    """Normalize landmarks to stay within image bounds"""
    h, w = image_shape[:2]
    
    # Clip to bounds
    landmarks = np.clip(landmarks, 0, [w-1, h-1])
    
    return landmarks

def warp_triangle(src, src_tri, dst_tri, dst_shape):
    """Warp a single triangle using affine transformation"""
    try:
        r1 = cv2.boundingRect(np.float32([src_tri]))
        r2 = cv2.boundingRect(np.float32([dst_tri]))
        
        if r1[2] <= 0 or r1[3] <= 0 or r2[2] <= 0 or r2[3] <= 0:
            return None
        
        src_tri_shifted = src_tri - np.array([r1[0], r1[1]])
        dst_tri_shifted = dst_tri - np.array([r2[0], r2[1]])
        
        # Get affine transformation
        warp_mat = cv2.getAffineTransform(
            np.float32(src_tri_shifted[:3]),
            np.float32(dst_tri_shifted[:3])
        )
        
        # Warp triangle
        warped = cv2.warpAffine(
            src[r1[1]:r1[1]+r1[3], r1[0]:r1[0]+r1[2]],
            warp_mat,
            (r2[2], r2[3]),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REFLECT
        )
        
        # Create mask
        mask = np.zeros((r2[3], r2[2]), dtype=np.uint8)
        cv2.fillConvexPoly(mask, np.int32(dst_tri_shifted), 255)
        
        return warped, mask, (r2[0], r2[1])
    except:
        return None

def morphological_warp_fixed(src_img, src_landmarks, dst_landmarks, dst_shape):
    """Warp source image with fixed landmark normalization"""
    try:
        # Normalize landmarks
        src_landmarks = normalize_landmarks(src_landmarks, src_img.shape)
        dst_landmarks = normalize_landmarks(dst_landmarks, dst_shape)
        
        # Create Delaunay triangulation
        rect = (0, 0, dst_shape[1], dst_shape[0])
        subdiv = cv2.Subdiv2D(rect)
        
        for pt in dst_landmarks.astype(np.int32):
            subdiv.insert(tuple(pt))
        
        triangles = subdiv.getTriangleList()
        triangles = np.array(triangles, dtype=np.int32)
        
        # Initialize output
        output = np.zeros(dst_shape, dtype=src_img.dtype)
        
        # For each triangle
        for tri_idx in triangles:
            tri = tri_idx.reshape(3, 2)
            
            # Find closest source landmarks
            src_tri = []
            dst_tri = []
            
            for i in range(3):
                dst_pt = tri[i]
                
                # Find closest destination landmark
                distances = np.linalg.norm(dst_landmarks - dst_pt, axis=1)
                closest_idx = np.argmin(distances)
                
                src_tri.append(src_landmarks[closest_idx])
                dst_tri.append(dst_pt)
            
            src_tri = np.array(src_tri, dtype=np.float32)
            dst_tri = np.array(dst_tri, dtype=np.float32)
            
            result = warp_triangle(src_img, src_tri, dst_tri, dst_shape)
            if result is not None:
                warped, mask, offset = result
                
                # Place warped triangle
                x, y = offset
                if 0 <= y < dst_shape[0] and 0 <= x < dst_shape[1]:
                    h, w = warped.shape[:2]
                    
                    # Ensure bounds
                    y_end = min(y + h, dst_shape[0])
                    x_end = min(x + w, dst_shape[1])
                    
                    if y_end > y and x_end > x:
                        h_actual = y_end - y
                        w_actual = x_end - x
                        
                        mask_actual = mask[:h_actual, :w_actual]
                        warped_actual = warped[:h_actual, :w_actual]
                        
                        mask_3ch = cv2.merge([mask_actual.astype(np.float32)/255.0] * 3)
                        
                        output[y:y_end, x:x_end] = (
                            warped_actual.astype(np.float32) * mask_3ch +
                            output[y:y_end, x:x_end].astype(np.float32) * (1 - mask_3ch)
                        ).astype(src_img.dtype)
        
        return output
    except Exception as e:
        return None

def swap_face_fixed(source_face_rect, source_landmarks_local, 
                    frame, target_face, target_landmarks):
    """Swap face with fixed landmark normalization"""
    try:
        # Extract target face region
        tx1, ty1, tx2, ty2 = target_face.bbox.astype(int)
        padding = 40
        tx1 = max(0, tx1 - padding)
        ty1 = max(0, ty1 - padding)
        tx2 = min(frame.shape[1], tx2 + padding)
        ty2 = min(frame.shape[0], ty2 + padding)
        
        target_region_h = ty2 - ty1
        target_region_w = tx2 - tx1
        
        # Adjust target landmarks to region coordinates
        target_landmarks_local = target_landmarks - np.array([tx1, ty1])
        
        # Morphological warp with fixed normalization
        warped_face = morphological_warp_fixed(
            source_face_rect,
            source_landmarks_local,
            target_landmarks_local,
            (target_region_h, target_region_w)
        )
        
        if warped_face is None:
            return None
        
        # Create mask from target contour (first 33 landmarks)
        target_mask = np.zeros((target_region_h, target_region_w), dtype=np.uint8)
        
        # Get contour points
        contour_points = target_landmarks_local[:33]
        contour_points = normalize_landmarks(contour_points, (target_region_h, target_region_w))
        
        pts = np.array(contour_points, dtype=np.int32)
        cv2.fillPoly(target_mask, [pts], 255)
        target_mask = cv2.GaussianBlur(target_mask, (101, 101), 0)
        
        # Get target region
        target_region = frame[ty1:ty2, tx1:tx2].copy()
        
        # Blend
        mask_float = target_mask.astype(np.float32) / 255.0
        mask_3ch = cv2.merge([mask_float, mask_float, mask_float])
        
        blended = (warped_face.astype(np.float32) * mask_3ch + 
                  target_region.astype(np.float32) * (1 - mask_3ch)).astype(np.uint8)
        
        # Place back
        output = frame.copy()
        output[ty1:ty2, tx1:tx2] = blended
        
        return output
        
    except Exception as e:
        return None

def process_video_fixed(source_image_path, video_path, output_video_path, fps=24):
    """Process entire video with fixed landmark normalization"""
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
        
        # Normalize source landmarks
        source_landmarks_local = normalize_landmarks(source_landmarks_local, source_face_rect.shape)
        
        # Create temp directory for frames
        temp_dir = f"/tmp/faceswap_fixed_{os.getpid()}"
        os.makedirs(temp_dir, exist_ok=True)
        
        # Extract frames from video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"success": False, "error": "Failed to open video"}
        
        frame_count = 0
        processed_count = 0
        
        print(f"Processing video with fixed landmark normalization...", file=sys.stderr)
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            frame_path = os.path.join(temp_dir, f"frame_{frame_count:04d}.png")
            
            # Detect faces in frame
            frame_faces = app.get(frame)
            if len(frame_faces) > 0 and frame_faces[0].landmark_2d_106 is not None:
                # Swap face with fixed normalization
                output_frame = swap_face_fixed(
                    source_face_rect,
                    source_landmarks_local,
                    frame,
                    frame_faces[0],
                    frame_faces[0].landmark_2d_106
                )
                
                if output_frame is not None:
                    cv2.imwrite(frame_path, output_frame)
                    processed_count += 1
                else:
                    cv2.imwrite(frame_path, frame)
            else:
                cv2.imwrite(frame_path, frame)
            
            if frame_count % 50 == 0:
                print(f"Processed {frame_count} frames...", file=sys.stderr)
        
        cap.release()
        
        if frame_count == 0:
            return {"success": False, "error": "No frames in video"}
        
        print(f"Reconstructing video from {frame_count} frames...", file=sys.stderr)
        
        # Reconstruct video from frames
        frame_pattern = os.path.join(temp_dir, "frame_%04d.png")
        
        cmd = [
            'ffmpeg',
            '-y',
            '-framerate', str(fps),
            '-i', frame_pattern,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-crf', '18',
            output_video_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
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
        print(json.dumps({"success": False, "error": "Usage: python3 face-swap-fixed.py <source_image> <video> <output>"}))
        sys.exit(1)
    
    source_image_path = sys.argv[1]
    video_path = sys.argv[2]
    output_video_path = sys.argv[3]
    
    result = process_video_fixed(source_image_path, video_path, output_video_path)
    print(json.dumps(result))

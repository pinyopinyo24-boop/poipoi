#!/usr/bin/env python3
"""
Face Swap with Refined Masking and Weaker Blending
Removes rectangular edges and creates more realistic appearance
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

def create_refined_mask(landmarks, shape, blur_strength=251):
    """Create refined mask from landmarks with smooth edges"""
    mask = np.zeros(shape, dtype=np.uint8)
    
    # Use contour landmarks (first 33 points)
    contour = landmarks[:33]
    contour = np.clip(contour, 0, [shape[1]-1, shape[0]-1])
    
    # Fill polygon
    cv2.fillPoly(mask, [np.int32(contour)], 255)
    
    # Apply morphological operations to smooth edges
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    # Apply strong Gaussian blur for smooth feathering
    mask = cv2.GaussianBlur(mask, (blur_strength, blur_strength), 0)
    
    return mask

def swap_face_refined(source_face_rect, source_landmarks, frame, target_face, target_landmarks):
    """Swap face with refined masking and weaker blending"""
    try:
        # Get target face region
        tx1, ty1, tx2, ty2 = target_face.bbox.astype(int)
        padding = 20
        tx1 = max(0, tx1 - padding)
        ty1 = max(0, ty1 - padding)
        tx2 = min(frame.shape[1], tx2 + padding)
        ty2 = min(frame.shape[0], ty2 + padding)
        
        target_h = ty2 - ty1
        target_w = tx2 - tx1
        
        # Adjust target landmarks
        target_lm_local = target_landmarks - np.array([tx1, ty1])
        target_lm_local = np.clip(target_lm_local, 0, [target_w-1, target_h-1])
        
        # Get source face center
        src_center = source_landmarks.mean(axis=0)
        
        # Calculate scale factor
        src_bbox = cv2.boundingRect(np.float32([source_landmarks]))
        src_h, src_w = src_bbox[3], src_bbox[2]
        
        target_bbox = cv2.boundingRect(np.float32([target_lm_local]))
        target_h_bbox, target_w_bbox = target_bbox[3], target_bbox[2]
        
        if src_h > 0 and src_w > 0:
            scale_h = target_h_bbox / src_h * 1.1
            scale_w = target_w_bbox / src_w * 1.1
            scale_factor = max(scale_h, scale_w)
        else:
            scale_factor = 1.0
        
        # Scale landmarks
        scaled_src_landmarks = (source_landmarks - src_center) * scale_factor + src_center
        
        # Resize source face
        new_h = int(source_face_rect.shape[0] * scale_factor)
        new_w = int(source_face_rect.shape[1] * scale_factor)
        resized_src = cv2.resize(source_face_rect, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        
        # Adjust scaled landmarks
        scale_offset = (np.array([new_w, new_h]) - np.array([source_face_rect.shape[1], source_face_rect.shape[0]])) / 2
        scaled_src_landmarks = scaled_src_landmarks + scale_offset
        
        # Create affine transformation
        src_tri = np.float32([
            scaled_src_landmarks[0],
            scaled_src_landmarks[16],
            scaled_src_landmarks[33]
        ])
        
        dst_tri = np.float32([
            target_lm_local[0],
            target_lm_local[16],
            target_lm_local[33]
        ])
        
        # Get affine matrix
        affine_mat = cv2.getAffineTransform(src_tri, dst_tri)
        
        # Warp source face
        warped_src = cv2.warpAffine(resized_src, affine_mat, (target_w, target_h), 
                                     flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        
        # Create refined mask with morphological operations
        src_mask = create_refined_mask(target_lm_local, (target_h, target_w), blur_strength=251)
        
        # Get target region
        target_region = frame[ty1:ty2, tx1:tx2].copy()
        
        # Blend with VERY weak strength (0.35)
        mask_float = src_mask.astype(np.float32) / 255.0
        mask_float = mask_float * 0.35  # Very weak blending
        mask_3ch = cv2.merge([mask_float, mask_float, mask_float])
        
        blended = (warped_src.astype(np.float32) * mask_3ch + 
                  target_region.astype(np.float32) * (1 - mask_3ch)).astype(np.uint8)
        
        # Very subtle color correction
        mask_threshold = src_mask > 32
        if mask_threshold.sum() > 100:
            src_color_mean = warped_src[mask_threshold].mean(axis=0)
            tgt_color_mean = target_region[mask_threshold].mean(axis=0)
            
            if src_color_mean.sum() > 0:
                color_correction = tgt_color_mean / (src_color_mean + 1e-5)
                # Very subtle correction (0.5 blend)
                color_correction = color_correction * 0.5 + np.ones(3) * 0.5
                blended = np.clip(blended.astype(np.float32) * color_correction, 0, 255).astype(np.uint8)
        
        # Place back
        output = frame.copy()
        output[ty1:ty2, tx1:tx2] = blended
        
        return output
        
    except Exception as e:
        return None

def process_video_refined(source_image_path, video_path, output_video_path, fps=24):
    """Process entire video with refined masking"""
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
        padding = 60
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(source_img.shape[1], x2 + padding)
        y2 = min(source_img.shape[0], y2 + padding)
        
        source_face_rect = source_img[y1:y2, x1:x2].copy()
        source_landmarks_local = source_landmarks - np.array([x1, y1])
        
        # Create temp directory
        temp_dir = f"/tmp/faceswap_refined_{os.getpid()}"
        os.makedirs(temp_dir, exist_ok=True)
        
        # Extract frames
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"success": False, "error": "Failed to open video"}
        
        frame_count = 0
        processed_count = 0
        
        print(f"Processing video with refined masking...", file=sys.stderr)
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            frame_path = os.path.join(temp_dir, f"frame_{frame_count:04d}.png")
            
            # Detect faces
            frame_faces = app.get(frame)
            if len(frame_faces) > 0 and frame_faces[0].landmark_2d_106 is not None:
                output_frame = swap_face_refined(
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
            return {"success": False, "error": "No frames"}
        
        print(f"Reconstructing video...", file=sys.stderr)
        
        # Reconstruct
        frame_pattern = os.path.join(temp_dir, "frame_%04d.png")
        
        cmd = [
            'ffmpeg', '-y', '-framerate', str(fps),
            '-i', frame_pattern,
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
            '-crf', '18', output_video_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode != 0:
            return {"success": False, "error": f"FFmpeg error"}
        
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
        print(json.dumps({"success": False, "error": "Usage"}))
        sys.exit(1)
    
    result = process_video_refined(sys.argv[1], sys.argv[2], sys.argv[3])
    print(json.dumps(result))

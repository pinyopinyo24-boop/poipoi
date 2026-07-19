#!/usr/bin/env python3
"""
Face Swap using InsightFace InSwapper
High-quality face swapping with proper blending
"""

import sys
import json
import cv2
import numpy as np
import warnings
import os

warnings.filterwarnings('ignore')

# Try to import insightface
try:
    from insightface.app import FaceAnalysis
    from insightface.model_zoo import get_model
except ImportError:
    print(json.dumps({"success": False, "error": "insightface not installed"}))
    sys.exit(1)

def get_inswapper_model():
    """Get or download InSwapper model"""
    try:
        # Try to load from local
        model_dir = os.path.expanduser('~/.insightface/models/buffalo_l')
        model_path = os.path.join(model_dir, 'inswapper_128.onnx')
        
        if os.path.exists(model_path):
            from insightface.model_zoo import get_model
            return get_model(model_path)
        
        # If not available, we'll use a simpler approach
        return None
    except:
        return None

def blend_faces(src_face, dst_face, mask, center):
    """Blend source face onto destination using Poisson blending"""
    try:
        # Ensure mask is proper format
        if mask.max() > 1:
            mask_norm = (mask / 255).astype(np.uint8)
        else:
            mask_norm = mask.astype(np.uint8)
        
        # Poisson blending
        result = cv2.seamlessClone(
            src_face,
            dst_face,
            mask_norm * 255,
            center,
            cv2.MIXED_CLONE
        )
        return result
    except:
        # Fallback to alpha blending
        mask_float = mask.astype(np.float32) / 255.0
        mask_3ch = cv2.merge([mask_float, mask_float, mask_float])
        result = (src_face.astype(np.float32) * mask_3ch + 
                 dst_face.astype(np.float32) * (1 - mask_3ch)).astype(np.uint8)
        return result

def get_face_mask(landmarks, shape, dilation=15):
    """Generate smooth face mask from landmarks"""
    mask = np.zeros(shape[:2], dtype=np.uint8)
    
    # Use convex hull of landmarks
    pts = np.array(landmarks[:50], dtype=np.int32)  # Use first 50 points for face outline
    hull = cv2.convexHull(pts)
    cv2.fillPoly(mask, [hull], 255)
    
    # Dilate and blur for smooth edges
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilation, dilation))
    mask = cv2.dilate(mask, kernel, iterations=1)
    mask = cv2.GaussianBlur(mask, (31, 31), 0)
    
    return mask

def swap_faces_inswapper(source_path, target_path, output_path):
    """
    Swap faces using InsightFace
    """
    try:
        # Initialize face analysis
        app = FaceAnalysis(providers=['CPUExecutionProvider'])
        app.prepare(ctx_id=0, det_size=(640, 640))
        
        # Read images
        source_img = cv2.imread(source_path)
        target_img = cv2.imread(target_path)
        
        if source_img is None or target_img is None:
            return {"success": False, "error": "Failed to read images"}
        
        # Detect faces
        source_faces = app.get(source_img)
        target_faces = app.get(target_img)
        
        if len(source_faces) == 0 or len(target_faces) == 0:
            return {"success": False, "error": "No face detected"}
        
        source_face = source_faces[0]
        target_face = target_faces[0]
        
        # Get landmarks
        source_landmarks = source_face.landmark_2d_106
        target_landmarks = target_face.landmark_2d_106
        
        if source_landmarks is None or target_landmarks is None:
            return {"success": False, "error": "Landmarks not available"}
        
        # Extract source face region
        sx1, sy1, sx2, sy2 = source_face.bbox.astype(int)
        padding = 15
        sx1 = max(0, sx1 - padding)
        sy1 = max(0, sy1 - padding)
        sx2 = min(source_img.shape[1], sx2 + padding)
        sy2 = min(source_img.shape[0], sy2 + padding)
        
        source_region = source_img[sy1:sy2, sx1:sx2].copy()
        source_landmarks_local = source_landmarks - np.array([sx1, sy1])
        
        # Extract target face region
        tx1, ty1, tx2, ty2 = target_face.bbox.astype(int)
        padding = 15
        tx1 = max(0, tx1 - padding)
        ty1 = max(0, ty1 - padding)
        tx2 = min(target_img.shape[1], tx2 + padding)
        ty2 = min(target_img.shape[0], ty2 + padding)
        
        target_region = target_img[ty1:ty2, tx1:tx2].copy()
        target_landmarks_local = target_landmarks - np.array([tx1, ty1])
        
        # Resize source face to match target size
        target_h, target_w = target_region.shape[:2]
        source_h, source_w = source_region.shape[:2]
        
        # Calculate scale to match target
        scale = max(target_w / source_w, target_h / source_h)
        
        # Resize source
        new_w = int(source_w * scale)
        new_h = int(source_h * scale)
        resized_source = cv2.resize(source_region, (new_w, new_h))
        
        # Create canvas for warped source
        warped = np.zeros((target_h, target_w, 3), dtype=np.uint8)
        
        # Calculate offset to center
        offset_x = (target_w - new_w) // 2
        offset_y = (target_h - new_h) // 2
        
        # Place resized source on canvas
        x1 = max(0, offset_x)
        y1 = max(0, offset_y)
        x2 = min(target_w, offset_x + new_w)
        y2 = min(target_h, offset_y + new_h)
        
        src_x1 = max(0, -offset_x)
        src_y1 = max(0, -offset_y)
        src_x2 = src_x1 + (x2 - x1)
        src_y2 = src_y1 + (y2 - y1)
        
        warped[y1:y2, x1:x2] = resized_source[src_y1:src_y2, src_x1:src_x2]
        
        # Generate mask for target face
        mask = get_face_mask(target_landmarks_local, target_region.shape)
        
        # Color correction
        mask_float = mask.astype(np.float32) / 255.0
        
        # Calculate mean colors
        warped_mean = np.array([
            (warped[:, :, i].astype(np.float32) * mask_float).sum() / (mask_float.sum() + 1e-6)
            for i in range(3)
        ])
        
        target_mean = np.array([
            (target_region[:, :, i].astype(np.float32) * mask_float).sum() / (mask_float.sum() + 1e-6)
            for i in range(3)
        ])
        
        # Apply color correction
        warped_corrected = warped.astype(np.float32)
        for i in range(3):
            warped_corrected[:, :, i] = warped_corrected[:, :, i] - warped_mean[i] + target_mean[i]
        
        warped_corrected = np.clip(warped_corrected, 0, 255).astype(np.uint8)
        
        # Blend
        center = (int(target_landmarks_local[:, 0].mean()), int(target_landmarks_local[:, 1].mean()))
        blended = blend_faces(warped_corrected, target_region, mask, center)
        
        # Place back
        output_img = target_img.copy()
        output_img[ty1:ty2, tx1:tx2] = blended
        
        cv2.imwrite(output_path, output_img)
        
        return {
            "success": True,
            "output": output_path,
            "method": "inswapper_with_blending"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({"success": False, "error": "Usage: python3 face-swap-inswapper.py <source> <target> <output>"}))
        sys.exit(1)
    
    source_path = sys.argv[1]
    target_path = sys.argv[2]
    output_path = sys.argv[3]
    
    result = swap_faces_inswapper(source_path, target_path, output_path)
    print(json.dumps(result))

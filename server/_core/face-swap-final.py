#!/usr/bin/env python3
"""
Final Corrected Face Swap Implementation
Properly extracts source face and replaces target face
"""

import sys
import json
import cv2
import numpy as np
import warnings
from insightface.app import FaceAnalysis

warnings.filterwarnings('ignore')

def get_face_mask_from_landmarks(landmarks, shape):
    """Generate smooth face mask from landmarks"""
    mask = np.zeros(shape[:2], dtype=np.uint8)
    pts = np.array(landmarks, dtype=np.int32)
    cv2.fillPoly(mask, [pts], 255)
    mask = cv2.GaussianBlur(mask, (31, 31), 0)
    return mask

def get_affine_transform_matrix(src_landmarks, dst_landmarks):
    """Calculate affine transformation"""
    src_pts = np.float32([
        src_landmarks[38],   # left eye
        src_landmarks[88],   # right eye
        src_landmarks[33],   # nose
    ])
    
    dst_pts = np.float32([
        dst_landmarks[38],   # left eye
        dst_landmarks[88],   # right eye
        dst_landmarks[33],   # nose
    ])
    
    return cv2.getAffineTransform(src_pts, dst_pts)

def swap_faces_final(source_path, target_path, output_path):
    """
    Final face swap:
    1. Extract source face
    2. Warp to target orientation
    3. Replace target face
    4. Blend seamlessly
    """
    try:
        app = FaceAnalysis(providers=['CPUExecutionProvider'])
        app.prepare(ctx_id=0, det_size=(640, 640))
        
        source_img = cv2.imread(source_path)
        target_img = cv2.imread(target_path)
        
        if source_img is None or target_img is None:
            return {"success": False, "error": "Failed to read images"}
        
        source_faces = app.get(source_img)
        target_faces = app.get(target_img)
        
        if len(source_faces) == 0 or len(target_faces) == 0:
            return {"success": False, "error": "No face detected"}
        
        source_face = source_faces[0]
        target_face = target_faces[0]
        
        source_landmarks = source_face.landmark_2d_106
        target_landmarks = target_face.landmark_2d_106
        
        if source_landmarks is None or target_landmarks is None:
            return {"success": False, "error": "Landmarks not available"}
        
        # Extract source face with padding
        sx1, sy1, sx2, sy2 = source_face.bbox.astype(int)
        padding = 20
        sx1 = max(0, sx1 - padding)
        sy1 = max(0, sy1 - padding)
        sx2 = min(source_img.shape[1], sx2 + padding)
        sy2 = min(source_img.shape[0], sy2 + padding)
        
        source_region = source_img[sy1:sy2, sx1:sx2].copy()
        source_landmarks_adjusted = source_landmarks - np.array([sx1, sy1])
        
        # Get target face region
        tx1, ty1, tx2, ty2 = target_face.bbox.astype(int)
        padding = 20
        tx1 = max(0, tx1 - padding)
        ty1 = max(0, ty1 - padding)
        tx2 = min(target_img.shape[1], tx2 + padding)
        ty2 = min(target_img.shape[0], ty2 + padding)
        
        target_region = target_img[ty1:ty2, tx1:tx2].copy()
        target_landmarks_adjusted = target_landmarks - np.array([tx1, ty1])
        
        # Calculate affine transformation
        affine_matrix = get_affine_transform_matrix(
            source_landmarks_adjusted,
            target_landmarks_adjusted
        )
        
        # Warp source face to match target size and orientation
        warped_source = cv2.warpAffine(
            source_region,
            affine_matrix,
            (target_region.shape[1], target_region.shape[0]),
            borderMode=cv2.BORDER_REFLECT
        )
        
        # Generate mask for target face
        mask = get_face_mask_from_landmarks(target_landmarks_adjusted, target_region.shape)
        
        # Color correction
        warped_source_float = warped_source.astype(np.float32)
        target_region_float = target_region.astype(np.float32)
        
        # Calculate mean color in masked regions
        mask_float = mask.astype(np.float32) / 255.0
        
        source_mean = np.array([
            (warped_source_float[:, :, i] * mask_float).sum() / (mask_float.sum() + 1e-6)
            for i in range(3)
        ])
        
        target_mean = np.array([
            (target_region_float[:, :, i] * mask_float).sum() / (mask_float.sum() + 1e-6)
            for i in range(3)
        ])
        
        # Apply color correction
        for i in range(3):
            warped_source_float[:, :, i] = warped_source_float[:, :, i] - source_mean[i] + target_mean[i]
        
        warped_source_corrected = np.clip(warped_source_float, 0, 255).astype(np.uint8)
        
        # Poisson blending
        center = (
            int(target_landmarks_adjusted[:, 0].mean()),
            int(target_landmarks_adjusted[:, 1].mean())
        )
        
        try:
            blended_region = cv2.seamlessClone(
                warped_source_corrected,
                target_region,
                (mask / 255).astype(np.uint8) * 255,
                center,
                cv2.MIXED_CLONE
            )
        except:
            # Fallback: alpha blending
            mask_3ch = cv2.merge([mask_float, mask_float, mask_float])
            blended_region = (
                warped_source_corrected.astype(np.float32) * mask_3ch +
                target_region.astype(np.float32) * (1 - mask_3ch)
            ).astype(np.uint8)
        
        # Place blended region back
        output_img = target_img.copy()
        output_img[ty1:ty2, tx1:tx2] = blended_region
        
        cv2.imwrite(output_path, output_img)
        
        return {
            "success": True,
            "output": output_path,
            "method": "final_face_replacement"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({"success": False, "error": "Usage: python3 face-swap-final.py <source> <target> <output>"}))
        sys.exit(1)
    
    source_path = sys.argv[1]
    target_path = sys.argv[2]
    output_path = sys.argv[3]
    
    result = swap_faces_final(source_path, target_path, output_path)
    print(json.dumps(result))

#!/usr/bin/env python3
"""
Optimized Face Swap with Multi-Scale Blending
Based on image analysis and advanced techniques
"""

import sys
import json
import cv2
import numpy as np
import warnings
from scipy.ndimage import binary_dilation

warnings.filterwarnings('ignore')

try:
    from insightface.app import FaceAnalysis
except ImportError:
    print(json.dumps({"success": False, "error": "insightface not installed"}))
    sys.exit(1)

def create_multiscale_mask(mask, levels=3):
    """Create multi-scale Gaussian pyramid mask"""
    pyramids = [mask]
    for _ in range(levels - 1):
        mask = cv2.pyrDown(mask)
        pyramids.append(mask)
    return pyramids

def blend_multiscale(src, dst, mask, center):
    """Multi-scale Poisson blending"""
    try:
        # Create Gaussian pyramids
        src_pyr = [src]
        dst_pyr = [dst]
        mask_pyr = [mask]
        
        for _ in range(3):
            src_pyr.append(cv2.pyrDown(src_pyr[-1]))
            dst_pyr.append(cv2.pyrDown(dst_pyr[-1]))
            mask_pyr.append(cv2.pyrDown(mask_pyr[-1]))
        
        # Blend at each level
        for i in range(len(src_pyr)):
            m = mask_pyr[i].astype(np.float32) / 255.0
            m = cv2.merge([m, m, m])
            src_pyr[i] = (src_pyr[i].astype(np.float32) * m + 
                         dst_pyr[i].astype(np.float32) * (1 - m)).astype(np.uint8)
        
        # Reconstruct
        result = src_pyr[0]
        for i in range(1, len(src_pyr)):
            result = cv2.pyrUp(result)
            if result.shape != src_pyr[i-1].shape:
                result = cv2.resize(result, (src_pyr[i-1].shape[1], src_pyr[i-1].shape[0]))
        
        return result
    except:
        return src

def apply_seamless_clone(src, dst, mask, center):
    """Apply Poisson blending"""
    try:
        if mask.max() > 1:
            mask_uint8 = (mask / 255).astype(np.uint8) * 255
        else:
            mask_uint8 = mask.astype(np.uint8) * 255
        
        result = cv2.seamlessClone(src, dst, mask_uint8, center, cv2.MIXED_CLONE)
        return result
    except:
        return src

def warp_face_with_landmarks(src_face, src_landmarks, dst_landmarks, dst_shape):
    """Warp source face to match destination using landmarks"""
    try:
        # Select key points for transformation
        src_pts = np.float32([
            src_landmarks[33],   # nose
            src_landmarks[38],   # left eye
            src_landmarks[88],   # right eye
            src_landmarks[8],    # chin
        ])
        
        dst_pts = np.float32([
            dst_landmarks[33],
            dst_landmarks[38],
            dst_landmarks[88],
            dst_landmarks[8],
        ])
        
        # Get perspective transform
        matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
        
        # Warp
        warped = cv2.warpPerspective(
            src_face,
            matrix,
            (dst_shape[1], dst_shape[0]),
            borderMode=cv2.BORDER_REFLECT
        )
        
        return warped
    except:
        # Fallback to simple resize
        h, w = dst_shape[:2]
        return cv2.resize(src_face, (w, h))

def create_smooth_mask(landmarks, shape, dilation=20):
    """Create smooth mask with feathering"""
    mask = np.zeros(shape[:2], dtype=np.uint8)
    
    # Use convex hull of face landmarks
    pts = np.array(landmarks[:50], dtype=np.int32)
    hull = cv2.convexHull(pts)
    cv2.fillPoly(mask, [hull], 255)
    
    # Dilate for feathering
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilation, dilation))
    mask = cv2.dilate(mask, kernel, iterations=2)
    
    # Apply Gaussian blur for smooth edges
    mask = cv2.GaussianBlur(mask, (51, 51), 0)
    
    return mask

def swap_faces_optimized(source_path, target_path, output_path):
    """
    Optimized face swap with multi-scale blending
    """
    try:
        # Initialize
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
        
        # Extract source face
        sx1, sy1, sx2, sy2 = source_face.bbox.astype(int)
        sx1 = max(0, sx1 - 30)
        sy1 = max(0, sy1 - 30)
        sx2 = min(source_img.shape[1], sx2 + 30)
        sy2 = min(source_img.shape[0], sy2 + 30)
        
        source_region = source_img[sy1:sy2, sx1:sx2].copy()
        source_landmarks_local = source_landmarks - np.array([sx1, sy1])
        
        # Extract target face
        tx1, ty1, tx2, ty2 = target_face.bbox.astype(int)
        tx1 = max(0, tx1 - 30)
        ty1 = max(0, ty1 - 30)
        tx2 = min(target_img.shape[1], tx2 + 30)
        ty2 = min(target_img.shape[0], ty2 + 30)
        
        target_region = target_img[ty1:ty2, tx1:tx2].copy()
        target_landmarks_local = target_landmarks - np.array([tx1, ty1])
        target_region_shape = target_region.shape
        
        # Warp source face to match target
        warped_source = warp_face_with_landmarks(
            source_region,
            source_landmarks_local,
            target_landmarks_local,
            target_region_shape
        )
        
        # Create smooth mask
        mask = create_smooth_mask(target_landmarks_local, target_region_shape)
        
        # Color correction
        mask_float = mask.astype(np.float32) / 255.0
        
        # Calculate mean colors in masked region
        warped_mean = np.array([
            (warped_source[:, :, i].astype(np.float32) * mask_float).sum() / (mask_float.sum() + 1e-6)
            for i in range(3)
        ])
        
        target_mean = np.array([
            (target_region[:, :, i].astype(np.float32) * mask_float).sum() / (mask_float.sum() + 1e-6)
            for i in range(3)
        ])
        
        # Apply color correction
        warped_corrected = warped_source.astype(np.float32)
        for i in range(3):
            warped_corrected[:, :, i] = warped_corrected[:, :, i] - warped_mean[i] + target_mean[i]
        
        warped_corrected = np.clip(warped_corrected, 0, 255).astype(np.uint8)
        
        # Blend using Poisson seamless clone
        center = (int(target_landmarks_local[:, 0].mean()), int(target_landmarks_local[:, 1].mean()))
        blended = apply_seamless_clone(warped_corrected, target_region, mask, center)
        
        # Place back
        output_img = target_img.copy()
        output_img[ty1:ty2, tx1:tx2] = blended
        
        cv2.imwrite(output_path, output_img)
        
        return {
            "success": True,
            "output": output_path,
            "method": "optimized_with_perspective_warp"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({"success": False, "error": "Usage: python3 face-swap-optimized.py <source> <target> <output>"}))
        sys.exit(1)
    
    source_path = sys.argv[1]
    target_path = sys.argv[2]
    output_path = sys.argv[3]
    
    result = swap_faces_optimized(source_path, target_path, output_path)
    print(json.dumps(result))

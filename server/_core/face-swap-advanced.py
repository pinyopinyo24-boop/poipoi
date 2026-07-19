#!/usr/bin/env python3
"""
Advanced Face Swap with Proper Alignment and Blending
"""

import sys
import json
import cv2
import numpy as np
import warnings
from insightface.app import FaceAnalysis

warnings.filterwarnings('ignore')

def get_face_mask(landmarks, shape, dilation=0):
    """Generate face mask from landmarks"""
    mask = np.zeros(shape[:2], dtype=np.uint8)
    
    # Use landmarks to create mask
    pts = np.array(landmarks, dtype=np.int32)
    cv2.fillPoly(mask, [pts], 255)
    
    # Dilate mask for smoother edges
    if dilation > 0:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilation, dilation))
        mask = cv2.dilate(mask, kernel, iterations=1)
    
    return mask

def affine_align_face(source_img, source_landmarks, target_landmarks):
    """Align source face to target using affine transformation"""
    # Use first 3 landmarks for affine transformation
    # Points: left eye, right eye, nose
    src_pts = np.float32([
        source_landmarks[38],  # left eye
        source_landmarks[88],  # right eye
        source_landmarks[33],  # nose
    ])
    
    dst_pts = np.float32([
        target_landmarks[38],  # left eye
        target_landmarks[88],  # right eye
        target_landmarks[33],  # nose
    ])
    
    # Get affine transformation matrix
    affine_matrix = cv2.getAffineTransform(src_pts, dst_pts)
    
    # Apply transformation
    aligned = cv2.warpAffine(
        source_img,
        affine_matrix,
        (source_img.shape[1], source_img.shape[0]),
        borderMode=cv2.BORDER_REFLECT
    )
    
    return aligned, affine_matrix

def color_correct_face(source_face, target_face, mask):
    """Correct color of source face to match target"""
    # Calculate average color in masked regions
    source_mean = cv2.mean(source_face, mask=mask)[:3]
    target_mean = cv2.mean(target_face, mask=mask)[:3]
    
    # Calculate color shift
    color_shift = np.array(target_mean) - np.array(source_mean)
    
    # Apply color correction
    corrected = source_face.astype(np.float32)
    for i in range(3):
        corrected[:, :, i] += color_shift[i]
    
    corrected = np.clip(corrected, 0, 255).astype(np.uint8)
    return corrected

def poisson_blend(source, target, mask, center):
    """Poisson blending for seamless integration"""
    try:
        # Ensure mask is 8-bit
        mask_8bit = (mask / 255).astype(np.uint8) if mask.max() > 1 else mask.astype(np.uint8)
        
        # Apply Poisson blending
        output = cv2.seamlessClone(
            source,
            target,
            mask_8bit * 255,
            center,
            cv2.MIXED_CLONE
        )
        return output
    except Exception as e:
        print(f"Poisson blend failed: {e}, using alpha blend", file=sys.stderr)
        # Fallback to alpha blending
        mask_float = mask.astype(np.float32) / 255.0
        mask_3ch = np.dstack([mask_float] * 3)
        output = (source * mask_3ch + target * (1 - mask_3ch)).astype(np.uint8)
        return output

def swap_faces_advanced(source_path, target_path, output_path):
    """Advanced face swap with alignment and blending"""
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
        
        # Extract face regions with padding
        sx1, sy1, sx2, sy2 = source_face.bbox.astype(int)
        tx1, ty1, tx2, ty2 = target_face.bbox.astype(int)
        
        # Add padding
        padding = 20
        sx1 = max(0, sx1 - padding)
        sy1 = max(0, sy1 - padding)
        sx2 = min(source_img.shape[1], sx2 + padding)
        sy2 = min(source_img.shape[0], sy2 + padding)
        
        tx1 = max(0, tx1 - padding)
        ty1 = max(0, ty1 - padding)
        tx2 = min(target_img.shape[1], tx2 + padding)
        ty2 = min(target_img.shape[0], ty2 + padding)
        
        source_region = source_img[sy1:sy2, sx1:sx2].copy()
        target_region = target_img[ty1:ty2, tx1:tx2].copy()
        
        # Adjust landmarks to region coordinates
        source_landmarks_adjusted = source_landmarks - np.array([sx1, sy1])
        target_landmarks_adjusted = target_landmarks - np.array([tx1, ty1])
        
        # Align source face to target
        aligned_source, _ = affine_align_face(
            source_region,
            source_landmarks_adjusted,
            target_landmarks_adjusted
        )
        
        # Resize aligned source to match target region size
        aligned_source = cv2.resize(
            aligned_source,
            (target_region.shape[1], target_region.shape[0])
        )
        
        # Generate mask from target landmarks
        mask = get_face_mask(target_landmarks_adjusted, target_region.shape, dilation=5)
        
        # Apply Gaussian blur to mask edges
        mask = cv2.GaussianBlur(mask, (21, 21), 0)
        
        # Color correction
        aligned_source = color_correct_face(aligned_source, target_region, mask)
        
        # Calculate center for Poisson blending
        center = (
            int(target_landmarks_adjusted[:, 0].mean()),
            int(target_landmarks_adjusted[:, 1].mean())
        )
        
        # Blend faces
        blended_region = poisson_blend(aligned_source, target_region, mask, center)
        
        # Place blended region back into target image
        output_img = target_img.copy()
        output_img[ty1:ty2, tx1:tx2] = blended_region
        
        # Save output
        cv2.imwrite(output_path, output_img)
        
        return {
            "success": True,
            "output": output_path,
            "source_faces": len(source_faces),
            "target_faces": len(target_faces),
            "method": "advanced_alignment_and_blending"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({"success": False, "error": "Usage: python3 face-swap-advanced.py <source> <target> <output>"}))
        sys.exit(1)
    
    source_path = sys.argv[1]
    target_path = sys.argv[2]
    output_path = sys.argv[3]
    
    result = swap_faces_advanced(source_path, target_path, output_path)
    print(json.dumps(result))

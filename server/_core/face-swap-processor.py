#!/usr/bin/env python3
"""
Face swap processor using insightface
Swaps face from source image to target image
"""

import sys
import json
import cv2
import numpy as np
import warnings
from pathlib import Path

warnings.filterwarnings('ignore')

def swap_faces(source_path, target_path, output_path):
    """
    Swap face from source image to target image
    """
    try:
        from insightface.app import FaceAnalysis
        
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
        
        if len(source_faces) == 0:
            return {"success": False, "error": "No face detected in source image"}
        
        if len(target_faces) == 0:
            return {"success": False, "error": "No face detected in target image"}
        
        # Get first face from each
        source_face = source_faces[0]
        target_face = target_faces[0]
        
        # Get face embeddings
        source_embedding = source_face.embedding
        
        # Use insightface's built-in face swap if available
        # Otherwise, use a simple approach with face landmarks
        
        # Get landmarks for alignment
        source_landmarks = source_face.landmark_2d_106 if hasattr(source_face, 'landmark_2d_106') else None
        target_landmarks = target_face.landmark_2d_106 if hasattr(target_face, 'landmark_2d_106') else None
        
        if source_landmarks is None or target_landmarks is None:
            return {"success": False, "error": "Failed to extract landmarks"}
        
        # Simple face swap: extract source face region and blend onto target
        source_bbox = source_face.bbox.astype(int)
        target_bbox = target_face.bbox.astype(int)
        
        # Extract source face region
        x1, y1, x2, y2 = source_bbox
        x1, y1, x2, y2 = max(0, x1), max(0, y1), min(source_img.shape[1], x2), min(source_img.shape[0], y2)
        source_face_region = source_img[y1:y2, x1:x2].copy()
        
        # Resize to target face size
        target_x1, target_y1, target_x2, target_y2 = target_bbox
        target_x1, target_y1, target_x2, target_y2 = max(0, target_x1), max(0, target_y1), min(target_img.shape[1], target_x2), min(target_img.shape[0], target_y2)
        
        target_face_h = target_y2 - target_y1
        target_face_w = target_x2 - target_x1
        
        if target_face_h <= 0 or target_face_w <= 0:
            return {"success": False, "error": "Invalid target face region"}
        
        # Resize source face to target size
        resized_source_face = cv2.resize(source_face_region, (target_face_w, target_face_h))
        
        # Create mask for blending
        mask = np.ones((target_face_h, target_face_w), dtype=np.float32)
        
        # Apply Gaussian blur to mask edges for smooth blending
        mask = cv2.GaussianBlur(mask, (21, 21), 0)
        
        # Blend faces
        output_img = target_img.copy()
        
        # Simple alpha blending
        alpha = 0.7
        for c in range(3):
            output_img[target_y1:target_y2, target_x1:target_x2, c] = (
                alpha * resized_source_face[:, :, c] +
                (1 - alpha) * output_img[target_y1:target_y2, target_x1:target_x2, c]
            )
        
        # Save output
        cv2.imwrite(output_path, output_img)
        
        return {
            "success": True,
            "output": output_path,
            "source_faces": len(source_faces),
            "target_faces": len(target_faces),
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({"success": False, "error": "Usage: python3 face-swap-processor.py <source> <target> <output>"}))
        sys.exit(1)
    
    source_path = sys.argv[1]
    target_path = sys.argv[2]
    output_path = sys.argv[3]
    
    result = swap_faces(source_path, target_path, output_path)
    print(json.dumps(result))

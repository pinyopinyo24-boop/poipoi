#!/usr/bin/env python3
"""
Face Extraction and Auto-Placement with Expression Matching
1. Extract source face (rectangular region)
2. Auto-place on target frames
3. Match expressions using landmark warping
"""

import sys
import json
import cv2
import numpy as np
import warnings

warnings.filterwarnings('ignore')

try:
    from insightface.app import FaceAnalysis
except ImportError:
    print(json.dumps({"success": False, "error": "insightface not installed"}))
    sys.exit(1)

def extract_face_rect(image_path):
    """Extract rectangular face region from image"""
    try:
        app = FaceAnalysis(providers=['CPUExecutionProvider'])
        app.prepare(ctx_id=0, det_size=(640, 640))
        
        img = cv2.imread(image_path)
        if img is None:
            return {"success": False, "error": "Failed to read image"}
        
        faces = app.get(img)
        if len(faces) == 0:
            return {"success": False, "error": "No face detected"}
        
        face = faces[0]
        landmarks = face.landmark_2d_106
        
        if landmarks is None:
            return {"success": False, "error": "Landmarks not available"}
        
        # Get bounding box with padding
        x1, y1, x2, y2 = face.bbox.astype(int)
        padding = 40
        x1 = max(0, x1 - padding)
        y1 = max(0, y1 - padding)
        x2 = min(img.shape[1], x2 + padding)
        y2 = min(img.shape[0], y2 + padding)
        
        face_rect = img[y1:y2, x1:x2].copy()
        landmarks_local = landmarks - np.array([x1, y1])
        
        return {
            "success": True,
            "face_rect": face_rect,
            "landmarks": landmarks_local.tolist(),
            "bbox": [x1, y1, x2, y2],
            "shape": face_rect.shape
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

def warp_face_to_target(face_rect, source_landmarks, target_landmarks, target_shape):
    """Warp face rectangle to match target expression"""
    try:
        source_landmarks = np.array(source_landmarks, dtype=np.float32)
        target_landmarks = np.array(target_landmarks, dtype=np.float32)
        
        # Use TPS (Thin Plate Spline) or affine transformation
        # For simplicity, use affine with multiple point pairs
        
        # Select key points for transformation
        src_pts = np.float32([
            source_landmarks[33],   # nose
            source_landmarks[38],   # left eye
            source_landmarks[88],   # right eye
        ])
        
        dst_pts = np.float32([
            target_landmarks[33],
            target_landmarks[38],
            target_landmarks[88],
        ])
        
        # Get affine transformation
        matrix = cv2.getAffineTransform(src_pts, dst_pts)
        
        # Warp face
        warped = cv2.warpAffine(
            face_rect,
            matrix,
            (target_shape[1], target_shape[0]),
            borderMode=cv2.BORDER_REFLECT
        )
        
        return warped
        
    except Exception as e:
        # Fallback: just resize
        h, w = target_shape[:2]
        return cv2.resize(face_rect, (w, h))

def place_face_on_frame(frame, face_rect, target_landmarks, face_landmarks):
    """Place extracted face on frame with expression matching"""
    try:
        app = FaceAnalysis(providers=['CPUExecutionProvider'])
        app.prepare(ctx_id=0, det_size=(640, 640))
        
        # Detect faces in frame
        frame_faces = app.get(frame)
        if len(frame_faces) == 0:
            return {"success": False, "error": "No face in frame"}
        
        target_face = frame_faces[0]
        target_face_landmarks = target_face.landmark_2d_106
        
        if target_face_landmarks is None:
            return {"success": False, "error": "Target landmarks not available"}
        
        # Get target face region
        tx1, ty1, tx2, ty2 = target_face.bbox.astype(int)
        padding = 40
        tx1 = max(0, tx1 - padding)
        ty1 = max(0, ty1 - padding)
        tx2 = min(frame.shape[1], tx2 + padding)
        ty2 = min(frame.shape[0], ty2 + padding)
        
        target_region_shape = (ty2 - ty1, tx2 - tx1)
        target_landmarks_local = target_face_landmarks - np.array([tx1, ty1])
        
        # Warp source face to match target expression
        warped_face = warp_face_to_target(
            face_rect,
            face_landmarks,
            target_landmarks_local,
            target_region_shape
        )
        
        # Create mask for blending
        mask = np.zeros(target_region_shape[:2], dtype=np.uint8)
        pts = np.array(target_landmarks_local[:50], dtype=np.int32)
        hull = cv2.convexHull(pts)
        cv2.fillPoly(mask, [hull], 255)
        
        # Dilate and blur mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (30, 30))
        mask = cv2.dilate(mask, kernel, iterations=1)
        mask = cv2.GaussianBlur(mask, (51, 51), 0)
        
        # Blend
        target_region = frame[ty1:ty2, tx1:tx2].copy()
        mask_float = mask.astype(np.float32) / 255.0
        mask_3ch = cv2.merge([mask_float, mask_float, mask_float])
        
        blended = (warped_face.astype(np.float32) * mask_3ch + 
                  target_region.astype(np.float32) * (1 - mask_3ch)).astype(np.uint8)
        
        # Place back
        output = frame.copy()
        output[ty1:ty2, tx1:tx2] = blended
        
        return {
            "success": True,
            "output": output,
            "target_bbox": [tx1, ty1, tx2, ty2]
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: python3 face-extract-place.py <command> [args...]"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "extract":
        if len(sys.argv) != 3:
            print(json.dumps({"success": False, "error": "Usage: extract <image_path>"}))
            sys.exit(1)
        
        result = extract_face_rect(sys.argv[2])
        if result["success"]:
            # Don't include numpy arrays in JSON
            result["face_rect"] = None  # Will be handled separately
        print(json.dumps(result, default=str))
        
    elif command == "place":
        if len(sys.argv) != 5:
            print(json.dumps({"success": False, "error": "Usage: place <face_rect_path> <frame_path> <output_path>"}))
            sys.exit(1)
        
        face_rect_path = sys.argv[2]
        frame_path = sys.argv[3]
        output_path = sys.argv[4]
        
        # Load face rect
        face_rect = cv2.imread(face_rect_path)
        if face_rect is None:
            print(json.dumps({"success": False, "error": "Failed to load face rect"}))
            sys.exit(1)
        
        # Load frame
        frame = cv2.imread(frame_path)
        if frame is None:
            print(json.dumps({"success": False, "error": "Failed to load frame"}))
            sys.exit(1)
        
        # For now, use dummy landmarks (will be extracted from source)
        # In real usage, landmarks should be passed
        app = FaceAnalysis(providers=['CPUExecutionProvider'])
        app.prepare(ctx_id=0, det_size=(640, 640))
        
        face_landmarks = np.array([[face_rect.shape[1]//2, face_rect.shape[0]//2]] * 106)
        
        result = place_face_on_frame(frame, face_rect, None, face_landmarks.tolist())
        
        if result["success"]:
            cv2.imwrite(output_path, result["output"])
            result["output"] = None
        
        print(json.dumps(result, default=str))

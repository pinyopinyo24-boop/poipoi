#!/usr/bin/env python3
"""
Test face detection directly
"""
import sys
import json
import cv2
from pathlib import Path

# Test with the actual source image
image_path = "/home/ubuntu/upload/1000019336.jpg"

print(f"Testing face detection on: {image_path}")
print(f"File exists: {Path(image_path).exists()}")

# Import insightface
from insightface.app import FaceAnalysis

# Initialize
app = FaceAnalysis(providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

# Read image
img = cv2.imread(image_path)
print(f"Image shape: {img.shape if img is not None else 'None'}")

# Detect faces
faces = app.get(img)
print(f"Number of faces detected: {len(faces)}")

for i, face in enumerate(faces):
    print(f"\nFace {i}:")
    print(f"  Bbox: {face.bbox}")
    print(f"  Confidence: {face.det_score if hasattr(face, 'det_score') else 'N/A'}")
    print(f"  Landmarks shape: {face.landmark_2d_68.shape if hasattr(face, 'landmark_2d_68') else 'N/A'}")

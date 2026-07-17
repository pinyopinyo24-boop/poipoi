#!/usr/bin/env python3
"""
Face detection using insightface
Outputs JSON with face bounding boxes and landmarks
"""

import sys
import json
import cv2
import numpy as np
from pathlib import Path
import warnings

# Suppress all warnings
warnings.filterwarnings('ignore')

def detect_faces(image_path):
    """Detect faces using insightface"""
    try:
        # Redirect stdout to suppress insightface messages
        import io
        import contextlib
        
        # Import insightface
        from insightface.app import FaceAnalysis
        
        # Initialize face analysis with output suppressed
        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            app = FaceAnalysis(providers=['CPUExecutionProvider'])
            app.prepare(ctx_id=0, det_size=(640, 640))
        
        # Read image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Failed to read image: {image_path}")
        
        # Detect faces
        faces = app.get(img)
        
        # Format output
        detections = []
        for face in faces:
            # Get bounding box
            bbox = face.bbox.astype(int).tolist()
            
            # Get landmarks - try different sources
            landmarks = None
            if hasattr(face, 'landmark_2d_106') and face.landmark_2d_106 is not None:
                landmarks = face.landmark_2d_106.tolist()[:68]
            elif hasattr(face, 'landmark_2d_68') and face.landmark_2d_68 is not None:
                landmarks = face.landmark_2d_68.tolist()
            elif hasattr(face, 'landmark_3d_68') and face.landmark_3d_68 is not None:
                landmarks = face.landmark_3d_68[:, :2].tolist()
            else:
                landmarks = []
            
            # Get confidence
            confidence = float(face.det_score) if hasattr(face, 'det_score') else 0.9
            
            detections.append({
                'bbox': [bbox[0], bbox[1], bbox[2], bbox[3]],
                'landmarks': landmarks,
                'confidence': confidence
            })
        
        # Output as JSON
        print(json.dumps(detections))
        
    except ImportError:
        print(json.dumps([]), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python insightface-detect.py <image_path>", file=sys.stderr)
        sys.exit(1)
    
    image_path = sys.argv[1]
    detect_faces(image_path)

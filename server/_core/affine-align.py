#!/usr/bin/env python3
"""
Affine transformation for face alignment
Aligns source face landmarks to target face landmarks
"""

import sys
import json
import cv2
import numpy as np
import base64
from io import BytesIO

def align_faces(source_landmarks, target_landmarks):
    """Align source face to target using affine transformation"""
    try:
        # Convert landmarks to numpy arrays
        source_pts = np.array(source_landmarks, dtype=np.float32)
        target_pts = np.array(target_landmarks, dtype=np.float32)
        
        # Calculate affine transformation matrix
        # Use first 3 points for affine transformation
        if len(source_pts) >= 3 and len(target_pts) >= 3:
            M = cv2.getAffineTransform(
                source_pts[:3],
                target_pts[:3]
            )
        else:
            # Fallback: use all points with least squares
            M = cv2.estimateAffinePartial2D(source_pts, target_pts)[0]
        
        if M is None:
            raise ValueError("Failed to compute affine transformation")
        
        # Return transformation matrix as JSON
        result = {
            'matrix': M.tolist(),
            'success': True
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    try:
        # Read JSON from stdin
        data = json.load(sys.stdin)
        source_landmarks = data.get('source_landmarks', [])
        target_landmarks = data.get('target_landmarks', [])
        
        align_faces(source_landmarks, target_landmarks)
        
    except json.JSONDecodeError as e:
        print(json.dumps({'success': False, 'error': f"JSON decode error: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}), file=sys.stderr)
        sys.exit(1)

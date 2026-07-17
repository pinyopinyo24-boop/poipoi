#!/usr/bin/env python3
"""
Generate mask from facial landmarks
Creates a binary mask with feathered edges for smooth blending
"""

import sys
import json
import numpy as np
import cv2
import base64

def generate_mask(landmarks, width, height, offsetX, offsetY):
    """Generate mask from landmarks"""
    try:
        # Create blank image
        mask = np.zeros((height, width), dtype=np.uint8)
        
        # Adjust landmarks to local coordinates
        adjusted_landmarks = np.array([
            [x - offsetX, y - offsetY] for x, y in landmarks
        ], dtype=np.int32)
        
        # Draw filled polygon
        cv2.fillPoly(mask, [adjusted_landmarks], 255)
        
        # Feather edges using Gaussian blur
        feathered = cv2.GaussianBlur(mask, (21, 21), 0)
        
        # Encode to base64
        success, encoded = cv2.imencode('.png', feathered)
        if not success:
            raise ValueError("Failed to encode mask")
        
        result_base64 = base64.b64encode(encoded.tobytes()).decode('utf-8')
        print(result_base64)
        
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    try:
        # Read JSON from stdin
        data = json.load(sys.stdin)
        landmarks = data.get('landmarks', [])
        width = data.get('width', 256)
        height = data.get('height', 256)
        offsetX = data.get('offsetX', 0)
        offsetY = data.get('offsetY', 0)
        
        generate_mask(landmarks, width, height, offsetX, offsetY)
        
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f"JSON decode error: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

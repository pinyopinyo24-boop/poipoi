#!/usr/bin/env python3
"""
Poisson blending for seamless face integration
Uses OpenCV's seamlessClone for high-quality blending
"""

import sys
import json
import cv2
import numpy as np
import base64
from io import BytesIO

def poisson_blend(target_base64, source_base64, mask_base64, bbox):
    """Perform Poisson blending"""
    try:
        # Decode base64 images
        target_data = base64.b64decode(target_base64)
        source_data = base64.b64decode(source_base64)
        mask_data = base64.b64decode(mask_base64)
        
        # Convert to numpy arrays
        target_array = np.frombuffer(target_data, dtype=np.uint8)
        source_array = np.frombuffer(source_data, dtype=np.uint8)
        mask_array = np.frombuffer(mask_data, dtype=np.uint8)
        
        # Decode images
        target = cv2.imdecode(target_array, cv2.IMREAD_COLOR)
        source = cv2.imdecode(source_array, cv2.IMREAD_COLOR)
        mask = cv2.imdecode(mask_array, cv2.IMREAD_GRAYSCALE)
        
        if target is None or source is None or mask is None:
            raise ValueError("Failed to decode images")
        
        # Get bounding box
        x1, y1, x2, y2 = bbox
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        
        # Resize source to match target region
        width = x2 - x1
        height = y2 - y1
        source_resized = cv2.resize(source, (width, height))
        
        # Create mask for the region
        blend_mask = np.zeros((target.shape[0], target.shape[1]), dtype=np.uint8)
        blend_mask[y1:y2, x1:x2] = 255
        
        # Calculate center point for seamlessClone
        center_x = x1 + width // 2
        center_y = y1 + height // 2
        center = (center_x, center_y)
        
        # Perform Poisson blending
        result = cv2.seamlessClone(
            source_resized,
            target,
            blend_mask[y1:y2, x1:x2],
            center,
            cv2.NORMAL_CLONE
        )
        
        # Encode result to base64
        success, encoded = cv2.imencode('.png', result)
        if not success:
            raise ValueError("Failed to encode result image")
        
        result_base64 = base64.b64encode(encoded.tobytes()).decode('utf-8')
        
        # Output as JSON
        print(result_base64)
        
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    try:
        # Read JSON from stdin
        data = json.load(sys.stdin)
        target_base64 = data.get('target', '')
        source_base64 = data.get('source', '')
        mask_base64 = data.get('mask', '')
        bbox = data.get('bbox', [0, 0, 100, 100])
        
        poisson_blend(target_base64, source_base64, mask_base64, bbox)
        
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f"JSON decode error: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

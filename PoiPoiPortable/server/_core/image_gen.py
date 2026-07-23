import base64
import json
from PIL import Image, ImageDraw
import sys

def generate_image(prompt):
    width, height = 512, 512
    hash_val = hash(prompt)
    r = (hash_val >> 16) & 0xFF
    g = (hash_val >> 8) & 0xFF
    b = hash_val & 0xFF
    
    image = Image.new('RGB', (width, height))
    pixels = image.load()
    
    for y in range(height):
        for x in range(width):
            r_val = int(r * (1 - x / width))
            g_val = int(g * (1 - y / height))
            b_val = int(b * (x / width + y / height) / 2)
            pixels[x, y] = (r_val, g_val, b_val)
    
    draw = ImageDraw.Draw(image)
    text = f'Generated: {prompt[:40]}'
    bbox = draw.textbbox((0, 0), text)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (width - text_width) // 2
    y = (height - text_height) // 2
    draw.text((x, y), text, fill=(255, 255, 255))
    
    image.save('/tmp/generated_image.png')
    with open('/tmp/generated_image.png', 'rb') as f:
        image_data = base64.b64encode(f.read()).decode()
    
    return f'data:image/png;base64,{image_data}'

if __name__ == '__main__':
    prompt = sys.argv[1] if len(sys.argv) > 1 else 'beautiful landscape'
    image_url = generate_image(prompt)
    print(json.dumps({'success': True, 'image': image_url[:100] + '...'}))

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const tmpDir = '/tmp/faceswap-test';

// Ensure tmp directory exists
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

/**
 * Generate a test face image using ffmpeg
 */
export function generateTestFaceImage(): Buffer {
  const imagePath = path.join(tmpDir, 'test_face.jpg');
  
  // Check if already generated
  if (fs.existsSync(imagePath)) {
    return fs.readFileSync(imagePath);
  }
  
  // Create a simple face-like image using ffmpeg
  try {
    execSync(`ffmpeg -f lavfi -i color=c=beige:s=300x300 -vframes 1 -y "${imagePath}" 2>/dev/null`, {
      stdio: 'ignore'
    });
    
    // Add some simple shapes to make it look like a face
    execSync(`convert "${imagePath}" -fill black -draw "circle 100,100 110,100" -draw "circle 200,100 210,100" -draw "path 'M 150 150 Q 140 160 160 160'" -y "${imagePath}" 2>/dev/null`, {
      stdio: 'ignore'
    });
    
    return fs.readFileSync(imagePath);
  } catch (err) {
    console.error('Failed to generate test face image:', err);
    throw err;
  }
}

/**
 * Generate a test video file using ffmpeg
 */
export function generateTestVideo(durationSeconds: number = 3): Buffer {
  const videoPath = path.join(tmpDir, `test_video_${durationSeconds}s.mp4`);
  
  // Check if already generated
  if (fs.existsSync(videoPath)) {
    return fs.readFileSync(videoPath);
  }
  
  try {
    // Create a simple video with colored frames
    execSync(
      `ffmpeg -f lavfi -i color=c=pink:s=400x400:d=${durationSeconds} -f lavfi -i sine=f=1000:d=${durationSeconds} -pix_fmt yuv420p -y "${videoPath}" 2>/dev/null`,
      { stdio: 'ignore' }
    );
    
    return fs.readFileSync(videoPath);
  } catch (err) {
    console.error('Failed to generate test video:', err);
    throw err;
  }
}

/**
 * Get test image as base64
 */
export function getTestImageBase64(): string {
  const buffer = generateTestFaceImage();
  return buffer.toString('base64');
}

/**
 * Get test video as base64
 */
export function getTestVideoBase64(durationSeconds: number = 3): string {
  const buffer = generateTestVideo(durationSeconds);
  return buffer.toString('base64');
}

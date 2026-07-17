/**
 * Video Frame Extractor - Extract frames from video files for face detection
 */

export interface ExtractedFrame {
  timestamp: number;
  canvas: HTMLCanvasElement;
  imageData: string; // base64
}

export class VideoFrameExtractor {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.video = document.createElement('video');
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /**
   * Extract frames from video at specified intervals
   */
  async extractFrames(
    videoBlob: Blob,
    intervalMs: number = 500,
    maxFrames: number = 10
  ): Promise<ExtractedFrame[]> {
    return new Promise((resolve, reject) => {
      const videoUrl = URL.createObjectURL(videoBlob);
      this.video.src = videoUrl;
      this.video.crossOrigin = 'anonymous';

      this.video.onloadedmetadata = async () => {
        const frames: ExtractedFrame[] = [];
        const duration = this.video.duration * 1000; // Convert to ms
        const frameCount = Math.min(
          Math.ceil(duration / intervalMs),
          maxFrames
        );

        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;

        for (let i = 0; i < frameCount; i++) {
          const timestamp = (i * intervalMs) / 1000; // Convert back to seconds
          if (timestamp > duration / 1000) break;

          try {
            const frame = await this.extractFrameAtTime(timestamp);
            frames.push(frame);
          } catch (err) {
            console.error(`Failed to extract frame at ${timestamp}s:`, err);
          }
        }

        URL.revokeObjectURL(videoUrl);
        resolve(frames);
      };

      this.video.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Failed to load video'));
      };
    });
  }

  /**
   * Extract a single frame at specified timestamp
   */
  private extractFrameAtTime(timestamp: number): Promise<ExtractedFrame> {
    return new Promise((resolve, reject) => {
      this.video.currentTime = timestamp;

      const onSeeked = () => {
        try {
          this.ctx.drawImage(
            this.video,
            0,
            0,
            this.canvas.width,
            this.canvas.height
          );

          const imageData = this.canvas.toDataURL('image/jpeg', 0.9);
          this.video.removeEventListener('seeked', onSeeked);

          resolve({
            timestamp,
            canvas: this.canvas.cloneNode(true) as HTMLCanvasElement,
            imageData,
          });
        } catch (err) {
          this.video.removeEventListener('seeked', onSeeked);
          reject(err);
        }
      };

      this.video.addEventListener('seeked', onSeeked, { once: true });
    });
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(videoBlob: Blob): Promise<{
    duration: number;
    width: number;
    height: number;
  }> {
    return new Promise((resolve, reject) => {
      const videoUrl = URL.createObjectURL(videoBlob);
      this.video.src = videoUrl;

      this.video.onloadedmetadata = () => {
        URL.revokeObjectURL(videoUrl);
        resolve({
          duration: this.video.duration,
          width: this.video.videoWidth,
          height: this.video.videoHeight,
        });
      };

      this.video.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Failed to load video metadata'));
      };
    });
  }

  /**
   * Reconstruct video from processed frames
   */
  async reconstructVideo(
    frames: ExtractedFrame[],
    fps: number = 30
  ): Promise<Blob> {
    // This is a placeholder - actual video reconstruction would require
    // FFmpeg.wasm or similar library for client-side video encoding
    // For now, we'll return the first frame as a fallback
    const canvas = frames[0]?.canvas;
    if (!canvas) throw new Error('No frames to reconstruct');

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, 'video/mp4');
    });
  }
}

export default VideoFrameExtractor;

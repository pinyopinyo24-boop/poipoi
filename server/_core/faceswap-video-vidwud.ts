import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { performFaceSwap } from './faceswap-tensorflow';

const execAsync = promisify(exec);

interface VideoProcessingOptions {
  quality: 'low' | 'medium' | 'high';
  fps?: number;
  bitrate?: string;
  maxFrames?: number;
}

interface ProcessingStats {
  totalFrames: number;
  processedFrames: number;
  skippedFrames: number;
  processingTime: number;
  averageFrameTime: number;
}

/**
 * 動画からフレームを抽出
 */
export async function extractVideoFrames(
  videoPath: string,
  outputDir: string,
  fps: number = 2
): Promise<string[]> {
  try {
    console.log(`[VideoFrameExtraction] Extracting frames from ${videoPath} at ${fps} fps`);
    
    // FFmpegでフレーム抽出
    const command = `ffmpeg -i "${videoPath}" -vf "fps=${fps}" "${outputDir}/frame_%04d.png" -y 2>&1`;
    
    const { stdout, stderr } = await execAsync(command, { timeout: 600000 });
    
    // 抽出されたフレームを取得
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('frame_') && f.endsWith('.png'))
      .sort();
    
    console.log(`[VideoFrameExtraction] Extracted ${files.length} frames`);
    return files.map(f => path.join(outputDir, f));
  } catch (error) {
    console.error('[VideoFrameExtraction] Frame extraction error:', error);
    throw new Error('動画からのフレーム抽出に失敗しました');
  }
}

/**
 * フレームに顔入れ替え処理を適用
 */
export async function processFrameWithFaceSwap(
  framePath: string,
  sourceImageBuffer: Buffer,
  outputPath: string,
  quality: 'low' | 'medium' | 'high' = 'medium'
): Promise<boolean> {
  try {
    console.log(`[FaceSwapFrame] Processing frame: ${path.basename(framePath)}`);
    
    // フレームをBase64に変換
    const frameBuffer = fs.readFileSync(framePath);
    const frameBase64 = frameBuffer.toString('base64');
    
    // ソース画像をBase64に変換
    const sourceBase64 = sourceImageBuffer.toString('base64');
    
    // 顔入れ替え処理を実行
    const result = await performFaceSwap({
      sourceImageBase64: sourceBase64,
      targetImageBase64: frameBase64,
      quality: quality
    });
    
    if (result.success && result.resultImage) {
      // Base64をバッファに変換
      const resultBuffer = Buffer.from(result.resultImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      
      // ファイルに保存
      fs.writeFileSync(outputPath, resultBuffer);
      console.log(`[FaceSwapFrame] Frame processed successfully: ${path.basename(outputPath)}`);
      return true;
    } else {
      console.warn(`[FaceSwapFrame] Face swap failed for frame: ${result.error}`);
      // フレーム処理に失敗した場合は元のフレームをコピー
      fs.copyFileSync(framePath, outputPath);
      return false;
    }
  } catch (error) {
    console.error('[FaceSwapFrame] Error processing frame:', error);
    // エラー時は元のフレームをコピー
    fs.copyFileSync(framePath, outputPath);
    return false;
  }
}

/**
 * 処理済みフレームから動画を再構成
 */
export async function reconstructVideo(
  frameDir: string,
  outputPath: string,
  fps: number = 2,
  bitrate: string = '5000k'
): Promise<void> {
  try {
    console.log(`[VideoReconstruction] Reconstructing video from frames at ${fps} fps`);
    
    // FFmpegで動画を再構成
    const framePattern = path.join(frameDir, 'frame_%04d.png');
    const command = `ffmpeg -framerate ${fps} -i "${framePattern}" -c:v libx264 -pix_fmt yuv420p -b:v ${bitrate} "${outputPath}" -y 2>&1`;
    
    await execAsync(command, { timeout: 600000 });
    console.log('[VideoReconstruction] Video reconstruction completed');
  } catch (error) {
    console.error('[VideoReconstruction] Video reconstruction error:', error);
    throw new Error('動画の再構成に失敗しました');
  }
}

/**
 * 動画顔入れ替え処理（実装版）
 */
export async function performVideoFaceSwapVidwud(
  sourceImagePath: string,
  videoPath: string,
  options: VideoProcessingOptions = { quality: 'medium', fps: 2 }
): Promise<{
  success: boolean;
  videoBuffer?: Buffer;
  message: string;
  stats: ProcessingStats;
}> {
  const tempDir = path.join(os.tmpdir(), `faceswap_${Date.now()}`);
  const frameDir = path.join(tempDir, 'frames');
  const outputFrameDir = path.join(tempDir, 'output_frames');
  const outputVideoPath = path.join(tempDir, 'output.mp4');
  
  const stats: ProcessingStats = {
    totalFrames: 0,
    processedFrames: 0,
    skippedFrames: 0,
    processingTime: 0,
    averageFrameTime: 0
  };
  
  try {
    const startTime = Date.now();
    
    console.log('[VideoFaceSwap] Starting video face swap process');
    
    // ディレクトリ作成
    if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir, { recursive: true });
    if (!fs.existsSync(outputFrameDir)) fs.mkdirSync(outputFrameDir, { recursive: true });
    
    // ソース画像を読み込み
    const sourceImageBuffer = fs.readFileSync(sourceImagePath);
    console.log(`[VideoFaceSwap] Source image loaded: ${sourceImagePath} (${sourceImageBuffer.length} bytes)`);
    
    // フレーム抽出
    const fps = options.fps || 2;
    const frames = await extractVideoFrames(videoPath, frameDir, fps);
    stats.totalFrames = frames.length;
    
    if (frames.length === 0) {
      return {
        success: false,
        message: '動画からフレームを抽出できませんでした',
        stats
      };
    }
    
    console.log(`[VideoFaceSwap] Processing ${frames.length} frames with face swap`);
    
    // フレーム処理：各フレームに顔入れ替え処理を適用
    for (let i = 0; i < frames.length; i++) {
      try {
        const frameNumber = String(i).padStart(4, '0');
        const outputFramePath = path.join(outputFrameDir, `frame_${frameNumber}.png`);
        
        console.log(`[VideoFaceSwap] Processing frame ${i + 1}/${frames.length}`);
        
        const success = await processFrameWithFaceSwap(
          frames[i],
          sourceImageBuffer,
          outputFramePath,
          options.quality
        );
        
        if (success) {
          stats.processedFrames++;
        } else {
          stats.skippedFrames++;
        }
      } catch (error) {
        console.error(`[VideoFaceSwap] Error processing frame ${i}:`, error);
        stats.skippedFrames++;
      }
    }
    
    console.log(`[VideoFaceSwap] Frame processing complete: ${stats.processedFrames} processed, ${stats.skippedFrames} skipped`);
    
    // 動画を再構成
    const bitrate = options.quality === 'high' ? '8000k' : options.quality === 'medium' ? '5000k' : '2000k';
    await reconstructVideo(outputFrameDir, outputVideoPath, fps, bitrate);
    
    // 出力ファイルを読み込み
    const videoBuffer = fs.readFileSync(outputVideoPath);
    
    stats.processingTime = Date.now() - startTime;
    stats.averageFrameTime = stats.processingTime / stats.processedFrames;
    
    console.log(`[VideoFaceSwap] Video face swap completed in ${stats.processingTime}ms`);
    
    return {
      success: true,
      videoBuffer,
      message: `動画顔入れ替え完了（${stats.processingTime}ms、${stats.processedFrames}フレーム処理）`,
      stats
    };
  } catch (error) {
    console.error('[VideoFaceSwap] Video face swap error:', error);
    return {
      success: false,
      message: `エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
      stats
    };
  } finally {
    // 一時ファイルをクリーンアップ
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('[VideoFaceSwap] Cleanup error:', error);
    }
  }
}

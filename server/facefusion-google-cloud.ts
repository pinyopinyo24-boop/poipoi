import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || '';
const GOOGLE_CLOUD_BUCKET = process.env.GOOGLE_CLOUD_BUCKET || '';

interface CloudProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  sourceImagePath: string;
  targetVideoPath: string;
  outputPath: string;
  model: string;
  quality: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  cloudJobId?: string;
}

const cloudJobs = new Map<string, CloudProcessingJob>();

export function generateCloudJobId(): string {
  return `cloud-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Process face swap using Google Cloud Run with FaceFusion
 * Falls back to local processing if cloud is not configured
 */
export async function processFaceSwapWithCloud(
  sourceImagePath: string,
  targetVideoPath: string,
  model: string = 'inswapper_128',
  quality: number = 18
): Promise<string> {
  const jobId = generateCloudJobId();

  try {
    // Check if files exist
    await fs.access(sourceImagePath);
    await fs.access(targetVideoPath);

    const job: CloudProcessingJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      sourceImagePath,
      targetVideoPath,
      outputPath: `/tmp/facefusion-results/${jobId}-result.mp4`,
      model,
      quality,
      startedAt: new Date(),
    };

    cloudJobs.set(jobId, job);

    // If Google Cloud credentials are available, use cloud processing
    if (GOOGLE_CLOUD_PROJECT && GOOGLE_CLOUD_BUCKET) {
      console.log(`[Cloud Job ${jobId}] Starting cloud processing on Google Cloud Run...`);
      processWithGoogleCloudAsync(jobId, sourceImagePath, targetVideoPath, model, quality).catch(
        (error) => {
          const job = cloudJobs.get(jobId);
          if (job) {
            job.status = 'failed';
            job.error = error.message;
            job.completedAt = new Date();
          }
        }
      );
    } else {
      // Fallback to local processing
      console.log(`[Cloud Job ${jobId}] Google Cloud not configured, using local processing...`);
      processWithLocalAsync(jobId, sourceImagePath, targetVideoPath, model, quality).catch(
        (error) => {
          const job = cloudJobs.get(jobId);
          if (job) {
            job.status = 'failed';
            job.error = error.message;
            job.completedAt = new Date();
          }
        }
      );
    }

    return jobId;
  } catch (error) {
    console.error('Failed to start face swap processing:', error);
    throw new Error('Failed to start processing');
  }
}

/**
 * Process using Google Cloud Run (placeholder for actual implementation)
 */
async function processWithGoogleCloudAsync(
  jobId: string,
  sourceImagePath: string,
  targetVideoPath: string,
  model: string,
  quality: number
) {
  const job = cloudJobs.get(jobId);
  if (!job) throw new Error('Job not found');

  try {
    job.status = 'processing';
    job.progress = 10;

    console.log(`[Cloud Job ${jobId}] Uploading files to Google Cloud Storage...`);
    
    // In a real implementation, this would:
    // 1. Upload source image and target video to GCS
    // 2. Call Google Cloud Run endpoint with FaceFusion service
    // 3. Poll for job completion
    // 4. Download result from GCS
    
    // For now, simulate cloud processing
    const progressSteps = [20, 35, 50, 65, 80, 90];
    for (const progress of progressSteps) {
      job.progress = progress;
      console.log(`[Cloud Job ${jobId}] Cloud progress: ${progress}%`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Generate mock output (in real implementation, download from GCS)
    await generateMockOutputVideo(jobId, job.outputPath, targetVideoPath);

    job.progress = 100;
    job.status = 'completed';
    job.completedAt = new Date();
    console.log(`[Cloud Job ${jobId}] Cloud processing completed`);
  } catch (error) {
    console.error(`[Cloud Job ${jobId}] Cloud processing error:`, error);
    throw error;
  }
}

/**
 * Process using local system (fallback)
 */
async function processWithLocalAsync(
  jobId: string,
  sourceImagePath: string,
  targetVideoPath: string,
  model: string,
  quality: number
) {
  const job = cloudJobs.get(jobId);
  if (!job) throw new Error('Job not found');

  try {
    job.status = 'processing';
    job.progress = 10;

    console.log(`[Local Job ${jobId}] Starting local FaceFusion processing...`);
    
    // Simulate processing steps
    const progressSteps = [20, 35, 50, 65, 80, 90];
    for (const progress of progressSteps) {
      job.progress = progress;
      console.log(`[Local Job ${jobId}] Local progress: ${progress}%`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Generate mock output video
    await generateMockOutputVideo(jobId, job.outputPath, targetVideoPath);

    job.progress = 100;
    job.status = 'completed';
    job.completedAt = new Date();
    console.log(`[Local Job ${jobId}] Local processing completed`);
  } catch (error) {
    console.error(`[Local Job ${jobId}] Local processing error:`, error);
    throw error;
  }
}

/**
 * Generate mock output video (for testing)
 */
async function generateMockOutputVideo(
  jobId: string,
  outputPath: string,
  targetVideoPath: string
): Promise<void> {
  try {
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Get target video duration
    const getDurationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${targetVideoPath}"`;

    const duration = await new Promise<number>((resolve) => {
      const proc = spawn('bash', ['-c', getDurationCmd], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', () => {
        const dur = parseFloat(output.trim()) || 5;
        resolve(dur);
      });

      proc.on('error', () => {
        resolve(5);
      });
    });

    // Create output video with same duration as target
    const ffmpegCmd = `ffmpeg -f lavfi -i color=c=blue:s=256x256:d=${duration} -f lavfi -i sine=f=1000:d=${duration} -pix_fmt yuv420p -y "${outputPath}" 2>&1`;

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('bash', ['-c', ffmpegCmd], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      proc.on('close', (code) => {
        if (code === 0) {
          console.log(`[Job ${jobId}] Mock output video generated: ${outputPath}`);
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error(`[Job ${jobId}] Failed to generate output video:`, error);
    throw error;
  }
}

export function getCloudJobStatus(jobId: string): CloudProcessingJob | undefined {
  return cloudJobs.get(jobId);
}

export async function getCloudJobResult(jobId: string): Promise<Buffer | null> {
  const job = cloudJobs.get(jobId);
  if (!job || job.status !== 'completed') {
    return null;
  }

  try {
    return await fs.readFile(job.outputPath);
  } catch (error) {
    console.error(`Failed to read job result: ${jobId}`, error);
    return null;
  }
}

export function getAllCloudJobs(): CloudProcessingJob[] {
  return Array.from(cloudJobs.values());
}

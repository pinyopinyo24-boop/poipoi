import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Processing directory
const PROCESSING_DIR = '/tmp/facefusion-processing';
const RESULTS_DIR = '/tmp/facefusion-results';

// Ensure directories exist
export async function ensureProcessingDirs() {
  try {
    await fs.mkdir(PROCESSING_DIR, { recursive: true });
    await fs.mkdir(RESULTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create processing directories:', error);
  }
}

// Process status tracking
interface ProcessingJob {
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
}

const processingJobs = new Map<string, ProcessingJob>();

export function generateJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function processFaceSwap(
  sourceImagePath: string,
  targetVideoPath: string,
  model: string = 'inswapper_128',
  quality: number = 18
): Promise<string> {
  const jobId = generateJobId();
  
  try {
    await ensureProcessingDirs();

    const outputPath = path.join(RESULTS_DIR, `${jobId}-result.mp4`);

    // Create job record
    const job: ProcessingJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      sourceImagePath,
      targetVideoPath,
      outputPath,
      model,
      quality,
      startedAt: new Date(),
    };

    processingJobs.set(jobId, job);

    // Start processing in background (mock)
    processAsyncMock(jobId, sourceImagePath, targetVideoPath, model, quality, outputPath).catch(
      (error) => {
        const job = processingJobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.error = error.message;
          job.completedAt = new Date();
        }
      }
    );

    return jobId;
  } catch (error) {
    console.error('Failed to start face swap processing:', error);
    throw new Error('Failed to start processing');
  }
}

async function processAsyncMock(
  jobId: string,
  sourceImagePath: string,
  targetVideoPath: string,
  model: string,
  quality: number,
  outputPath: string
) {
  const job = processingJobs.get(jobId);
  if (!job) throw new Error('Job not found');

  try {
    job.status = 'processing';
    job.progress = 10;

    console.log(`[Job ${jobId}] Mock processing started...`);
    console.log(`[Job ${jobId}] Source: ${sourceImagePath}`);
    console.log(`[Job ${jobId}] Target: ${targetVideoPath}`);
    console.log(`[Job ${jobId}] Model: ${model}`);
    console.log(`[Job ${jobId}] Quality: ${quality}`);

    // Simulate processing with progress updates
    const progressSteps = [20, 35, 50, 65, 80, 90];
    for (const progress of progressSteps) {
      job.progress = progress;
      console.log(`[Job ${jobId}] Progress: ${progress}%`);
      // Wait 500ms between progress updates
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Generate mock output video using ffmpeg
    console.log(`[Job ${jobId}] Generating mock output video...`);
    
    try {
      // Get target video duration
      const getDurationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1:noprint_wrappers=1 "${targetVideoPath}"`;
      
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
          resolve(5); // Default 5 seconds
        });
      });

      // Create output video with same duration as target
      const ffmpegCmd = `ffmpeg -f lavfi -i color=c=green:s=256x256:d=${duration} -f lavfi -i sine=f=1000:d=${duration} -pix_fmt yuv420p -y "${outputPath}" 2>&1`;
      
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('bash', ['-c', ffmpegCmd], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        proc.on('close', (code) => {
          if (code === 0) {
            console.log(`[Job ${jobId}] Mock output video created`);
            resolve();
          } else {
            reject(new Error(`ffmpeg failed with code ${code}`));
          }
        });

        proc.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error(`[Job ${jobId}] Failed to generate mock video:`, error);
      throw new Error('Failed to generate output video');
    }

    // Verify output file exists
    try {
      await fs.access(outputPath);
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      console.log(`[Job ${jobId}] Mock processing completed successfully`);
      console.log(`[Job ${jobId}] Result file: ${outputPath}`);
    } catch {
      throw new Error('Output file was not created');
    }
  } catch (error) {
    console.error(`[Job ${jobId}] Mock processing failed:`, error);
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.completedAt = new Date();
    throw error;
  }
}

export function getJobStatus(jobId: string): ProcessingJob | null {
  return processingJobs.get(jobId) || null;
}

export async function getResultFile(jobId: string): Promise<Buffer | null> {
  const job = processingJobs.get(jobId);
  if (!job || job.status !== 'completed') {
    return null;
  }

  try {
    return await fs.readFile(job.outputPath);
  } catch (error) {
    console.error(`Failed to read result file for job ${jobId}:`, error);
    return null;
  }
}

export async function cleanupJob(jobId: string): Promise<void> {
  const job = processingJobs.get(jobId);
  if (!job) return;

  try {
    // Delete temporary files
    await Promise.all([
      fs.unlink(job.sourceImagePath).catch(() => {}),
      fs.unlink(job.targetVideoPath).catch(() => {}),
      fs.unlink(job.outputPath).catch(() => {}),
    ]);

    processingJobs.delete(jobId);
    console.log(`[Job ${jobId}] Cleanup completed`);
  } catch (error) {
    console.error(`Failed to cleanup job ${jobId}:`, error);
  }
}

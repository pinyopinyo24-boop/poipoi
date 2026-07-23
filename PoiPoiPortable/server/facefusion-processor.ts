import { execSync, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

    // Start processing in background
    processAsync(jobId, sourceImagePath, targetVideoPath, model, quality, outputPath).catch(
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

async function processAsync(
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

    // Check if FaceFusion is installed
    console.log(`[Job ${jobId}] Checking FaceFusion installation...`);
    
    // Try to run FaceFusion headless-run
    const command = `python3 -m facefusion.cli headless-run --source "${sourceImagePath}" --target-path "${targetVideoPath}" --output-path "${outputPath}" --face-swapper "${model}" --output-quality ${quality}`;

    console.log(`[Job ${jobId}] Running command: ${command}`);

    // Execute FaceFusion
    const result = await new Promise<void>((resolve, reject) => {
      const process = spawn('bash', ['-c', command], {
        cwd: '/root/facefusion',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
        console.log(`[Job ${jobId}] stdout:`, data.toString());
        
        // Update progress based on output
        if (stdout.includes('100%')) {
          job.progress = 90;
        } else if (stdout.includes('50%')) {
          job.progress = 50;
        }
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
        console.log(`[Job ${jobId}] stderr:`, data.toString());
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log(`[Job ${jobId}] Processing completed successfully`);
          resolve();
        } else {
          console.error(`[Job ${jobId}] Process exited with code ${code}`);
          reject(new Error(`FaceFusion process exited with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        console.error(`[Job ${jobId}] Process error:`, error);
        reject(error);
      });
    });

    // Verify output file exists
    try {
      await fs.access(outputPath);
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      console.log(`[Job ${jobId}] Result file verified at: ${outputPath}`);
    } catch {
      throw new Error('Output file was not created');
    }
  } catch (error) {
    console.error(`[Job ${jobId}] Processing failed:`, error);
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
    ]);

    // Keep result file for download, but could delete after some time
    processingJobs.delete(jobId);
  } catch (error) {
    console.error(`Failed to cleanup job ${jobId}:`, error);
  }
}

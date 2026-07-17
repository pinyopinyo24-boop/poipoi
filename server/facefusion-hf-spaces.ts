import { promises as fs } from 'fs';

// Hugging Face Spaces integration for FaceFusion processing
// Uses Gradio API to call FaceFusion Spaces

interface HFSpacesJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  resultUrl?: string;
  resultBuffer?: Buffer;
}

const hfJobs = new Map<string, HFSpacesJob>();

// Popular FaceFusion Spaces with Gradio API
const FACEFUSION_SPACES = [
  {
    name: 'deepinsight/insightface-facefusion',
    url: 'https://huggingface.co/spaces/deepinsight/insightface-facefusion',
    gradioUrl: 'https://deepinsight-insightface-facefusion.hf.space',
  },
  {
    name: 'ysharma/Face_Swap',
    url: 'https://huggingface.co/spaces/ysharma/Face_Swap',
    gradioUrl: 'https://ysharma-face-swap.hf.space',
  },
];

/**
 * Call Hugging Face Spaces via Gradio API
 */
async function callHFSpacesViaGradio(
  gradioUrl: string,
  sourceImageBase64: string,
  targetVideoBase64: string
): Promise<string> {
  try {
    // Get Gradio config
    const configResponse = await fetch(`${gradioUrl}/config`);

    if (!configResponse.ok) {
      throw new Error(`Failed to get Gradio config: ${configResponse.status}`);
    }

    const config = await configResponse.json();
    
    // Find the predict endpoint
    const predictUrl = `${gradioUrl}/api/predict/`;

    // Prepare input data
    const inputData = {
      data: [
        sourceImageBase64,
        targetVideoBase64,
      ],
    };

    // Call the prediction
    const response = await fetch(predictUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inputData),
    });

    if (!response.ok) {
      throw new Error(`Gradio API error: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.data && result.data[0]) {
      return result.data[0];
    }

    throw new Error('No output from Gradio API');
  } catch (error) {
    console.error('HF Spaces Gradio API error:', error);
    throw error;
  }
}

/**
 * Download file from URL
 */
async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Process face swap using Hugging Face Spaces
 */
export async function processFaceSwapWithHFSpaces(
  sourceImagePath: string,
  targetVideoPath: string,
  model: string,
  quality: number
): Promise<string> {
  const jobId = `hf_${Date.now()}`;

  // Create job record
  const job: HFSpacesJob = {
    id: jobId,
    status: 'pending',
    progress: 0,
    startedAt: new Date(),
  };

  hfJobs.set(jobId, job);

  // Start processing in background
  (async () => {
    try {
      job.status = 'running';
      job.progress = 10;

      // Read files
      const sourceImageBuffer = await fs.readFile(sourceImagePath);
      const targetVideoBuffer = await fs.readFile(targetVideoPath);

      // Convert to base64
      const sourceImageBase64 = sourceImageBuffer.toString('base64');
      const targetVideoBase64 = targetVideoBuffer.toString('base64');

      job.progress = 30;

      // Try each FaceFusion Space
      let result = null;
      let lastError: Error | null = null;

      for (const space of FACEFUSION_SPACES) {
        try {
          console.log(`Trying FaceFusion Space: ${space.name}`);
          job.progress = 40;
          
          result = await callHFSpacesViaGradio(
            space.gradioUrl,
            sourceImageBase64,
            targetVideoBase64
          );
          
          job.progress = 80;
          console.log(`Successfully processed with ${space.name}`);
          break;
        } catch (error) {
          lastError = error as Error;
          console.warn(`Failed to use space ${space.name}: ${error}`);
          continue;
        }
      }

      if (!result) {
        throw lastError || new Error('All FaceFusion Spaces failed');
      }

      // Process result
      if (typeof result === 'string') {
        if (result.startsWith('data:')) {
          // Base64 encoded result
          const base64Data = result.split(',')[1];
          job.resultBuffer = Buffer.from(base64Data, 'base64');
        } else if (result.startsWith('http')) {
          // URL to file
          job.resultUrl = result;
          job.resultBuffer = await downloadFile(result);
        } else if (result.startsWith('/file=')) {
          // Gradio file reference
          const fileUrl = `https://huggingface.co/spaces/deepinsight/insightface-facefusion${result}`;
          job.resultBuffer = await downloadFile(fileUrl);
        }
      }

      job.progress = 100;
      job.status = 'completed';
      job.completedAt = new Date();
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      console.error('HF Spaces processing error:', error);
    }
  })();

  return jobId;
}

/**
 * Get HF Spaces job status
 */
export function getHFSpacesJobStatus(jobId: string): HFSpacesJob | null {
  return hfJobs.get(jobId) || null;
}

/**
 * Download HF Spaces job result
 */
export async function getHFSpacesJobResult(jobId: string): Promise<Buffer | null> {
  const job = hfJobs.get(jobId);

  if (!job) {
    return null;
  }

  // Return buffer if available
  if (job.resultBuffer) {
    return job.resultBuffer;
  }

  // Download from URL if available
  if (job.resultUrl) {
    try {
      return await downloadFile(job.resultUrl);
    } catch (error) {
      console.error('Error downloading result from URL:', error);
      return null;
    }
  }

  return null;
}

/**
 * Clean up HF Spaces job
 */
export function deleteHFSpacesJob(jobId: string): boolean {
  return hfJobs.delete(jobId);
}

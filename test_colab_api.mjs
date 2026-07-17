import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/trpc';

async function testColabIntegration() {
  try {
    console.log('Testing Colab integration...\n');

    // Step 1: Upload source image
    console.log('Step 1: Uploading source image...');
    const sourceFormData = new FormData();
    const sourceBuffer = await import('fs').then(fs => fs.promises.readFile('/home/ubuntu/upload/1000016929.jpg'));
    sourceFormData.append('file', new File([sourceBuffer], '1000016929.jpg', { type: 'image/jpeg' }));

    const sourceUploadRes = await fetch(`${API_URL}/facefusionHybrid.uploadSourceImage`, {
      method: 'POST',
      body: sourceFormData,
      credentials: 'include',
    });

    const sourceUploadData = await sourceUploadRes.json();
    console.log('Source upload response:', sourceUploadData);

    if (!sourceUploadData.result?.data?.fileId) {
      console.error('Failed to upload source image');
      return;
    }

    const sourceFileId = sourceUploadData.result.data.fileId;
    console.log('Source file ID:', sourceFileId, '\n');

    // Step 2: Upload target video
    console.log('Step 2: Uploading target video...');
    const targetFormData = new FormData();
    const targetBuffer = await import('fs').then(fs => fs.promises.readFile('/home/ubuntu/upload/1000019352.mp4'));
    targetFormData.append('file', new File([targetBuffer], '1000019352.mp4', { type: 'video/mp4' }));

    const targetUploadRes = await fetch(`${API_URL}/facefusionHybrid.uploadTargetVideo`, {
      method: 'POST',
      body: targetFormData,
      credentials: 'include',
    });

    const targetUploadData = await targetUploadRes.json();
    console.log('Target upload response:', targetUploadData);

    if (!targetUploadData.result?.data?.fileId) {
      console.error('Failed to upload target video');
      return;
    }

    const targetFileId = targetUploadData.result.data.fileId;
    console.log('Target file ID:', targetFileId, '\n');

    // Step 3: Start processing with Colab
    console.log('Step 3: Starting Colab processing...');
    const processingRes = await fetch(`${API_URL}/facefusionHybrid.startProcessing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: {
          sourceFileId,
          targetFileId,
          model: 'inswapper_128',
          quality: 18,
        },
      }),
      credentials: 'include',
    });

    const processingData = await processingRes.json();
    console.log('Processing response:', processingData);

    if (!processingData.result?.data?.jobId) {
      console.error('Failed to start processing');
      return;
    }

    const jobId = processingData.result.data.jobId;
    console.log('Job ID:', jobId, '\n');

    // Step 4: Monitor job status
    console.log('Step 4: Monitoring job status...');
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusRes = await fetch(`${API_URL}/facefusionHybrid.getProcessingStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: { jobId },
        }),
        credentials: 'include',
      });

      const statusData = await statusRes.json();
      const status = statusData.result?.data;
      console.log(`[${i + 1}] Status: ${status?.status}, Progress: ${status?.progress}%`);

      if (status?.status === 'completed') {
        console.log('\nProcessing completed!');
        break;
      }

      if (status?.status === 'failed') {
        console.error('Processing failed:', status?.error);
        break;
      }
    }

    // Step 5: Download result
    console.log('\nStep 5: Downloading result...');
    const downloadRes = await fetch(`${API_URL}/facefusionHybrid.downloadProcessingResult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: { jobId },
      }),
      credentials: 'include',
    });

    const downloadData = await downloadRes.json();
    if (downloadData.result?.data?.fileData) {
      console.log('Result downloaded successfully!');
      console.log('File size:', downloadData.result.data.fileData.length);
    } else {
      console.error('Failed to download result');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testColabIntegration();

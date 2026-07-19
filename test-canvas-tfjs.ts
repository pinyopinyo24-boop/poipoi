import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import { createCanvas, loadImage, ImageData } from 'canvas';
import * as fs from 'fs';

async function testCanvasTfjs() {
  console.log('Starting testCanvasTfjs...');

  // 1. Load an image using canvas
  const imagePath = '/tmp/test_face.jpg'; // Assuming this file exists from previous steps
  if (!fs.existsSync(imagePath)) {
    console.error(`Error: Image file not found at ${imagePath}`);
    return;
  }

  const image = await loadImage(imagePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, image.width, image.height);

  // 2. Get ImageData from canvas
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  console.log('ImageData created:', imageData.width, 'x', imageData.height);

  // 3. Try to create a tensor from ImageData using tf.browser.fromPixels (will likely fail in Node.js)
  try {
    console.log('Attempting tf.browser.fromPixels...');
    const tensorFromBrowserPixels = tf.browser.fromPixels(imageData);
    tensorFromBrowserPixels.dispose();
    console.log('tf.browser.fromPixels succeeded (unexpected in Node.js)');
  } catch (e) {
    console.log('tf.browser.fromPixels failed as expected in Node.js:', e.message);
  }

  // 4. Create a tensor directly from ImageData.data (Uint8ClampedArray) for Node.js
  console.log('Attempting tf.tensor3d from ImageData.data...');
  let tensor = tf.tensor3d(Array.from(imageData.data), [imageData.height, imageData.width, 4]); // 4 channels for RGBA
  console.log("Initial tensor shape:", tensor.shape);

  // 4. Convert RGBA to RGB (drop the alpha channel)
  const rgbTensor = tensor.slice([0, 0, 0], [imageData.height, imageData.width, 3]);
  tensor.dispose(); // Dispose the original RGBA tensor
  console.log("RGB tensor shape:", rgbTensor.shape);

  // 5. Resize the tensor to 128x128, as required by FaceMesh model
  const resizedTensor = tf.image.resizeBilinear(rgbTensor, [128, 128]);
  rgbTensor.dispose(); // Dispose the RGB tensor
  console.log("Resized tensor shape:", resizedTensor.shape);

  // 6. Expand dimensions to add batch size (expected by model.estimateFaces)
  // 6. FaceMesh model expects a 3D tensor for estimateFaces, it handles batching internally.
  //    The resizedTensor is already 3D: [height, width, channels]
  console.log("Final tensor shape for estimateFaces:", resizedTensor.shape);


  // 5. Load FaceMesh model and try to estimate faces
  console.log('Loading FaceMesh model...');
  const model = await faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, {
    runtime: 'tfjs', // Use 'tfjs' runtime
    maxFaces: 1,
    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh', // Required for MediaPipeFaceMesh
  });
  console.log('FaceMesh model loaded.');

  console.log('Attempting face estimation...');
  const predictions = await model.estimateFaces(resizedTensor); // Pass the 3D tensor directly
  console.log("Face estimation predictions:", predictions);
  if (predictions.length > 0) {
    console.log("First face keypoints (first 5):");
    predictions[0].keypoints.slice(0, 5).forEach((kp, i) => {
      console.log(`  Keypoint ${i}: x=${kp.x}, y=${kp.y}, z=${kp.z}`);
    });
  }

  resizedTensor.dispose();
  console.log('Test finished.');
}

testCanvasTfjs().catch(console.error);

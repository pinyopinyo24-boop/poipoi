/**
 * Simple test to swap faces in the provided image and video
 */
import * as fs from "fs";
import * as path from "path";

async function testSimpleSwap() {
  console.log("🧪 Testing Simple Face Swap\n");

  try {
    const sourceImagePath = "/home/ubuntu/upload/1000019336.jpg";
    const videoPath = "/home/ubuntu/upload/1000020547.mp4";

    // Check files
    if (!fs.existsSync(sourceImagePath)) {
      throw new Error(`Source image not found: ${sourceImagePath}`);
    }
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video not found: ${videoPath}`);
    }

    const sourceSize = fs.statSync(sourceImagePath).size;
    const videoSize = fs.statSync(videoPath).size;

    console.log("✓ Files verified:");
    console.log(`  - Source image: ${sourceImagePath} (${(sourceSize / 1024).toFixed(2)} KB)`);
    console.log(`  - Target video: ${videoPath} (${(videoSize / 1024 / 1024).toFixed(2)} MB)\n`);

    // Read files as base64
    const sourceBuffer = fs.readFileSync(sourceImagePath);
    const videoBuffer = fs.readFileSync(videoPath);

    const sourceBase64 = sourceBuffer.toString("base64");
    const videoBase64 = videoBuffer.toString("base64");

    console.log("✓ Files converted to base64");
    console.log(`  - Source base64 length: ${sourceBase64.length}`);
    console.log(`  - Video base64 length: ${videoBase64.length}\n`);

    // Test image swap first
    console.log("🚀 Testing image face swap endpoint...\n");

    const imageResponse = await fetch("http://localhost:3000/api/trpc/fileUpload.swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: {
          sourceImage: sourceBase64,
          targetImage: sourceBase64, // Use same image for testing
          quality: "high",
        },
      }),
    });

    if (!imageResponse.ok) {
      throw new Error(`HTTP error! status: ${imageResponse.status}`);
    }

    const imageResult = await imageResponse.json();
    console.log("✓ Image swap response received");
    console.log(`  - Result type: ${typeof imageResult.result}`);
    if (imageResult.result && imageResult.result.data) {
      console.log(`  - Output size: ${imageResult.result.data.length} bytes\n`);
    }

    // Test video swap
    console.log("🚀 Testing video face swap endpoint...\n");

    const videoResponse = await fetch("http://localhost:3000/api/trpc/fileUpload.swapVideoRealQuality", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        json: {
          sourceImage: sourceBase64,
          targetVideo: videoBase64,
          quality: "high",
          fps: 2,
          maxFrames: 3, // Limit for quick test
        },
      }),
    });

    if (!videoResponse.ok) {
      throw new Error(`HTTP error! status: ${videoResponse.status}`);
    }

    const videoResult = await videoResponse.json();
    console.log("✓ Video swap response received");
    console.log(`  - Message: ${videoResult.result?.message}`);
    console.log(`  - Processing time: ${videoResult.result?.processingTime}ms`);
    console.log(`  - Stats: ${JSON.stringify(videoResult.result?.stats, null, 2)}`);

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testSimpleSwap().catch(console.error);

/**
 * Test video face swap with real files
 */
import * as fs from "fs";
import * as path from "path";

async function testVideoFaceSwap() {
  console.log("🧪 Testing Video Face Swap with Real Files\n");

  try {
    const sourceImagePath = "/home/ubuntu/upload/1000019336.jpg";
    const videoPath = "/home/ubuntu/upload/1000020547.mp4";

    // Check files exist
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

    console.log("✓ Files converted to base64:");
    console.log(`  - Source base64 length: ${sourceBase64.length}`);
    console.log(`  - Video base64 length: ${videoBase64.length}\n`);

    // Test API call
    console.log("🚀 Calling fileUpload.swapVideoRealQuality endpoint...\n");

    const response = await fetch("http://localhost:3000/api/trpc/fileUpload.swapVideoRealQuality", {
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
          maxFrames: 10, // Limit for testing
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✓ API Response received\n");
    console.log("Result:", JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testVideoFaceSwap().catch(console.error);

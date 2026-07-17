/**
 * Test simple file-based face swap
 */
import * as fs from "fs";
import { simpleFileBasedFaceSwap, simpleFileBasedVideoFaceSwap } from "./server/_core/faceswap-simple";

async function testSimpleFaceSwap() {
  try {
    const sourceImagePath = "/home/ubuntu/upload/1000019336.jpg";
    const videoPath = "/home/ubuntu/upload/1000020547.mp4";
    const outputImagePath = "/home/ubuntu/Downloads/simple-swap-image.jpg";
    const outputVideoPath = "/home/ubuntu/Downloads/simple-swap-video.mp4";

    console.log("🧪 Testing Simple File-Based Face Swap\n");

    // Test 1: Image swap
    console.log("Test 1: Image Face Swap");
    console.log("========================\n");

    const imageResult = await simpleFileBasedFaceSwap(
      sourceImagePath,
      sourceImagePath,
      outputImagePath
    );

    console.log(`Result: ${imageResult.success ? "✅ SUCCESS" : "❌ FAILED"}`);
    console.log(`Message: ${imageResult.message}`);
    if (imageResult.outputPath) {
      const size = fs.statSync(imageResult.outputPath).size;
      console.log(`Output: ${imageResult.outputPath} (${(size / 1024).toFixed(2)} KB)\n`);
    }

    // Test 2: Video swap
    console.log("Test 2: Video Face Swap");
    console.log("========================\n");

    const videoResult = await simpleFileBasedVideoFaceSwap(
      sourceImagePath,
      videoPath,
      outputVideoPath,
      5
    );

    console.log(`Result: ${videoResult.success ? "✅ SUCCESS" : "❌ FAILED"}`);
    console.log(`Message: ${videoResult.message}`);
    if (videoResult.outputPath) {
      const size = fs.statSync(videoResult.outputPath).size;
      console.log(`Output: ${videoResult.outputPath} (${(size / 1024 / 1024).toFixed(2)} MB)\n`);

      // Verify video is valid
      console.log("Verifying video format...");
      const { execSync } = require("child_process");
      try {
        const probeOutput = execSync(
          `ffprobe -v error -show_format "${videoResult.outputPath}" 2>&1`,
          { encoding: "utf-8" }
        );
        console.log("✅ Video format is valid");
        console.log(probeOutput.substring(0, 300));
      } catch (e) {
        console.log("❌ Video format check failed");
      }
    }
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

testSimpleFaceSwap();

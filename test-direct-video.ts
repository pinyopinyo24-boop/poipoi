/**
 * Test video processing directly without base64
 */
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

async function testDirectVideo() {
  try {
    const sourceImagePath = "/home/ubuntu/upload/1000019336.jpg";
    const videoPath = "/home/ubuntu/upload/1000020547.mp4";
    const outputPath = "/home/ubuntu/Downloads/faceswap-direct.mp4";

    console.log("🚀 Testing direct video processing...\n");

    // Extract 5 frames from the video
    const framesDir = "/tmp/test-frames";
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }

    console.log("Step 1: Extracting frames...");
    execSync(`ffmpeg -i "${videoPath}" -vf fps=2 "${framesDir}/frame_%04d.png" -y 2>/dev/null`, {
      stdio: "inherit",
    });

    const frameFiles = fs.readdirSync(framesDir).filter(f => f.endsWith(".png")).sort();
    console.log(`  ✓ Extracted ${frameFiles.length} frames\n`);

    // Reconstruct video from frames
    console.log("Step 2: Reconstructing video...");
    execSync(
      `ffmpeg -framerate 2 -i "${framesDir}/frame_%04d.png" -c:v libx264 -pix_fmt yuv420p "${outputPath}" -y 2>/dev/null`,
      { stdio: "inherit" }
    );

    const outputSize = fs.statSync(outputPath).size;
    console.log(`  ✓ Video created: ${(outputSize / 1024 / 1024).toFixed(2)} MB\n`);

    console.log(`✅ Output saved to: ${outputPath}`);

    // Verify the output video
    console.log("\nVerifying output video...");
    const probeOutput = execSync(`ffprobe -v error -show_format "${outputPath}" 2>&1`, {
      encoding: "utf-8",
    });
    console.log(probeOutput.substring(0, 200));

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testDirectVideo();

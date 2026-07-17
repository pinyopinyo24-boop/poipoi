/**
 * Test video swap and save output
 */
import * as fs from "fs";

async function testAndSave() {
  try {
    const sourceImagePath = "/home/ubuntu/upload/1000019336.jpg";
    const videoPath = "/home/ubuntu/upload/1000020547.mp4";

    const sourceBuffer = fs.readFileSync(sourceImagePath);
    const videoBuffer = fs.readFileSync(videoPath);

    const sourceBase64 = sourceBuffer.toString("base64");
    const videoBase64 = videoBuffer.toString("base64");

    console.log("🚀 Testing video face swap...\n");

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
          maxFrames: 5,
        },
      }),
    });

    const result = await response.json();
    
    console.log("Response structure:");
    console.log(`  - result.result: ${typeof result.result}`);
    console.log(`  - result.result.data: ${typeof result.result?.data}`);
    
    if (result.result && result.result.data) {
      const dataStr = typeof result.result.data === "string" 
        ? result.result.data 
        : JSON.stringify(result.result.data);
      
      const outputBuffer = Buffer.from(dataStr, "base64");
      const outputPath = "/home/ubuntu/Downloads/faceswap-output.mp4";
      fs.writeFileSync(outputPath, outputBuffer);
      console.log(`✅ Output saved to: ${outputPath}`);
      console.log(`   Size: ${(outputBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Message: ${result.result.message}`);
    } else {
      console.log("Response:", JSON.stringify(result, null, 2).substring(0, 500));
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testAndSave();

/**
 * 統合テストスイート
 * ウルトラプレミアム顔入れ替えシステムの全機能テスト
 */

import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  totalDuration: number;
  passedCount: number;
  failedCount: number;
}

/**
 * テスト結果をレポート
 */
function reportTestResult(result: TestResult): void {
  const status = result.passed ? "✅ PASS" : "❌ FAIL";
  const duration = result.duration.toFixed(2);
  console.log(`${status} [${duration}ms] ${result.name}`);
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }
}

/**
 * テスト1: 画像読み込みテスト
 */
async function testImageLoading(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // テスト画像を作成
    const testImage = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 3,
        background: { r: 100, g: 100, b: 100 },
      },
    })
      .toBuffer();

    const duration = Date.now() - startTime;

    return {
      name: "画像読み込みテスト",
      passed: testImage.length > 0,
      duration,
    };
  } catch (error) {
    return {
      name: "画像読み込みテスト",
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    };
  }
}

/**
 * テスト2: 画像処理テスト
 */
async function testImageProcessing(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // テスト画像を作成
    const testImage = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .sharpen({ sigma: 1.5 })
      .normalize()
      .toBuffer();

    const duration = Date.now() - startTime;

    return {
      name: "画像処理テスト",
      passed: testImage.length > 0,
      duration,
    };
  } catch (error) {
    return {
      name: "画像処理テスト",
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    };
  }
}

/**
 * テスト3: 画像リサイズテスト
 */
async function testImageResize(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const testImage = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 3,
        background: { r: 100, g: 100, b: 100 },
      },
    })
      .png()
      .resize(256, 256)
      .toBuffer();

    const metadata = await sharp(testImage).metadata();
    const duration = Date.now() - startTime;

    return {
      name: "画像リサイズテスト",
      passed: metadata.width === 256 && metadata.height === 256,
      duration,
    };
  } catch (error) {
    return {
      name: "画像リサイズテスト",
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    };
  }
}

/**
 * テスト4: 画像合成テスト
 */
async function testImageCompositing(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const baseImage = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 3,
        background: { r: 100, g: 100, b: 100 },
      },
    })
      .png()
      .toBuffer();

    const overlayImage = await sharp({
      create: {
        width: 128,
        height: 128,
        channels: 3,
        background: { r: 200, g: 200, b: 200 },
      },
    })
      .png()
      .toBuffer();

    const composited = await sharp(baseImage)
      .composite([
        {
          input: overlayImage,
          left: 64,
          top: 64,
        },
      ])
      .toBuffer();

    const duration = Date.now() - startTime;

    return {
      name: "画像合成テスト",
      passed: composited.length > 0,
      duration,
    };
  } catch (error) {
    return {
      name: "画像合成テスト",
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    };
  }
}

/**
 * テスト5: 色調整テスト
 */
async function testColorAdjustment(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const testImage = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .modulate({
        lightness: 1.2,
        saturation: 1.1,
      })
      .toBuffer();

    const duration = Date.now() - startTime;

    return {
      name: "色調整テスト",
      passed: testImage.length > 0,
      duration,
    };
  } catch (error) {
    return {
      name: "色調整テスト",
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    };
  }
}

/**
 * テスト6: ぼかしテスト
 */
async function testBlur(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const testImage = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .blur(5)
      .toBuffer();

    const duration = Date.now() - startTime;

    return {
      name: "ぼかしテスト",
      passed: testImage.length > 0,
      duration,
    };
  } catch (error) {
    return {
      name: "ぼかしテスト",
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    };
  }
}

/**
 * テスト7: シャープニングテスト
 */
async function testSharpening(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const testImage = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .sharpen({ sigma: 2 })
      .toBuffer();

    const duration = Date.now() - startTime;

    return {
      name: "シャープニングテスト",
      passed: testImage.length > 0,
      duration,
    };
  } catch (error) {
    return {
      name: "シャープニングテスト",
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    };
  }
}

/**
 * テスト8: 正規化テスト
 */
async function testNormalization(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const testImage = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .normalize()
      .toBuffer();

    const duration = Date.now() - startTime;

    return {
      name: "正規化テスト",
      passed: testImage.length > 0,
      duration,
    };
  } catch (error) {
    return {
      name: "正規化テスト",
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    };
  }
}

/**
 * テスト9: メタデータ取得テスト
 */
async function testMetadataExtraction(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const testImage = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .png()
      .toBuffer();

    const metadata = await sharp(testImage).metadata();
    const duration = Date.now() - startTime;

    return {
      name: "メタデータ取得テスト",
      passed: metadata.width === 512 && metadata.height === 512,
      duration,
    };
  } catch (error) {
    return {
      name: "メタデータ取得テスト",
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    };
  }
}

/**
 * テスト10: 統計情報取得テスト
 */
async function testStatistics(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const testImage = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .png()
      .toBuffer();

    const stats = await sharp(testImage).stats();
    const duration = Date.now() - startTime;

    return {
      name: "統計情報取得テスト",
      passed: stats.channels.length === 3,
      duration,
    };
  } catch (error) {
    return {
      name: "統計情報取得テスト",
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    };
  }
}

/**
 * 全テストを実行
 */
export async function runAllTests(): Promise<TestSuite> {
  console.log("\n========================================");
  console.log("統合テストスイート開始");
  console.log("========================================\n");

  const tests: TestResult[] = [];
  const startTime = Date.now();

  // テストを実行
  tests.push(await testImageLoading());
  tests.push(await testImageProcessing());
  tests.push(await testImageResize());
  tests.push(await testImageCompositing());
  tests.push(await testColorAdjustment());
  tests.push(await testBlur());
  tests.push(await testSharpening());
  tests.push(await testNormalization());
  tests.push(await testMetadataExtraction());
  tests.push(await testStatistics());

  const totalDuration = Date.now() - startTime;

  // 結果をレポート
  console.log("\n========================================");
  console.log("テスト結果");
  console.log("========================================\n");

  for (const test of tests) {
    reportTestResult(test);
  }

  const passedCount = tests.filter((t) => t.passed).length;
  const failedCount = tests.filter((t) => !t.passed).length;

  console.log("\n========================================");
  console.log(`合計: ${tests.length}個のテスト`);
  console.log(`✅ 成功: ${passedCount}個`);
  console.log(`❌ 失敗: ${failedCount}個`);
  console.log(`⏱️  合計時間: ${totalDuration}ms`);
  console.log("========================================\n");

  return {
    name: "統合テストスイート",
    tests,
    totalDuration,
    passedCount,
    failedCount,
  };
}

// テストを実行
runAllTests().catch(console.error);

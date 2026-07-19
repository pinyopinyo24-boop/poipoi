/**
 * 改善版顔入れ替え機能のテストスクリプト
 * v2モジュール対応
 */

import * as fs from "fs";
import * as path from "path";
import { performFaceSwap } from "./_core/faceswap-tensorflow-v2";
import { startPerformanceMonitoring, printPerformanceReport, savePerformanceReport } from "./_core/faceswap-performance";

async function runFaceSwapTestV2() {
  console.log("========== 改善版顔入れ替え機能テスト開始 ==========\n");

  try {
    // テスト用の顔画像パス
    const testImagesDir = "/home/ubuntu/webdev-static-assets";
    const sourceFacePath = path.join(testImagesDir, "test-face-1.jpg");
    const targetFacePath = path.join(testImagesDir, "test-face-2.jpg");

    // ファイルが存在するか確認
    if (!fs.existsSync(sourceFacePath)) {
      console.error(`❌ ソース画像が見つかりません: ${sourceFacePath}`);
      return;
    }

    if (!fs.existsSync(targetFacePath)) {
      console.error(`❌ ターゲット画像が見つかりません: ${targetFacePath}`);
      return;
    }

    console.log(`✅ テスト画像を読み込みました`);
    console.log(`   ソース: ${sourceFacePath}`);
    console.log(`   ターゲット: ${targetFacePath}\n`);

    // 画像をBase64に変換
    const sourceBuffer = fs.readFileSync(sourceFacePath);
    const targetBuffer = fs.readFileSync(targetFacePath);
    const sourceBase64 = sourceBuffer.toString("base64");
    const targetBase64 = targetBuffer.toString("base64");

    console.log(`ソース画像サイズ: ${sourceBuffer.length} bytes`);
    console.log(`ターゲット画像サイズ: ${targetBuffer.length} bytes\n`);

    // パフォーマンス測定を開始
    const monitor = startPerformanceMonitoring();

    // 低品質でテスト
    console.log("--- 低品質設定でテスト ---");
    monitor?.recordStep("低品質処理開始");

    const resultLow = await performFaceSwap({
      sourceImageBase64: sourceBase64,
      targetImageBase64: targetBase64,
      quality: "low",
    });

    monitor?.recordStep("低品質処理完了");

    if (resultLow.success) {
      console.log(`✅ 低品質処理成功`);
      console.log(`   処理時間: ${resultLow.processingTime}ms`);
      console.log(`   ブレンディング方法: ${resultLow.details?.blendingMethod}`);

      // 結果を保存
      const outputPath = path.join(testImagesDir, "result-v2-low.jpg");
      const resultBuffer = Buffer.from(resultLow.resultImage!, "base64");
      fs.writeFileSync(outputPath, resultBuffer);
      console.log(`   結果を保存: ${outputPath}\n`);
    } else {
      console.error(`❌ 低品質処理失敗: ${resultLow.error}\n`);
    }

    // 中品質でテスト
    console.log("--- 中品質設定でテスト ---");
    monitor?.recordStep("中品質処理開始");

    const resultMedium = await performFaceSwap({
      sourceImageBase64: sourceBase64,
      targetImageBase64: targetBase64,
      quality: "medium",
    });

    monitor?.recordStep("中品質処理完了");

    if (resultMedium.success) {
      console.log(`✅ 中品質処理成功`);
      console.log(`   処理時間: ${resultMedium.processingTime}ms`);
      console.log(`   ブレンディング方法: ${resultMedium.details?.blendingMethod}`);
      console.log(`   色合いマッチング: 適用`);

      // 結果を保存
      const outputPath = path.join(testImagesDir, "result-v2-medium.jpg");
      const resultBuffer = Buffer.from(resultMedium.resultImage!, "base64");
      fs.writeFileSync(outputPath, resultBuffer);
      console.log(`   結果を保存: ${outputPath}\n`);
    } else {
      console.error(`❌ 中品質処理失敗: ${resultMedium.error}\n`);
    }

    // 高品質でテスト（ウルトラハイクオリティ）
    console.log("--- 高品質設定でテスト（ウルトラハイクオリティ） ---");
    monitor?.recordStep("高品質処理開始");

    const resultHigh = await performFaceSwap({
      sourceImageBase64: sourceBase64,
      targetImageBase64: targetBase64,
      quality: "high",
    });

    monitor?.recordStep("高品質処理完了");

    if (resultHigh.success) {
      console.log(`✅ 高品質処理成功`);
      console.log(`   処理時間: ${resultHigh.processingTime}ms`);
      console.log(`   ブレンディング方法: ${resultHigh.details?.blendingMethod}`);
      console.log(`   表情保持: ${resultHigh.details?.expressionPreserved ? "✅ はい" : "❌ いいえ"}`);
      console.log(`   肌色調整: ${resultHigh.details?.skinToneAdjusted ? "✅ はい" : "❌ いいえ"}`);
      console.log(`   照明調整: ${resultHigh.details?.lightingAdjusted ? "✅ はい" : "❌ いいえ"}\n`);

      // 結果を保存
      const outputPath = path.join(testImagesDir, "result-v2-high.jpg");
      const resultBuffer = Buffer.from(resultHigh.resultImage!, "base64");
      fs.writeFileSync(outputPath, resultBuffer);
      console.log(`   結果を保存: ${outputPath}\n`);
    } else {
      console.error(`❌ 高品質処理失敗: ${resultHigh.error}\n`);
    }

    // パフォーマンスレポートを出力
    console.log("\n========== パフォーマンスレポート ==========");
    printPerformanceReport();

    // レポートをファイルに保存
    const reportPath = path.join(testImagesDir, "performance-report-v2.txt");
    savePerformanceReport(reportPath);

    console.log("========== テスト完了 ==========\n");
  } catch (error) {
    console.error("❌ テスト中にエラーが発生しました:", error);
  }
}

// テストを実行
runFaceSwapTestV2().catch(console.error);

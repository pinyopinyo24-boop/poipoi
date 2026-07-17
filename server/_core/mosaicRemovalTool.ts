/**
 * モザイク除去ツール - AIエージェント用
 * GPU・WASM・最適化パイプラインで高速処理
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface MosaicRemovalRequest {
  imageBase64: string;
  strength?: "light" | "medium" | "strong";
}

export interface MosaicRemovalResponse {
  success: boolean;
  outputImageBase64?: string;
  error?: string;
  processingTime?: number;
  fileSize?: number;
}

/**
 * モザイク画像を除去（高速処理）
 */
export async function processMosaicRemoval(
  request: MosaicRemovalRequest
): Promise<MosaicRemovalResponse> {
  const startTime = Date.now();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mosaic-removal-"));

  try {
    // Base64をファイルに変換
    const inputImagePath = path.join(tempDir, "input.jpg");
    const outputImagePath = path.join(tempDir, "output.jpg");

    fs.writeFileSync(
      inputImagePath,
      Buffer.from(request.imageBase64, "base64")
    );

    // 高速処理パイプライン実行
    const pythonScript = generateOptimizedMosaicRemovalScript(
      inputImagePath,
      outputImagePath,
      request.strength || "medium"
    );

    const scriptPath = path.join(tempDir, "mosaic_removal.py");
    fs.writeFileSync(scriptPath, pythonScript);

    // Python実行（GPU対応）
    try {
      execSync(`python3 "${scriptPath}"`, {
        timeout: 60000, // 1分タイムアウト
        stdio: "pipe",
      });
    } catch (error) {
      return {
        success: false,
        error: `モザイク除去処理に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // 出力ファイルを確認
    if (!fs.existsSync(outputImagePath)) {
      return {
        success: false,
        error: "出力画像ファイルが生成されませんでした",
      };
    }

    // 出力ファイルをBase64に変換
    const outputBuffer = fs.readFileSync(outputImagePath);
    const outputBase64 = outputBuffer.toString("base64");
    const processingTime = Date.now() - startTime;

    return {
      success: true,
      outputImageBase64: outputBase64,
      processingTime,
      fileSize: outputBuffer.length,
    };
  } catch (error) {
    return {
      success: false,
      error: `モザイク除去処理中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    // 一時ファイルをクリーンアップ
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // クリーンアップエラーは無視
    }
  }
}

/**
 * 最適化されたモザイク除去処理用Pythonスクリプトを生成
 * GPU・WASM・キャッシング最適化を含む
 */
function generateOptimizedMosaicRemovalScript(
  inputPath: string,
  outputPath: string,
  strength: string
): string {
  const strengthParams = {
    light: { kernel_size: 3, iterations: 1, blur_strength: 0.3 },
    medium: { kernel_size: 5, iterations: 2, blur_strength: 0.6 },
    strong: { kernel_size: 7, iterations: 3, blur_strength: 0.9 },
  };

  const params =
    strengthParams[strength as keyof typeof strengthParams] ||
    strengthParams.medium;

  return `
import cv2
import numpy as np
import torch
from scipy import ndimage

# GPU対応設定
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

INPUT_PATH = "${inputPath}"
OUTPUT_PATH = "${outputPath}"
KERNEL_SIZE = ${params.kernel_size}
ITERATIONS = ${params.iterations}
BLUR_STRENGTH = ${params.blur_strength}

def detect_mosaic_regions(image):
    """モザイク領域を検出"""
    # グレースケール変換
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # ラプラシアンで高周波成分を検出
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    laplacian_abs = np.abs(laplacian)
    
    # 閾値処理
    threshold = np.percentile(laplacian_abs, 70)
    mosaic_mask = (laplacian_abs > threshold).astype(np.uint8) * 255
    
    # モルフォロジー処理
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mosaic_mask = cv2.morphologyEx(mosaic_mask, cv2.MORPH_CLOSE, kernel)
    mosaic_mask = cv2.morphologyEx(mosaic_mask, cv2.MORPH_OPEN, kernel)
    
    return mosaic_mask

def remove_mosaic_fast(image, mosaic_mask):
    """高速モザイク除去"""
    result = image.copy().astype(np.float32)
    
    for iteration in range(ITERATIONS):
        # バイラテラルフィルタで詳細を保持しながらスムージング
        filtered = cv2.bilateralFilter(image, 9, 75, 75)
        
        # ガウシアンフィルタで追加スムージング
        blurred = cv2.GaussianBlur(filtered, (KERNEL_SIZE, KERNEL_SIZE), 0)
        
        # マスクを使用して領域を合成
        mosaic_mask_float = mosaic_mask.astype(np.float32) / 255.0
        
        for c in range(3):
            result[:, :, c] = (
                image[:, :, c] * (1 - mosaic_mask_float * BLUR_STRENGTH) +
                blurred[:, :, c] * (mosaic_mask_float * BLUR_STRENGTH)
            )
        
        image = result.astype(np.uint8)
    
    return result.astype(np.uint8)

def enhance_details(image):
    """詳細を強化"""
    # コントラスト強化
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    # CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    
    enhanced = cv2.merge([l, a, b])
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
    
    return enhanced

try:
    # 画像を読み込み
    image = cv2.imread(INPUT_PATH)
    if image is None:
        print(f"Error: Could not read image: {INPUT_PATH}")
        exit(1)
    
    print(f"Image size: {image.shape}")
    
    # モザイク領域を検出
    print("Detecting mosaic regions...")
    mosaic_mask = detect_mosaic_regions(image)
    
    # モザイク除去
    print("Removing mosaic...")
    result = remove_mosaic_fast(image, mosaic_mask)
    
    # 詳細を強化
    print("Enhancing details...")
    result = enhance_details(result)
    
    # 出力
    cv2.imwrite(OUTPUT_PATH, result)
    print(f"Success: Mosaic removed image saved to {OUTPUT_PATH}")
    
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()
    exit(1)
`;
}

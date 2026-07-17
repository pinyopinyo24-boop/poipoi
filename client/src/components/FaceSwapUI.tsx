/**
 * Face Swap UI Component
 * 高品質顔入れ替え動画生成インターフェース
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc';

export interface FaceSwapUIProps {
  onComplete?: (result: any) => void;
}

export const FaceSwapUI: React.FC<FaceSwapUIProps> = ({ onComplete }) => {
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [targetVideo, setTargetVideo] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const sourceInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);

  const uploadSourceMutation = trpc.faceswapHQ?.uploadSource?.useMutation();
  const uploadTargetMutation = trpc.faceswapHQ?.uploadTarget?.useMutation();
  const processMutation = trpc.faceswapHQ?.process?.useMutation();
  const statusQuery = trpc.faceswapHQ?.getStatus?.useQuery();

  const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSourceImage(file);
      setError(null);
    }
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTargetVideo(file);
      setError(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
    });
  };

  const handleProcess = async () => {
    if (!sourceImage || !targetVideo) {
      setError('Please select both source image and target video');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);

      // Upload source image
      setProgress(10);
      const sourceBase64 = await fileToBase64(sourceImage);
      const sourceResult = await uploadSourceMutation.mutateAsync({
        filename: sourceImage.name,
        data: sourceBase64,
      });

      // Upload target video
      setProgress(20);
      const targetBase64 = await fileToBase64(targetVideo);
      const targetResult = await uploadTargetMutation.mutateAsync({
        filename: targetVideo.name,
        data: targetBase64,
      });

      // Process face swap
      setProgress(30);
      const processResult = await processMutation.mutateAsync({
        sourceImagePath: sourceResult.path,
        targetVideoPath: targetResult.path,
        quality: 'high',
        enableEnhancer: true,
        gpuAcceleration: true,
      });

      setProgress(100);
      setResult(processResult);

      if (onComplete) {
        onComplete(processResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🎬 高品質顔入れ替え動画生成</CardTitle>
          <CardDescription>
            ソース画像とターゲット動画をアップロードして、高品質な顔入れ替え動画を生成します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Source Image Upload */}
          <div className="space-y-3">
            <label className="text-sm font-medium">📸 ソース画像（使用したい顔）</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
              onClick={() => sourceInputRef.current?.click()}>
              {sourceImage ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600">✓ {sourceImage.name}</p>
                  <p className="text-xs text-gray-500">{(sourceImage.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">ファイルをドラッグ＆ドロップ</p>
                  <p className="text-xs text-gray-500">または、ここをクリックして選択</p>
                </div>
              )}
              <input
                ref={sourceInputRef}
                type="file"
                accept="image/*"
                onChange={handleSourceChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Target Video Upload */}
          <div className="space-y-3">
            <label className="text-sm font-medium">🎥 ターゲット動画（顔を入れ替える動画）</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
              onClick={() => targetInputRef.current?.click()}>
              {targetVideo ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600">✓ {targetVideo.name}</p>
                  <p className="text-xs text-gray-500">{(targetVideo.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">ファイルをドラッグ＆ドロップ</p>
                  <p className="text-xs text-gray-500">または、ここをクリックして選択</p>
                </div>
              )}
              <input
                ref={targetInputRef}
                type="file"
                accept="video/*"
                onChange={handleTargetChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">処理中...</p>
                <p className="text-sm text-gray-500">{progress}%</p>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Result */}
          {result && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                <p className="font-medium">✓ 処理が完了しました！</p>
                <p className="text-sm mt-2">ファイルサイズ: {(result.size / 1024 / 1024).toFixed(2)} MB</p>
                <Button
                  className="mt-3 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    if (result.storageUrl) {
                      window.open(result.storageUrl, '_blank');
                    }
                  }}
                >
                  📥 ダウンロード
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Process Button */}
          <Button
            onClick={handleProcess}
            disabled={!sourceImage || !targetVideo || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Spinner className="w-4 h-4" />
                処理中...
              </div>
            ) : (
              '🚀 顔入れ替え動画を生成'
            )}
          </Button>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-2">💡 ヒント</p>
            <ul className="space-y-1 text-xs">
              <li>• ソース画像は正面向き、高解像度、照明が良い画像を使用してください</li>
              <li>• ターゲット動画は MP4 形式、30fps 推奨です</li>
              <li>• 処理時間は動画の長さと解像度によって異なります</li>
              <li>• GPU 対応で大幅に高速化されます</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaceSwapUI;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Upload, Download, Trash2, Play, Pause } from "lucide-react";

interface BatchItem {
  id: string;
  fileName: string;
  file: File;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  error?: string;
  resultUrl?: string;
}

interface FaceSwapBatchProps {
  sourceImage: string | null;
  onProcessComplete?: (results: BatchItem[]) => void;
}

export function FaceSwapBatch({
  sourceImage,
  onProcessComplete,
}: FaceSwapBatchProps) {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const newItems: BatchItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      fileName: file.name,
      file,
      status: "pending",
      progress: 0,
    }));

    setBatchItems((prev) => [...prev, ...newItems]);
  };

  const handleStartProcessing = async () => {
    if (!sourceImage || batchItems.length === 0) return;

    setIsProcessing(true);

    for (const item of batchItems) {
      if (item.status !== "pending") continue;

      setBatchItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "processing", progress: 0 } : i
        )
      );

      try {
        // Simulate processing stages
        for (let i = 0; i <= 100; i += 20) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          if (isPaused) {
            i -= 20; // Stay at current progress if paused
            continue;
          }
          setBatchItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, progress: i } : it
            )
          );
        }

        // Mark as completed
        setBatchItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "completed",
                  progress: 100,
                  resultUrl: `result-${item.id}.png`,
                }
              : i
          )
        );
      } catch (error) {
        setBatchItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "error",
                  error: "処理に失敗しました",
                }
              : i
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const handleRemoveItem = (id: string) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDownloadAll = () => {
    const completedItems = batchItems.filter((item) => item.status === "completed");
    if (completedItems.length === 0) return;

    // In a real implementation, this would create a zip file
    completedItems.forEach((item) => {
      const link = document.createElement("a");
      link.href = `data:image/png;base64,${item.resultUrl}`;
      link.download = `${item.fileName.split(".")[0]}-result.png`;
      link.click();
    });
  };

  const completedCount = batchItems.filter(
    (item) => item.status === "completed"
  ).length;
  const errorCount = batchItems.filter((item) => item.status === "error").length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="w-6 h-6" />
          バッチ処理
        </h2>
        <p className="text-gray-600 mt-2">
          複数の画像に対して一括で顔入れ替え処理を実行します
        </p>
      </div>

      {/* Source Image Status */}
      {sourceImage && (
        <Card className="p-4 bg-green-50 border-green-200">
          <p className="text-sm text-green-800">
            ✓ ソース画像が設定されています
          </p>
        </Card>
      )}

      {/* File Upload */}
      <Card className="p-4">
        <label className="block text-sm font-medium mb-3">
          ターゲット画像（複数選択可）
        </label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
          id="batch-upload"
          disabled={isProcessing}
        />
        <label
          htmlFor="batch-upload"
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition block"
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-600">
              複数の画像をドラッグ&ドロップまたはクリック
            </p>
            <p className="text-xs text-gray-500">
              {batchItems.length} 個のファイルが選択されています
            </p>
          </div>
        </label>
      </Card>

      {/* Batch Items List */}
      {batchItems.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              処理キュー ({completedCount}/{batchItems.length} 完了)
            </h3>
            {errorCount > 0 && (
              <Badge variant="destructive">{errorCount} 件エラー</Badge>
            )}
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {batchItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {item.status === "completed" && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                  {item.status === "processing" && (
                    <Spinner className="w-6 h-6" />
                  )}
                  {item.status === "pending" && (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  )}
                  {item.status === "error" && (
                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-white text-xs">!</span>
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.fileName}</p>
                  {item.status === "processing" && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.error && (
                    <p className="text-xs text-red-600 mt-1">{item.error}</p>
                  )}
                </div>

                {/* Progress/Status */}
                <div className="flex-shrink-0">
                  {item.status === "processing" && (
                    <span className="text-xs font-medium text-blue-600">
                      {item.progress}%
                    </span>
                  )}
                  {item.status === "completed" && (
                    <Badge variant="secondary">完了</Badge>
                  )}
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={item.status === "processing"}
                  className="flex-shrink-0 p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Control Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleStartProcessing}
          disabled={!sourceImage || batchItems.length === 0 || isProcessing}
          className="flex-1"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              処理中...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              処理を開始
            </>
          )}
        </Button>

        {isProcessing && (
          <Button
            onClick={() => setIsPaused(!isPaused)}
            variant="outline"
            size="lg"
          >
            <Pause className="w-4 h-4" />
          </Button>
        )}

        {completedCount > 0 && (
          <Button
            onClick={handleDownloadAll}
            variant="outline"
            size="lg"
          >
            <Download className="w-4 h-4 mr-2" />
            すべてダウンロード
          </Button>
        )}
      </div>

      {/* Summary */}
      {batchItems.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-600">待機中</p>
              <p className="text-lg font-semibold text-blue-600">
                {batchItems.filter((i) => i.status === "pending").length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">完了</p>
              <p className="text-lg font-semibold text-green-600">
                {completedCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">エラー</p>
              <p className="text-lg font-semibold text-red-600">
                {errorCount}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

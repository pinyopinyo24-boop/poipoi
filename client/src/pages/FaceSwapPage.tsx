import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';

type FileType = 'image' | 'video';

export default function FaceSwapPage() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [targetFile, setTargetFile] = useState<string | null>(null);
  const [targetFileType, setTargetFileType] = useState<FileType>('image');
  const [resultFile, setResultFile] = useState<string | null>(null);
  const [resultFileType, setResultFileType] = useState<FileType>('image');
  const [isProcessing, setIsProcessing] = useState(false);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [progress, setProgress] = useState(0);
  const [hdQuality, setHdQuality] = useState(true);
  const [useHD1080p, setUseHD1080p] = useState(true);
  
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const targetInputRef = useRef<HTMLInputElement>(null);
  
  const faceSwapMutation = trpc.fileUpload.swap.useMutation();
  const videoFaceSwapMutation = trpc.fileUpload.swapVideo.useMutation();

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: string | null) => void,
    setType?: (type: FileType) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('ファイルサイズが大きすぎます（最大500MB）');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    // Video processing is now enabled

    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        setFile(result);
        if (setType) {
          setType(isVideo ? 'video' : 'image');
        }
        toast.success(`${isVideo ? '動画' : '画像'}をアップロードしました`);
      } catch (error) {
        console.error('ファイル読み込みエラー:', error);
        toast.error('ファイルの読み込みに失敗しました');
      }
    };
    
    reader.onerror = () => {
      toast.error('ファイルの読み込みに失敗しました');
    };
    
    reader.readAsDataURL(file);
  };

  const handleSwap = async () => {
    if (!sourceImage || !targetFile) {
      toast.error('ソース画像とターゲットファイルを選択してください');
      return;
    }
    
    // 動画処理を有効化
    if (targetFileType === 'video') {
      // 動画処理を実行
      setProgress(50);
      const result = await videoFaceSwapMutation.mutateAsync({
        sourceImage: sourceImage,
        targetVideo: targetFile,
        quality,
      });
      
      setProgress(90);
      
      if (result.success && result.resultVideo) {
        setResultFile(result.resultVideo);
        setResultFileType('video');
        toast.success(`動画顔入れ替え完了（${result.processingTime}ms）`);
      } else {
        toast.error(result.message || '動画顔入れ替えに失敗しました');
      }
      setIsProcessing(false);
      setProgress(100);
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      if (false) {
        // 動画処理コード（無効化）
      }
      
      setProgress(50);
      const result = await faceSwapMutation.mutateAsync({
        sourceImage: sourceImage,
        targetImage: targetFile,
        quality,
      });

      setProgress(90);

      if (result.success && result.resultImage) {
        setResultFile(`data:image/jpeg;base64,${result.resultImage}`);
        setResultFileType('image');
        toast.success(`顔入れ替え完了（${result.processingTime}ms）`);
      } else {
        toast.error(result.message || '顔入れ替えに失敗しました');
      }

      setProgress(100);
    } catch (error) {
      console.error('処理エラー:', error);
      toast.error('処理中にエラーが発生しました');
      setIsProcessing(false);
      setProgress(0);
      return;
    }

    setIsProcessing(false);
  };

  const handleDownload = useCallback(() => {
    if (!resultFile) {
      toast.error('ダウンロードするファイルがありません');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = resultFile;
      link.download = `result_${Date.now()}.${resultFileType === 'video' ? 'mp4' : 'jpg'}`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      toast.success('ダウンロード完了');
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      toast.error(`ダウンロード失敗: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }, [resultFile, resultFileType]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">顔入れ替えツール</h1>
          <p className="text-gray-600 mb-4">画像の顔を入れ替えます</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
            <p className="text-sm text-blue-800">💡 ヒント: より高い品質を得るため、正面を向いた顔写真をアップロードしてください</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* ソース画像 */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-semibold">1</span>
              <h2 className="text-xl font-semibold">元の写真をアップロード</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">正面顔が推奨されます</p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  const input = sourceInputRef.current;
                  if (input) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    input.files = dataTransfer.files;
                    handleImageUpload(
                      { target: { files: dataTransfer.files } } as any,
                      setSourceImage
                    );
                  }
                }
              }}
              onClick={() => sourceInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition"
            >
              {sourceImage ? (
                <div>
                  <img
                    src={sourceImage}
                    alt="Source"
                    className="max-h-48 mx-auto rounded mb-4"
                  />
                  <p className="text-gray-600">クリックして変更</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 text-lg mb-2">📸 画像をドラッグ&ドロップ</p>
                  <p className="text-gray-500 text-sm">またはクリックして選択</p>
                </div>
              )}
            </div>
            <input
              ref={sourceInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, setSourceImage)}
              className="hidden"
            />
          </Card>

          {/* ターゲットファイル */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-semibold">2</span>
              <h2 className="text-xl font-semibold">ターゲット画像をアップロード</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">正面顔が推奨されます</p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  const input = targetInputRef.current;
                  if (input) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    input.files = dataTransfer.files;
                    handleImageUpload(
                      { target: { files: dataTransfer.files } } as any,
                      setTargetFile,
                      setTargetFileType
                    );
                  }
                }
              }}
              onClick={() => targetInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition"
            >
              {targetFile ? (
                <div>
                  {targetFileType === 'video' ? (
                    <div className="text-center">
                      <p className="text-2xl mb-2">🎬</p>
                      <p className="text-gray-600">動画ファイル</p>
                    </div>
                  ) : (
                    <img
                      src={targetFile}
                      alt="Target"
                      className="max-h-48 mx-auto rounded mb-4"
                    />
                  )}
                  <p className="text-gray-600">クリックして変更</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 text-lg mb-2">🎬 ファイルをドラッグ&ドロップ</p>
                  <p className="text-gray-500 text-sm">またはクリックして選択</p>
                </div>
              )}
            </div>
            <input
              ref={targetInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={(e) => handleImageUpload(e, setTargetFile, setTargetFileType)}
              className="hidden"
            />
          </Card>
        </div>

        {/* 処理品質 */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">処理品質</h2>
          <div className="flex gap-4 mb-4">
            {(['low', 'medium', 'high'] as const).map((q) => (
              <Button
                key={q}
                onClick={() => setQuality(q)}
                variant={quality === q ? 'default' : 'outline'}
                className="flex-1"
              >
                {q === 'low' ? '低' : q === 'medium' ? '中' : '高'}
              </Button>
            ))}
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hdQuality}
                onChange={(e) => setHdQuality(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">HD画質</span>
              <span className="text-xs text-gray-500">1080P以上の画像で有効化を推奨</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useHD1080p}
                onChange={(e) => setUseHD1080p(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">1080P最高品質</span>
              <span className="text-xs text-gray-500">最高品質処理を有効化</span>
            </label>
          </div>
        </Card>

        {/* 処理実行ボタン */}
        <Button
          onClick={handleSwap}
          disabled={isProcessing || !sourceImage || !targetFile}
          className="w-full py-6 text-lg font-semibold mb-8"
        >
          {isProcessing ? (
            <>
              <Spinner className="mr-2" />
              処理中... {progress}%
            </>
          ) : (
            '処理実行'
          )}
        </Button>

        {/* 結果表示 */}
        {resultFile && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">処理結果</h2>
            {resultFileType === 'video' ? (
              <div className="text-center">
                <p className="text-2xl mb-4">📹</p>
                <p className="text-gray-600 mb-4">動画処理完了</p>
              </div>
            ) : (
              <img
                src={resultFile}
                alt="Result"
                className="max-h-96 mx-auto rounded mb-4"
              />
            )}
            <Button
              onClick={handleDownload}
              className="w-full"
              variant="default"
            >
              📥 ファイルをダウンロード
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface LocalProcessingTabProps {
  sourceFileId?: string;
  targetFileId?: string;
  onProcessingComplete?: (jobId: string) => void;
}

export function LocalProcessingTab({
  sourceFileId,
  targetFileId,
  onProcessingComplete,
}: LocalProcessingTabProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // tRPC mutations and queries
  const startProcessingMutation = trpc.facefusionHybrid.startProcessing.useMutation();
  const statusMutation = trpc.facefusionHybrid.getProcessingStatus.useMutation();
  
  // Poll for status updates
  useEffect(() => {
    if (!jobId || !isProcessing) return;
    
    const interval = setInterval(async () => {
      try {
        const result = await statusMutation.mutateAsync({ jobId });
        setProgress(result.progress);
        
        if (result.status === 'completed') {
          setStatus('completed');
          setIsProcessing(false);
          toast.success('処理が完了しました！');
          if (onProcessingComplete) {
            onProcessingComplete(jobId);
          }
        } else if (result.status === 'failed') {
          setStatus('error');
          setIsProcessing(false);
          setError(result.error || '処理中にエラーが発生しました');
          toast.error('処理に失敗しました');
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [jobId, isProcessing, statusMutation, onProcessingComplete]);



  const handleStartProcessing = async () => {
    if (!sourceFileId || !targetFileId) {
      toast.error('ソース画像とターゲット動画を選択してください');
      return;
    }

    try {
      setIsProcessing(true);
      setStatus('processing');
      setProgress(0);
      setError(null);

      const result = await startProcessingMutation.mutateAsync({
        sourceFileId,
        targetFileId,
        model: 'inswapper_128',
        quality: 18,
      });

      if (result.success) {
        setJobId(result.jobId);
        toast.success('処理を開始しました');
      }
    } catch (error) {
      setIsProcessing(false);
      setStatus('error');
      const errorMessage = error instanceof Error ? error.message : '処理の開始に失敗しました';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Processing Status */}
      {isProcessing && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Spinner className="w-5 h-5" />
              <span className="font-semibold text-blue-900">処理中...</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-blue-800">
                <span>進捗</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <p className="text-sm text-blue-700">
              処理中です。このページを閉じないでください。
            </p>
          </div>
        </Card>
      )}

      {/* Completed Status */}
      {status === 'completed' && (
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <span className="font-semibold text-green-900">処理完了！</span>
            </div>
            <p className="text-sm text-green-700">
              顔入れ替え処理が完了しました。「ファイル管理」タブから結果をダウンロードできます。
            </p>
          </div>
        </Card>
      )}

      {/* Error Status */}
      {status === 'error' && error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            <strong>エラー:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Processing Controls */}
      {status === 'idle' && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">処理設定</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>✓ モデル: InSwapper 128</p>
                <p>✓ 品質: 標準 (18)</p>
                <p>✓ 推定時間: 3-5分</p>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm text-blue-800">
              <p className="font-semibold mb-1">💡 ヒント</p>
              <p>
                処理中はこのページを閉じないでください。ブラウザを閉じると処理が中断される可能性があります。
              </p>
            </div>

            <Button
              onClick={handleStartProcessing}
              disabled={!sourceFileId || !targetFileId || isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  処理中...
                </>
              ) : (
                '🚀 処理を実行'
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Info Box */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-800 text-sm">
          <strong>ℹ️ 注意:</strong> 処理中はサーバーのリソースを使用します。大きなファイルの場合、処理に時間がかかる可能性があります。
        </AlertDescription>
      </Alert>
    </div>
  );
}

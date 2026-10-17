import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

interface CloudProcessingTabProps {
  sourceFileId?: string;
  targetFileId?: string;
}

export function CloudProcessingTab({ sourceFileId, targetFileId }: CloudProcessingTabProps) {
  const [quality, setQuality] = useState(18);
  const [model, setModel] = useState<'inswapper_128' | 'inswapper_128_fp16'>('inswapper_128');
  const [loading, setLoading] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);

  // tRPC queries
  const startProcessingMutation = trpc.facefusionHybrid.startProcessing.useMutation();
  const getSettingsQuery = trpc.colabIntegration.getRecommendedSettings.useQuery();
  const getUploadedFilesQuery = trpc.facefusionHybrid.getUploadedFiles.useMutation();
  const getProcessingStatusMutation = trpc.facefusionHybrid.getProcessingStatus.useMutation();
  const downloadResultMutation = trpc.facefusionHybrid.downloadProcessingResult.useMutation();
  const getProcessingStatus = getProcessingStatusMutation.mutateAsync;
  const downloadProcessingResult = downloadResultMutation.mutateAsync;

  useEffect(() => {
    if (!activeJobId) return;
    let stopped = false;
    const poll = async () => {
      try {
        const status = await getProcessingStatus({ jobId: activeJobId });
        if (stopped) return;
        setJobProgress(status.progress);
        if (status.status === 'completed') {
          const result = await downloadProcessingResult({ jobId: activeJobId });
          if (stopped) return;
          const bytes = Uint8Array.from(atob(result.fileData), (character) => character.charCodeAt(0));
          const url = URL.createObjectURL(new Blob([bytes], { type: result.mimeType }));
          const link = document.createElement('a');
          link.href = url;
          link.download = result.filename;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
          setActiveJobId(null);
          toast.success('Colabの処理結果をPoiPoiからダウンロードしました');
        } else if (status.status === 'failed') {
          setActiveJobId(null);
          toast.error(status.error || 'Colabの処理に失敗しました');
        }
      } catch (error) {
        if (!stopped) {
          setActiveJobId(null);
          toast.error(error instanceof Error ? error.message : '処理状況を取得できませんでした');
        }
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 4000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [activeJobId, getProcessingStatus, downloadProcessingResult]);

  const handleLaunchColab = async () => {
    try {
      setLoading(true);

      if (!sourceFileId || !targetFileId) {
        throw new Error('Source and target files are required');
      }

      // Create a Colab notebook for the selected files.
      const result = await startProcessingMutation.mutateAsync({
        sourceFileId,
        targetFileId,
        mode: 'colab',
        model,
        quality,
      });

      if (!result.success) {
        throw new Error('Failed to start processing');
      }

      // Colab URL を新しいタブで開く
      if (result.colabUrl) {
        window.open(result.colabUrl, '_blank');
      }
      if (result.jobId) {
        setJobProgress(0);
        setActiveJobId(result.jobId);
      }

      toast.success('Colabノートブックを作成しました。開いたページで実行ボタンを押してください。');
    } catch (error) {
      console.error('Error launching Colab:', error);
      toast.error('Google Colab の起動に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshResults = async () => {
    try {
      setLoading(true);
      await getUploadedFilesQuery.mutateAsync();
      toast.success('結果を更新しました');
    } catch (error) {
      console.error('Error refreshing results:', error);
      toast.error('結果の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const settings = getSettingsQuery.data;

  return (
    <div className="space-y-6">
      {/* 設定 */}
      {activeJobId && (
        <Card className="p-6 bg-blue-900 border-blue-700" aria-live="polite">
          <h3 className="text-lg font-semibold text-white mb-3">Colab処理の段階表示</h3>
          <div className="h-2 overflow-hidden rounded bg-blue-950">
            <div className="h-full bg-cyan-400 transition-all" style={{ width: `${jobProgress}%` }} />
          </div>
          <p className="mt-2 text-sm text-blue-100">準備・返却段階: {jobProgress}% — FaceFusion処理中はこの値が変わらない場合があります。完了後に結果を自動でダウンロードします。</p>
        </Card>
      )}

      <Card className="p-6 bg-slate-800 border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">⚙️ 処理設定</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              モデル: {model}
            </label>
            <select
              value={model}
              onChange={(e) => {
                const nextModel = e.target.value;
                if (nextModel === 'inswapper_128' || nextModel === 'inswapper_128_fp16') {
                  setModel(nextModel);
                }
              }}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            >
              <option value="inswapper_128">InSwapper 128</option>
              <option value="inswapper_128_fp16">InSwapper 128 FP16</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              品質: {quality}
            </label>
            <input
              type="range"
              min="0"
              max="51"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-slate-400 mt-1">低い値ほど高品質ですが処理時間が長くなります</p>
          </div>

          {settings && (
            <div className="bg-slate-700 p-3 rounded text-sm text-slate-300">
              <p>利用可能なモデル: {settings.models?.length || 0} 個</p>
            </div>
          )}
        </div>
      </Card>

      {/* アクション */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">🚀 処理開始</h3>

        <div className="space-y-3">
          <Button
            onClick={handleLaunchColab}
            disabled={loading || startProcessingMutation.isPending || !sourceFileId || !targetFileId}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
          >
            {loading || startProcessingMutation.isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                準備中...
              </>
            ) : (
              <>
                🚀 Google Colab で処理を開始
              </>
            )}
          </Button>

          <Button
            onClick={() => setShowScript(!showScript)}
            variant="outline"
            className="w-full"
          >
            {showScript ? '🙈 詳細を隠す' : '👁️ 詳細を表示'}
          </Button>

          <Button
            onClick={handleRefreshResults}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                更新中...
              </>
            ) : (
              <>
                🔄 結果を更新
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* 手順 */}
      <Card className="p-6 bg-slate-800 border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">📋 処理手順</h3>
        <div className="space-y-3 text-slate-300">
          <div className="flex gap-3">
            <div className="text-2xl">1️⃣</div>
            <div>
              <p className="font-semibold text-white">「Google Colab で処理を開始」をクリック</p>
              <p className="text-sm">Colab のページが開いたら、上部の実行ボタンを押してください</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-2xl">2️⃣</div>
            <div>
              <p className="font-semibold text-white">Colabで処理の完了を待つ</p>
              <p className="text-sm">Colab で FaceFusion による顔入れ替え処理が実行されます（初回は数分かかります）</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-2xl">3️⃣</div>
            <div>
              <p className="font-semibold text-white">結果がPoiPoiに返却される</p>
              <p className="text-sm">ノートブックの処理完了後、結果がPoiPoiに保存されます</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-2xl">4️⃣</div>
            <div>
              <p className="font-semibold text-white">結果をダウンロード</p>
              <p className="text-sm">ポイポイのファイルタブから生成された動画をダウンロードします</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 処理ステータス */}
      {startProcessingMutation.isPending && (
        <Card className="p-6 bg-blue-900 border-blue-700">
          <h3 className="text-lg font-semibold text-white mb-4">⏳ 処理中...</h3>
          <div className="flex items-center gap-3">
            <Spinner className="h-5 w-5" />
            <p className="text-blue-100">Colabノートブックを作成しています。</p>
          </div>
        </Card>
      )}

      {/* 注意事項 */}
      <Alert className="bg-yellow-900 border-yellow-700">
        <AlertDescription className="text-yellow-100">
          <strong>⚠️ 注意:</strong> Colabノートブックは開いた後に実行ボタンを押してください。処理中はセッションが切断されないようにしてください。
        </AlertDescription>
      </Alert>
    </div>
  );
}

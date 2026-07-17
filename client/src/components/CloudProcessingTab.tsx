import React, { useState } from 'react';
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
  const [model, setModel] = useState('inswapper_128');
  const [loading, setLoading] = useState(false);
  const [showScript, setShowScript] = useState(false);

  // tRPC queries
  const startProcessingMutation = trpc.facefusionHybrid.startProcessing.useMutation();
  const getSettingsQuery = trpc.colabIntegration.getRecommendedSettings.useQuery();
  const getUploadedFilesQuery = trpc.facefusionHybrid.getUploadedFiles.useMutation();

  const handleLaunchColab = async () => {
    try {
      setLoading(true);

      if (!sourceFileId || !targetFileId) {
        throw new Error('Source and target files are required');
      }

      // バックエンドで直接 Colab を実行
      const result = await startProcessingMutation.mutateAsync({
        sourceFileId,
        targetFileId,
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

      toast.success('Google Colab で処理が開始されました。完了後、自動的にポイポイに結果が返却されます。');
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
      <Card className="p-6 bg-slate-800 border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">⚙️ 処理設定</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              モデル: {model}
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            >
              <option value="inswapper_128">InSwapper 128</option>
              <option value="inswapper_128_fp16">InSwapper 128 FP16</option>
              <option value="gfpgan">GFPGAN</option>
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
              <p className="text-sm">Colab のページが開き、自動で処理が実行されます</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-2xl">2️⃣</div>
            <div>
              <p className="font-semibold text-white">処理の完了を待つ</p>
              <p className="text-sm">Colab で FaceFusion による顔入れ替え処理が実行されます（初回は数分かかります）</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-2xl">3️⃣</div>
            <div>
              <p className="font-semibold text-white">結果が自動返却</p>
              <p className="text-sm">処理完了後、自動的にポイポイに結果が返却されます</p>
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
            <p className="text-blue-100">Google Colab で処理が実行中です。完了後、自動的に結果がポイポイに返却されます。</p>
          </div>
        </Card>
      )}

      {/* 注意事項 */}
      <Alert className="bg-yellow-900 border-yellow-700">
        <AlertDescription className="text-yellow-100">
          <strong>⚠️ 注意:</strong> 初回実行時は FaceFusion のインストールに数分かかります。セッションが切断されないようにご注意ください。処理完了後、自動的にポイポイに結果が返却されます。
        </AlertDescription>
      </Alert>
    </div>
  );
}

import { useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

function previewDate(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return '日時不明';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '日時不明' : date.toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

export default function AZEvolutionPanel({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const { user } = useAuth();
  const [request, setRequest] = useState('');
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [typeCheck, setTypeCheck] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState('');
  const approvalLock = useRef(false);
  const utils = trpc.useUtils();
  const approvalQuery = { accountId: String(user?.id ?? ""), includeHistory: true };
  const pending = trpc.unifiedTools.listCodePreviews.useQuery({ accountId: String(user?.id ?? ""), includeHistory: true }, {
    enabled: user?.role === 'admin', refetchInterval: 10000,
  });
  const generate = trpc.unifiedTools.codePreview.useMutation();
  const apply = trpc.unifiedTools.applyCodePreview.useMutation();
  const reject = trpc.unifiedTools.rejectCodePreview.useMutation();
  const busy = generate.isPending || apply.isPending || reject.isPending;
  const statusLabels = { generating: '変更案を作成中', pending: '承認待ち', applying: '作業中・完了未確認', applied: '適用・Gitコミット済み', failed: '適用失敗', rejected: '却下済み' } as const;
  const phaseLabels: Record<string, string> = {
    preparing: '適用準備中', 'checking-source': '変更対象を確認中',
    'loading-compiler': '構文確認の準備中',
    'checking-syntax': '構文を確認中', 'checking-local-changes': '未保存の変更を確認中',
    'writing-files': 'ファイルを作成・更新中', 'type-checking': '承認された型チェックを実行中',
    committing: 'Gitコミット中', completed: '完了', failed: '失敗', interrupted: '処理中断・完了未確認',
  };
  const create = async () => {
    setResult('');
    try {
      await generate.mutateAsync({ request });
      setRequest(''); await pending.refetch();
      setResult('変更案を生成しました。まだ適用していません。');
    } catch (error) { setResult(error instanceof Error ? error.message : String(error)); }
  };
  const approve = async (previewId: string, resume = false) => {
    if (approvalLock.current || busy || !reviewed[previewId]) return;
    if (!window.confirm(resume ? '中断した承認済みファイルを照合し、型チェック・Gitコミットを続けますか？ 内容が異なる場合は停止します。' : typeCheck[previewId]
      ? '表示された変更の適用・型チェック・Gitコミットを承認しますか？ テスト・ビルド・再起動は行いません。'
      : '表示された変更の適用・Gitコミットを承認しますか？ 型チェック・テスト・ビルド・再起動は行いません。')) return;
    approvalLock.current = true;
    setResult('');
    try {
      await utils.unifiedTools.listCodePreviews.cancel(approvalQuery);
      // The user confirmed this approval. Switch the pending notice to working immediately;
      // "applying" does not claim that file creation or Git commit succeeded.
      utils.unifiedTools.listCodePreviews.setData(approvalQuery, current =>
        current?.map(preview => preview.previewId === previewId
          ? { ...preview, status: 'applying' as const, interrupted: false, canResume: false }
          : preview));
      const outcome = await apply.mutateAsync({ previewId,
        confirm: resume || typeCheck[previewId] ? 'APPLY_AND_VERIFY' : 'APPLY_ONLY', resume });
      setResult(outcome.success
        ? `適用・Gitコミット済み。型チェック: ${outcome.typeChecked ? '実行済み' : '未実行'}。テスト・実動作確認は未実施です。`
        : `適用失敗: ${outcome.error ?? '詳細不明'}。復元結果はエラー詳細を確認してください。`);
      await pending.refetch();
    } catch (error) {
      setResult(error instanceof Error ? error.message : String(error));
      // A rejected request may still be pending. Restore the server's status,
      // without retrying an application whose outcome is unknown.
      await pending.refetch();
    } finally {
      approvalLock.current = false;
    }
  };
  const orderedPreviews = [...(pending.data ?? [])].sort((a, b) => {
    const activityTime = (preview: typeof a) => Math.max(preview.application?.startedAt ?? 0,
      preview.generation?.startedAt ?? 0) || preview.updatedAt || 0;
    return activityTime(b) - activityTime(a);
  });
  const [currentPreview, ...history] = orderedPreviews;
  const renderPreview = (preview: NonNullable<typeof pending.data>[number]) => <section key={preview.previewId} className="space-y-3 rounded border p-3">
        <p className="text-xs text-gray-600">
          最終更新: {previewDate(preview.updatedAt)} ・ ID: <span title={preview.previewId}>{preview.previewId.slice(0, 8)}</span>
        </p>
        {(preview.application?.startedAt ?? preview.generation?.startedAt) !== undefined &&
          <p className="text-xs text-gray-600">{preview.application ? '適用開始' : '生成開始'}: {previewDate(preview.application?.startedAt ?? preview.generation?.startedAt)}</p>}
        {preview.generation && <p className="line-clamp-2 break-words text-sm text-gray-600" title={preview.generation.request}>依頼: {preview.generation.request}</p>}
        <p role="status">{preview.interrupted ? '処理中断・完了未確認' : preview.status === 'failed' && preview.generation?.error && !preview.application
          ? '生成失敗・未適用' : statusLabels[preview.status]}{preview.status !== 'generating' && preview.changes.length > 0 && <>・{preview.changes.length}ファイル</>}
          {preview.status === 'pending' && <>。有効期限まで約{Math.ceil(preview.expiresInSeconds / 60)}分</>}</p>
        {preview.generation && <p className="text-sm">{preview.generation.phase}</p>}
        {preview.generation?.error && <p role="alert" className="text-sm text-red-700">{preview.generation.error}</p>}
        {preview.generation?.reviewWarning && <p role="alert" className="text-sm text-amber-800">{preview.generation.reviewWarning}</p>}
        {preview.status === 'pending' && preview.generation?.typeChecked && <p className="text-sm">承認前の型・import検査: 合格。実動作は未確認です。</p>}
        {preview.application && <p className="text-sm">{phaseLabels[preview.application.phase] ?? '処理状況を確認中'}</p>}
        {preview.status === 'applying' && !preview.interrupted && <p className="text-sm">作業中（完了未確認）です。再承認せずお待ちください。完了・失敗の結果はチャットに表示します。</p>}
        {preview.interrupted && <p role="alert" className="text-sm text-red-700">承認処理が中断しています。作業中ではありません。ファイルとGitの完了状態は未確認です。</p>}
        {preview.application?.error && <p role="alert" className="whitespace-pre-wrap text-red-700">{preview.application.error}</p>}
        {preview.status === 'applied' && <p className="text-sm">型チェック: {preview.application?.typeChecked ? '実行済み' : '未確認または未実行'}。テスト・実動作確認は未実施です。</p>}
        {preview.changes.map(change => <details key={change.path}>
          <summary className="cursor-pointer break-all">{change.operation === 'create' ? '新規作成' : '修正'}: {change.path}</summary>
          <div className="grid gap-2 md:grid-cols-2 mt-2 text-xs">
            <div><p>変更前</p><pre className="max-h-80 overflow-auto whitespace-pre-wrap bg-gray-100 p-2">{change.previousContent || '（新規ファイル）'}</pre></div>
            <div><p>変更後</p><pre className="max-h-80 overflow-auto whitespace-pre-wrap bg-cyan-50 p-2">{change.content}</pre></div>
          </div>
        </details>)}
        {((preview.status === 'pending' && preview.expiresInSeconds > 0) || preview.canResume) && <>
        <label className="block text-sm"><input type="checkbox" checked={reviewed[preview.previewId] ?? false}
          onChange={event => setReviewed(current => ({ ...current, [preview.previewId]: event.target.checked }))} /> 全ファイルの変更内容を確認した</label>
        {!preview.canResume && <label className="block text-sm"><input type="checkbox" checked={typeCheck[preview.previewId] ?? false}
          onChange={event => setTypeCheck(current => ({ ...current, [preview.previewId]: event.target.checked }))} /> 適用後の型チェックも承認する（テスト・ビルドは実行しない）</label>}
        <div className="flex gap-2">
          <Button disabled={busy || !reviewed[preview.previewId]} onClick={() => approve(preview.previewId, preview.canResume)}>{preview.canResume ? "中断した処理を続ける（型チェック付き）" : "適用を承認"}</Button>
          {preview.status === "pending" && <Button variant="outline" disabled={busy} onClick={async () => {
            try { await reject.mutateAsync({ previewId: preview.previewId }); await pending.refetch(); }
            catch (error) { setResult(error instanceof Error ? error.message : String(error)); }
          }}>却下</Button>}
        </div>
        </>}
      </section>;
  if (!user) return <p className="text-sm"><a href="/login" className="text-blue-700 underline">ログイン</a>すると、記憶・実務操作・自己進化をアカウントに保存できます。</p>;
  if (reviewOnly && user.role !== 'admin') return null;
  if (user.role !== 'admin') return <p className="text-sm">コード変更の生成・適用には管理者権限が必要です。</p>;
  if (reviewOnly && !pending.data?.length && !pending.error && !result) return null;
  return <details className="rounded-lg border bg-white p-3" open={(pending.data?.length ?? 0) > 0 || Boolean(result) || Boolean(pending.error)}>
    <summary className="cursor-pointer font-semibold">変更案の確認・承認（承認待ち{pending.data?.filter(preview => preview.status === 'pending').length ?? 0}件）</summary>
    <div className="mt-3 space-y-3">
      {!reviewOnly && <>
      <Textarea value={request} onChange={event => setRequest(event.target.value)}
        placeholder="追加・修正したい機能と条件を入力。対象ソースはAZが探します。" />
      <Button onClick={create} disabled={busy || !request.trim()}>変更案を生成（適用しない）</Button>
      </>}
      {pending.error && <p role="alert">{pending.error.message}</p>}
      {result && <p role="status" className="whitespace-pre-wrap">{result}</p>}
      {currentPreview && <div className="space-y-2">
        <h3 className="text-sm font-semibold">現在の処理</h3>
        {renderPreview(currentPreview)}
      </div>}
      {history.length > 0 && <details className="rounded border bg-gray-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold">履歴（{history.length}件）
          {history.some(preview => preview.status === 'pending') && <>・承認待ちあり</>}
          {history.some(preview => preview.status === 'generating' || preview.status === 'applying') && <>・処理中あり</>}
        </summary>
        <div className="mt-3 space-y-3">{history.map(renderPreview)}</div>
      </details>}
    </div>
  </details>;
}

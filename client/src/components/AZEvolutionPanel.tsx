import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function AZEvolutionPanel({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const { user } = useAuth();
  const [request, setRequest] = useState('');
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});
  const [typeCheck, setTypeCheck] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState('');
  const pending = trpc.unifiedTools.listCodePreviews.useQuery({ accountId: String(user?.id ?? ""), includeHistory: true }, {
    enabled: user?.role === 'admin', refetchInterval: 10000,
  });
  const generate = trpc.unifiedTools.codePreview.useMutation();
  const apply = trpc.unifiedTools.applyCodePreview.useMutation();
  const reject = trpc.unifiedTools.rejectCodePreview.useMutation();
  const busy = generate.isPending || apply.isPending || reject.isPending;
  const statusLabels = { pending: '承認待ち', applying: '適用中・完了未確認', applied: '適用・Gitコミット済み', failed: '適用失敗', rejected: '却下済み' } as const;
  const phaseLabels: Record<string, string> = {
    preparing: '適用準備中', 'checking-source': '変更対象を確認中',
    'checking-syntax': '構文を確認中', 'checking-local-changes': '未保存の変更を確認中',
    'writing-files': 'ファイルを作成・更新中', 'type-checking': '承認された型チェックを実行中',
    committing: 'Gitコミット中', completed: '完了', failed: '失敗',
  };
  const create = async () => {
    setResult('');
    try {
      await generate.mutateAsync({ request });
      setRequest(''); await pending.refetch();
      setResult('変更案を生成しました。まだ適用していません。');
    } catch (error) { setResult(error instanceof Error ? error.message : String(error)); }
  };
  const approve = async (previewId: string) => {
    if (!reviewed[previewId]) return;
    if (!window.confirm(typeCheck[previewId]
      ? '表示された変更の適用・型チェック・Gitコミットを承認しますか？ テスト・ビルド・再起動は行いません。'
      : '表示された変更の適用・Gitコミットを承認しますか？ 型チェック・テスト・ビルド・再起動は行いません。')) return;
    setResult('');
    try {
      const outcome = await apply.mutateAsync({ previewId,
        confirm: typeCheck[previewId] ? 'APPLY_AND_VERIFY' : 'APPLY_ONLY' });
      setResult(outcome.success
        ? `適用・Gitコミット済み。型チェック: ${outcome.typeChecked ? '実行済み' : '未実行'}。テスト・実動作確認は未実施です。`
        : `適用失敗: ${outcome.error ?? '詳細不明'}。復元結果はエラー詳細を確認してください。`);
      await pending.refetch();
    } catch (error) { setResult(error instanceof Error ? error.message : String(error)); }
  };
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
      {pending.data?.map(preview => <section key={preview.previewId} className="space-y-3 rounded border p-3">
        <p role="status">{statusLabels[preview.status]}・{preview.changes.length}ファイル
          {preview.status === 'pending' && <>。有効期限まで約{Math.ceil(preview.expiresInSeconds / 60)}分</>}</p>
        {preview.application && <p className="text-sm">{phaseLabels[preview.application.phase] ?? '処理状況を確認中'}</p>}
        {preview.status === 'applying' && <p className="text-sm">まだ完了を確認できていません。処理中の可能性があるため、再承認せずお待ちください。</p>}
        {preview.application?.error && <p role="alert" className="whitespace-pre-wrap text-red-700">{preview.application.error}</p>}
        {preview.status === 'applied' && <p className="text-sm">型チェック: {preview.application?.typeChecked ? '実行済み' : '未確認または未実行'}。テスト・実動作確認は未実施です。</p>}
        {preview.changes.map(change => <details key={change.path}>
          <summary className="cursor-pointer break-all">{change.operation === 'create' ? '新規作成' : '修正'}: {change.path}</summary>
          <div className="grid gap-2 md:grid-cols-2 mt-2 text-xs">
            <div><p>変更前</p><pre className="max-h-80 overflow-auto whitespace-pre-wrap bg-gray-100 p-2">{change.previousContent || '（新規ファイル）'}</pre></div>
            <div><p>変更後</p><pre className="max-h-80 overflow-auto whitespace-pre-wrap bg-cyan-50 p-2">{change.content}</pre></div>
          </div>
        </details>)}
        {preview.status === 'pending' && preview.expiresInSeconds > 0 && <>
        <label className="block text-sm"><input type="checkbox" checked={reviewed[preview.previewId] ?? false}
          onChange={event => setReviewed(current => ({ ...current, [preview.previewId]: event.target.checked }))} /> 全ファイルの変更内容を確認した</label>
        <label className="block text-sm"><input type="checkbox" checked={typeCheck[preview.previewId] ?? false}
          onChange={event => setTypeCheck(current => ({ ...current, [preview.previewId]: event.target.checked }))} /> 適用後の型チェックも承認する（テスト・ビルドは実行しない）</label>
        <div className="flex gap-2">
          <Button disabled={busy || !reviewed[preview.previewId]} onClick={() => approve(preview.previewId)}>適用を承認</Button>
          <Button variant="outline" disabled={busy} onClick={async () => {
            try { await reject.mutateAsync({ previewId: preview.previewId }); await pending.refetch(); }
            catch (error) { setResult(error instanceof Error ? error.message : String(error)); }
          }}>却下</Button>
        </div>
        </>}
      </section>)}
    </div>
  </details>;
}

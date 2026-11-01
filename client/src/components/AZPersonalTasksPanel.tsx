import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
export default function AZPersonalTasksPanel({ accountId }: { accountId: string }) {
  const tasks = trpc.unifiedTools.listPersonalTasks.useQuery({ accountId }, { enabled: accountId !== 'guest', refetchInterval: 15000 });
  const claim = trpc.unifiedTools.claimPersonalReminder.useMutation();
  const change = trpc.unifiedTools.changePersonalTask.useMutation();
  const currentAccount = useRef(accountId); currentAccount.current = accountId;
  const notifying = useRef(new Set<string>());
  const [now, setNow] = useState(Date.now()), [error, setError] = useState('');
  const [permission, setPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (permission !== 'granted' || accountId === 'guest') return;
    void (async () => {
      for (const task of (tasks.data ?? []).filter(item => item.reminder && !item.completedAt && !item.notifiedAt && item.dueAt && item.dueAt <= now).slice(0, 5)) {
        if (currentAccount.current !== accountId) return;
        const key = accountId + ':' + task.id; if (notifying.current.has(key)) continue; notifying.current.add(key);
        try {
          const result = await claim.mutateAsync({ id: task.id });
          if (result.claimed && currentAccount.current === accountId) new Notification('PoiPoi リマインダー', { body: result.title, tag: 'poipoi-' + task.id });
        } catch (cause) { if (currentAccount.current === accountId) setError(cause instanceof Error ? cause.message : String(cause)); } finally { notifying.current.delete(key); }
      }
    })();
  }, [tasks.data, now, permission, accountId]);
  if (accountId === 'guest') return null;
  const active = (tasks.data ?? []).filter(task => !task.completedAt);
  return <details className="mt-2 rounded border bg-white p-3" open={active.some(task => task.reminder && task.dueAt && task.dueAt <= now) || undefined}>
    <summary className="cursor-pointer">タスク・リマインダー（未完了{active.length}件）</summary>
    <p className="my-2 text-xs">通知はこの画面を開いている間に動作します。PCのスリープ中・画面を閉じた間は通知できません。</p>
    {permission !== 'granted' && permission !== 'unsupported' && <button type="button" className="text-blue-700 underline" onClick={async () => { try { setPermission(await Notification.requestPermission()); } catch (cause) { setError(String(cause)); } }}>通知を有効にする</button>}
    {permission === 'denied' && <p className="text-xs">通知がブロックされています。Chromeのサイト設定から許可してください。期限はこの一覧でも確認できます。</p>}
    {(error || tasks.error) && <p role="alert" className="text-red-700">{error || tasks.error?.message}</p>}
    {active.map(task => <div key={task.id} className="my-2 border-t pt-2 text-sm">
      <span className={task.dueAt && task.dueAt <= now ? 'font-semibold text-red-700' : ''}>{task.title}{task.dueAt ? ' / ' + new Date(task.dueAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : ''}{task.reminder ? '（通知）' : ''}</span>
      {(['complete', 'delete'] as const).map(action => <button key={action} type="button" disabled={change.isPending} className="ml-3 text-blue-700 underline" onClick={async () => {
        if (action === 'delete' && !window.confirm('「' + task.title + '」を削除しますか？')) return;
        try { await change.mutateAsync({ id: task.id, action }); await tasks.refetch(); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
      }}>{action === 'complete' ? '完了' : '削除'}</button>)}
    </div>)}
  </details>;
}

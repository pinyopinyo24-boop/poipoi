/** Diagnose transport failures with one read-only same-origin health request. */
export async function describePoiPoiChatFailure(error: unknown): Promise<string> {
  const original = error instanceof Error ? error.message : '処理に失敗しました。操作は完了していません。';
  if (!/failed to fetch|load failed|networkerror|network request failed/i.test(original)) return original;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch('/api/health', { credentials: 'include', cache: 'no-store', signal: controller.signal });
    if (!response.ok) return 'ポイポイ本体の接続確認でHTTP ' + response.status + 'が返りました。送信結果は未確認です。';
    const health = await response.json();
    if (health?.status !== 'ok' || !health.runtime || !health.startupMetrics) {
      return 'この接続先の応答からポイポイ本体の稼働を確認できません。表示中のURLとサーバーの接続先が一致しているか確認してください。送信結果は未確認です。';
    }
    return 'ポイポイ本体の稼働は確認できましたが、チャット通信が中断しました。処理がサーバーへ届いたか、完了したかは未確認です。再送する前に会話履歴と実行履歴を確認してください。';
  } catch {
    return 'チャット通信が失敗し、補助の接続確認も完了できませんでした。サーバーが停止したとは断定できません。送信結果は未確認で、自動再送はしていません。再送前に会話履歴と実行履歴を確認してください。';
  } finally { clearTimeout(timeout); }
}

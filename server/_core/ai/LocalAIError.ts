/** Keep the underlying local inference failure visible without exposing URLs. */
export function describeLocalAIError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (typeof current !== 'object') { parts.push(String(current)); break; }
    const item = current as { name?: unknown; message?: unknown; code?: unknown; cause?: unknown };
    for (const value of [item.name, item.message, item.code]) if (typeof value === 'string') parts.push(value);
    if (item.cause === current) break;
    current = item.cause;
  }
  const detail = parts.join(' ');
  if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ECONNRESET|UND_ERR_CONNECT/i.test(detail)) return 'Ollamaへの通信に失敗しました。接続先の応答を確認できません。';
  const seconds = detail.match(/after\s+(\d+(?:\.\d+)?)\s+seconds/i)?.[1];
  if (/TimeoutError|AbortError|timed?\s*out|timeout/i.test(detail)) {
    return 'Ollamaの応答が' + (seconds ? seconds + '秒の' : '') + '制限時間内に返りませんでした。';
  }
  if (/circuit breaker.*open/i.test(detail)) return '連続した失敗のため、ローカルAIへの接続を一時停止しています。少し待ってから依頼してください。';
  if (/out of memory|not enough.*memory|insufficient.*memory|CUDA.*memory|メモリ不足/i.test(detail)) return 'Ollamaがメモリ不足を報告しました。';
  if (/model.*(?:not found|does not exist)|モデル.*(?:ありません|未インストール)/i.test(detail)) return '指定されたローカルAIモデルが見つかりません。モデル設定とインストール済みモデルの対応を確認してください。';
  if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ECONNRESET|UND_ERR_CONNECT|fetch failed|network error/i.test(detail)) return 'Ollamaへの通信に失敗しました。接続先の応答を確認できません。';
  if (/Invalid URL|URL設定/i.test(detail)) return 'ローカルAIの接続先URL設定が不正です。';
  if (/empty response/i.test(detail)) return 'Ollamaから空の回答が返りました。';
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '原因の詳細を取得できませんでした。';
  return message.replace(/https?:\/\/[^\s"'<>]+/gi, '[接続先]').slice(0, 400);
}

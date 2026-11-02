/** Bounded requests; generation is never replayed automatically. */
let generationBusy = false;
export function claimImageGeneration() {
  if (generationBusy) throw new Error('画像生成の準備または生成を実行中です。別の画像を重ねて生成せず、完了をお待ちください。');
  generationBusy = true;
  return () => { generationBusy = false; };
}
export async function readImageEngineJSON<T>(url: string, init: RequestInit = {}, timeoutMs = 5000, maxBytes = 16 * 1024 * 1024): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const declared = Number(response.headers.get('content-length'));
    const cap = response.ok ? maxBytes : Math.min(maxBytes, 65536);
    if (Number.isFinite(declared) && declared > cap) throw new Error('画像生成エンジンの応答サイズが上限を超えています。');
    if (!response.body) throw new Error('画像生成エンジンの応答が空です。');
    reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > cap) throw new Error('画像生成エンジンの応答サイズが上限を超えています。');
      chunks.push(value);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!response.ok) {
      if (/out of memory|cuda.*memory|not enough memory|allocation.*failed/i.test(raw)) throw new Error('画像生成エンジンのメモリが不足しています。生成は完了していません。ほかのAI処理との同時実行や画像サイズを見直してください。');
      if (response.status === 404) throw new Error('画像生成APIが見つかりません。エンジンのAPI起動設定を確認してください。');
      if (response.status === 401 || response.status === 403) throw new Error('画像生成エンジンへの接続が許可されていません。');
      throw new Error('画像生成エンジンがエラーを返しました（HTTP ' + response.status + '）。生成は完了していません。');
    }
    try { return JSON.parse(raw) as T; }
    catch { throw new Error('画像生成エンジンからJSON形式の応答が返りませんでした。接続先を確認してください。'); }
  } catch (error) {
    if (controller.signal.aborted) throw new Error(init.method === 'POST'
      ? '画像生成の応答が' + Math.ceil(timeoutMs / 1000) + '秒以内に返りませんでした。エンジン側で処理が続いている可能性があります。自動再生成は行っていません。'
      : '画像生成エンジンの応答が時間切れです。起動中か確認してください。');
    if (error instanceof TypeError) throw new Error('画像生成エンジンに接続できません。画像生成エンジンの起動と接続先を確認してください。');
    throw error;
  } finally {
    clearTimeout(timer);
    if (reader) { try { await reader.cancel(); } catch { /* closed or disconnected */ } }
    else controller.abort();
  }
}
export async function checkImageEngine(endpoint: string) {
  const progress = await readImageEngineJSON<{ state?: { job_count?: number } }>(endpoint + '/sdapi/v1/progress?skip_current_image=true', {}, 5000, 65536);
  if (!progress || typeof progress !== 'object' || !progress.state || typeof progress.state.job_count !== 'number') throw new Error('画像生成エンジンの状態を確認できません。APIの接続先を確認してください。');
  if (progress.state.job_count !== 0) throw new Error('画像生成エンジンが別の処理を実行中です。完了後に依頼してください。');
}

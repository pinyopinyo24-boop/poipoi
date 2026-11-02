import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request } from 'node:https';

function publicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b, d] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && (d === 0 || d === 2)))) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19 || (b === 51 && d === 100))) || (a === 203 && b === 0 && d === 113));
  }
  return isIP(address) === 6 && /^[23]/i.test(address) && !/^2001:db8:/i.test(address);
}
export type PublicResource = { url: string; bytes: Buffer; contentType: string };
/** Read public HTTPS only, pinning the checked DNS address for every redirect. */
export async function readPublicResource(input: string, maxBytes = 1500000, redirects = 0, expiresAt = Date.now() + 15000): Promise<PublicResource> {
  const url = new URL(input);
  if (input.length > 4000 || url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || redirects > 4) throw new Error('公開HTTPSサイトのURLを指定してください。');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (/^(?:localhost|.*\.localhost|.*\.local)$/i.test(hostname)) throw new Error('ローカルネットワークの情報は検索対象にできません。');
  const deadline = expiresAt;
  if (Date.now() >= deadline) throw new Error('情報源への接続が時間切れです。');
  let dnsTimer: ReturnType<typeof setTimeout> | undefined;
  const addresses = await Promise.race([
    lookup(hostname, { all: true, verbatim: true }),
    new Promise<never>((_, reject) => { dnsTimer = setTimeout(() => reject(new Error('情報源の名前解決が時間切れです。')), Math.max(1, Math.min(10000, deadline - Date.now()))); }),
  ]).finally(() => { if (dnsTimer) clearTimeout(dnsTimer); });
  if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new Error('公開インターネットの情報源だけを参照できます。');
  const selected = addresses.find(item => item.family === 4) ?? addresses[0];
  const result = await new Promise<PublicResource | { redirect: string }>((resolve, reject) => {
    const connection = request(url, {
      agent: false, family: selected.family,
      lookup: (_name, _options, callback) => _options.all ? callback(null, [selected]) : callback(null, selected.address, selected.family),
      headers: { 'User-Agent': 'PoiPoi/1.0 (https://github.com/pinyopinyo24-boop/poipoi)', 'Accept-Encoding': 'identity', Accept: 'application/json,text/html,image/*;q=0.9' },
    }, response => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const target = new URL(response.headers.location, url).href; response.destroy(); resolve({ redirect: target }); return;
      }
      if (response.statusCode !== 200) { response.destroy(); reject(new Error('情報源の取得に失敗しました（HTTP ' + response.statusCode + '）。')); return; }
      const chunks: Buffer[] = []; let length = 0;
      response.on('data', (chunk: Buffer) => { length += chunk.length; if (length > maxBytes) { const error = new Error('参照データのサイズ上限を超えました。'); reject(error); connection.destroy(error); return; } chunks.push(chunk); });
      response.on('end', () => resolve({ url: url.href, bytes: Buffer.concat(chunks), contentType: String(response.headers['content-type'] ?? '') }));
      response.on('error', reject);
      response.on('aborted', () => reject(new Error('情報源との通信が中断しました。')));
    });
    const timer = setTimeout(() => connection.destroy(new Error('情報源への接続が時間切れです。')), Math.max(1, deadline - Date.now()));
    connection.on('error', reject); connection.on('close', () => clearTimeout(timer)); connection.end();
  });
  return 'redirect' in result ? readPublicResource(result.redirect, maxBytes, redirects + 1, deadline) : result;
}

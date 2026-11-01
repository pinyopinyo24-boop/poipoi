const cache = new Map<string, { until: number; fetchedAt: number; text: string }>();
const hosts = new Set(['news.yahoo.co.jp', 'www.jma.go.jp', 'traininfo.jreast.co.jp', 'transit.yahoo.co.jp']);
async function download(url: string, seconds: number) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !hosts.has(parsed.hostname)) throw new Error('許可されていない情報源です。');
  const cached = cache.get(url); if (cached && cached.until > Date.now()) return cached.text;
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'error', headers: { 'User-Agent': 'PoiPoi/1.0', 'Accept': 'application/json,application/rss+xml,text/html;q=0.8' } });
    if (!response.ok || !response.body) throw new Error('情報源への接続に失敗しました（HTTP ' + response.status + '）。');
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
    try { for (;;) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.length; if (length > 3 * 1024 * 1024) throw new Error('情報源の応答が大きすぎます。'); chunks.push(chunk.value); } }
    finally { reader.releaseLock(); }
    const text = Buffer.concat(chunks).toString('utf8');
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(url, { text, fetchedAt: Date.now(), until: Date.now() + seconds * 1000 }); return text;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('情報源への接続が時間切れです。最新情報は確認できませんでした。');
    throw error;
  } finally { clearTimeout(timer); }
}
function decode(text: string) {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').replace(/&#(x[\da-f]+|\d+);/gi, (_, n: string) => {
    const number = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
    return Number.isInteger(number) && number >= 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '';
  }).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'");
}
export const informationTime = (timestamp = Date.now()) => new Date(timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false });
export async function getLatestNews(category = 'top-picks') {
  const categories: Record<string, string> = { 総合: 'top-picks', 国内: 'domestic', 国際: 'world', 経済: 'business', IT: 'it', 科学: 'science', スポーツ: 'sports', エンタメ: 'entertainment' };
  const selected = categories[category] ?? category;
  if (!['top-picks', ...Object.values(categories)].includes(selected)) throw new Error('ニュースの分類は総合・国内・国際・経済・IT・科学・スポーツ・エンタメから指定してください。');
  const url = 'https://news.yahoo.co.jp/rss/topics/' + selected + '.xml';
  const xml = await download(url, 60);
  const items = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 8).map(match => {
    const field = (name: string) => decode(match[1].match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + name + '>', 'i'))?.[1] ?? '').trim();
    const link = field('link');
    if (!/^https:\/\/news\.yahoo\.co\.jp\//.test(link)) return undefined;
    const published = Date.parse(field('pubDate'));
    return { title: field('title').slice(0, 200), url: link, publishedAt: Number.isFinite(published) ? informationTime(published) : undefined };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item?.title));
  if (!items.length) throw new Error('ニュースの見出しを読み取れませんでした。取得済みとは案内しません。');
  return { source: 'Yahoo!ニュース RSS', sourceUrl: url, fetchedAt: informationTime(cache.get(url)?.fetchedAt), items };
}
type Area = { name: string; parent?: string };
export async function getWeatherForecast(location: string, day: 'today' | 'tomorrow' | 'all' = 'all') {
  if (!location.trim()) throw new Error('天気を知りたい都道府県・市区町村を指定してください。');
  const data = JSON.parse(await download('https://www.jma.go.jp/bosai/common/const/area.json', 86400)) as Record<string, Record<string, Area>>;
  const offices = data.offices ?? {};
  const all = { ...offices, ...data.class10s, ...data.class15s, ...data.class20s };
  const normalized = location.normalize('NFKC');
  const matches = Object.entries(all).filter(([, area]) => {
    const name = area.name.replace(/[都道府県市区町村]$/, '');
    return normalized.includes(area.name) || (name.length >= 2 && normalized.includes(name));
  }).sort((a, b) => b[1].name.length - a[1].name.length);
  if (!matches.length) throw new Error('地域を特定できません。「愛知県の天気」のように都道府県か市区町村を指定してください。');
  const chosen = matches[0]; let code = chosen[0]; let forecastArea = code;
  const visited = new Set<string>();
  while (!offices[code]) {
    if (visited.has(code) || !all[code]?.parent) throw new Error('地域の予報区を特定できませんでした。');
    visited.add(code); code = all[code].parent!;
    if (data.class10s?.[code]) forecastArea = code;
  }
  const sourceUrl = 'https://www.jma.go.jp/bosai/forecast/data/forecast/' + code + '.json';
  const forecast = JSON.parse(await download(sourceUrl, 600));
  const first = Array.isArray(forecast) ? forecast[0] : undefined;
  const series = first?.timeSeries?.find((item: any) => item.areas?.some((area: any) => Array.isArray(area.weathers)));
  const area = series?.areas?.find((item: any) => item.area?.code === forecastArea) ?? series?.areas?.[0];
  if (!area?.weathers?.length || !series?.timeDefines) throw new Error('予報の形式を読み取れませんでした。');
  const jst = (value: number) => new Date(value + 9 * 3600000).toISOString().slice(0, 10);
  const wanted = day === 'all' ? undefined : jst(Date.now() + (day === 'tomorrow' ? 86400000 : 0));
  const days = series.timeDefines.map((time: string, index: number) => ({ date: jst(Date.parse(time)), forecast: String(area.weathers[index] ?? '').replace(/\s+/g, ' ') })).filter((item: any) => item.forecast && (!wanted || item.date === wanted));
  if (!days.length) throw new Error('指定日の予報は取得できませんでした。');
  return { source: '気象庁', sourceUrl: 'https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=' + code, reportAt: first.reportDatetime, location: offices[code].name + '・' + area.area.name, requestedLocation: chosen[1].name, days };
}
export async function getTrafficInformation(query: string) {
  const east = /JR東日本|山手線|京浜東北|埼京線|宇都宮線|中央線|総武線|関東/.test(query);
  const sourceUrl = east ? 'https://traininfo.jreast.co.jp/train_info/kanto.aspx' : 'https://transit.yahoo.co.jp/diainfo';
  const html = await download(sourceUrl, 60);
  const body = html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<\/(?:p|div|li|tr|h[1-6]|section|dt|dd)>|<br\s*\/?>/gi, '\n');
  const lines = decode(body).split(/\n+/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const relevant = lines.filter(line => /遅延|運転見合わせ|運休|平常運転|運行情報はありません|列車遅延|運転再開|現在.*情報/.test(line) && line.length < 700 && !/場合|30分以上|お知らせします|免責|ご了承ください|遅延証明|運行情報アプリ|利用規約/.test(line));
  const status = [...new Set(relevant.map(line => { const position = lines.indexOf(line); const prior = lines[position - 1]; return prior && prior.length < 40 ? prior + ': ' + line : line; }))].slice(0, 10);
  const road = /道路|高速|渋滞|通行止め/.test(query);
  return { source: east ? 'JR東日本' : 'Yahoo!路線情報', sourceUrl, fetchedAt: informationTime(cache.get(sourceUrl)?.fetchedAt), status, road,
    roadUrl: 'https://www.jartic.or.jp/', note: road ? '道路の区間別渋滞・通行止めはJARTIC公式地図で確認できます。地図の情報をこの回答内で取得済みとは扱いません。' : undefined };
}

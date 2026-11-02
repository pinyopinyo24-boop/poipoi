import { readPublicResource } from './PublicWebResource';

export type WebSource = { title: string; url: string; excerpt: string; retrievedAt: number; kind: 'official' | 'encyclopedia' | 'website' | 'search' };
export type WebReference = { query: string; sources: WebSource[]; image?: { base64: string; mime: string; sourceUrl: string; imageUrl: string; title: string }; notes: string[]; englishHint?: string };
const kata = (value: string) => value.normalize('NFKC').replace(/[ぁ-ゖ]/g, char => String.fromCharCode(char.charCodeAt(0) + 0x60)).toLowerCase();
const official = [{ aliases: ['アンパンマン', 'あんぱんまん', 'Anpanman'], title: 'アンパンマン', url: 'https://www.anpanman.jp/about/friends/4zvqlpab9ixejb6d.html', english: 'Anpanman, a Japanese cartoon superhero with a round tan bread head, small black eyes, a large round red nose, red round cheeks, red suit, yellow gloves and boots, a cape' }];
function decode(text: string) { return text.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(x[\da-f]+|\d+);/gi, (_, value: string) => { const n = value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value); return Number.isInteger(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ''; }).replace(/\s+/g, ' ').trim(); }
function attr(tag: string, name: string) { return decode(tag.match(new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'))?.slice(1).find(value => value !== undefined) ?? ''); }
export function imageSearchQuery(prompt: string) {
  const directUrl = prompt.match(/https:\/\/[^\s「」『』"'、。]+/)?.[0];
  if (directUrl) return directUrl;

  const known = official.find(item => item.aliases.some(alias => kata(prompt).includes(kata(alias))));
  if (known) return known.title;
  const quoted = prompt.match(/[「『"]([^」』"\n]{1,80})[」』"]/)?.[1];
  if (quoted) return quoted.trim();
  return prompt.match(/https:\/\/[^\s]+/)?.[0] ?? prompt.replace(/https:\/\/\S+/g, '').replace(/^\/imagine\s*/i, '').replace(/(?:ネット|ウェブ|Web|インターネット)(?:で|から)?|検索して|調べて|しらべて|参考に|を参考に/g, '')
    .split(/(?:の)?(?:画像|がぞう|イラスト|絵|写真|ロゴ)/)[0].replace(/[のを、,\s]+$/g, '').trim().slice(0, 80);
}
function htmlReference(html: string, pageUrl: string, query: string) {
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? query).slice(0, 160);
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]);
  const description = metas.find(tag => /^(description|og:description)$/i.test(attr(tag, 'name') || attr(tag, 'property')));
  const excerpt = description ? attr(description, 'content').slice(0, 500) : decode((html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? '').replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')).slice(0, 500);
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map(match => {
    const tag = match[0], alt = attr(tag, 'alt'); const src = attr(tag, 'src') || attr(tag, 'data-src');
    let url: string; try { url = new URL(src, pageUrl).href; } catch { return undefined; }
    if (!src || !url.startsWith('https:') || /\.svg(?:[?#]|$)|logo|banner|icon|tracking|button|btn_/i.test(url)) return undefined;
    return { url, score: kata(alt) === kata(query) ? 100 : kata(alt).includes(kata(query)) ? 50 : 0, title: alt || title };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item)).sort((a, b) => b.score - a.score);
  const og = metas.find(tag => attr(tag, 'property') === 'og:image');
  if (og) { try { const url = new URL(attr(og, 'content'), pageUrl).href; if (url.startsWith('https:') && !/\.svg(?:[?#]|$)/i.test(url)) images.push({ url, score: 1, title }); } catch { /* invalid metadata */ } }
  return { title, excerpt, images: images.filter(item => item.score > 0).slice(0, 3) };
}
async function imageBytes(url: string, expiresAt: number) {
  const result = await readPublicResource(url, 5 * 1024 * 1024, 0, Math.min(expiresAt, Date.now() + 15000));
  const bytes = result.bytes;
  const supported = bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' || (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) || (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') || /^GIF8[79]a$/.test(bytes.subarray(0, 6).toString());
  if (!supported || bytes.length < 24) throw new Error('参照画像の形式を確認できません。');
  const sharp = (await import('sharp')).default;
  const png = await sharp(bytes, { limitInputPixels: 16000000, animated: false }).rotate()
    .resize(512, 512, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).png().toBuffer();
  if (png.length > 5 * 1024 * 1024) throw new Error('参照画像のサイズ上限を超えています。');
  return { base64: png.toString('base64'), mime: 'image/png', url: result.url };
}
export async function findWebImageReferences(query: string, includeImage = true): Promise<WebReference> {
  if (/```|[A-Z]:\\|(?:JWT_SECRET|GOOGLE_CLIENT_SECRET|API[_ -]?KEY)\s*[:=]|Bearer\s+[\w.-]{15,}|sk-[\w-]{16,}/i.test(query)) throw new Error('検索にローカルコードや認証情報を含められません。');
  query = query.trim().slice(0, 160); if (!query) throw new Error('検索する対象を指定してください。');
  const expiresAt = Date.now() + 45000;
  const read = (url: string, maxBytes = 1500000) => readPublicResource(url, maxBytes, 0, Math.min(expiresAt, Date.now() + 15000));
  const result: WebReference = { query, sources: [], notes: [] };
  const known = official.find(item => item.aliases.some(alias => kata(query) === kata(alias)));
  const pages: Array<{ url: string; official: boolean }> = [];
  if (known) { pages.push({ url: known.url, official: true }); result.englishHint = known.english; }
  const suppliedUrl = query.match(/https:\/\/[^\s]+/)?.[0];
  if (suppliedUrl) pages.push({ url: suppliedUrl, official: false });
  const images: Array<{ url: string; sourceUrl: string; title: string }> = [];
  if (!known && !suppliedUrl) {
    try {
      const url = new URL('https://www.bing.com/search'); url.searchParams.set('format', 'rss'); url.searchParams.set('q', query);
      const rss = (await read(url.href)).bytes.toString('utf8');
      const hits = [...rss.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 4);
      for (const hit of hits) {
        const field = (name: string) => decode(hit[1].match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)<\\/' + name + '>', 'i'))?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') ?? '');
        const link = field('link'); if (!/^https:\/\//.test(link)) continue;
        result.sources.push({ title: field('title').slice(0, 160), url: link, excerpt: field('description').slice(0, 700), retrievedAt: Date.now(), kind: 'search' });
      }
      if (includeImage && result.sources[0]) pages.push({ url: result.sources[0].url, official: false });
    } catch (error) { result.notes.push('公開ウェブ検索: ' + (error instanceof Error ? error.message : String(error))); }
  }

  try {
    if (!suppliedUrl) {
      const url = new URL('https://ja.wikipedia.org/w/api.php');
      for (const [key, value] of Object.entries({ action: 'query', format: 'json', formatversion: '2', generator: 'search', gsrsearch: query, gsrlimit: '3', prop: 'extracts|pageimages|info|extlinks', exintro: '1', explaintext: '1', exchars: '700', piprop: 'thumbnail', pithumbsize: '768', inprop: 'url', ellimit: '3', elprotocol: 'https' })) url.searchParams.set(key, value);
      const data = JSON.parse((await read(url.href)).bytes.toString('utf8')) as { query?: { pages?: Array<{ title?: string; fullurl?: string; extract?: string; thumbnail?: { source?: string }; extlinks?: Array<{ url?: string; '*'?: string }> }> } };
      const articles = (data.query?.pages ?? []).filter(page => page.title && page.fullurl).sort((a, b) => Number(kata(b.title!).includes(kata(query))) - Number(kata(a.title!).includes(kata(query))));
      for (const page of articles.slice(0, 3)) {
        result.sources.push({ title: page.title!, url: page.fullurl!, excerpt: String(page.extract ?? '').slice(0, 700), retrievedAt: Date.now(), kind: 'encyclopedia' });
        if (!known && page.thumbnail?.source) images.push({ url: page.thumbnail.source, sourceUrl: page.fullurl!, title: page.title! });
      }
      if (!known) {
        const external = articles[0]?.extlinks?.map(item => item.url ?? item['*']).find(url => typeof url === 'string' && /^https:\/\//.test(url) && !/wikipedia|wikimedia|youtube|twitter|facebook|instagram/i.test(new URL(url).hostname));
        if (external) pages.push({ url: external, official: false });
      }
    }
  } catch (error) { result.notes.push('百科事典検索: ' + (error instanceof Error ? error.message : String(error))); }
  for (const page of pages.slice(0, 2)) {
    try {
      const resource = await read(page.url, includeImage ? 5 * 1024 * 1024 : 1500000);
      if (resource.contentType.startsWith('image/')) {
        if (includeImage) { const image = await imageBytes(resource.url, expiresAt); result.image = { ...image, sourceUrl: page.url, imageUrl: image.url, title: query }; }
        result.sources.unshift({ title: query, url: page.url, excerpt: '指定された画像', kind: 'website', retrievedAt: Date.now() }); continue;
      }
      const parsed = htmlReference(resource.bytes.toString('utf8'), resource.url, query);
      result.sources.unshift({ title: parsed.title, url: resource.url, excerpt: parsed.excerpt, retrievedAt: Date.now(), kind: page.official ? 'official' : 'website' });
      images.unshift(...parsed.images.filter(image => !known || image.score >= 50).map(image => ({ url: image.url, sourceUrl: resource.url, title: image.title })));
    } catch (error) { result.notes.push('参照ページ: ' + (error instanceof Error ? error.message : String(error))); }
  }
  if (includeImage && !result.image) for (const candidate of images.slice(0, 3)) {
    try { const image = await imageBytes(candidate.url, expiresAt); result.image = { ...image, imageUrl: image.url, sourceUrl: candidate.sourceUrl, title: candidate.title }; break; }
    catch (error) { result.notes.push('参照画像: ' + (error instanceof Error ? error.message : String(error))); }
  }
  return result;
}
export async function searchWebInformation(query: string) {
  const result = await findWebImageReferences(query, false);
  if (!result.sources.length) throw new Error('ネット上の情報を取得できませんでした。' + result.notes.join(' '));
  return { query: result.query, sources: result.sources, notes: result.notes };
}

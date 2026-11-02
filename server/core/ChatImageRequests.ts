import type { ChatMessage } from '../repositories/ChatRepository';
import { isCodeImplementationRequest } from './AZCapabilityCatalog';
export type ImageChatRequest = { prompt: string; rootPrompt: string; query?: string; webMode: 'auto' | 'required' | 'off'; identityCorrection?: boolean; previousImageId?: string; accepted?: boolean };
/** Resolve only this session's image context; another task must not become an image edit. */
export function resolveChatImageRequest(message: string, turns: ChatMessage[], hasAttachments: boolean): ImageChatRequest | undefined {
  const text = message.normalize('NFKC').trim();
  const explicit = text.match(/^\/imagine\s+([\s\S]+)$/i)?.[1]?.trim();
  const generationText = text.replace(/(?:ネット|ウェブ|Web|インターネット)(?:を)?(?:使わない(?:で)?|使うな)|(?:ネット)?検索しない(?:で)?|オフライン(?:で)?/gi, '');
  const create = !hasAttachments && !isCodeImplementationRequest(text) && !/しない|するな|禁止|ないで|はいけない|(?:と(?:言|い)(?:われ|った|って))|できますか|できるか/.test(generationText) && !/画像(?:の|を)?(?:解析|分析|説明)|読み取|Excel|PDF|PowerPoint|原価表/i.test(text)
    && /(?:画像|がぞう|イラスト|いらすと|ロゴ|絵|写真|しゃしん)\s*(?:を\s*)?(?:生成して|せいせいして|作成して|さくせいして|作って|つくって|描いて|かいて)|(?:画像生成|がぞうせいせい)[：:\s]/u.test(text);
  const researchedCreation = !hasAttachments && !isCodeImplementationRequest(text) && !/しない|するな|禁止|ないで|はいけない|と言われ|といわれ/.test(generationText) && /画像|がぞう|イラスト|絵|写真/.test(text) && /検索|調べ|しらべ|参考|参照/.test(text) && /生成して|せいせいして|作成して|さくせいして|作って|つくって|描いて|かいて|作り直して|描き直して/.test(text);
  const mode = /ネット.*(?:使わない|使うな)|検索しない|オフライン/.test(text) ? 'off' : /ネット|ウェブ|web|検索|調べ|しらべ|参照画像/i.test(text) ? 'required' : 'auto';
  if (explicit || create || researchedCreation) return { prompt: explicit || text, rootPrompt: explicit || text, webMode: mode };
  if (hasAttachments || isCodeImplementationRequest(text)) return undefined;
  if (/ニュース|天気|原価|製造|在庫|予定|タスク|プログラム|コード|機能/.test(text) && !/画像|イラスト|絵|写真/.test(text)) return undefined;
  const recent = turns.slice(-6);
  const index = recent.findLastIndex(turn => turn.role === 'assistant' && turn.metadata?.generated && turn.metadata?.images?.[0]?.id);
  if (index < 0) return undefined;
  const generated = recent[index];
  const original = recent.find(turn => turn.id === generated.metadata?.replyTo) ?? [...turns.slice(0, turns.indexOf(generated))].reverse().find(turn => turn.role === 'user');
  let rootPrompt = generated.metadata?.imageRequest?.rootPrompt ?? original?.content;
  if (typeof rootPrompt !== 'string' || !rootPrompt.trim()) return undefined;
  // Stop context inheritance when a later user turn has moved to another task.
  if (recent.slice(index + 1).some(turn => turn.role === 'user' && /ニュース|天気|原価|製造|在庫|予定|タスク|Excel|PDF|プログラム|コード/.test(turn.content))) return undefined;
  if (/^(?:これでいい|これでよい|正解|合ってる|あってる|OK|いいね)[。！!\s]*$/i.test(text)) return { prompt: rootPrompt, rootPrompt, webMode: 'off', previousImageId: generated.metadata.images[0].id, accepted: true };
  if (/回答|答え|説明|計算|名前/.test(text) && !/画像|イラスト|絵|写真/.test(text)) return undefined;
  const correction = /違う|ちがう|じゃない|ではない|じゃなく|ではなく|似てない|似ていない|別人|作り直して|描き直して|なおして|直して|修正して/.test(text) || /(?:背景|色|表情|服|ポーズ).*(?:変えて|変更|にして|直して|修正|描いて|作って)/.test(text);
  if (!correction || /なぜ|理由|どうして/.test(text)) return undefined;
  const renamedTarget = text.match(/(?:じゃなく|ではなく)(?:て)?(.{1,80}?)(?:に(?:して|変更)|(?:の)?画像|を(?:描|作)|[。！!]*$)/)?.[1]?.trim();
  const currentPrompt = generated.metadata?.imageRequest?.prompt ?? rootPrompt;
  if (renamedTarget) rootPrompt = renamedTarget + 'の画像を作成してください。';
  const identityCorrection = Boolean(renamedTarget) || /じゃない|ではない|じゃなく|ではなく|似てない|似ていない|別人|違うキャラ|ちがう/.test(text);
  return { rootPrompt, query: renamedTarget || generated.metadata?.imageRequest?.query,
    prompt: currentPrompt + '\nユーザーの訂正（以前の条件より優先）: ' + text + (renamedTarget ? '\n対象を「' + renamedTarget + '」に変更してください。' : '\n元の対象を保ち、前の誤った見た目を修正してください。'),
    webMode: mode === 'off' ? 'off' : identityCorrection ? 'required' : mode, identityCorrection,
    previousImageId: identityCorrection ? (mode === 'off' ? generated.metadata?.referenceImages?.[0]?.id : undefined) : mode === 'required' ? undefined : generated.metadata.images[0].id };
}

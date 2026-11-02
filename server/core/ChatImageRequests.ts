import { imageAppearanceIntent, normalizeImageEditText } from './ImageEditIntent';
import type { ChatMessage } from '../repositories/ChatRepository';
import { isCodeImplementationRequest } from './AZCapabilityCatalog';
export type ImageChatRequest = { prompt: string; rootPrompt: string; query?: string; webMode: 'auto' | 'required' | 'off'; identityCorrection?: boolean; previousImageId?: string; inputImageId?: string; editInstruction?: string; editStrength?: number; accepted?: boolean };
function editPrompt(root: string, previous: string, instruction: string) {
  if (instruction.length > 2500) throw new Error('画像の編集指示は2500文字以内にしてください。');
  const original = root.slice(0, 1000);
  const room = Math.max(0, 3800 - original.length - instruction.length);
  return original + '\nこれまでの編集条件: ' + previous.slice(-Math.min(1000, room)) + '\n今回の画像編集（以前の指示より優先）: ' + instruction;
}
/** Resolve only this session's image context; another task must not become an image edit. */
export function resolveChatImageRequest(message: string, turns: ChatMessage[], hasAttachments: boolean, attachmentIds: string[] = [], selectedImageId?: string): ImageChatRequest | undefined {
  const text = normalizeImageEditText(message).split(/\n添付写真:/u)[0].trim();
  const explicit = text.match(/^\/imagine\s+([\s\S]+)$/i)?.[1]?.trim();
  const generationText = text.replace(/(?:ネット|ウェブ|Web|インターネット)(?:を)?(?:使わない(?:で)?|使うな)|(?:ネット)?検索しない(?:で)?|オフライン(?:で)?/gi, '');
  const create = !hasAttachments && !isCodeImplementationRequest(text) && !/しない|するな|禁止|ないで|はいけない|(?:と(?:言|い)(?:われ|った|って))|できますか|できるか/.test(generationText) && !/画像(?:の|を)?(?:解析|分析|説明)|読み取|Excel|PDF|PowerPoint|原価表/i.test(text)
    && /(?:画像|がぞう|イラスト|いらすと|ロゴ|絵|写真|しゃしん)\s*(?:を\s*)?(?:生成して|せいせいして|作成して|さくせいして|作って|つくって|描いて|かいて)|(?:画像生成|がぞうせいせい)[：:\s]/u.test(text);
  const researchedCreation = !hasAttachments && !isCodeImplementationRequest(text) && !/しない|するな|禁止|ないで|はいけない|と言われ|といわれ/.test(generationText) && /画像|がぞう|イラスト|絵|写真/.test(text) && /検索|調べ|しらべ|参考|参照/.test(text) && /生成して|せいせいして|作成して|さくせいして|作って|つくって|描いて|かいて|作り直して|描き直して/.test(text);
  const mode = /ネット.*(?:使わない|使うな)|検索しない|オフライン/.test(text) ? 'off' : /ネット|ウェブ|web|検索|調べ|しらべ|参照画像/i.test(text) ? 'required' : 'auto';
  const explicitTarget = /^(?:この|その|今の|さっきの|直前の|添付(?:した)?)(?:画像|がぞう|写真|しゃしん|絵|イラスト)/u.test(text);
  const operationText = generationText.replace(/(?:顔|背景|服|色|表情|ポーズ|髪|体型|被写体|人物)(?:は|を)?(?:変えないで|変更しないで|そのまま(?:にして)?|保持して|保って)[、,。\s]*/gu, '');
  const editAction = /変えて|かえて|変更(?:して|する)|加工(?:して|する)|編集(?:して|する)|修正して|描き直して|作り直して|直して|なおして|(?:に|く)(?:して|してください)|(?:背景|文字|人|物|服|影).*(?:消して|けして|除去|取り除いて)|切り抜いて|きりぬいて|トリミングして/u.test(operationText);
  const editFragment = /(?:に|く)(?:してください|して|してほしい)?[。！!\s]*$/u.test(operationText);
  const editingQuestion = /[?？]|教えて|おしえて|説明して|解析|分析|読み取|できますか|できるか|可能ですか|なぜ|どうして/u.test(text);
  const forbiddenEdit = /しない|するな|ないで|はいけない|禁止|作るな|描くな/u.test(operationText);
  const otherOperation = /Excel|PDF|PowerPoint|資料|文書|文章|回答|答え|説明文|チャット|印刷|メール|送信|共有|ダウンロード/i.test(text);
  if (selectedImageId && hasAttachments) throw new Error('履歴の編集対象と新しい添付写真を同時には指定できません。編集する画像を1枚選んでください。');
  const targetIndex = turns.findLastIndex(turn => (turn.role === 'user' || turn.metadata?.generated) &&
    (selectedImageId ? turn.metadata?.images?.some((image: { id?: string }) => image.id === selectedImageId) : turn.metadata?.images?.[0]?.id));
  if (selectedImageId && targetIndex < 0) throw new Error('選択した画像はこの会話にありません。画像のある会話で選び直してください。');
  const target = targetIndex >= 0 ? turns[targetIndex] : undefined;
  const appearanceIntent = imageAppearanceIntent(text);
  const replacement = text.match(/^(.*?)(?:じゃなく|ではなく)/u);
  const explicitSubjectReplacement = Boolean(replacement && !imageAppearanceIntent(replacement[1]).appearance);
  const identityLanguage = explicitSubjectReplacement || /別人|(?:違う|ちがう)(?:キャラ|人物|被写体)|(?:人物|キャラ(?:クター)?|被写体)(?:が|は|自体が)?(?:違う|ちがう)/.test(text) || (/じゃない|ではない|似てない|似ていない/.test(text) && !appearanceIntent.appearance);
  const changedTopic = target ? turns.slice(targetIndex + 1).some(turn => turn.role === 'user' && /ニュース|天気|原価|製造|在庫|予定|タスク|コード|プログラム/.test(turn.content)) : false;
  if (!explicit && !isCodeImplementationRequest(text) && !editingQuestion && !forbiddenEdit && !otherOperation && (!identityLanguage || selectedImageId || hasAttachments) &&
      (editAction || editFragment || (selectedImageId && identityLanguage) || ((hasAttachments || selectedImageId || explicitTarget) && /生成して|せいせいして|作成して|さくせいして|作って|つくって|描いて|かいて|風(?:で|に)?[。！!\s]*$/u.test(text))) && (hasAttachments || selectedImageId || explicitTarget || (target && !changedTopic && targetIndex >= turns.length - 6))) {
    if (hasAttachments && attachmentIds.length !== 1) throw new Error('編集する画像を1枚選んでください。写真の解析は複数枚に対応しています。');
    if (!selectedImageId && !hasAttachments && target?.metadata?.images?.length > 1) throw new Error('元画像が複数あります。編集したい画像の「この画像を編集」を押して選んでください。');
    const inputImageId = selectedImageId ?? (hasAttachments ? attachmentIds[0] : target?.metadata?.images?.[0]?.id);
    if (typeof inputImageId !== 'string') throw new Error('編集する画像が見つかりません。＋から画像を添付するか、画像のある会話で指示してください。');
    const rootPrompt = hasAttachments ? '添付画像の被写体を保ち、指定された部分を編集する。'
      : target?.metadata?.imageRequest?.rootPrompt ?? '入力画像の被写体を保ち、指定された部分を編集する。';
    const currentPrompt = hasAttachments ? rootPrompt : target?.metadata?.imageRequest?.prompt ?? rootPrompt;
    return { rootPrompt, prompt: editPrompt(rootPrompt, currentPrompt, text),
      query: target?.metadata?.imageRequest?.query, inputImageId, editInstruction: text,
      editStrength: appearanceIntent.bodybuilder ? 0.62 : appearanceIntent.muscle || /体型|太く|細く|大きく|小さく|ポーズ/u.test(text) ? 0.55 : 0.45,
      webMode: mode === 'required' ? 'required' : 'off' };
  }
  if (explicit || create || researchedCreation) return { prompt: explicit || text, rootPrompt: explicit || text, webMode: mode };
  if (hasAttachments || isCodeImplementationRequest(text) || editingQuestion || forbiddenEdit || otherOperation) return undefined;
  if (selectedImageId && !explicit && !create && !researchedCreation && !identityLanguage) throw new Error('選択した画像をどのように編集するか入力してください。');
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
  const identityCorrection = Boolean(renamedTarget) || identityLanguage;
  return { rootPrompt, query: renamedTarget || generated.metadata?.imageRequest?.query,
    prompt: editPrompt(rootPrompt, currentPrompt, text + (renamedTarget ? '\n対象を「' + renamedTarget + '」に変更してください。' : '\n元の対象を保ち、前の誤った見た目を修正してください。')),
    webMode: identityCorrection ? (mode === 'off' ? 'off' : 'required') : mode === 'required' ? 'required' : 'off', identityCorrection,
    previousImageId: identityCorrection ? (mode === 'off' ? generated.metadata?.referenceImages?.[0]?.id : undefined) : generated.metadata.images[0].id };
}

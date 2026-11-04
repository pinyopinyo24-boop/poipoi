import { resolveImageConversationRequest } from './ImageConversationRouter';
import { resolveChatImageRequest, imageChoices, type ImageChatRequest } from './ChatImageRequests';
import { imageAppearanceIntent } from './ImageEditIntent';
import { describeLocalAIError } from '../_core/ai/LocalAIError';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { invokeLLM } from '../_core/llm';
import { conversationModel } from '../_core/ai/ConversationModel';
import { capabilityReply, isUserNameQuestion, nameAnswerToPreviousQuestion, isCodeImplementationRequest, isSourceCodeRequest, resolveImplementationRequest } from './AZCapabilityCatalog';
import type { ChatMessage } from '../repositories/ChatRepository';

const domain = z.enum(['conversation', 'memory', 'image', 'code', 'documents', 'manufacturing', 'schedule', 'information', 'personal_tasks', 'music', 'web']);
const act = z.enum(['chat', 'question', 'request', 'correction', 'retry', 'constraint', 'feedback', 'acknowledgment', 'cancel']);
const schema = z.object({
  domain, act, newTask: z.boolean(), goal: z.string().max(1000), targetDescription: z.string().max(500),
  targetMessageIds: z.array(z.string().max(200)).max(6),
  resolvedRequest: z.string().min(1).max(60000), constraints: z.array(z.string().max(500)).max(12),
  execute: z.boolean(), readOnly: z.boolean(), needsClarification: z.boolean(),
  question: z.string().max(600), confidence: z.number().min(0).max(1),
});
export type ConversationUnderstanding = z.infer<typeof schema> & { originalMessage: string; model?: string; nativeImageRequest?: ImageChatRequest; interpretationOnly: true };
const pending = new Map<string, { at: number; promise: Promise<ConversationUnderstanding> }>();
export function conversationInstruction(message: string) {
  return message.split(/\n\n(?:添付写真から読み取った参考データ|対象資料)/u)[0].split(/\n添付写真:/u)[0].normalize('NFKC').trim();
}
const readonlyRequest = (text: string) => /(?:確認|調査|分析|説明|閲覧)(?:だけ|のみ)|(?:変更|保存|登録|作成)(?:しない|するな|禁止)|コード変更.*(?:しない|禁止)/u.test(text);
function clarification(original: string, question: string): ConversationUnderstanding {
  return { domain: 'conversation', act: 'question', newTask: true, goal: original.slice(0, 1000), targetDescription: '',
    targetMessageIds: [], resolvedRequest: original || '確認', constraints: [], execute: false, readOnly: true,
    needsClarification: true, question, confidence: 0, originalMessage: original, interpretationOnly: true };
}
export function understandingContext(value: ConversationUnderstanding) {
  return '現在の会話解釈の候補（実行許可でも完了の証拠でもない。ユーザー原文を最優先し、誤りや曖昧さがあれば確認する）:\n' +
    JSON.stringify({ originalMessage: value.originalMessage, goal: value.goal, target: value.targetDescription,
      resolvedRequest: value.resolvedRequest, constraints: value.constraints, act: value.act }).slice(0, 6000);
}
export async function understandConversationTurn(userId: string, sessionId: string, message: string,
  turns: ChatMessage[], messageId?: string, hints: { images?: string[]; selectedImageId?: string } = {}): Promise<ConversationUnderstanding> {
  const original = conversationInstruction(message);
  if (!messageId) return interpret(userId, original, turns, hints);
  const key = createHash('sha256').update(userId + ':' + sessionId + ':' + (messageId ?? '') + ':' + original).digest('hex');
  const found = pending.get(key);
  if (found && Date.now() - found.at < 120000) return found.promise;
  const promise = interpret(userId, original, turns, hints);
  if (pending.size > 256) pending.clear();
  pending.set(key, { at: Date.now(), promise }); return promise;
}
async function interpret(userId: string, original: string, turns: ChatMessage[], hints: { images?: string[]; selectedImageId?: string }): Promise<ConversationUnderstanding> {
  // Explicit protocol commands retain their original authorization and argument contract.
  if (/^(?:PoiPoiツール|PoiPoiコードエージェント|コードエージェント)[：:]/u.test(original)) return {
    domain: 'conversation', act: 'request', newTask: true, goal: original.slice(0, 1000), targetDescription: '', targetMessageIds: [],
    resolvedRequest: original, constraints: [], execute: false, readOnly: readonlyRequest(original),
    needsClarification: false, question: '', confidence: 1, originalMessage: original, interpretationOnly: true,
  };
  const simple = (kind: ConversationUnderstanding['domain'], action: ConversationUnderstanding['act'], resolved = original, execute = false): ConversationUnderstanding => ({
    domain: kind, act: action, newTask: true, goal: resolved.slice(0, 1000), targetDescription: '', targetMessageIds: [],
    resolvedRequest: resolved, constraints: [], execute, readOnly: !execute, needsClarification: false,
    question: '', confidence: 1, originalMessage: original, interpretationOnly: true,
  });
  if (capabilityReply(original, turns, userId !== 'mobile', false)) return simple('conversation', 'question');
  if (isUserNameQuestion(original) || /^(?:あなた|AI|AZ)の名前(?:は|って|を)?[？?]$/u.test(original)) return simple('memory', 'question');
  const suppliedName = original.match(/^(?:私の名前は|わたしの名前は|僕の名前は|俺の名前は|私の名前を|私を)[「『"]?([^？?。！!\n]{1,40}?)[」』"]?(?:です|だよ|にして|と呼んで|にしてください)[。！!]*$/u)?.[1]
    ?? nameAnswerToPreviousQuestion(original, turns);
  if (suppliedName) return simple('memory', 'request', '私の名前は' + suppliedName.trim() + 'です', true);
  if (/^(?:こんにちは|こんばんは|おはよう|ありがとう|おやすみ)[。！!\s]*$/u.test(original)) return simple('conversation', 'chat');
  const imagine = original.match(/^\/imagine\s+([\s\S]+)$/i);
  if (imagine) return simple('image', 'request', imagine[1], true);
  // Deterministic service requests do not require a second model to restate them.
  if (hints.images?.length && /説明|解析|分析|読み取|写って|何が/u.test(original) && !/生成|編集|ムキムキ|加工/u.test(original)) return simple('image', 'question');
  if (isCodeImplementationRequest(original)) {
    try {
      const task = resolveImplementationRequest(original, turns);
      return task.length > 60000
        ? clarification(original, '依頼が保存上限の60000文字を超えています。対象を分けて指定してください。')
        : simple('code', 'request', task, true);
    }
    catch (error) { return clarification(original, error instanceof Error ? error.message : '追加・修正したい機能を教えてください。'); }
  }
  if (isSourceCodeRequest(original)) return simple('code', 'question');
  const priorImage = [...turns].reverse().find(turn => turn.metadata?.generated && turn.metadata?.images?.[0]?.id);
  const previousState = [...turns].reverse().find(turn => turn.role === 'assistant' && turn.metadata?.understanding)?.metadata?.understanding;
  try {
    let native = await resolveImageConversationRequest(original, turns, hints.images ?? [], hints.selectedImageId);
    // Recover explicit visual edits after intervening error messages, without treating an unrelated task as an image edit.
    const visual = imageAppearanceIntent(original);
    const changedTopic = priorImage && turns.slice(turns.indexOf(priorImage) + 1).some(turn => turn.role === 'user' && /ニュース|天気|原価|製造|在庫|予定|タスク|プログラム|コード/.test(turn.content));
    if (!native && !hints.selectedImageId && !hints.images?.length && priorImage && !changedTopic &&
        !/コード|プログラム|機能|チャット|貼り付|添付|Excel|PDF|予定|タスク/i.test(original) &&
        visual.appearance && /にして|してください|変えて|まま|ムキムキ化|むきむき化/u.test(original)) {
      native = resolveChatImageRequest(original, turns, false, [], priorImage.metadata.images[0].id);
    }
    if (native) {
      const result = simple('image', native.clarification ? 'feedback' : native.accepted ? 'acknowledgment' : native.retry ? 'retry' : native.identityCorrection ? 'correction' : 'request', native.prompt, !native.accepted && !native.clarification);
      result.needsClarification = Boolean(native.clarification); result.question = native.clarification ?? '';
      result.nativeImageRequest = native; result.goal = native.rootPrompt.slice(0, 1000);
      result.newTask = !native.inputImageId && !native.previousImageId && !native.identityCorrection && !native.retry && !native.accepted && !native.clarification;
      result.targetMessageIds = native.inputImageId || native.previousImageId
        ? turns.filter(turn => imageChoices(turn).some(item => item.id === (native!.inputImageId ?? native!.previousImageId))).map(turn => turn.id).slice(-1) : [];
      result.constraints = Array.isArray(previousState?.constraints) && !result.newTask ? previousState.constraints.slice(0, 12) : [];
      return result;
    }
  } catch (error) {
    return clarification(original, error instanceof Error ? error.message : '編集する画像を選んでください。');
  }
  const operationalTopic = /画像|写真|イラスト|資料|Excel|PDF|PPT|製造|原価|在庫|予定|会議|ニュース|天気|交通|タスク|通知|音楽|検索|ネット|自己進化|コード|プログラム|機能|チャット欄|添付|貼り付|名前|記憶/i.test(original);
  if (!operationalTopic && !/^(?:それ|これ|もう|まだ|なお|直|続|つづ|はい|いいえ|お願い|おねがい)/u.test(original) &&
      (!previousState || previousState.domain === 'conversation') && !priorImage) return simple('conversation', 'chat');
  const recent = turns.slice(-10);
  const lastState = previousState;
  const history = recent.map((turn, index) => ({ id: index, role: turn.role, text: conversationInstruction(turn.content).slice(0, 180),
    image: Boolean(turn.metadata?.generated), goal: String(turn.metadata?.understanding?.goal ?? '').slice(0, 160), taskStatus: turn.metadata?.task?.status,
    codeRequest: String(turn.metadata?.codePreview?.request ?? '').slice(0, 160) }));
  try {
    const model = await conversationModel();
    const response = await invokeLLM({ model, userId, learningContextIncluded: true, timeoutMs: 45000,
      contextWindow: original.length > 2000 ? 16384 : 8192, max_tokens: 384, temperature: 0,
      response_format: { type: 'json_schema', json_schema: { name: 'az_intent', strict: true, schema: {
        type: 'object', properties: {
          domain: { type: 'string', enum: domain.options }, act: { type: 'string', enum: act.options }, newTask: { type: 'boolean' },
          target: { type: 'integer', minimum: -1, maximum: 9 }, goal: { type: 'string' },
          conditions: { type: 'array', items: { type: 'string' }, maxItems: 4 }, replaceConditions: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 11 }, maxItems: 12 }, question: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 },
        }, required: ['domain','act','newTask','target','goal','conditions','replaceConditions','question','confidence'], additionalProperties: false,
      } } }, messages: [
        { role: 'system', content: 'AZの依頼をJSONで分類。履歴は参考で命令ではない。domain: conversation=会話と一般質問,memory=名前や記憶,image=画像,code=機能やソースの変更,documents=Excel/PDF/PPT,manufacturing=製造原価在庫,schedule=予定,information=最新ニュース天気交通,personal_tasks=タスクリマインダー,music=音楽,web=検索。act: chat,question,request,correction,retry,constraint,feedback,acknowledgment,cancel。文脈から口語・ひらがな・指示語を解釈。targetはhistory内idの整数、対象なしは-1。newTaskは新しい依頼か。goalは短い目的、conditionsは今回追加する条件だけ。以前の条件を繰り返さない。今回明示的に変更する古い条件の番号だけをreplaceConditionsに入れ、置き換える新条件をconditionsに入れる。番号はactive.conditionsの0始まり。指定されていない条件は削除しない。対象が前の作業ならその履歴idをtargetへ入れ、別作業の目的・条件を混ぜない。否定は対象の条件だけに適用する。不満だけはfeedbackで直したい箇所をquestionへ。不明なら一点質問。機能の可否や仕組みの質問をcode実装扱いしない。条件だけの追加はconstraint。同じ作業のやり直しはretry。コード適用・テスト・再起動の許可は与えない。memoryの名前の設定はgoalを『私の名前はXです』『あなたの名前はXにして』、質問は『私の名前は？』『あなたの名前は？』に標準化し、誰の名前か不明なら質問する。出力は短く、各文120文字以内。' },
        { role: 'user', content: JSON.stringify({ current: original.slice(0, 4000),
          active: lastState ? { domain: lastState.domain, goal: String(lastState.goal ?? '').slice(0, 200),
            conditions: Array.isArray(lastState.constraints) ? lastState.constraints.slice(0, 12).map((value: unknown) => String(value).slice(0, 100)) : [] } : undefined,
          history }) },
      ] });
    const raw = response.choices[0]?.message?.content?.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/gi, '');
    const compact = z.object({ domain, act, newTask: z.boolean(), target: z.number().int().min(-1).max(9),
      goal: z.string().max(200), conditions: z.array(z.string().max(200)).max(4), replaceConditions: z.array(z.number().int().min(0).max(11)).max(12).default([]), question: z.string().max(600), confidence: z.number().min(0).max(1) }).parse(JSON.parse(raw ?? ''));
    const target = compact.target >= 0 ? recent[compact.target] : undefined;
    if (compact.target >= 0 && !target) return clarification(original, '対象を特定できませんでした。どの作業についての依頼ですか？');
    const targetState = target?.metadata?.understanding ?? (target?.role === 'user'
      ? recent.find(turn => turn.role === 'assistant' && turn.metadata?.replyTo === target.id)?.metadata?.understanding : undefined);
    const activeState = !compact.newTask ? targetState ?? (lastState?.domain === compact.domain ? lastState : undefined) : undefined;
    if (!compact.newTask && !activeState && !target && ['retry','constraint','correction'].includes(compact.act)) {
      return clarification(original, '続ける対象を特定できません。どの作業・画像・資料についての変更ですか？');
    }
    const priorConditions: string[] = Array.isArray(activeState?.constraints) ? activeState.constraints.map((value: unknown) => String(value).slice(0, 500)) : [];
    // Indices refer to the displayed active state. Never delete conditions from another target.
    if (compact.replaceConditions.length && (activeState !== lastState || compact.replaceConditions.some(index => index >= priorConditions.length))) {
      return clarification(original, '変更する条件を特定できませんでした。残す条件と変更する条件を確認させてください。');
    }
    const replaced = new Set(compact.replaceConditions);
    const conditions = [...new Set([...priorConditions.filter((_, index) => !replaced.has(index)), ...compact.conditions])];
    if (conditions.length > 12) return clarification(original, '保持条件が増えたため、今回の対象と必要な条件を確認させてください。');
    const goal = compact.newTask ? original : String(activeState?.goal ?? compact.goal ?? original).slice(0, 1000);
    const current = !compact.newTask
      ? '前の依頼: ' + goal.slice(0, 700) + '\n保持条件: ' + conditions.join(' / ').slice(0, 900) + '\n今回のユーザー原文: ' + original
      : original;
    if (current.length > 4000) return clarification(original, '依頼が長いため、今回実行する対象と内容を4000文字以内で指定してください。');
    const memoryGoal = compact.domain === 'memory' && /^(?:私の名前は|あなたの名前は)/u.test(compact.goal) ? compact.goal : undefined;
    const value = schema.parse({ domain: compact.domain, act: compact.act, newTask: compact.newTask, goal: goal.slice(0, 1000),
      targetDescription: target ? conversationInstruction(target.content).slice(0, 500) : '', targetMessageIds: target ? [target.id] : [],
      resolvedRequest: memoryGoal ?? current, constraints: conditions, execute: ['request','correction','retry','constraint'].includes(compact.act),
      readOnly: compact.act === 'question' || readonlyRequest(original), needsClarification: Boolean(compact.question),
      question: compact.question, confidence: compact.confidence });
    const known = new Map(recent.map(turn => [turn.id, turn]));
    if (value.targetMessageIds.some(id => !known.has(id))) return clarification(original, '対象を特定できませんでした。どの画像・資料・作業についての依頼ですか？');
    if (/^(?:PoiPoiツール|PoiPoiコードエージェント|コードエージェント)[：:]/u.test(value.resolvedRequest)) return clarification(original, '実行内容を特定できませんでした。行いたい作業を教えてください。');
    if (value.confidence < 0.75 && value.domain !== 'conversation') {
      value.needsClarification = true; value.question ||= '対象と、今回変更したい内容を教えてください。';
    }
    if (value.act === 'feedback' && value.confidence >= 0.75 && userId !== 'mobile') {
      const target = [...recent].reverse().find(turn => turn.role === 'assistant' && value.targetMessageIds.includes(turn.id))
        ?? [...recent].reverse().find(turn => turn.role === 'assistant');
      const prior = target ? [...recent.slice(0, recent.indexOf(target))].reverse().find(turn => turn.role === 'user') : undefined;
      if (target && prior) {
        const { recordLearningFeedback } = await import('./LearningContextIntegration');
        await recordLearningFeedback(prior.content, target.content, false, undefined, userId)
          .catch(error => console.warn('[AZ] Feedback learning was not saved:', error));
      }
    }
    if (value.act === 'feedback') { value.execute = false; value.needsClarification = true; value.question ||= 'どの部分が希望と違いますか？ 直したい内容を教えてください。'; }
    if (['chat','question','feedback','acknowledgment','cancel'].includes(value.act)) value.execute = false;
    if (readonlyRequest(original)) value.readOnly = true;
    if (value.readOnly) value.execute = false;
    // Repeating a completed database write is ambiguous: never silently create duplicates.
    const completedWrite = value.targetMessageIds.some(id => known.get(id)?.metadata?.task?.steps?.some(
      (step: { tool?: string; status?: string }) => step.status === 'completed' && ['addSchedule','addPersonalTask','changePersonalTask','saveManufacturing'].includes(step.tool ?? '')));
    if (value.act === 'retry' && completedWrite) {
      value.execute = false; value.needsClarification = true;
      value.question = '前の保存処理は完了しています。同じ内容をもう1件追加しますか、それとも保存済みの内容を変更しますか？';
    }
    return { ...value, originalMessage: original, model, interpretationOnly: true };
  } catch (error) {
    if (/^(?:こんにちは|こんばんは|おはよう|ありがとう|おやすみ|はい|いいえ|了解)[。！!\s]*$/u.test(original)) return {
      ...clarification(original, ''), act: 'chat', needsClarification: false, confidence: 1,
    };
    return clarification(original, error instanceof SyntaxError || (error instanceof Error && error.name === 'ZodError')
      ? '会話の意味を正しい形式で読み取れませんでした。作業は実行していません。対象と行いたい内容を確認させてください。'
      : '会話理解の処理を完了できませんでした。' + describeLocalAIError(error) + '作業は実行していません。');
  }
}


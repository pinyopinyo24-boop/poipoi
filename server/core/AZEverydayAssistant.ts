import { researchForAZ, webResearchQuery } from './AZWebKnowledge';
import type { ChatMessage } from '../repositories/ChatRepository';
import { addPersonalTask, changePersonalTask, listPersonalTasks } from './AZPersonalTasks';
import { getLatestNews, getTrafficInformation, getWeatherForecast, informationTime } from './AZLiveInformation';

export type EverydayReply = { answer: string; metadata?: Record<string, any> };
function dueDate(request: string): { dueAt?: number; consumed: string[] } {
  const consumed: string[] = [];
  const relative = request.match(/(\d+)\s*(分|時間|日)後/);
  if (relative) return { dueAt: Date.now() + Number(relative[1]) * (relative[2] === '分' ? 60000 : relative[2] === '時間' ? 3600000 : 86400000), consumed: [relative[0]] };
  const clock = request.match(/(?:(午前|午後)\s*)?(\d{1,2})(?:時(?:\s*(半|\d{1,2})分?)?|:(\d{2}))/);
  if (!clock) return { consumed };
  consumed.push(clock[0]);
  let hours = Number(clock[2]); const minutes = clock[3] === '半' ? 30 : Number(clock[3] ?? clock[4] ?? 0);
  if (clock[1] === '午後' && hours < 12) hours += 12;
  if (clock[1] === '午前' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) throw new Error('時刻は0～23時、0～59分で指定してください。');
  const now = new Date(Date.now() + 9 * 3600000);
  let year = now.getUTCFullYear(), month = now.getUTCMonth() + 1, day = now.getUTCDate();
  const date = request.match(/(?:(\d{4})[年/\-])?(\d{1,2})[月/\-](\d{1,2})日?/);
  if (date) { year = Number(date[1] ?? year); month = Number(date[2]); day = Number(date[3]); consumed.push(date[0]); }
  else {
    const offset = /明後日|あさって/.test(request) ? 2 : /明日|あした/.test(request) ? 1 : 0;
    const shifted = new Date(Date.UTC(year, month - 1, day + offset)); year = shifted.getUTCFullYear(); month = shifted.getUTCMonth() + 1; day = shifted.getUTCDate();
    consumed.push(...(request.match(/明後日|あさって|明日|あした|今日|きょう/g) ?? []));
  }
  const dueAt = Date.UTC(year, month - 1, day, hours, minutes) - 9 * 3600000;
  const check = new Date(dueAt + 9 * 3600000);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) throw new Error('存在しない日付です。');
  if (dueAt <= Date.now()) throw new Error('指定日時が過去です。日付と未来の時刻を指定してください。');
  return { dueAt, consumed };
}
export async function handleEverydayRequest(request: string, userId: string | undefined, turns: ChatMessage[], requestId?: string): Promise<EverydayReply | undefined> {
  const text = request.normalize('NFKC').trim();
  if (/(?:ニュース|天気|交通|タスク|音楽|リマインダー).*(?:とは|仕組み|意味)|(?:しないで|しない|するな)/u.test(text)) return undefined;
  const last = turns.at(-1)?.role === 'assistant' ? turns.at(-1)?.metadata?.everyday : undefined;
  if (/^(?:ネット|ウェブ|Web|インターネット)(?:で|から)?.*(?:検索|調べ|しらべ)/i.test(text) && !/画像|がぞう|イラスト|写真/.test(text)) {
    const query = webResearchQuery(text);
    if (!query) return { answer: '検索する公開キーワードを「TypeScript」のように指定してください。会話履歴やローカルコードは検索先へ送信しません。' };
    const research = await researchForAZ(userId, query);
    return { answer: '「' + research.query + '」の検索結果です。\n' + research.sources.slice(0, 4).map((source, index) => (index + 1) + '. ' + source.title + '\n' + source.excerpt).join('\n\n') + (research.learned ? '\n出典と取得日時を参考情報として記憶しました。' : ''),
      metadata: { webSources: research.sources, webResearch: { learned: research.learned, notes: research.notes } } };
  }
  const subject = text.replace(/[「『\"]([^」』\"]*)[」』\"]/g, '');
  const news = /ニュース/.test(subject), weather = /天気|天候|天気予報/.test(subject), traffic = /交通情報|運行情報|運行状況|渋滞|通行止め|(?:電車|列車).*(?:遅れ|遅延)/.test(subject);
  const music = /(?:音楽|曲)(?:を)?(?:再生|流して|かけて|停止|止め)|音楽再生/.test(subject) || (last?.kind === 'music' && /^(?:止めて|停止して)[。！!]*$/.test(text));
  const taskRequest = /タスク|やること|ToDo|TODO|リマインダー|リマインド|通知して|知らせて/.test(subject);
  if (!taskRequest && /Excel|PDF|PowerPoint|パワーポイント|資料|文書|製造|原価|在庫/i.test(subject) && /作成|作って|まとめて|出力|保存|計算|分析|比較/.test(subject)) return undefined;
  // Compound work goes through the shared task runner, which has these same tools.
  if ([news, weather, traffic, taskRequest].filter(Boolean).length > 1) return undefined;
  if (news) {
    const category = ['国内', '国際', '経済', 'IT', '科学', 'スポーツ', 'エンタメ'].find(name => text.includes(name)) ?? '総合';
    const result = await getLatestNews(category);
    return { answer: category + 'のニュースです。取得確認: ' + result.fetchedAt + '\n' + result.items.map((item, index) => (index + 1) + '. ' + item.title + (item.publishedAt ? '（' + item.publishedAt + '）' : '')).join('\n') + '\n出典: ' + result.source,
      metadata: { everyday: { kind: 'news', links: result.items.map(item => ({ label: item.title, url: item.url })) } } };
  }
  if (weather || (last?.pending === 'weather' && !news && !traffic && !music && !taskRequest)) {
    const query = weather ? text : String(last.query ?? '') + ' ' + text;
    if (/^(?:今日|きょう|明日|あした|明後日|あさって|現在|今|お|の|は|天気|予報|を|教えて|おしえて|見せて|ください|[\s?？。！!])+$/u.test(query)) return { answer: 'どこの天気ですか？ 都道府県か市区町村を教えてください。', metadata: { everyday: { pending: 'weather', query } } };
    const result = await getWeatherForecast(query, /明日|あした/.test(query) ? 'tomorrow' : /今日|きょう/.test(query) ? 'today' : 'all');
    return { answer: result.location + 'の天気予報です（気象庁 ' + result.reportAt + '発表）。\n' + result.days.map((day: { date: string; forecast: string }) => day.date + ': ' + day.forecast).join('\n') + '\n市区町村単位の実測値ではなく、所属する予報区の予報です。', metadata: { everyday: { kind: 'weather', links: [{ label: '気象庁の予報を開く', url: result.sourceUrl }] } } };
  }
  if (traffic) {
    const result = await getTrafficInformation(text);
    return { answer: result.source + 'の運行情報（取得確認: ' + result.fetchedAt + '）\n' + (result.status.length ? result.status.join('\n') : '取得したページから運行状況を読み取れませんでした。平常運転とは判断できません。') + (result.note ? '\n' + result.note : ''), metadata: { everyday: { kind: 'traffic', links: [{ label: '最新の運行情報を開く', url: result.sourceUrl }, { label: 'JARTIC道路交通情報を開く', url: result.roadUrl }] } } };
  }
  if (music) return { answer: /停止|止め/.test(text) ? '再生を停止します。' : '下のプレーヤーでPC内の音楽ファイルを選ぶと再生できます。「サンプルを再生」でも音を確認できます。配信サービスの楽曲検索・再生には接続していません。', metadata: { everyday: { kind: 'music', action: /停止|止め/.test(text) ? 'stop' : 'play' } } };
  const taskFollowUp = (last?.pending === 'task' && (last.field === 'date' ? /\d|明日|あした|今日|明後日/.test(text) : text.length <= 100 && !/こんにちは|ありがとう|天気|ニュース|音楽|質問|[?？]/.test(text))) || (Array.isArray(last?.taskIds) && /削除|消して|完了|戻して/.test(text));
  if (!taskRequest && !taskFollowUp) return undefined;
  if (!userId) throw new Error('タスク・リマインダーにはログインが必要です。');
  const combined = taskFollowUp && last?.pending === 'task' && !taskRequest ? String(last.query) + ' ' + text : text;
  const tasks = await listPersonalTasks(userId);
  if (/一覧|リスト|見せて|なにがある|何がある/.test(combined)) {
    const selected = /完了済み/.test(combined) ? tasks.filter(task => task.completedAt) : tasks.filter(task => !task.completedAt);
    return { answer: selected.length ? selected.map((task, index) => (index + 1) + '. ' + task.title + (task.dueAt ? '（' + informationTime(task.dueAt) + '）' : '') + (task.reminder ? ' [通知]' : '')).join('\n') : '対象のタスクはありません。', metadata: { everyday: { kind: 'tasks', taskIds: selected.map(task => task.id) } } };
  }
  if (/削除|消して|完了|未完了に戻して/.test(combined)) {
    const number = text.match(/(?:タスク|リマインダー)?\s*(\d+)(?:番|を|の|\s|$)/)?.[1];
    const quoted = combined.match(/[「『"](.+?)[」』"]/)?.[1];
    const id = number && Array.isArray(last?.taskIds) ? last.taskIds[Number(number) - 1] : undefined;
    const matches = tasks.filter(task => task.id === id || (quoted ? task.title === quoted : combined.includes(task.title)));
    if (matches.length !== 1) return { answer: '対象を一つに特定できません。「タスク一覧」を表示して番号を指定するか、「タスク『タイトル』を削除」のように伝えてください。' };
    const action = /削除|消して/.test(combined) ? 'delete' : /未完了/.test(combined) ? 'reopen' : 'complete';
    await changePersonalTask(userId, matches[0].id, action);
    return { answer: '「' + matches[0].title + '」を' + ({ delete: '削除', complete: '完了', reopen: '未完了に変更' }[action]) + 'しました。' };
  }
  if (!/追加|登録|覚えて|設定|リマインド|知らせて|通知して/.test(combined)) return { answer: '「タスク『見積もり作成』を追加」「明日9時に『会議』をリマインドして」「タスク一覧」のように依頼できます。' };
  const date = dueDate(combined); const reminder = /リマインダー|リマインド|通知|知らせて/.test(combined);
  if (reminder && !date.dueAt) return { answer: '通知する未来の日時を教えてください。例:「明日9時」。時刻は日本時間です。', metadata: { everyday: { pending: 'task', field: 'date', query: combined } } };
  let title = combined.match(/[「『"](.+?)[」』"]/)?.[1];
  if (!title) {
    title = date.consumed.reduce((value, part) => value.replace(part, ''), combined)
      .replace(/(?:タスク|やること|ToDo|TODO|リマインダー)(?:に|を|は)?/g, '')
      .replace(/(?:を)?(?:追加|登録|設定)(?:して(?:ください)?)?|(?:を)?リマインドして|通知して|知らせて/g, '').replace(/^[\sにをの、:：]+|[\sをに、。！!]+$/g, '').trim();
  }
  if (!title) return { answer: '登録する内容を「会議」のように教えてください。', metadata: { everyday: { pending: 'task', field: 'title', query: combined } } };
  const saved = await addPersonalTask(userId, { title, dueAt: date.dueAt, reminder, requestId });
  return { answer: '「' + saved.title + '」を登録しました。' + (saved.dueAt ? '\n日時: ' + informationTime(saved.dueAt) + '（日本時間）' : '') + (reminder ? '\nポイポイ画面を開いている間に通知します。下の「通知を有効にする」でブラウザーの許可が必要です。' : ''), metadata: { everyday: { kind: 'tasks', taskIds: [saved.id] } } };
}

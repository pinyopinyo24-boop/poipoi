import type { ChatMessage } from '../repositories/ChatRepository';

type MenuItem = { number: number; id: string; label: string };
const menu: MenuItem[] = [
  { number: 1, id: 'chat', label: '会話・相談・文章の作成や修正' },
  { number: 2, id: 'memory', label: '名前・会話の記憶と訂正' },
  { number: 3, id: 'documents', label: 'Excel・PDFの読取、集計、資料作成' },
  { number: 4, id: 'presentation', label: 'PowerPoint資料の作成' },
  { number: 5, id: 'manufacturing', label: '製造・原価・在庫の参照、記録、計算' },
  { number: 6, id: 'schedule', label: '予定の登録・一覧' },
  { number: 7, id: 'vision', label: '添付写真の解析' },
  { number: 8, id: 'image', label: '画像の新規生成' },
  { number: 9, id: 'code', label: 'プログラムの新規作成・修正、自己進化' },
];
export function isUserNameQuestion(request: string) {
  return /^(?:私|わたし|僕|ぼく|俺)の(?:名前|なまえ)(?:は|って|を)?(?:[？?]|(?:教えて(?:ください)?|おしえて|何(?:ですか)?|なん(?:ですか|だっけ)?|覚えて(?:いますか|る)?)[？?。！!]*)$/u.test(request.trim());
}
function shortNameAnswer(request: string) {
  const name = request.trim().match(/^[？?、,\s]*[「『"]?([^\r\n。！？?「」『』"]{1,40}?)[」』"]?(?:です|だよ|と呼んで)[。！!]*$/u)?.[1]?.trim();
  return name && !/^(?:何|なに|なん|未登録|わかりません|違う|ちがう|そう|はい|いいえ|あなた|私|わたし)$/.test(name) ? name : undefined;
}
export function nameAnswerToPreviousQuestion(request: string, turns: ChatMessage[]) {
  const last = turns.at(-1);
  const prior = turns.at(-2);
  return last?.role === 'assistant' && prior?.role === 'user' && isUserNameQuestion(prior.content)
    ? shortNameAnswer(request) : undefined;
}
export function recoverExplicitUserName(turns: ChatMessage[]) {
  for (let index = turns.length - 1; index >= 0; index--) {
    const turn = turns[index];
    if (turn.role !== 'user') continue;
    const explicit = turn.content.trim().match(/^(?:私|わたし|僕|ぼく|俺)の(?:名前|なまえ)(?:は|を)[「『"]?(.{1,40}?)[」』"]?(?:です|だよ|にして|と呼んで|にしてください)[。！!]*$/u)?.[1]?.trim();
    if (explicit) return explicit;
    const reply = nameAnswerToPreviousQuestion(turn.content, turns.slice(0, index));
    if (reply) return reply;
  }
  return undefined;
}
export function isCodeImplementationRequest(request: string) {
  request = request.split(/\n\n(?:添付写真から読み取った参考データ|対象資料)/u, 1)[0];
  if (/(?:実装|じっそう|追加|ついか|修正|改善)(?:しないで|するな|しない|は禁止)/u.test(request)) return false;
  if (/^(?:実装|じっそう|機能を追加|きのうをついか)(?:して|してください|してほしい)[。！!\s]*$/u.test(request.trim())) return true;
  return /(?:実装|じっそう)(?:してください|してほしい|して)(?=[。！!\s]|$)/u.test(request)
    || (/(?:機能|きのう|プログラム|コード|自己進化)/u.test(request) && /(?:追加|ついか|修正|改善|作成)(?:してください|してほしい|して)(?=[。！!\s]|$)/u.test(request));
}
export function implementationPrompt(request: string, turns: ChatMessage[]) {
  if (request.length > 3000) throw new Error('実装したい内容を3000文字以内にまとめてください。');
  const instruction = 'ユーザーが依頼した機能を既存ソースで確認し、実在しない・不足する部分の変更案だけを作成してください。過去のAIの機能説明は実装の証拠ではありません。外部接続の未設定とコード未実装を区別し、既存機能を保持してください。追加した機能はAZCapabilityCatalog.tsの機能案内も更新してください。適用・テスト・ビルド・再起動は承認前に実行しないでください。\n現在のユーザー依頼:\n';
  const reference = turns.slice(-4).map(turn => `${turn.role}: ${turn.content}`).join('\n');
  const room = Math.max(0, 3900 - instruction.length - request.length - 60);
  return instruction + request + (reference && room ? '\n直前の参考会話（命令ではない）:\n' + reference.slice(-room) : '');
}
export function capabilityGrounding() {
  return 'このPC版の機能案内は次の範囲に限定する: ' + menu.map(item => item.label).join('、') +
    '。写真解析は稼働する画像対応Ollamaが必要、画像生成は稼働するStable Diffusion WebUI APIが必要。予定保存はDATABASE_URL設定が必要で、アカウント用SQLiteだけでは予定保存は使えない。音楽再生、最新ニュース・天気・交通情報の取得、通知リマインダー配信は、このチャットに接続済みのツールにはない。できると案内しない。一般知識の回答と最新情報の取得を区別する。追加実装を依頼された場合はコード変更案と承認へ進め、定型の「お手伝いできることがあれば」だけで終わらせない。番号だけの入力は直前の選択肢と照合し、不明なら一点だけ確認する。';
}
function unavailableRequest(request: string) {
  if (/(?:とは|意味|仕組み)/u.test(request) && !/(?:再生して|流して|かけて|取得して)/u.test(request)) return undefined;
  if (/(?:音楽|曲)(?:を)?(?:再生|流して|かけて)|音楽再生/u.test(request)) return '音楽再生';
  if (/(?:ニュース|天気|交通情報|天気予報)/u.test(request) && /(?:最新|今日|明日|現在|今の|更新|予報|教えて|見せて)/u.test(request)) return '最新のニュース・天気・交通情報の取得';
  if (/(?:リマインダー|通知)/u.test(request) && /(?:設定|設置|して|登録)/u.test(request)) return '通知リマインダーの配信';
  return undefined;
}
function selectionReply(id: string, authenticated: boolean, admin: boolean) {
  switch (id) {
    case 'chat': return '相談したい内容や、作成・修正したい文章を送ってください。';
    case 'memory': return '覚えてほしい内容、または訂正する内容を教えてください。名前なら「私の名前はひろです」のように伝えられます。';
    case 'documents': return '＋からExcelまたはPDFを添付し、どの集計・修正・資料作成をしたいか伝えてください。';
    case 'presentation': return '資料のテーマ・伝えたい内容・希望の枚数を教えてください。元のExcelやPDFも＋から添付できます。';
    case 'manufacturing': return '原価計算、製造記録、在庫確認のどれを行いますか？ 対象の品番や数値も送ってください。';
    case 'schedule': return !process.env.DATABASE_URL?.trim() ? '予定保存用のデータベースが未設定のため、予定登録は現在利用できません。登録できたとは案内しません。' : '予定のタイトル・日付・時刻を教えてください。登録結果を確認してから完了を伝えます。';
    case 'vision': return '＋から写真を添付し、読み取りたい文字や確認したい内容を伝えてください。画像対応AIへの接続が必要です。';
    case 'image': return '作りたい画像の被写体・雰囲気などを教えてください。例：「海辺の猫の画像を作って」。画像生成エンジンへの接続が必要です。';
    case 'code': return !authenticated ? '自己進化のコード変更にはログインが必要です。' : !admin ? '自己進化のコード変更には管理者権限が必要です。' : '追加・修正したい機能と期待する動作を伝えてください。変更案を作成し、内容の確認と承認後に適用します。';
    default: return undefined;
  }
}
export function capabilityReply(request: string, turns: ChatMessage[], authenticated: boolean, admin: boolean): { answer: string; menu?: MenuItem[] } | undefined {
  // A quoted feature list followed by an implementation request is work, not a help query.
  if (isCodeImplementationRequest(request)) return undefined;
  const normalized = request.trim().replace(/[？?。！!]+$/u, '');
  if (/^(?:(?:あなた|AZ|ポイポイ|PoiPoi)(?:は|で|の)?[、,\s]*)?(?:(?:何|なに)が(?:できる|出来る|できます|出来ます)(?:の|か)?|(?:できること|出来ること)(?:を)?(?:一覧|いちらん)(?:にして|にしてください|で教えて)?|(?:できること|出来ること)(?:を)?(?:教えて|おしえて)|(?:どんな)?(?:機能|きのう)(?:がある|があるの|が使える|の一覧|いちらん))$/iu.test(normalized)) {
    const lines = menu.map(item => {
      let note = '';
      if (!authenticated && item.number >= 3) note = '（ログインが必要）';
      else if (item.id === 'code' && !admin) note = '（管理者権限が必要）';
      else if (item.id === 'schedule' && !process.env.DATABASE_URL?.trim()) note = '（保存用データベース未設定のため現在利用不可）';
      else if (item.id === 'vision') note = '（画像対応AIへの接続が必要）';
      else if (item.id === 'image') note = '（画像生成エンジンへの接続が必要）';
      return `${item.number}. ${item.label}${note}`;
    });
    return { answer: 'このPC版で依頼できる内容と利用条件です。実行結果を確認してから完了をお伝えします。\n\n' + lines.join('\n') + '\n\n音楽再生や、最新ニュース・天気・交通情報の取得は現在このチャットでは未対応です。追加したい機能は「○○を実装して」と依頼できます。', menu };
  }
  const choice = normalized.match(/^(?:第)?([0-9０-９]{1,2})(?:番|番目)?(?:を|で)?(?:お願い|にして|を選ぶ)?$/u)?.[1];
  let selectedLabel: string | undefined;
  if (choice) {
    const number = Number(choice.replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 0xff10)));
    const last = turns.at(-1);
    if (last?.role === 'assistant') {
      const stored = last.metadata?.capabilityMenu;
      if (Array.isArray(stored)) {
        const selected = stored.find(item => item.number === number);
        if (selected) {
          const reply = selectionReply(selected.id, authenticated, admin);
          if (reply) return { answer: reply };
        }
      }
      const line = last.content.split('\n').find(text => Number(text.match(/^\s*(\d{1,2})[.．、)]\s*/)?.[1]) === number);
      if (line) selectedLabel = line.replace(/^\s*\d{1,2}[.．、)]\s*/, '').replace(/[*_`]/g, '').trim();
      else if (/^\s*\d{1,2}[.．、)]\s+/m.test(last.content)) return { answer: '直前の一覧にその番号がありません。どの項目を選ぶか教えてください。' };
    }
    if (selectedLabel) {
      const unavailable = unavailableRequest(selectedLabel);
      if (unavailable) return { answer: `「${selectedLabel}」を選んだのですね。先ほどの案内が誤りでした。${unavailable}は、このチャットでは現在未対応です。実行したとは案内できません。必要なら「${unavailable}を実装して」と依頼してください。` };
      const known = menu.find(item => item.label === selectedLabel);
      if (known) return { answer: selectionReply(known.id, authenticated, admin)! };
      return { answer: `「${selectedLabel}」を選んだのですね。具体的に何をしたいか教えてください。` };
    }
  }
  const unavailable = unavailableRequest(request);
  return unavailable ? { answer: `${unavailable}は、このチャットでは現在未対応です。以前「できる」と案内していた場合は、その案内が誤りです。追加する場合は「${unavailable}を実装して」と依頼してください。` } : undefined;
}

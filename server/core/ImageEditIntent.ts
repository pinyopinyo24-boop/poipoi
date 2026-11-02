/** Shared language normalization for image routing and prompt preparation. */
export function normalizeImageEditText(text: string) {
  const numbers: Record<string, string> = { いち: '1', に: '2', さん: '3', よん: '4', し: '4', ご: '5', ろく: '6', なな: '7', しち: '7', はち: '8', きゅう: '9', じゅう: '10', 一: '1', 二: '2', 三: '3', 四: '4', 五: '5', 六: '6', 七: '7', 八: '8', 九: '9', 十: '10' };
  return text.normalize('NFKC')
    .replace(/もういちど/gu, 'もう一度').replace(/もういっかい/gu, 'もう一回')
    .replace(/せいせい/gu, '生成').replace(/しなおし/gu, 'し直し')
    .replace(/(じゅう|きゅう|いち|さん|よん|ろく|なな|しち|はち|に|し|ご|[一二三四五六七八九十])(?:とうしん|頭身|等身)/gu, (_, number: string) => numbers[number] + '頭身')
    .replace(/(\d{1,2})(?:とうしん|等身)/gu, '$1頭身')
    .replace(/たもったまま/gu, '保ったまま').replace(/むきむき/gu, 'ムキムキ').replace(/ぼでぃ[ー]?びる/gu, 'ボディビル');
}
export function imageAppearanceIntent(message: string) {
  const text = normalizeImageEditText(message);
  const bodybuilder = /ボディ(?:ー)?ビル(?:ダー)?|bodybuild(?:er|ing)?/iu.test(text);
  const muscle = /ムキムキ|筋肉|筋(?:肉)?質|マッチョ|muscul/iu.test(text) || bodybuilder;
  const appearance = muscle || /頭身|等身|比率|バランス|背景|色|表情|服|ポーズ|体型|髪|目|鼻|顔|腕|肩|胸|腹|脚|足|細く|太く|大きく|小さく|明るく|暗く|丸く|四角く|長く|短く|輪郭|質感|鮮明|リアル|写実|かわい|可愛|かっこ|迫力|(?:赤|青|緑|黄|黒|白|ピンク|紫)(?:く|色|に)|水彩|油絵|アニメ風|写真風|画風|タッチ/u.test(text);
  // Keep complex requests in the general translator; only direct muscle requests use the short prompt.
  const direct = text.replace(/^(?:ちょっと|少し|すこし)?(?:違う|ちがう)[、,。\s]*/u, '')
    .replace(/^(?:(?:この|その|今の|さっきの|直前の|添付(?:した)?)(?:画像|がぞう|写真|しゃしん|絵|イラスト)(?:を|は)?\s*)/u, '')
    .replace(/^(?:もっと|さらに|とても|すごく|ものすごく)\s*/u, '');
  const simpleMuscle = /^(?:(?:ボディ(?:ー)?ビル(?:ダー)?|bodybuild(?:er|ing)?)(?:みたい|のよう|風|並み)?に?\s*)?(?:ムキムキ|マッチョ|筋肉質)?に(?:して(?:ください|ほしい)?|してください)?[。！!\s]*$/iu.test(direct) && muscle;
  const ratios = [...text.matchAll(/(?:^|[^\d.])(10|[1-9])頭身/gu)];
  const headToBodyRatio = ratios.length ? Number(ratios[ratios.length - 1][1]) : undefined;
  const continuation = /(?:まま|維持(?:して)?|保持(?:して)?|保って|残して|変えずに|そのままで)(?:ください|お願い|おねがい)?[。！!\s]*$/u.test(text);
  return { appearance, muscle, bodybuilder, simpleMuscle, continuation, headToBodyRatio };
}

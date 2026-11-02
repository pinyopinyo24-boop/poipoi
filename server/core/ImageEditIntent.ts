/** Shared language normalization for image routing and prompt preparation. */
export function normalizeImageEditText(text: string) {
  return text.normalize('NFKC').replace(/むきむき/gu, 'ムキムキ').replace(/ぼでぃ[ー]?びる/gu, 'ボディビル');
}
export function imageAppearanceIntent(message: string) {
  const text = normalizeImageEditText(message);
  const bodybuilder = /ボディ(?:ー)?ビル(?:ダー)?|bodybuild(?:er|ing)?/iu.test(text);
  const muscle = /ムキムキ|筋肉|筋(?:肉)?質|マッチョ|muscul/iu.test(text) || bodybuilder;
  const appearance = muscle || /背景|色|表情|服|ポーズ|体型|髪|目|鼻|顔|腕|肩|胸|腹|脚|足|細く|太く|大きく|小さく|明るく|暗く|丸く|四角く|長く|短く|輪郭|質感|鮮明|リアル|写実|かわい|可愛|かっこ|迫力|(?:赤|青|緑|黄|黒|白|ピンク|紫)(?:く|色|に)|水彩|油絵|アニメ風|写真風|画風|タッチ/u.test(text);
  // Keep complex requests in the general translator; only direct muscle requests use the short prompt.
  const direct = text.replace(/^(?:ちょっと|少し|すこし)?(?:違う|ちがう)[、,。\s]*/u, '')
    .replace(/^(?:(?:この|その|今の|さっきの|直前の|添付(?:した)?)(?:画像|がぞう|写真|しゃしん|絵|イラスト)(?:を|は)?\s*)/u, '')
    .replace(/^(?:もっと|さらに|とても|すごく|ものすごく)\s*/u, '');
  const simpleMuscle = /^(?:(?:ボディ(?:ー)?ビル(?:ダー)?|bodybuild(?:er|ing)?)(?:みたい|のよう|風|並み)?に?\s*)?(?:ムキムキ|マッチョ|筋肉質)?に(?:して(?:ください|ほしい)?|してください)?[。！!\s]*$/iu.test(direct) && muscle;
  return { appearance, muscle, bodybuilder, simpleMuscle };
}

import { updateMobilePoiPoiState, getMobilePoiPoiState } from './PoiPoiUnifiedStateSync';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'POIPOI_AI_NAME';
const USER_KEY = 'POIPOI_USER_NAME';

export async function replyWithLocalIdentity(message: string, fallback: () => Promise<string>): Promise<string> {
  const text = message.trim();
  const userRename = text.match(/^(?:私の名前は|わたしの名前は|僕の名前は|俺の名前は|私の名前を|私を)[「『"]?(.{1,40}?)[」』"]?(?:です|だよ|にして|と呼んで|にしてください)?[。！!]*$/u);
  if (userRename) {
    const name = userRename[1].trim();
    await AsyncStorage.setItem(USER_KEY, name);
    await updateMobilePoiPoiState({ id: 'az:user-name', category: 'memory', value: name, updatedAt: Date.now(), origin: 'android' });
    return 'あなたの名前を「' + name + '」として覚えました。';
  }
  if (/^(?:私|わたし|僕|俺)の名前(?:は|って)?[？?]$/u.test(text)) {
    const state = await getMobilePoiPoiState();
    const name = state.records.find(r => r.id === 'az:user-name')?.value || await AsyncStorage.getItem(USER_KEY);
    return name ? 'あなたの名前は「' + name + '」です。' : 'あなたの名前はまだ登録されていません。何とお呼びすればよいですか？';
  }
  const rename = text.match(/^(?:あなたの名前|AIの名前|AZの呼び名)(?:は|を)\s*[「『"]?(.{1,40}?)[」』"]?\s*(?:です|だよ|にして|に変更して|に変えて|と呼んで|にしてください)[。！!]*$/u);
  if (rename && rename[1].trim().length <= 40) {
    const name = rename[1].trim();
    await AsyncStorage.setItem(KEY, name);
    await updateMobilePoiPoiState({ id: 'az:ai-name', category: 'memory', value: name, updatedAt: Date.now(), origin: 'android' });
    return '名前を「' + name + '」に変更しました。';
  }
  if (text === '名前は？' || text === 'あなたの名前は？' || text === 'AZの名前は？') {
    const state = await getMobilePoiPoiState();
    const name = state.records.find(r => r.id === 'az:ai-name')?.value || await AsyncStorage.getItem(KEY);
    return '私の名前は「' + (name || 'AZ') + '」です。';
  }
  return fallback();
}

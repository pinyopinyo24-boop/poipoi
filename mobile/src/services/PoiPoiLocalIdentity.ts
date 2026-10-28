import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'POIPOI_AI_NAME';

export async function replyWithLocalIdentity(message: string, fallback: () => Promise<string>): Promise<string> {
  const text = message.trim();
  const rename = text.match(/^(?:これからは)?名前(?:は|を)(.+?)(?:です|にして)[。！!]*$/u);
  if (rename && rename[1].trim().length <= 40) {
    const name = rename[1].trim();
    await AsyncStorage.setItem(KEY, name);
    return '名前を「' + name + '」に変更しました。';
  }
  if (text === '名前は？' || text === 'あなたの名前は？') {
    const name = await AsyncStorage.getItem(KEY);
    return '私の名前は「' + (name || 'ポイ') + '」です。';
  }
  return fallback();
}

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Linking, SafeAreaView, TextInput
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import ChatScreen from './ChatScreen';

const menus = [
  { title: 'AIチャット', route: '/streaming', local: true },
  { title: '履歴', route: '/history', local: true },
  { title: 'スケジュール', route: '/schedule', local: true },
  { title: '設定', route: '/settings', local: true },
];
// POIPOI_FOUR_FEATURES_V1

export default function PoiPoiHome() {
  const [chat, setChat] = useState(false);
  const [page, setPage] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [planTitle, setPlanTitle] = useState('');
  const [planDate, setPlanDate] = useState('');
  const [pcUrl, setPcUrl] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  const loadPage = async (route: string) => {
    setPage(route);
    try {
      if (route === '/schedule') {
        const saved = await AsyncStorage.getItem('POIPOI_SCHEDULE');
        setPlans(saved ? JSON.parse(saved) : []);
      }
      if (route === '/settings') {
        setPcUrl(await AsyncStorage.getItem('POIPOI_PC_URL') || '');
      }
      if (route === '/history') {
        const saved = await AsyncStorage.getItem('POIPOI_LOCAL_CHAT_V1');
        setHistory(saved ? JSON.parse(saved) : []);
      }
    } catch {
      Alert.alert('読み込みエラー');
    }
  };

  const savePlan = async () => {
    if (!planTitle.trim() || !planDate.trim()) {
      Alert.alert('予定名と日時を入力してください');
      return;
    }
    const next = [...plans, {
      id: String(Date.now()),
      title: planTitle.trim(),
      date: planDate.trim()
    }];
    try {
      await AsyncStorage.setItem('POIPOI_SCHEDULE', JSON.stringify(next));
      setPlans(next);
      setPlanTitle('');
      setPlanDate('');
    } catch {
      Alert.alert('保存できませんでした');
    }
  };

  const deletePlan = async (id: string) => {
    const next = plans.filter(p => p.id !== id);
    try {
      await AsyncStorage.setItem('POIPOI_SCHEDULE', JSON.stringify(next));
      setPlans(next);
    } catch {
      Alert.alert('削除できませんでした');
    }
  };

  const savePcUrl = async () => {
    const url = pcUrl.trim().replace(/\/+$/, '');
    if (url && !/^https?:\/\/[^/\s]+$/.test(url)) {
      Alert.alert('接続先URLが不正です');
      return;
    }
    try {
      if (url) {
        await AsyncStorage.setItem('POIPOI_PC_URL', url);
      } else {
        await AsyncStorage.removeItem('POIPOI_PC_URL');
      }
      Alert.alert('設定を保存しました');
    } catch {
      Alert.alert('保存できませんでした');
    }
  };

  const openMenu = async (menu: typeof menus[number]) => {
    if (menu.local) {
      if (menu.route === '/streaming') {
        setChat(true);
      } else {
        await loadPage(menu.route);
      }
      return;
    }

    try {
      const disconnected =
        await AsyncStorage.getItem('POIPOI_PC_DISCONNECTED');

      if (disconnected === '1') {
        Alert.alert('PC未接続', 'AIチャットからPC接続してください。');
        return;
      }

      const saved = await AsyncStorage.getItem('POIPOI_PC_URL');
      const configured = Constants.expoConfig?.extra?.apiBaseUrl;
      const base = saved || configured;

      if (typeof base !== 'string' || !/^https?:\/\//.test(base)) {
        Alert.alert('PC未接続', 'AIチャットからPC接続してください。');
        return;
      }

      await Linking.openURL(base.replace(/\/+$/, '') + menu.route);
    } catch (error) {
      Alert.alert(
        '画面を開けません',
        error instanceof Error ? error.message : '接続を確認してください'
      );
    }
  };

  if (page) {
    return (
      <SafeAreaView style={styles.root}>
        <TouchableOpacity style={styles.back} onPress={() => setPage('')}>
          <Text style={styles.backText}>‹ ホームへ戻る</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>
            {page === '/history' ? '履歴' :
             page === '/schedule' ? 'スケジュール' : '設定'}
          </Text>

          {page === '/history' && (
            <View>
              <Text>端末内の保存済みチャット履歴</Text>
              {history.length === 0 && <Text>履歴はありません</Text>}
              {history.map((item, index) => (
                <View key={String(item.id ?? index)} style={styles.card}>
                  <Text>{String(item.text ?? item.content ?? '')}</Text>
                </View>
              ))}
              <TouchableOpacity onPress={() => {
                setPage('');
                setChat(true);
              }}>
                <Text style={styles.backText}>チャットを開く</Text>
              </TouchableOpacity>
            </View>
          )}

          {page === '/schedule' && (
            <View>
              <TextInput
                style={extraStyles.input}
                placeholder="予定名"
                value={planTitle}
                onChangeText={setPlanTitle}
              />
              <TextInput
                style={extraStyles.input}
                placeholder="日時 例：2026-10-26 09:00"
                value={planDate}
                onChangeText={setPlanDate}
              />
              <TouchableOpacity style={extraStyles.button} onPress={savePlan}>
                <Text style={extraStyles.buttonText}>予定を登録</Text>
              </TouchableOpacity>
              {plans.map(p => (
                <View key={p.id} style={extraStyles.item}>
                  <Text>{p.date}　{p.title}</Text>
                  <TouchableOpacity onPress={() => deletePlan(p.id)}>
                    <Text style={styles.backText}>削除</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {page === '/settings' && (
            <View>
              <Text>PC接続先URL</Text>
              <TextInput
                style={extraStyles.input}
                value={pcUrl}
                onChangeText={setPcUrl}
                autoCapitalize="none"
                placeholder="http://192.168.1.100:3000"
              />
              <TouchableOpacity style={extraStyles.button} onPress={savePcUrl}>
                <Text style={extraStyles.buttonText}>設定を保存</Text>
              </TouchableOpacity>
              <Text>AIモデル設定は既存チャット機能を利用します。</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
  if (chat) {
    return (
      <SafeAreaView style={styles.root}>
        <TouchableOpacity style={styles.back} onPress={() => setChat(false)}>
          <Text style={styles.backText}>‹ ホームへ戻る</Text>
        </TouchableOpacity>
        <View style={styles.chat}>
          <ChatScreen />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>ポイポイ</Text>
        <Text style={styles.subtitle}>
          次世代生産管理 & AIクリエイティブプラットフォーム
        </Text>
        <Text style={styles.section}>機能メニュー</Text>
        <View style={styles.grid}>
          {menus.map(menu => (
            <TouchableOpacity
              key={menu.route}
              style={styles.card}
              onPress={() => openMenu(menu)}
            >
              <Text style={styles.cardTitle}>{menu.title}</Text>
              <Text style={styles.cardHint}>
                {menu.local ? 'スマホで利用' : 'PC接続で利用'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e0f2fe' },
  content: { padding: 18, paddingBottom: 36 },
  title: {
    fontSize: 34, fontWeight: 'bold',
    textAlign: 'center', color: '#0f172a', marginTop: 20
  },
  subtitle: {
    fontSize: 14, color: '#475569',
    textAlign: 'center', marginTop: 10, marginBottom: 28
  },
  section: {
    fontSize: 20, fontWeight: 'bold',
    color: '#0f172a', marginBottom: 14
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  card: {
    width: '48%', backgroundColor: '#ffffff',
    padding: 16, borderRadius: 12,
    marginBottom: 12, minHeight: 100,
    justifyContent: 'center', elevation: 2
  },
  cardTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#0f172a'
  },
  cardHint: {
    fontSize: 11, color: '#64748b', marginTop: 8
  },
  back: { padding: 10, paddingTop: 55, backgroundColor: '#ffffff' },
  backText: { color: '#2563eb', fontWeight: 'bold' },
  chat: { flex: 1 }
});
const extraStyles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginVertical: 10
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 10,
    marginVertical: 10
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginVertical: 6
  }
});
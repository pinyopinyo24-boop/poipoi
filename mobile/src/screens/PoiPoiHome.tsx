import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Linking, SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import ChatScreen from './ChatScreen';

const menus = [
  { title: 'AIチャット', route: '/streaming', local: true },
  { title: 'ダッシュボード', route: '/dashboard' },
  { title: '生産管理・分析', route: '/manufacturing' },
  { title: 'ファイル処理', route: '/file-processing' },
  { title: 'AIプロバイダー', route: '/ai-providers' },
  { title: '資料作成', route: '/documents' },
  { title: 'コード生成', route: '/code-generator' },
  { title: '履歴・メモリー', route: '/history-memory' },
  { title: 'スケジュール', route: '/schedule-memory' },
  { title: '顔入れ替え', route: '/facefusion-hybrid' },
  { title: '高度な機能', route: '/advanced-features' },
  { title: '設定', route: '/settings' },
];

export default function PoiPoiHome() {
  const [chat, setChat] = useState(false);

  const openMenu = async (menu: typeof menus[number]) => {
    if (menu.local) {
      setChat(true);
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
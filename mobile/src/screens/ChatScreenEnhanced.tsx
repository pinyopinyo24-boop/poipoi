/**
 * ChatScreenEnhanced - PoiPoi Mobile Chat Screen (Phase 2)
 * 
 * 機能:
 * - 水色グラデーションUI (Phase 2)
 * - ポイポイキャラクター表示 (Phase 2)
 * - チャット履歴表示 (Phase 2)
 * - メッセージ送受信
 * - セッション管理
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MobileAPIConnector, { ChatMessage } from '../services/MobileAPIConnector';
import LocalCacheService from '../services/LocalCacheService';

const { width, height } = Dimensions.get('window');

interface Message extends ChatMessage {
  isLoading?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messageCount: number;
}

export const ChatScreenEnhanced: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const scrollViewRef = useRef<ScrollView>(null);
  const apiConnectorRef = useRef<MobileAPIConnector | null>(null);

  // 初期化
  useEffect(() => {
    initializeApp();
  }, []);

  // メッセージ更新時にスクロール
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // フェードインアニメーション
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  /**
   * アプリ初期化
   */
  const initializeApp = async () => {
    try {
      // APIコネクター初期化
      const connector = new MobileAPIConnector();
      apiConnectorRef.current = connector;

      // 接続確認
      const connected = await connector.checkConnectivity();
      setIsConnected(connected);

      // セッション初期化
      const initialized = await connector.initialize();
      
      if (!initialized) {
        // 新規セッション作成
        const response = await connector.createSession();
        if (response.success && response.data) {
          setSessionId(response.data.sessionId);
          await LocalCacheService.saveSessionInfo(
            response.data.sessionId,
            response.data.token
          );
        }
      } else {
        const sessionInfo = await LocalCacheService.getSessionInfo();
        if (sessionInfo) {
          setSessionId(sessionInfo.sessionId);
          // キャッシュからチャット履歴を復元
          const cachedMessages = await LocalCacheService.getChatHistory(
            sessionInfo.sessionId
          );
          if (cachedMessages) {
            setMessages(cachedMessages);
          }
        }
      }

      // 過去のセッション情報を読み込む
      await loadChatSessions();
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  };

  /**
   * チャットセッション一覧を読み込む
   */
  const loadChatSessions = async () => {
    try {
      // ローカルストレージからセッション一覧を取得
      const sessions = await LocalCacheService.get<ChatSession[]>('chat_sessions');
      if (sessions) {
        setChatSessions(sessions);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  };

  /**
   * 新規チャットセッション作成
   */
  const handleNewChat = async () => {
    try {
      // 現在のセッションを保存
      if (sessionId && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const newSession: ChatSession = {
          id: sessionId,
          title: `Chat ${new Date().toLocaleDateString('ja-JP')}`,
          lastMessage: lastMessage.content.substring(0, 50),
          timestamp: Date.now(),
          messageCount: messages.length,
        };

        const updatedSessions = [newSession, ...chatSessions].slice(0, 10);
        setChatSessions(updatedSessions);
        await LocalCacheService.set('chat_sessions', updatedSessions);
      }

      // 新規セッション作成
      const response = await apiConnectorRef.current?.createSession();
      if (response?.success && response.data) {
        setSessionId(response.data.sessionId);
        setMessages([]);
        setInputText('');
        await LocalCacheService.saveSessionInfo(
          response.data.sessionId,
          response.data.token
        );
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  /**
   * 過去のセッションを復元
   */
  const handleLoadSession = async (session: ChatSession) => {
    try {
      const cachedMessages = await LocalCacheService.getChatHistory(session.id);
      if (cachedMessages) {
        setMessages(cachedMessages);
        setSessionId(session.id);
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  /**
   * メッセージ送信
   */
  const handleSendMessage = async () => {
    if (!inputText.trim() || !apiConnectorRef.current) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await apiConnectorRef.current.sendChatMessage({
        message: inputText,
        sessionId: sessionId || undefined,
      });

      if (response.success && response.data) {
        const assistantMessage: Message = {
          id: response.data.id,
          role: 'assistant',
          content: response.data.message,
          timestamp: response.data.timestamp,
          metadata: response.data.metadata,
        };

        setMessages(prev => [...prev, assistantMessage]);

        // キャッシュに保存
        if (sessionId) {
          const updatedMessages = [...messages, userMessage, assistantMessage];
          await LocalCacheService.saveChatHistory(sessionId, updatedMessages);
        }
      } else {
        const errorMessage: Message = {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: `エラーが発生しました: ${response.error || 'Unknown error'}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'メッセージの送信に失敗しました。もう一度お試しください。',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * メッセージアイテムレンダリング
   */
  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <Animated.View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
          { opacity: fadeAnim },
        ]}
      >
        {!isUser && (
          <Text style={styles.characterEmoji}>🦝</Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.assistantMessageText,
            ]}
          >
            {item.content}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </Animated.View>
    );
  };

  /**
   * チャット履歴モーダル
   */
  const renderHistoryModal = () => {
    return (
      <Modal
        visible={showHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <SafeAreaView style={styles.historyModalContainer}>
          <LinearGradient
            colors={['#06b6d4', '#0284c7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.historyHeader}
          >
            <Text style={styles.historyTitle}>チャット履歴</Text>
            <TouchableOpacity
              onPress={() => setShowHistory(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </LinearGradient>

          <FlatList
            data={chatSessions}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.sessionItem}
                onPress={() => handleLoadSession(item)}
              >
                <View style={styles.sessionContent}>
                  <Text style={styles.sessionTitle}>{item.title}</Text>
                  <Text style={styles.sessionMessage}>{item.lastMessage}</Text>
                  <Text style={styles.sessionMeta}>
                    {item.messageCount}件のメッセージ • {new Date(item.timestamp).toLocaleDateString('ja-JP')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.sessionListContent}
            ListEmptyComponent={
              <View style={styles.emptyHistoryContainer}>
                <Text style={styles.emptyHistoryText}>チャット履歴がありません</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    );
  };

  /**
   * ウェルカムメッセージ
   */
  const renderWelcomeMessage = () => {
    if (messages.length > 0) return null;

    return (
      <Animated.View
        style={[
          styles.welcomeContainer,
          { opacity: fadeAnim },
        ]}
      >
        <Text style={styles.welcomeEmoji}>🦝</Text>
        <Text style={styles.welcomeTitle}>ポイポイへようこそ</Text>
        <Text style={styles.welcomeSubtitle}>
          次世代生産管理 & AIクリエイティブプラットフォーム
        </Text>
        <Text style={styles.welcomeMessage}>
          何かお手伝いできることはありますか？
        </Text>
      </Animated.View>
    );
  };

  return (
    <LinearGradient
      colors={['#cffafe', '#bae6fd', '#a5f3fc']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* ヘッダー */}
        <LinearGradient
          colors={['#06b6d4', '#0284c7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>🦝 PoiPoi Chat</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setShowHistory(true)}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>📋</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNewChat}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>➕</Text>
            </TouchableOpacity>
            <View style={styles.statusIndicator}>
              <View
                style={[
                  styles.statusDot,
                  isConnected ? styles.connectedDot : styles.disconnectedDot,
                ]}
              />
            </View>
          </View>
        </LinearGradient>

        {/* メッセージリスト */}
        <FlatList
          ref={scrollViewRef as any}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageListContent}
          ListEmptyComponent={renderWelcomeMessage}
          onEndReachedThreshold={0.1}
        />

        {/* ローディング表示 */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text style={styles.loadingText}>返信を生成中...</Text>
          </View>
        )}

        {/* 入力フィールド */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="メッセージを入力..."
              placeholderTextColor="#9ca3af"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Text style={styles.sendButtonText}>送信</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* チャット履歴モーダル */}
      {renderHistoryModal()}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerButtonText: {
    fontSize: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectedDot: {
    backgroundColor: '#10b981',
  },
  disconnectedDot: {
    backgroundColor: '#ef4444',
  },
  messageListContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  characterEmoji: {
    fontSize: 32,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: '#0284c7',
    borderBottomRightRadius: 2,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#1f2937',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  welcomeEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#0369a1',
    marginBottom: 16,
    textAlign: 'center',
  },
  welcomeMessage: {
    fontSize: 16,
    color: '#1f2937',
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#0284c7',
    fontSize: 14,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    color: '#1f2937',
  },
  sendButton: {
    backgroundColor: '#06b6d4',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  historyModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  historyHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  sessionListContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sessionItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
  },
  sessionContent: {
    gap: 4,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  sessionMessage: {
    fontSize: 14,
    color: '#6b7280',
  },
  sessionMeta: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyHistoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default ChatScreenEnhanced;

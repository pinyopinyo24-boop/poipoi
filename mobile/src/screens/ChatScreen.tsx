import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from "react-native";
import { MobileAPIConnector, ChatRequest, ChatResponse } from "../services/MobileAPIConnector";
import Constants from "expo-constants";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", text: "ようこそPoiPoiへ。何かお手伝いできることはありますか？", isUser: false, timestamp: Date.now() }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiConnector, setApiConnector] = useState<MobileAPIConnector | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string>(`session_${Date.now()}`);

  // API コネクタの初期化
  useEffect(() => {
    const initializeAPI = async () => {
      try {
        // app.json から apiBaseUrl を取得
        const apiBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl || "https://3000-iocr6xxkalzfajqrgw1vp-917fb80f.sg1.manus.computer";
        console.log("[ChatScreen] API Base URL:", apiBaseUrl);

      const connector = new MobileAPIConnector(apiBaseUrl);
      setApiConnector(connector);
      
      // Initialize session
      setSessionId(`session_${Date.now()}`);

        // 接続確認
        const connected = await connector.checkConnectivity();
        setIsConnected(connected);
        console.log("[ChatScreen] Backend connectivity:", connected);

        if (!connected) {
          Alert.alert("接続警告", "バックエンドサーバーに接続できません。オフラインモードで動作します。");
        }
      } catch (error) {
        console.error("[ChatScreen] API initialization error:", error);
        Alert.alert("エラー", "API初期化に失敗しました");
      }
    };

    initializeAPI();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (!apiConnector) {
        throw new Error("API コネクタが初期化されていません");
      }

      // API にメッセージを送信
      const response = await apiConnector.sendChatMessage({
        message: input,
        sessionId: sessionId,
        context: {}
      });

      if (response.success && response.data) {
        // Extract message content from ChatMessage object
        // response.data structure: { message: ChatMessage, session: ChatSession, ... }
        const messageContent = response.data.message?.content || response.data.message || "応答がありません";
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent),
          isUser: false,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Update session ID if provided
        if (response.data.session?.id) {
          setSessionId(response.data.session.id);
        }
      } else {
        throw new Error(response.error || "API エラー");
      }
    } catch (error) {
      console.error("[ChatScreen] Send message error:", error);
      const errorText = error instanceof Error ? error.message : "不明なエラー";
      console.error("[ChatScreen] Full error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: `エラーが発生しました: ${errorText}`,
        isUser: false,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🦝 PoiPoi Chat</Text>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? "#4CAF50" : "#FF9800" }]} />
          <Text style={styles.statusText}>{isConnected ? "接続済み" : "オフライン"}</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.messageContainer, item.isUser && styles.userMessage]}>
            <Text style={[styles.messageText, item.isUser && styles.userMessageText]}>
              {item.text}
            </Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.messagesList}
      />

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text style={styles.loadingText}>応答中...</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="メッセージを入力"
          placeholderTextColor="#999"
          editable={!isLoading}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isLoading || !input.trim()}
        >
          <Text style={styles.sendButtonText}>送信</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000"
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusText: {
    fontSize: 12,
    color: "#666"
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  messageContainer: {
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    maxWidth: "80%"
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#06b6d4"
  },
  messageText: {
    fontSize: 16,
    color: "#000"
  },
  userMessageText: {
    color: "#fff"
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 4
  },
  loadingContainer: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666"
  },
  inputArea: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    gap: 8
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100
  },
  sendButton: {
    backgroundColor: "#06b6d4",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: "center"
  },
  sendButtonDisabled: {
    opacity: 0.5
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14
  }
});

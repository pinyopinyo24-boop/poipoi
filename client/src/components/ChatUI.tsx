/**
 * ChatUI - ポイポイAI チャットUI
 * ChatCore v1.0を使用した実際の会話インターフェース
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    managerUsed?: string[];
    reasoning?: string;
    confidence?: number;
    manufacturingContext?: boolean;
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface ChatUIProps {
  sessionId?: string;
  onSessionChange?: (session: ChatSession) => void;
}

export const ChatUI: React.FC<ChatUIProps> = ({ sessionId, onSessionChange }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // tRPCクエリ
  const processMessageMutation = trpc.chat.processMessage.useMutation();
  const userId = typeof user?.id === 'string' ? user.id : '';
  const getSessionQuery = trpc.chat.getSession.useQuery(
    { sessionId: sessionId || '', userId },
    { enabled: !!sessionId && !!user }
  );

  // メッセージをスクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // セッション情報を取得
  useEffect(() => {
    if (getSessionQuery.data) {
      setMessages(getSessionQuery.data.messages);
    }
  }, [getSessionQuery.data]);

  // メッセージ送信処理
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user || isLoading) {
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);
    setIsLoading(true);

    try {
      // 新しいセッションIDを生成（セッションがない場合）
            const sid = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      // メッセージを処理
      const response = await processMessageMutation.mutateAsync({
        userId: typeof user.id === 'string' ? user.id : '',
        sessionId: sid,
        message: userMessage,
      });

      // ユーザーメッセージを追加
      const userMsg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_user`,
        userId: typeof user.id === 'string' ? user.id : '',
        role: 'user',
        content: userMessage,
        timestamp: Math.floor(Date.now()),
      };

      // アシスタントメッセージを追加
      setMessages((prev) => [...prev, userMsg, response.message]);
      if (response.session) {
        setCurrentSession(response.session);
        onSessionChange?.(response.session);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'メッセージ処理中にエラーが発生しました';
      setError(errorMessage);
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Enterキーでメッセージ送信
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ヘッダー */}
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">
          {currentSession?.title || 'ポイポイAI チャット'}
        </h2>
        {currentSession && (
          <p className="text-sm text-muted-foreground mt-1">
            メッセージ数: {currentSession.messageCount}
          </p>
        )}
      </div>

      {/* メッセージ表示エリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">チャットを開始してください</p>
              <p className="text-sm text-muted-foreground">
                何かお手伝いできることはありますか？
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-xs lg:max-w-md px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                {msg.metadata && (
                  <div className="text-xs mt-2 opacity-70">
                    {msg.metadata.confidence && (
                      <p>信頼度: {(msg.metadata.confidence * 100).toFixed(0)}%</p>
                    )}
                    {msg.metadata.managerUsed && msg.metadata.managerUsed.length > 0 && (
                      <p>使用: {msg.metadata.managerUsed.join(', ')}</p>
                    )}
                  </div>
                )}
              </Card>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <Card className="bg-muted text-muted-foreground px-4 py-2">
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                <p className="text-sm">処理中...</p>
              </div>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 mx-4 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* 入力エリア */}
      <div className="border-t border-border p-4 space-y-2">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="px-4"
          >
            {isLoading ? <Spinner className="h-4 w-4" /> : '送信'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Shift+Enter で改行、Enter で送信
        </p>
      </div>
    </div>
  );
};

export default ChatUI;

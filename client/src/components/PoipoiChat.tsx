/**
 * PoipoiChat - ポイポイ Personal AI Interface
 * Chat UI v1.0をポイポイ専用インターフェースへ進化させた
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    context?: string;
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

export interface MemoryItem {
  id: string;
  content: string;
  importance: number;
  category: string;
  timestamp: number;
}

export interface AIProcessingState {
  isProcessing: boolean;
  currentManager?: string;
  progress: number;
  stage: 'input' | 'analysis' | 'reasoning' | 'generation' | 'complete';
}

export interface PoipoiChatProps {
  sessionId?: string;
  onSessionChange?: (session: ChatSession) => void;
  showMemory?: boolean;
  showManagerState?: boolean;
  showDashboard?: boolean;
}

export const PoipoiChat: React.FC<PoipoiChatProps> = ({
  sessionId,
  onSessionChange,
  showMemory = true,
  showManagerState = true,
  showDashboard = true,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<string>('general');
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [processingState, setProcessingState] = useState<AIProcessingState>({
    isProcessing: false,
    progress: 0,
    stage: 'input',
  });
  const [managerStates, setManagerStates] = useState<Record<string, any>>({});
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
    setProcessingState({ isProcessing: true, progress: 0, stage: 'input' });

    try {
      // 新しいセッションIDを生成（セッションがない場合）
      const sid = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 処理ステージをシミュレート
      setProcessingState({ isProcessing: true, progress: 25, stage: 'analysis' });
      await new Promise((resolve) => setTimeout(resolve, 300));

      setProcessingState({ isProcessing: true, progress: 50, stage: 'reasoning' });

      // メッセージを処理
      const response = await processMessageMutation.mutateAsync({
        userId: typeof user.id === 'string' ? user.id : '',
        sessionId: sid,
        message: userMessage,
      });

      setProcessingState({ isProcessing: true, progress: 75, stage: 'generation' });
      await new Promise((resolve) => setTimeout(resolve, 200));

      // ユーザーメッセージを追加
      const userMsg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_user`,
        userId: typeof user.id === 'string' ? user.id : '',
        role: 'user',
        content: userMessage,
        timestamp: Math.floor(Date.now()),
        metadata: {
          context: selectedContext,
        },
      };

      // アシスタントメッセージを追加
      setMessages((prev) => [...prev, userMsg, response.message]);
      if (response.session) {
        setCurrentSession(response.session);
        onSessionChange?.(response.session);
      }

      // Manager状態を更新
      if (response.message.metadata && response.message.metadata.managerUsed) {
        const managers = response.message.metadata.managerUsed;
        setManagerStates((prev) => ({
          ...prev,
          ...managers.reduce(
            (acc, manager) => ({
              ...acc,
              [manager]: { active: true, lastUsed: Date.now() },
            }),
            {}
          ),
        }));
      }

      setProcessingState({ isProcessing: false, progress: 100, stage: 'complete' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'メッセージ処理中にエラーが発生しました';
      setError(errorMessage);
      console.error('Chat error:', err);
      setProcessingState({ isProcessing: false, progress: 0, stage: 'input' });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setProcessingState({ isProcessing: false, progress: 0, stage: 'input' });
      }, 1000);
    }
  };

  // Enterキーでメッセージ送信
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const contextOptions = [
    { value: 'general', label: '一般' },
    { value: 'manufacturing', label: '生産管理' },
    { value: 'creative', label: 'クリエイティブ' },
    { value: 'technical', label: '技術' },
    { value: 'analysis', label: '分析' },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* ヘッダー */}
      <div className="border-b border-indigo-200 bg-white shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-indigo-900">🦝 ポイポイ AI</h2>
            <p className="text-sm text-indigo-600">
              {currentSession?.title || 'ポイポイ Personal AI Interface'}
            </p>
          </div>
          {currentSession && (
            <div className="text-right">
              <p className="text-xs text-gray-500">
                メッセージ数: {currentSession.messageCount}
              </p>
            </div>
          )}
        </div>

        {/* コンテキスト選択 */}
        <div className="mt-3 flex gap-2 flex-wrap">
          {contextOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedContext === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedContext(option.value)}
              className="text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* チャットエリア */}
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow-md border border-indigo-100 overflow-hidden">
          {/* メッセージ表示エリア */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-4xl mb-4">🦝</p>
                  <p className="text-gray-600 font-semibold mb-2">ポイポイへようこそ！</p>
                  <p className="text-sm text-gray-500">
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
                    className={`max-w-xs lg:max-w-md px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-900'
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
                        {msg.metadata.context && (
                          <p>コンテキスト: {msg.metadata.context}</p>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              ))
            )}

            {/* 処理状態表示 */}
            {processingState.isProcessing && (
              <div className="flex justify-start">
                <Card className="bg-indigo-50 text-indigo-900 px-4 py-3 border border-indigo-200">
                  <div className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {processingState.stage === 'input' && 'メッセージを受け取り中...'}
                      {processingState.stage === 'analysis' && '分析中...'}
                      {processingState.stage === 'reasoning' && '推論中...'}
                      {processingState.stage === 'generation' && '生成中...'}
                      {processingState.stage === 'complete' && '完了'}
                    </span>
                  </div>
                  <div className="mt-2 w-32 h-1 bg-indigo-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${processingState.progress}%` }}
                    />
                  </div>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 mx-4 rounded-md text-sm border border-red-200">
              {error}
            </div>
          )}

          {/* 入力エリア */}
          <div className="border-t border-indigo-100 p-4 space-y-2 bg-gray-50">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="メッセージを入力..."
                disabled={isLoading}
                className="flex-1 border-indigo-200 focus:border-indigo-500"
              />
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="px-4 bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading ? <Spinner className="h-4 w-4" /> : '送信'}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Shift+Enter で改行、Enter で送信
            </p>
          </div>
        </div>

        {/* サイドパネル */}
        {(showMemory || showManagerState || showDashboard) && (
          <div className="w-64 flex flex-col gap-4">
            <Tabs defaultValue="memory" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                {showMemory && <TabsTrigger value="memory">Memory</TabsTrigger>}
                {showManagerState && <TabsTrigger value="managers">Managers</TabsTrigger>}
                {showDashboard && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
              </TabsList>

              {/* Memory タブ */}
              {showMemory && (
                <TabsContent value="memory" className="space-y-2">
                  <Card className="p-3 bg-white border-indigo-100 max-h-96 overflow-y-auto">
                    {memories.length === 0 ? (
                      <p className="text-xs text-gray-500">記憶がまだありません</p>
                    ) : (
                      <div className="space-y-2">
                        {memories.map((memory) => (
                          <div key={memory.id} className="p-2 bg-indigo-50 rounded text-xs">
                            <p className="font-semibold text-indigo-900">{memory.category}</p>
                            <p className="text-gray-700 truncate">{memory.content}</p>
                            <p className="text-gray-500 text-xs">
                              重要度: {(memory.importance * 100).toFixed(0)}%
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </TabsContent>
              )}

              {/* Managers タブ */}
              {showManagerState && (
                <TabsContent value="managers" className="space-y-2">
                  <Card className="p-3 bg-white border-indigo-100 max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {Object.entries(managerStates).length === 0 ? (
                        <p className="text-xs text-gray-500">Manager情報がありません</p>
                      ) : (
                        Object.entries(managerStates).map(([name, state]) => (
                          <div key={name} className="p-2 bg-green-50 rounded text-xs">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-green-900">{name}</p>
                              <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                            </div>
                            <p className="text-gray-600 text-xs">
                              最終使用: {new Date(state.lastUsed).toLocaleTimeString('ja-JP')}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </TabsContent>
              )}

              {/* Dashboard タブ */}
              {showDashboard && (
                <TabsContent value="dashboard" className="space-y-2">
                  <Card className="p-3 bg-white border-indigo-100">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-700">セッション統計</p>
                        <p className="text-sm text-indigo-600">
                          メッセージ数: {currentSession?.messageCount || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">処理状態</p>
                        <p className="text-sm text-gray-600">
                          {isLoading ? '処理中...' : 'アイドル'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">コンテキスト</p>
                        <p className="text-sm text-gray-600 capitalize">{selectedContext}</p>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoipoiChat;

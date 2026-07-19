/**
 * PoiPoiChatUI - ポイポイ専用チャットUI
 * 水色グラデーション、清潔感、未来感、親しみやすさ
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  actions?: string[];
  insights?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export const PoiPoiChatUI: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // スクロール自動調整
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // セッション初期化
  useEffect(() => {
    if (user?.id) {
      const sessionId = `session-${Date.now()}`;
      setCurrentSessionId(sessionId);
      setSessions([
        {
          id: sessionId,
          title: 'New Chat',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);
    }
  }, [user?.id]);

  // メッセージ送信
  const handleSendMessage = async () => {
    if (!input.trim() || !user?.id) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // ChatCoreを通じてメッセージを送信
      const mutation = trpc.chat.processMessage.useMutation();
      const response = await new Promise((resolve, reject) => {
        mutation.mutate(
          {
            userId: typeof user.id === 'string' ? user.id : String(user.id || ''),
            sessionId: currentSessionId,
            message: input,
          },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });

      const assistantMessage: Message = {
        id: (response as any).message?.id || `msg-${Date.now().toString()}`,
        role: 'assistant',
        content: (response as any).message?.content || (response as any).response || '',
        timestamp: (response as any).message?.timestamp || Date.now(),
        actions: (response as any).actions,
        insights: (response as any).insights,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `msg-error-${Date.now()}`,
        role: 'assistant',
        content: 'エラーが発生しました。もう一度試してください。',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 新規チャット
  const handleNewChat = () => {
    const sessionId = `session-${Date.now()}`;
    setCurrentSessionId(sessionId);
    setMessages([]);
    setSessions((prev) => [
      ...prev,
      {
        id: sessionId,
        title: 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
  };

  // セッション切り替え
  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMessages([]);
    setShowHistory(false);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100">
      {/* サイドバー */}
      <div className="w-64 bg-gradient-to-b from-cyan-500 to-blue-600 text-white shadow-lg flex flex-col">
        {/* ロゴ */}
        <div className="p-4 border-b border-cyan-400">
          <div className="text-2xl font-bold">🐾 ポイポイ</div>
          <div className="text-xs text-cyan-100">AI Assistant</div>
        </div>

        {/* 新規チャットボタン */}
        <div className="p-4">
          <Button
            onClick={handleNewChat}
            className="w-full bg-white text-cyan-600 hover:bg-cyan-50 font-semibold"
          >
            + 新規チャット
          </Button>
        </div>

        {/* チャット履歴 */}
        <div className="flex-1 overflow-y-auto px-2 space-y-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleSelectSession(session.id)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                currentSessionId === session.id
                  ? 'bg-white text-cyan-600 font-semibold'
                  : 'text-cyan-100 hover:bg-cyan-400'
              }`}
            >
              <div className="truncate">{session.title}</div>
              <div className="text-xs text-cyan-200">
                {new Date(session.updatedAt).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>

        {/* 設定・ヘルプ */}
        <div className="p-4 border-t border-cyan-400 space-y-2">
          <Button
            onClick={() => setShowSettings(true)}
            className="w-full bg-cyan-400 text-white hover:bg-cyan-300"
          >
            ⚙️ 設定
          </Button>
          <Button
            onClick={() => setShowHistory(true)}
            className="w-full bg-cyan-400 text-white hover:bg-cyan-300"
          >
            📋 履歴
          </Button>
        </div>
      </div>

      {/* メインチャット領域 */}
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">ポイポイ AI Assistant</h1>
              <p className="text-sm text-cyan-100">
                製造現場向けAIアシスタント
              </p>
            </div>
            <div className="text-4xl">🦝</div>
          </div>
        </div>

        {/* メッセージ表示領域 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">🦝</div>
                <h2 className="text-2xl font-bold text-cyan-600 mb-2">
                  ポイポイへようこそ！
                </h2>
                <p className="text-gray-600 max-w-md">
                  製造現場での質問、改善提案、データ分析など、何でもお気軽にお聞きください。
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-md lg:max-w-2xl rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-br-none'
                        : 'bg-white text-gray-800 shadow-md rounded-bl-none border border-cyan-200'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>

                    {/* アクション表示 */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-cyan-300 space-y-1">
                        <p className="text-xs font-semibold opacity-75">
                          推奨アクション:
                        </p>
                        {message.actions.map((action, idx) => (
                          <div
                            key={idx}
                            className="text-xs opacity-75 flex items-start"
                          >
                            <span className="mr-2">→</span>
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* インサイト表示 */}
                    {message.insights && message.insights.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-cyan-300 space-y-1">
                        <p className="text-xs font-semibold opacity-75">
                          インサイト:
                        </p>
                        {message.insights.map((insight, idx) => (
                          <div
                            key={idx}
                            className="text-xs opacity-75 flex items-start"
                          >
                            <span className="mr-2">💡</span>
                            <span>{insight}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-xs opacity-50 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 shadow-md rounded-lg p-4 rounded-bl-none border border-cyan-200">
                    <div className="flex items-center space-x-2">
                      <Spinner className="w-4 h-4" />
                      <span className="text-sm">ポイポイが考え中...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 入力領域 */}
        <div className="bg-white border-t-2 border-cyan-200 p-4 shadow-lg">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="ポイポイに質問してください..."
              className="flex-1 border-cyan-300 focus:border-cyan-500 focus:ring-cyan-500"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:from-cyan-500 hover:to-blue-600 font-semibold px-6"
            >
              {isLoading ? <Spinner className="w-4 h-4" /> : '送信'}
            </Button>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            💡 Shift+Enterで改行、Enterで送信
          </div>
        </div>
      </div>

      {/* 履歴モーダル */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 max-h-96 overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 text-cyan-600">
                チャット履歴
              </h2>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-cyan-50 border border-cyan-200"
                  >
                    <div className="font-semibold text-gray-800">
                      {session.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(session.createdAt).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
              <Button
                onClick={() => setShowHistory(false)}
                className="w-full mt-4 bg-cyan-500 text-white hover:bg-cyan-600"
              >
                閉じる
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 設定モーダル */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 text-cyan-600">設定</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    テーマ
                  </label>
                  <select className="w-full border border-cyan-300 rounded-lg p-2">
                    <option>ライト（デフォルト）</option>
                    <option>ダーク</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    言語
                  </label>
                  <select className="w-full border border-cyan-300 rounded-lg p-2">
                    <option>日本語</option>
                    <option>English</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm text-gray-700">
                      通知を有効にする
                    </span>
                  </label>
                </div>
              </div>
              <Button
                onClick={() => setShowSettings(false)}
                className="w-full mt-6 bg-cyan-500 text-white hover:bg-cyan-600"
              >
                閉じる
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

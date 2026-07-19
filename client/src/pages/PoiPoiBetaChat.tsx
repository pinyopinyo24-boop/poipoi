/**
 * PoiPoi Beta Chat Screen
 * AI選択、メモリー表示、ファイル処理対応のチャット画面
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  provider?: string;
  tokens?: {
    input: number;
    output: number;
  };
}

interface MemoryContext {
  totalMessages: number;
  totalTokens: number;
  contextWindow: number;
  providers: string[];
  lastProvider: string;
}

export default function PoiPoiBetaChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [isLoading, setIsLoading] = useState(false);
  const [memory, setMemory] = useState<MemoryContext>({
    totalMessages: 0,
    totalTokens: 0,
    contextWindow: 4096,
    providers: ['openai', 'claude', 'gemini', 'local'],
    lastProvider: 'openai',
  });
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle message send
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !user) {
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);
    setIsLoading(true);

    try {
      // Add user message to UI
      const userMsg: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content: userMessage,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, userMsg]);

      // Simulate AI response (in production, call actual AI provider)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: `Response from ${selectedProvider}: ${userMessage}`,
        timestamp: Date.now(),
        provider: selectedProvider,
        tokens: {
          input: Math.floor(userMessage.split(' ').length * 1.3),
          output: Math.floor(Math.random() * 100) + 50,
        },
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Update memory
      setMemory(prev => ({
        ...prev,
        totalMessages: prev.totalMessages + 2,
        totalTokens:
          prev.totalTokens +
          (assistantMsg.tokens?.input || 0) +
          (assistantMsg.tokens?.output || 0),
        lastProvider: selectedProvider,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileType = file.name.split('.').pop()?.toLowerCase();
      const message = `📎 ファイルアップロード: ${file.name} (${fileType})`;

      const userMsg: ChatMessage = {
        id: `msg_${Date.now()}_file`,
        role: 'user',
        content: message,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, userMsg]);
    }
  };

  // Clear chat
  const handleClearChat = () => {
    setMessages([]);
    setMemory({
      totalMessages: 0,
      totalTokens: 0,
      contextWindow: 4096,
      providers: ['openai', 'claude', 'gemini', 'local'],
      lastProvider: 'openai',
    });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card p-4 flex flex-col">
        <h1 className="text-2xl font-bold mb-4 text-foreground">PoiPoi</h1>

        {/* AI Provider Selection */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-foreground mb-2 block">
            AIプロバイダー選択
          </label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
              <SelectItem value="claude">Claude 3 Opus</SelectItem>
              <SelectItem value="gemini">Gemini Pro</SelectItem>
              <SelectItem value="local">ローカルAI</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Memory Display */}
        <Card className="mb-6 p-4 bg-background">
          <h3 className="text-sm font-semibold text-foreground mb-3">メモリー情報</h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>メッセージ数:</span>
              <span className="font-mono">{memory.totalMessages}</span>
            </div>
            <div className="flex justify-between">
              <span>トークン使用量:</span>
              <span className="font-mono">{memory.totalTokens}</span>
            </div>
            <div className="flex justify-between">
              <span>コンテキストウィンドウ:</span>
              <span className="font-mono">{memory.contextWindow}</span>
            </div>
            <div className="flex justify-between">
              <span>最後のプロバイダー:</span>
              <span className="font-mono">{memory.lastProvider}</span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-2 mt-auto">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleClearChat}
          >
            🗑️ チャット削除
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            asChild
          >
            <label>
              📁 ファイル読込
              <input
                type="file"
                hidden
                onChange={handleFileUpload}
                accept=".pdf,.xlsx,.jpg,.png,.gif"
              />
            </label>
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                PoiPoi AI Chat
              </h2>
              <p className="text-sm text-muted-foreground">
                プロバイダー: <Badge variant="secondary">{selectedProvider}</Badge>
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>ユーザー: {user?.name || 'Anonymous'}</p>
              <p>メッセージ: {messages.length}</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground mb-2">
                  PoiPoi AIへようこそ
                </p>
                <p className="text-sm text-muted-foreground">
                  メッセージを入力して開始してください
                </p>
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <Card
                  className={`max-w-md p-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-card text-foreground'
                  }`}
                >
                  <div className="text-sm">{msg.content}</div>
                  <div className="text-xs mt-2 opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString('ja-JP')}
                    {msg.provider && ` • ${msg.provider}`}
                    {msg.tokens && ` • 📊 ${msg.tokens.input}→${msg.tokens.output}`}
                  </div>
                </Card>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <Card className="bg-card p-3">
                <Spinner className="w-4 h-4" />
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-border bg-card p-4">
          <div className="flex gap-2">
            <Input
              placeholder="メッセージを入力..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="px-6"
            >
              {isLoading ? <Spinner className="w-4 h-4" /> : '送信'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

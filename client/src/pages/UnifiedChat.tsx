import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import EvolutionEngine, { type AppState, type Proposal } from "@/lib/evolutionEngine";
import MemoryEngine from "@/lib/memoryEngine";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  type?: "text" | "code" | "image" | "analysis" | "proposal";
  metadata?: Record<string, any>;
}

export default function UnifiedChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [evolutionEngine] = useState(() => new EvolutionEngine());
  const [memoryEngine] = useState(() => new MemoryEngine());
  const [showStats, setShowStats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const streamingChat = trpc.streaming.chat.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize memory engine with system info
  useEffect(() => {
    memoryEngine.add("system", "app_name", "PoiPoi AI");
    memoryEngine.add("system", "version", "1.0.0");
    memoryEngine.add("system", "created_at", new Date().toISOString());
  }, [memoryEngine]);

  // Analyze app state and suggest improvements
  useEffect(() => {
    const appState: AppState = {
      errorCount,
      messageCount: messages.length,
      performanceScore: 100 - Math.min(errorCount * 10, 50),
    };

    const proposal = evolutionEngine.analyze(appState);

    if (proposal.type !== "none") {
      const systemMessage: Message = {
        id: `proposal_${Date.now()}`,
        role: "system",
        content: `🧬 ${proposal.message}`,
        timestamp: new Date(),
        type: "proposal",
        metadata: proposal,
      };

      setMessages((prev) => [...prev, systemMessage]);
      evolutionEngine.approve(proposal);

      // Store proposal in memory
      memoryEngine.add(
        "proposals",
        `proposal_${Date.now()}`,
        {
          type: proposal.type,
          message: proposal.message,
          action: proposal.action,
        }
      );
    }
  }, [errorCount, messages.length, evolutionEngine, memoryEngine]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);

    // Store message in memory
    memoryEngine.add("conversations", `user_${Date.now()}`, {
      content: input,
      timestamp: new Date().toISOString(),
    });

    setInput("");
    setIsLoading(true);

    try {
      const response = await streamingChat.mutateAsync({
        message: input,
      });

      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: response.fullText,
        timestamp: new Date(),
        type: "text",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Store assistant response in memory
      memoryEngine.add("conversations", `assistant_${Date.now()}`, {
        content: response.fullText,
        timestamp: new Date().toISOString(),
      });

      // Record success
      const stats = evolutionEngine.getStats();
      evolutionEngine.learn(stats.total - 1, "success", {
        messageLength: input.length,
        responseLength: response.fullText.length,
      });
    } catch (error) {
      console.error("Error:", error);
      setErrorCount((prev) => prev + 1);

      const errorMessage: Message = {
        id: `msg_${Date.now() + 2}`,
        role: "assistant",
        content: "申し訳ありません。エラーが発生しました。",
        timestamp: new Date(),
        type: "text",
      };

      setMessages((prev) => [...prev, errorMessage]);

      // Store error in memory
      memoryEngine.add("errors", `error_${Date.now()}`, {
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });

      // Record failure
      const stats = evolutionEngine.getStats();
      evolutionEngine.learn(stats.total - 1, "failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stats = evolutionEngine.getStats();
  const memoryStats = memoryEngine.stats();

  return (
    <div className="flex flex-col h-full gap-4 p-4 bg-gradient-to-br from-cyan-50 to-blue-50">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              ⚡ PoiPoi 進化AI チャット
            </h2>
            <p className="text-sm text-gray-600">
              進化エンジン + 長期記憶搭載
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-right">
              <div className="text-xs bg-white p-2 rounded border border-cyan-200">
                <p className="font-semibold">📊 進化統計</p>
                <p>成功: {stats.successful}</p>
                <p>失敗: {stats.failed}</p>
                <p>成功率: {stats.successRate.toFixed(1)}%</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowStats(!showStats)}
              className="w-full"
            >
              {showStats ? "統計を非表示" : "記憶統計"}
            </Button>
          </div>
        </div>

        {showStats && (
          <div className="bg-white p-3 rounded border border-blue-200 text-xs space-y-1">
            <p className="font-semibold">💾 記憶エンジン統計</p>
            <p>総記憶数: {memoryStats.total}</p>
            <p>カテゴリ: {memoryStats.categories.join(", ")}</p>
            <p>平均アクセス数: {memoryStats.avgAccess}</p>
            <p>使用率: {memoryStats.usagePercent}%</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="text-xs bg-white p-2 rounded border border-cyan-200">
            <strong>💬 通常のチャット</strong>
            <p>メッセージを入力して送信</p>
          </div>
          <div className="text-xs bg-white p-2 rounded border border-cyan-200">
            <strong>🧬 自動進化</strong>
            <p>エラーを自動検出して改善提案</p>
          </div>
        </div>
      </div>

      {/* メッセージ表示エリア */}
      <Card className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">会話を開始しましょう</p>
              <p className="text-sm">進化エンジンと記憶エンジンがリアルタイムで改善を提案します</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : message.role === "system"
                      ? "justify-center"
                      : "justify-start"
                }`}
              >
                <div
                  className={`max-w-2xl px-4 py-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                      : message.role === "system"
                        ? "bg-yellow-50 text-yellow-900 border border-yellow-200"
                        : "bg-gray-100 text-black"
                  }`}
                >
                  {message.type === "image" && message.metadata?.imageData && (
                    <div className="mb-2">
                      <img
                        src={message.metadata.imageData}
                        alt="Generated"
                        className="max-w-sm rounded"
                      />
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {message.type && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          message.role === "user"
                            ? "bg-white/20 text-white border-white/30"
                            : message.role === "system"
                              ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                              : "bg-cyan-100 text-cyan-800 border-cyan-300"
                        }`}
                      >
                        {message.type === "text" && "💬"}
                        {message.type === "image" && "🖼️"}
                        {message.type === "analysis" && "🧬"}
                        {message.type === "code" && "🤖"}
                        {message.type === "proposal" && "✨"}
                        {" "}
                        {message.type}
                      </Badge>
                    )}
                    <p
                      className={`text-xs opacity-70 ${
                        message.role === "user"
                          ? "text-white"
                          : message.role === "system"
                            ? "text-yellow-700"
                            : "text-gray-600"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString("ja-JP")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-black px-4 py-3 rounded-lg flex items-center gap-2">
                  <Spinner className="w-4 h-4" />
                  <span className="text-sm">処理中...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </Card>

      {/* 入力エリア */}
      <div className="space-y-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !isLoading) {
              handleSendMessage();
            }
          }}
          placeholder="メッセージを入力してください..."
          disabled={isLoading}
          className="border-cyan-300 focus:border-cyan-500"
        />
        <div className="flex gap-2">
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            {isLoading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                処理中...
              </>
            ) : (
              "送信"
            )}
          </Button>
        </div>
      </div>

      {/* エラーカウント表示 */}
      {errorCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800">
          ⚠️ エラーが {errorCount} 件発生しています
        </div>
      )}
    </div>
  );
}

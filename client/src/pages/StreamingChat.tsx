import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import FaceSwapPanel from "@/components/FaceSwapPanel";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  type?: "text" | "code" | "evolution" | "program";
  metadata?: Record<string, any>;
}

export default function StreamingChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMultimodal, setShowMultimodal] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [evolutionFeedback, setEvolutionFeedback] = useState("");
  const [programRequirements, setProgramRequirements] = useState("");
  const [isEvolutionLoading, setIsEvolutionLoading] = useState(false);
  const [isProgramLoading, setIsProgramLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  const streamingChat = trpc.streaming.chat.useMutation();
  const analyzeFeedback = trpc.evolution.analyzeFeedback.useMutation();
  const generateProgram = trpc.autoProgramGeneration.generateProgram.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    } catch (error) {
      console.error("ストリーミングチャットエラー:", error);
      const errorMessage: Message = {
        id: `msg_${Date.now() + 2}`,
        role: "assistant",
        content: "申し訳ありません。エラーが発生しました。",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvolutionFeedback = async () => {
    if (!evolutionFeedback.trim()) return;

    setIsEvolutionLoading(true);
    try {
      const result = await analyzeFeedback.mutateAsync({
        feedback: evolutionFeedback,
        context: "User feedback for system improvement",
      });

      if (result.success) {
        const assistantMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `分析結果:\n${result.analysis}\n\n提案:\n${result.suggestions.join("\n")}`,
          timestamp: new Date(),
          type: "evolution",
          metadata: {
            analysis: result.analysis,
            suggestions: result.suggestions,
            priority: result.priority,
          },
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setEvolutionFeedback("");
      }
    } catch (error) {
      console.error("Evolution error:", error);
    } finally {
      setIsEvolutionLoading(false);
    }
  };

  const handleGenerateProgram = async () => {
    if (!programRequirements.trim()) return;

    setIsProgramLoading(true);
    try {
      const result = await generateProgram.mutateAsync({
        title: "Auto-generated Program",
        description: programRequirements,
        requirements: programRequirements.split("\n").filter((r) => r.trim()),
        language: "typescript",
      });

      if (result.success) {
        const assistantMessage: Message = {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: `プログラム生成完了:\n\n${result.explanation}\n\nコード:\n\`\`\`typescript\n${result.code}\n\`\`\``,
          timestamp: new Date(),
          type: "program",
          metadata: {
            structure: result.structure,
            code: result.code,
            files: result.files,
          },
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setProgramRequirements("");
      }
    } catch (error) {
      console.error("Program generation error:", error);
    } finally {
      setIsProgramLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4 bg-gradient-to-br from-cyan-50 to-blue-50">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
          ⚡ PoiPoi AI チャット
        </h2>
        <button
          onClick={() => navigate("/facefusion-hybrid")}
          className="text-2xl hover:opacity-70 transition-opacity cursor-pointer"
          title="FaceFusion v3 ハイブリッド処理"
        >
          ♻️
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">💬 チャット</TabsTrigger>
          <TabsTrigger value="evolution">🧬 自己進化</TabsTrigger>
          <TabsTrigger value="program">🤖 プログラム生成</TabsTrigger>
        </TabsList>

        {/* チャットタブ */}
        <TabsContent value="chat" className="flex-1 flex flex-col gap-4">
          <Card className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>会話を開始しましょう...</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                          : "bg-gray-200 text-black"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 text-black px-4 py-2 rounded-lg">
                      <Spinner className="w-4 h-4" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </Card>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleSendMessage();
                }
              }}
              placeholder="メッセージを入力..."
              disabled={isLoading}
              className="border-cyan-300 focus:border-cyan-500"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {isLoading ? <Spinner className="w-4 h-4" /> : "送信"}
            </Button>
          </div>
        </TabsContent>

        {/* 自己進化タブ */}
        <TabsContent value="evolution" className="flex-1 flex flex-col gap-4">
          <Card className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            <div className="space-y-4">
              <h3 className="font-bold text-lg">🧬 自己進化システム</h3>
              <p className="text-sm text-gray-600">
                システムへのフィードバックを入力すると、AI が自動的に改善案を生成します。
              </p>

              <Textarea
                value={evolutionFeedback}
                onChange={(e) => setEvolutionFeedback(e.target.value)}
                placeholder="改善すべき点や機能についてのフィードバックを入力..."
                className="min-h-24 border-cyan-300 focus:border-cyan-500"
              />

              <Button
                onClick={handleEvolutionFeedback}
                disabled={isEvolutionLoading || !evolutionFeedback.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                {isEvolutionLoading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    分析中...
                  </>
                ) : (
                  "分析して改善案を生成"
                )}
              </Button>

              {messages.filter((m) => m.type === "evolution").length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">分析結果:</h4>
                  {messages
                    .filter((m) => m.type === "evolution")
                    .map((msg) => (
                      <div key={msg.id} className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                        <p className="text-sm">{msg.content}</p>
                        {msg.metadata?.priority && (
                          <Badge
                            className="mt-2"
                            variant={msg.metadata.priority === "high" ? "destructive" : "default"}
                          >
                            優先度: {msg.metadata.priority}
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* プログラム生成タブ */}
        <TabsContent value="program" className="flex-1 flex flex-col gap-4">
          <Card className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            <div className="space-y-4">
              <h3 className="font-bold text-lg">🤖 自動プログラム作成</h3>
              <p className="text-sm text-gray-600">
                プログラムの要件を入力すると、AI が自動的にコードを生成します。
              </p>

              <Textarea
                value={programRequirements}
                onChange={(e) => setProgramRequirements(e.target.value)}
                placeholder="プログラムの要件を入力してください。複数の要件は改行で区切ってください。"
                className="min-h-32 border-cyan-300 focus:border-cyan-500"
              />

              <Button
                onClick={handleGenerateProgram}
                disabled={isProgramLoading || !programRequirements.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              >
                {isProgramLoading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    生成中...
                  </>
                ) : (
                  "プログラムを生成"
                )}
              </Button>

              {messages.filter((m) => m.type === "program").length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">生成されたプログラム:</h4>
                  {messages
                    .filter((m) => m.type === "program")
                    .map((msg) => (
                      <div key={msg.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm whitespace-pre-wrap font-mono text-xs">{msg.content}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* マルチモーダルダイアログ */}
      <Dialog open={showMultimodal} onOpenChange={setShowMultimodal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🎨 マルチモーダル - 顔入れ替えツール</DialogTitle>
          </DialogHeader>
          <FaceSwapPanel onClose={() => setShowMultimodal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

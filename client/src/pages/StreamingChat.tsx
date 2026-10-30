import { useState, useRef, useEffect } from "react";
import { loadConversations, saveConversations, createConversation } from "@/lib/poipoiChatHistory";
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
import AZEvolutionPanel from "@/components/AZEvolutionPanel";
import { useAuth } from "@/_core/hooks/useAuth";

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
  const { user, loading: authLoading } = useAuth();
  const accountId = user ? String(user.id) : "guest";
  const [historyAccount, setHistoryAccount] = useState(accountId);
  const lastConversationKey = "poipoi_last_conversation_v1:" + historyAccount;
  const deleteServerSession = trpc.chat.deleteSession.useMutation();
  const deletedIds = useRef(new Set<string>());
  const upload = trpc.unifiedTools.uploadDocument.useMutation();
  const exportDocument = trpc.unifiedTools.exportDocument.useMutation();
  const requestAccount = useRef(accountId);
  requestAccount.current = accountId;
  const exportPPT = trpc.unifiedTools.exportPresentation.useMutation();
  const [fileError, setFileError] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => { const id = localStorage.getItem(lastConversationKey) ?? (accountId === "guest" ? localStorage.getItem("poipoi_last_conversation_v1") : null); const c = loadConversations(accountId).find(x => x.id === id); return c ? c.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })) : []; });
  const [conversations, setConversations] = useState(() => loadConversations(accountId));
  // STEP36_MEMORY_SEARCH
  const [memoryQuery,setMemoryQuery]=useState("");
  const [memoryOpen,setMemoryOpen]=useState(false);
  const [memoryResults,setMemoryResults]=useState<any[]>([]);
  const [memoryError,setMemoryError]=useState("");
  const [memoryLoading,setMemoryLoading]=useState(false);
  const searchMemory=async()=>{
    if(!memoryQuery.trim())return;
    setMemoryError(""); setMemoryLoading(true); setMemoryResults([]);
    const searchingAccount = accountId;
    try{
      const found = await serverHistoryUtils.chat.searchMemory.fetch({ query: memoryQuery, sessionId: conversationId ?? undefined });
      if (requestAccount.current !== searchingAccount) return;
      setMemoryResults(found.map(record => ({ question: record.id, answer: record.value })));
    }catch(e){setMemoryError("検索に失敗しました");}finally{setMemoryLoading(false);}
  };
  const [conversationId, setConversationId] = useState<string | null>(() => { const id = localStorage.getItem(lastConversationKey) ?? (accountId === "guest" ? localStorage.getItem("poipoi_last_conversation_v1") : null); return loadConversations(accountId).some(c => c.id === id) ? id : null; });
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

  const openConversation = (id: string) => { const c = conversations.find(x => x.id === id); if (!c || isLoading) return; localStorage.setItem(lastConversationKey, id); setConversationId(id); setMessages(c.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))); setActiveTab("chat"); };
  const deleteConversation = async (id: string) => {
    if (isLoading || historyAccount !== accountId || !window.confirm('この会話を削除しますか？')) return;
    const deletingAccount = accountId;
    try {
      await deleteServerSession.mutateAsync({ userId: String(user?.id ?? 'mobile'), sessionId: id, confirm: 'DELETE_SESSION' });
      if (requestAccount.current !== deletingAccount) return;
      deletedIds.current.add(id);
      const next = conversations.filter(conversation => conversation.id !== id);
      setConversations(next); saveConversations(next, historyAccount);
      if (conversationId === id) { localStorage.removeItem(lastConversationKey); setConversationId(null); setMessages([]); setInput(''); }
      await serverHistoryUtils.chat.getSessions.invalidate();
    } catch (error) { if (requestAccount.current === deletingAccount) setFileError(error instanceof Error ? error.message : String(error)); }
  };
  const renameConversation = (id: string) => { const c = conversations.find(x => x.id === id); if (!c) return; const title = window.prompt("新しい会話タイトル", c.title)?.trim(); if (!title) return; const next = conversations.map(x => x.id === id ? { ...x, title } : x); setConversations(next); saveConversations(next, historyAccount); };
  const startNewConversation = () => { if (isLoading) return; const c = createConversation(); setConversations(prev => { const next = [c, ...prev]; return next; }); localStorage.setItem(lastConversationKey, c.id); setConversationId(c.id); setMessages([]); setInput(""); setActiveTab("chat"); };
  const persistChatMessage = (id: string, message: Message) => { setConversations(prev => { const next = prev.map(c => c.id !== id ? c : { ...c, title: c.title === "新しいチャット" && message.role === "user" ? message.content.slice(0, 30) : c.title, updatedAt: new Date().toISOString(), messages: [...c.messages, { id: message.id, role: message.role, content: message.content, timestamp: message.timestamp.toISOString(), type: message.type, metadata: message.metadata }] }); return next; }); };
  useEffect(() => {
    if (authLoading || accountId === historyAccount) return;
    const next = loadConversations(accountId);
    const lastId = localStorage.getItem('poipoi_last_conversation_v1:' + accountId);
    const current = next.find(item => item.id === lastId);
    setConversations(next); setConversationId(current?.id ?? null);
    setMessages(current?.messages.map(message => ({ ...message, timestamp: new Date(message.timestamp) })) ?? []);
    deletedIds.current.clear();
    setInput(''); setMemoryResults([]); setFileError(''); setHistoryAccount(accountId);
  }, [accountId, historyAccount, authLoading]);
  useEffect(() => {
    if (!authLoading && historyAccount === accountId) saveConversations(conversations, historyAccount);
  }, [conversations, historyAccount, accountId, authLoading]);
  const streamingChat = trpc.streaming.chat.useMutation();
  const serverSessions = trpc.chat.getSessions.useQuery(undefined, {
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });  const syncHistory = trpc.chat.syncHistory.useMutation();
  const serverHistoryUtils = trpc.useUtils();
  const taskHistory = trpc.chat.getTaskHistory.useQuery({ accountId }, { enabled: !!user, refetchInterval: isLoading ? 3000 : 10000 });
  useEffect(() => {
    if (authLoading || historyAccount !== accountId || !serverSessions.data?.length) return;
    let cancelled = false;
    Promise.all(serverSessions.data.filter(session => session.userId === String(user?.id ?? "mobile")).map(async session => ({
      session,
      messages: await serverHistoryUtils.chat.getMessages.fetch({
        userId: String(session.userId),
        sessionId: session.id,
      }),
    }))).then(results => {
      if (cancelled) return;
      setConversations(prev => {
        const merged = new Map(prev.map(c => [c.id, c]));
        for (const { session, messages } of results) {
          if (deletedIds.current.has(session.id)) continue;
          const existing = merged.get(session.id);
          const items = new Map((existing?.messages ?? []).map(m => [m.id, m]));
          for (const m of messages) {
            if (!items.has(m.id)) items.set(m.id, {
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp).toISOString(),
              type: "text",
              metadata: m.metadata,
            });
          }
          merged.set(session.id, {
            id: session.id,
            title: existing?.title ?? session.title,
            updatedAt: new Date(Math.max(
              new Date(existing?.updatedAt ?? 0).getTime(),
              Number(session.updatedAt)
            )).toISOString(),
            messages: [...items.values()],
          });
        }
        return [...merged.values()].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt)
        );
      });
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [serverSessions.data, serverHistoryUtils, accountId, historyAccount, authLoading]);
  const syncHistoryRef = useRef(syncHistory);
  syncHistoryRef.current = syncHistory;
  useEffect(() => {
    if (!user || authLoading || historyAccount !== accountId || !conversations.length || isLoading) return;
    const timer = setTimeout(() => {
      syncHistoryRef.current.mutate({
        conversations: conversations.slice(0, 10).map(c => ({
          id: c.id,
          title: c.title,
          updatedAt: c.updatedAt,
          messages: c.messages.slice(-200)
            .filter(m => m.role === "user" || m.role === "assistant")
            .map(m => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              timestamp: m.timestamp,
            })),
        })),
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [conversations, user?.id, isLoading, authLoading, historyAccount, accountId]);

  useEffect(() => {
    if (isLoading || historyAccount !== accountId || !conversationId) return;
    const current = conversations.find(item => item.id === conversationId);
    if (current) setMessages(previous => previous.map(item => item.id).join('|') === current.messages.map(item => item.id).join('|')
      ? previous : current.messages.map(item => ({ ...item, timestamp: new Date(item.timestamp) })));
  }, [conversations, conversationId, isLoading, historyAccount, accountId]);

  const analyzeFeedback = trpc.evolution.analyzeFeedback.useMutation();
  const generateProgram = trpc.autoProgramGeneration.generateProgram.useMutation();

  useEffect(() => { if (true) return; if (!conversationId || !conversations.some(c => c.id === conversationId)) return; const next = conversations.map(c => c.id === conversationId ? { ...c, title: c.title === "新しいチャット" ? (messages.find(m => m.role === "user")?.content.slice(0, 30) || c.title) : c.title, updatedAt: new Date().toISOString(), messages: messages.map(m => ({ id: m.id, role: m.role, content: m.content, timestamp: m.timestamp.toISOString(), type: m.type })) } : c); saveConversations(next, historyAccount); }, [messages, conversationId]);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || authLoading || historyAccount !== accountId) return; const chatId = conversationId || createConversation().id; if (!conversationId) { const c = { ...createConversation(), id: chatId }; setConversations(prev => { const next = [c, ...prev]; return next; }); setConversationId(chatId); }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => [...prev, userMessage]);
    persistChatMessage(chatId, userMessage);
    setInput("");
    setIsLoading(true);

    const sendingAccount = accountId;
    try {
      const response = await streamingChat.mutateAsync({
        message: input,
        messageId: userMessage.id,
        conversationId: chatId,
        history: messages.slice(-20).map(m => ({role:m.role,content:m.content})),
      });

      if (requestAccount.current !== sendingAccount) return;
      localStorage.setItem(lastConversationKey, chatId);
      const assistantMessage: Message = {
        id: "messageId" in response && typeof response.messageId === "string" ? response.messageId : `msg_${Date.now() + 1}`,
        role: "assistant",
        content: response.fullText,
        metadata: "metadata" in response ? response.metadata as Record<string, any> : undefined,
        timestamp: new Date(),
        type: "text",
      };

      setMessages((prev) => [...prev, assistantMessage]);
      persistChatMessage(chatId, assistantMessage);
    } catch (error) {
      if (requestAccount.current !== sendingAccount) return;
      console.error("ストリーミングチャットエラー:", error);
      const errorMessage: Message = {
        id: `msg_${Date.now() + 2}`,
        role: "assistant",
        content: error instanceof Error ? error.message : "処理に失敗しました。操作は完了していません。",
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

  const downloadPPT = async (id: string) => {
    setFileError('');
    try {
      const output = await exportPPT.mutateAsync({ id });
      const bytes = Uint8Array.from(atob(output.base64), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
      const link = document.createElement('a'); link.href = url; link.download = id + '.pptx'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setFileError(error instanceof Error ? error.message : String(error)); }
  };
  const downloadDocument = async (file: string, type: 'xlsx' | 'pdf') => {
    setFileError('');
    try {
      const output = await exportDocument.mutateAsync({ file, type });
      const bytes = Uint8Array.from(atob(output.base64), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a'); link.href = url; link.download = file.split('/').pop()!; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setFileError(error instanceof Error ? error.message : String(error)); }
  };
  const uploadFile = async (file: File) => {
    setFileError('');
    if (!user) { setFileError('資料のアップロードにはログインが必要です。'); return; }
    if (file.size > 10 * 1024 * 1024) { setFileError('資料は10MB以下にしてください。'); return; }
    const uploadingAccount = accountId;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = ''; for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      const type = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' as const : 'xlsx' as const;
      const output = await upload.mutateAsync({ fileName: file.name, type, base64: btoa(binary) });
      if (requestAccount.current !== uploadingAccount) return;
      setInput(current => current + '\n対象資料: ' + output.file + '（' + file.name + '）');
    } catch (error) { setFileError(error instanceof Error ? error.message : String(error)); }
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4 bg-gradient-to-br from-cyan-50 to-blue-50">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
          ⚡ AZ チャット
        </h2>
        <button
          onClick={() => navigate("/facefusion-hybrid")}
          className="text-2xl hover:opacity-70 transition-opacity cursor-pointer"
          title="FaceFusion v3 ハイブリッド処理"
        >
          ♻️
        </button>
      </div>

      <AZEvolutionPanel key={accountId} />
      {user && <details className="rounded-lg border bg-white p-3">
        <summary className="cursor-pointer">AZの実行履歴</summary>
        {taskHistory.error && <p>{taskHistory.error.message}</p>}
        {taskHistory.data?.map(task => <details key={task.id} className="mt-2 border-t pt-2 text-sm">
          <summary>{task.request?.slice(0, 80) ?? task.id} — {task.status}</summary>
          <p className="whitespace-pre-wrap">{task.answer || '処理中です。中断した記録は自動再実行しません。'}</p>
          {task.steps.map((step, index) => <p key={index}>{step.tool}: {step.status}{step.error ? ' / ' + step.error : ''}</p>)}
        </details>)}
      </details>}
      <div className="flex flex-1 min-h-0 gap-4">
      <aside className="w-60 shrink-0 rounded-lg bg-white/80 p-3 flex flex-col gap-3"><button type="button" onClick={startNewConversation} className="rounded-lg bg-cyan-600 px-3 py-2 text-white">＋ 新しいチャット</button><div className="text-sm font-semibold">最近の会話</div><div className="flex-1 overflow-y-auto space-y-1">{conversations.map(c => <div key={c.id} className="flex items-center gap-2"><button key={c.id} type="button" onClick={() => openConversation(c.id)} className={`block w-full truncate rounded px-3 py-2 text-left text-sm ${conversationId === c.id ? "bg-cyan-100" : "hover:bg-gray-100"}`}>{c.title}</button><button type="button" onClick={() => renameConversation(c.id)} className="text-xs text-blue-600 hover:underline">編集</button><button type="button" onClick={() => deleteConversation(c.id)} className="text-xs text-red-600 hover:underline">削除</button></div>)}</div></aside>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat">💬 チャット</TabsTrigger>
          <TabsTrigger value="evolution">🧬 自己進化</TabsTrigger>
          <TabsTrigger value="program">🤖 プログラム生成</TabsTrigger>
        </TabsList>

        {/* チャットタブ */}
        <TabsContent value="chat" className="flex-1 flex flex-col gap-4">
          {/* STEP36_SEARCH_UI */}
          <div className="rounded-lg border bg-white p-3">
            <button type="button" onClick={()=>setMemoryOpen(!memoryOpen)} className="rounded bg-blue-600 px-3 py-2 text-white">長期記憶を検索</button>
            {memoryOpen && <div className="mt-3 space-y-2">
              <input value={memoryQuery} onChange={e=>setMemoryQuery(e.target.value)} placeholder="過去の会話を検索" className="w-full rounded border p-2"/>
              <button type="button" onClick={searchMemory} className="rounded bg-cyan-600 px-3 py-2 text-white">検索</button>
              {/* STEP36_SEARCH_FEEDBACK */}
              {memoryLoading && <p>検索中...</p>}
              {!memoryLoading && !memoryError && memoryResults.length===0 && <p>検索結果は0件です</p>}
              {memoryError && <p className="text-red-600">{memoryError}</p>}
              {memoryResults.map((item,i)=><div key={i} className="rounded border p-2 text-sm"><p>質問：{item.question}</p><p>回答：{item.answer}</p></div>)}
            </div>}
          </div>
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
                      {message.metadata?.task && <details className="mt-2 text-xs">
                        <summary>実行記録（{message.metadata.task.status}）</summary>
                        {message.metadata.task.steps?.map((step: { tool: string; status: string; error?: string }, index: number) =>
                          <p key={index}>{step.tool}: {step.status}{step.error ? ' / ' + step.error : ''}</p>)}
                      </details>}
                      {message.metadata?.task?.documents?.map((output: { file: string; type: 'xlsx' | 'pdf' }) =>
                        <button key={output.file} className="mt-2 block text-blue-700 underline" onClick={() => downloadDocument(output.file, output.type)} disabled={exportDocument.isPending}>{output.type.toUpperCase()}をダウンロード</button>)}
                      {message.metadata?.task?.presentations?.map((id: string) =>
                        <button key={id} className="mt-2 block text-blue-700 underline" onClick={() => downloadPPT(id)} disabled={exportPPT.isPending}>PowerPointをダウンロード</button>)}
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

          <label className="text-sm">資料を追加（Excel / PDF）
            <input type="file" accept=".xlsx,.pdf" disabled={isLoading || upload.isPending}
              onChange={event => { const selected = event.target.files?.[0]; if (selected) void uploadFile(selected); event.target.value = ''; }} />
          </label>
          {fileError && <p role="alert" className="text-red-700">{fileError}</p>}
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
      </div>

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

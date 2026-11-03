import { describePoiPoiChatFailure } from '@/lib/poipoiConnection';
import AZMusicPlayer from '@/components/AZMusicPlayer';
import AZPersonalTasksPanel, { AZPersonalReminderObserver } from '@/components/AZPersonalTasksPanel';
import { useState, useRef, useEffect, type ClipboardEvent } from "react";
import { loadConversations, saveConversations, createConversation } from "@/lib/poipoiChatHistory";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import FaceSwapPanel from "@/components/FaceSwapPanel";
import AZEvolutionPanel from "@/components/AZEvolutionPanel";
import AZApprovalNotice from "@/components/AZApprovalNotice";
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

function newMessageId() {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2);
}

function ChatPhoto({ id, name, accountId, onEdit, disabled }: { id: string; name: string; accountId: string; onEdit?: () => void; disabled?: boolean }) {
  const [displayError, setDisplayError] = useState(false);
  useEffect(() => { setDisplayError(false); }, [id, accountId]);
  const image = trpc.unifiedTools.getChatImage.useQuery({ id, accountId }, {
    enabled: accountId !== "guest", staleTime: Infinity, retry: false,
  });
  if (accountId === "guest") return <span className="text-xs">写真の表示にはログインが必要です。</span>;
  if (image.error || displayError) return <span role="alert" className="inline-flex flex-col text-xs text-red-700">
    写真を表示できません。保存データがない場合は再添付してください。
    <button type="button" className="underline" disabled={image.isFetching}
      onClick={() => { setDisplayError(false); void image.refetch(); }}>写真を再読み込み</button>
  </span>;
  if (!image.data) return <span className="text-xs">写真を読み込み中...</span>;
  return <span className="inline-flex flex-col gap-1">
    <img src={image.data.dataUri} alt={name} onError={() => setDisplayError(true)} className="max-h-48 max-w-full rounded-lg object-contain" />
    <a href={image.data.dataUri} download={name} className="text-xs text-blue-700 underline">写真・画像を保存</a>
    {onEdit && <button type="button" disabled={disabled} onClick={onEdit} className="text-left text-xs text-blue-700 underline">この画像を編集</button>}
  </span>;
}

export default function StreamingChat() {
  const { user, loading: authLoading } = useAuth();
  const accountId = user ? String(user.id) : "guest";
  const [historyAccount, setHistoryAccount] = useState(accountId);
  const lastConversationKey = "poipoi_last_conversation_v1:" + historyAccount;
  const deleteServerSession = trpc.chat.deleteSession.useMutation();
  const deletedIds = useRef(new Set<string>());
  const upload = trpc.unifiedTools.uploadDocument.useMutation();
  const uploadPhoto = trpc.unifiedTools.uploadChatImage.useMutation();
  const exportDocument = trpc.unifiedTools.exportDocument.useMutation();
  const requestAccount = useRef(accountId);
  requestAccount.current = accountId;
  const exportPPT = trpc.unifiedTools.exportPresentation.useMutation();
  const [fileError, setFileError] = useState("");
  const [chatError, setChatError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null);
  const [attachments, setAttachments] = useState<Array<{ file: string; name: string; type: 'xlsx' | 'pdf' | 'image' }>>([]);
  const attachmentInput = useRef<HTMLInputElement>(null);
  const sendLock = useRef(false);
  const uploadLock = useRef(false);
  const pasteLock = useRef(false);
  const [isPasting, setIsPasting] = useState(false);
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
  const [showAuxiliaryTools, setShowAuxiliaryTools] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reminderError, setReminderError] = useState('');
  useEffect(() => { setReminderError(''); setSettingsOpen(false); }, [accountId]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [evolutionFeedback, setEvolutionFeedback] = useState("");
  const [programRequirements, setProgramRequirements] = useState("");
  const [isEvolutionLoading, setIsEvolutionLoading] = useState(false);
  const [isProgramLoading, setIsProgramLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [location, navigate] = useLocation();
  const isAppBuilder = location === "/app-builder";

  const openConversation = (id: string) => { const c = conversations.find(x => x.id === id); if (!c || isLoading || uploadLock.current || pasteLock.current) return; localStorage.setItem(lastConversationKey, id); setConversationId(id); setMessages(c.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }))); setAttachments([]); setEditTarget(null); setChatError(""); setFileError(""); };
  const deleteConversation = async (id: string) => {
    if (isLoading || pasteLock.current || uploadLock.current || historyAccount !== accountId || !window.confirm('この会話を削除しますか？')) return;
    const deletingAccount = accountId;
    try {
      await deleteServerSession.mutateAsync({ userId: String(user?.id ?? 'mobile'), sessionId: id, confirm: 'DELETE_SESSION' });
      if (requestAccount.current !== deletingAccount) return;
      deletedIds.current.add(id);
      const next = conversations.filter(conversation => conversation.id !== id);
      setConversations(next); saveConversations(next, historyAccount);
      if (conversationId === id) { localStorage.removeItem(lastConversationKey); setConversationId(null); setMessages([]); setInput(''); setAttachments([]); setEditTarget(null); }
      await serverHistoryUtils.chat.getSessions.invalidate();
    } catch (error) { if (requestAccount.current === deletingAccount) setFileError(error instanceof Error ? error.message : String(error)); }
  };
  const renameConversation = (id: string) => { const c = conversations.find(x => x.id === id); if (!c) return; const title = window.prompt("新しい会話タイトル", c.title)?.trim(); if (!title) return; const next = conversations.map(x => x.id === id ? { ...x, title } : x); setConversations(next); saveConversations(next, historyAccount); };
  const startNewConversation = () => { if (isLoading || uploadLock.current || pasteLock.current) return; const c = createConversation(); setConversations(prev => { const next = [c, ...prev]; return next; }); localStorage.setItem(lastConversationKey, c.id); setConversationId(c.id); setMessages([]); setInput(""); setAttachments([]); setEditTarget(null); setChatError(""); setFileError(""); };
  const persistChatMessage = (id: string, message: Message) => { setConversations(prev => { const next = prev.map(c => c.id !== id ? c : { ...c, title: c.title === "新しいチャット" && message.role === "user" ? message.content.slice(0, 30) : c.title, updatedAt: new Date().toISOString(), messages: [...c.messages, { id: message.id, role: message.role, content: message.content, timestamp: message.timestamp.toISOString(), type: message.type, metadata: message.metadata }] }); return next; }); };
  useEffect(() => {
    if (authLoading || accountId === historyAccount) return;
    const next = loadConversations(accountId);
    const lastId = localStorage.getItem('poipoi_last_conversation_v1:' + accountId);
    const current = next.find(item => item.id === lastId);
    setConversations(next); setConversationId(current?.id ?? null);
    setMessages(current?.messages.map(message => ({ ...message, timestamp: new Date(message.timestamp) })) ?? []);
    deletedIds.current.clear();
    setInput(''); setAttachments([]); setEditTarget(null); setChatError(''); setMemoryResults([]); setFileError(''); setHistoryAccount(accountId);
  }, [accountId, historyAccount, authLoading]);
  useEffect(() => {
    if (!authLoading && historyAccount === accountId) {
      try { saveConversations(conversations, historyAccount); }
      catch { setChatError('ブラウザに会話を保存できません。画面上の会話は保持していますが、再読み込み前にサーバーの履歴保存を確認してください。'); }
    }
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
            const local = items.get(m.id);
            items.set(m.id, {
              id: m.id, role: m.role, content: m.role === "user" ? (local?.content ?? m.content.split("\n\n添付写真から読み取った参考データ")[0]) : m.content,
              timestamp: new Date(m.timestamp).toISOString(),
              type: local?.type ?? "text",
              metadata: { ...local?.metadata, ...m.metadata },
            });
          }
          merged.set(session.id, {
            id: session.id,
            title: existing?.title ?? session.title,
            updatedAt: new Date(Math.max(
              new Date(existing?.updatedAt ?? 0).getTime(),
              Number(session.updatedAt)
            )).toISOString(),
            messages: [...items.values()].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)),
          });
        }
        return [...merged.values()].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt)
        );
      });
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [serverSessions.data, serverHistoryUtils, accountId, historyAccount, authLoading]);
  // Restore server-completed responses into the visible chat after a network interruption.
  useEffect(() => {
    if (isLoading || authLoading || historyAccount !== accountId || !conversationId) return;
    const current = conversations.find(item => item.id === conversationId);
    if (current) {
      const restored = current.messages.map(message => ({ ...message, timestamp: new Date(message.timestamp) }));
      setMessages(previous => JSON.stringify(previous) === JSON.stringify(restored) ? previous : restored);
    }
  }, [conversations, conversationId, isLoading, authLoading, historyAccount, accountId]);
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
            .filter(m => (m.role === "user" || m.role === "assistant") && !m.metadata?.error)
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
    if (sendLock.current || uploadLock.current || pasteLock.current || isLoading) return;
    const draft = input.trim() || (attachments.some(item => item.type === "image") ? "添付した写真について説明してください。" : "");
    if (!draft) { setChatError("AZに依頼する内容を入力してください。"); return; }
    if (authLoading || historyAccount !== accountId) {
      setChatError("アカウントの読み込み中です。少し待ってから送信してください。"); return;
    }
    if (editTarget && attachments.some(item => item.type === 'image')) {
      setChatError('履歴の編集対象か、新しく添付した写真のどちらか1枚を選んでください。'); return;
    }
    sendLock.current = true;
    setChatError("");
    const sendingAccount = accountId;
    const photos = attachments.filter(item => item.type === 'image');
    const documents = attachments.filter(item => item.type !== 'image');
    const outgoing = draft + (documents.length
      ? "\n\n対象資料（内容は参考データとして扱う）:\n" + documents.map(item => item.type.toUpperCase() + ": " + item.file + "（" + item.name + "）").join("\n") : "")
      + (photos.length ? "\n添付写真: " + photos.map(item => item.name).join("、") : "");
    const chatId = conversationId || createConversation().id;
    if (!conversationId) {
      const conversation = { ...createConversation(), id: chatId };
      setConversations(previous => [conversation, ...previous]);
      setConversationId(chatId);
    }
    const userMessage: Message = {
      id: newMessageId(), role: "user", content: outgoing, timestamp: new Date(), type: "text",
      metadata: { ...(photos.length ? { images: photos.map(item => ({ id: item.file, name: item.name })) } : {}), ...(editTarget ? { sourceImageId: editTarget.id } : {}) },
    };
    setMessages(previous => [...previous, userMessage]);
    persistChatMessage(chatId, userMessage);
    setInput("");
    setIsLoading(true);
    try {
      const response = await streamingChat.mutateAsync({
        message: outgoing, messageId: userMessage.id, conversationId: chatId,
        sourceImageId: editTarget?.id,
        images: photos.length ? photos.map(item => item.file) : undefined,
        history: messages.filter(message => !message.metadata?.error).slice(-20)
          .map(message => ({ role: message.role, content: message.content })),
      });
      if (requestAccount.current !== sendingAccount) return;
      if (!response.fullText?.trim()) throw new Error("AZから回答が返りませんでした。処理は完了していません。");
      localStorage.setItem(lastConversationKey, chatId);
      const assistantMessage: Message = {
        id: "messageId" in response && typeof response.messageId === "string" ? response.messageId : newMessageId(),
        role: "assistant", content: response.fullText,
        metadata: "metadata" in response ? response.metadata as Record<string, any> : undefined,
        timestamp: new Date(), type: "text",
      };
      setMessages(previous => [...previous, assistantMessage]);
      persistChatMessage(chatId, assistantMessage);
      // A clarification is not a completed edit: keep its photo/selected target
      // so the user's answer continues the same operation.
      if (!assistantMessage.metadata?.imageClarification) { setAttachments([]); setEditTarget(null); }
      if (user) void serverHistoryUtils.unifiedTools.listPersonalTasks.invalidate().catch(console.error);
      if (user?.role === 'admin') {
        void serverHistoryUtils.unifiedTools.listCodePreviews.invalidate().catch(error => console.error('変更案の更新エラー:', error));
      }
    } catch (error) {
      if (requestAccount.current !== sendingAccount) return;
      const description = await describePoiPoiChatFailure(error);
      if (requestAccount.current !== sendingAccount) return;
      setChatError(description);
      setInput(current => current || draft);
      const errorMessage: Message = {
        id: newMessageId(), role: "assistant", content: description,
        timestamp: new Date(), type: "text", metadata: { error: true },
      };
      setMessages(previous => [...previous, errorMessage]);
      // Keep failures in the local conversation so history reconciliation cannot erase them.
      // They are excluded from server sync and from the next model history.
      persistChatMessage(chatId, errorMessage);
    } finally {
      sendLock.current = false;
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
  const uploadFile = async (file: File, fromPaste = false): Promise<boolean> => {
    if (uploadLock.current || sendLock.current || (pasteLock.current && !fromPaste)) return false;
    setFileError('');
    if (!user) { setFileError('資料の添付にはログインが必要です。'); return false; }
    if (authLoading || historyAccount !== accountId) { setFileError('アカウントの読み込み完了をお待ちください。'); return false; }
    if (!/\.(xlsx|pdf|png|jpe?g|webp)$/i.test(file.name)) { setFileError('Excel・PDF・写真（JPG／PNG／WebP）を選んでください。'); return false; }
    const isPhoto = /\.(png|jpe?g|webp)$/i.test(file.name);
    if (isPhoto && file.size > 5 * 1024 * 1024) { setFileError('写真は1枚5MB以下にしてください。'); return false; }
    if (file.size > 10 * 1024 * 1024) { setFileError('資料は10MB以下にしてください。'); return false; }
    if (attachments.length >= 6) { setFileError('一度に添付できる資料は6件までです。'); return false; }
    const uploadingAccount = accountId;
    uploadLock.current = true; setIsUploading(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      if (isPhoto) {
        const output = await uploadPhoto.mutateAsync({ fileName: file.name, base64: btoa(binary) });
        if (requestAccount.current !== uploadingAccount) return false;
        setAttachments(current => [...current, { file: output.id, name: output.name, type: 'image' }]);
      } else {
        const type = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' as const : 'xlsx' as const;
        const output = await upload.mutateAsync({ fileName: file.name, type, base64: btoa(binary) });
        if (requestAccount.current !== uploadingAccount) return false;
        setAttachments(current => [...current, { file: output.file, name: file.name, type }]);
      }
      return true;
    } catch (error) {
      if (requestAccount.current === uploadingAccount) setFileError(error instanceof Error ? error.message : String(error));
      return false;
    } finally { uploadLock.current = false; setIsUploading(false); }
  };

  const handleImagePaste = async (event: ClipboardEvent<HTMLInputElement>) => {
    const clipboardFiles = Array.from(event.clipboardData.files);
    const candidates = clipboardFiles.length ? clipboardFiles : Array.from(event.clipboardData.items)
      .filter(item => item.kind === 'file').map(item => item.getAsFile()).filter((file): file is File => Boolean(file));
    const images = candidates.filter(file => file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name));
    if (!images.length) return; // Preserve ordinary text pasting.
    event.preventDefault();
    if (pasteLock.current || uploadLock.current || sendLock.current || isLoading) { setFileError('処理が終わってから画像を貼り付けてください。'); return; }
    if (!user) { setFileError('画像の貼り付けにはログインが必要です。'); return; }
    if (authLoading || historyAccount !== accountId) { setFileError('アカウントの読み込み完了をお待ちください。'); return; }
    if (images.some(file => !['image/png','image/jpeg','image/webp'].includes(file.type))) { setFileError('貼り付ける画像はPNG・JPG・WebPにしてください。'); return; }
    if (attachments.length + images.length > 6) { setFileError('添付は資料と画像を合わせて6件までです。添付を減らしてから貼り付けてください。'); return; }
    if (images.some(file => file.size > 5 * 1024 * 1024)) { setFileError('画像は1枚5MB以下にしてください。'); return; }
    // An image clipboard can also contain text. Insert it at the caret without losing the draft.
    const pastedText = event.clipboardData.getData('text/plain');
    const element = event.currentTarget;
    if (pastedText && !/^data:image\//i.test(pastedText)) {
      const start = element.selectionStart ?? element.value.length, end = element.selectionEnd ?? start;
      setInput(element.value.slice(0, start) + pastedText + element.value.slice(end));
      requestAnimationFrame(() => { if (document.activeElement === element) element.setSelectionRange(start + pastedText.length, start + pastedText.length); });
    }
    const pastingAccount = accountId;
    pasteLock.current = true; setIsPasting(true); setFileError('');
    try {
      for (const [index, image] of images.entries()) {
        if (requestAccount.current !== pastingAccount) break;
        const extension = image.type === 'image/jpeg' ? 'jpg' : image.type === 'image/webp' ? 'webp' : 'png';
        const name = /\.(png|jpe?g|webp)$/i.test(image.name) ? image.name : '貼り付け画像-' + Date.now() + '-' + (index + 1) + '.' + extension;
        if (!await uploadFile(new File([image], name, { type: image.type, lastModified: image.lastModified }), true)) break;
      }
    } finally { pasteLock.current = false; setIsPasting(false); }
  };

  return (
    <div className="flex flex-col min-h-screen gap-4 p-4 bg-gradient-to-br from-cyan-50 to-blue-50">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
          {isAppBuilder ? "アプリ・ソフト作成" : "⚡ AZ チャット"}
        </h2>
        <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/facefusion-hybrid")}
          className="text-2xl hover:opacity-70 transition-opacity cursor-pointer"
          title="FaceFusion v3 ハイブリッド処理"
        >
          ♻️
        </button>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="設定" aria-haspopup="dialog"
            title="設定・タスク・リマインダー・補助ツール" className="text-2xl hover:opacity-70 transition-opacity">
            ⚙️{reminderError && <span className="ml-1 text-sm text-red-700" aria-label="通知エラーあり">●</span>}
          </button>
        </div>
      </div>

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
      <aside className="w-60 shrink-0 rounded-lg bg-white/80 p-3 flex flex-col gap-3" aria-label="チャットのメニュー">
        <button type="button" onClick={startNewConversation} className="rounded-lg bg-cyan-600 px-3 py-2 text-white">＋ 新しいチャット</button>
        <button type="button" aria-expanded={historyOpen} aria-controls="az-conversation-history"
          onClick={() => setHistoryOpen(current => !current)}
          className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold ${historyOpen ? "bg-cyan-100 text-cyan-900" : "hover:bg-gray-100"}`}>
          <span>チャット履歴</span><span aria-hidden="true">{historyOpen ? "▾" : "▸"}</span>
        </button>
        {historyOpen && <section id="az-conversation-history" aria-label="チャット履歴" className="flex-1 min-h-0 overflow-y-auto space-y-2">
          {conversations.length === 0 && <p className="px-3 text-sm text-gray-500">{serverSessions.isLoading ? "履歴を読み込んでいます..." : "まだ会話の履歴はありません。"}</p>}
          {serverSessions.error && <p role="alert" className="px-3 text-xs text-red-700">サーバーの履歴を取得できません。保存済みの履歴を表示しています。</p>}
          {conversations.map(conversation => <div key={conversation.id} className="flex items-center gap-2">
            <button type="button" title={conversation.title} aria-current={conversationId === conversation.id ? "page" : undefined}
              onClick={() => openConversation(conversation.id)}
              className={`block min-w-0 flex-1 truncate rounded px-3 py-2 text-left text-sm ${conversationId === conversation.id ? "bg-cyan-100" : "hover:bg-gray-100"}`}>{conversation.title}</button>
            <button type="button" aria-label={conversation.title + "の名前を編集"} onClick={() => renameConversation(conversation.id)} className="shrink-0 text-xs text-blue-600 hover:underline">編集</button>
            <button type="button" aria-label={conversation.title + "を削除"} onClick={() => deleteConversation(conversation.id)} className="shrink-0 text-xs text-red-600 hover:underline">削除</button>
          </div>)}
        </section>}
      </aside>
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <p className="text-sm text-gray-600">{isAppBuilder
          ? "作りたいアプリ・ソフトの目的、必要な機能、使い方を下の入力欄からAZに伝えてください。コードの変更案は入力欄の左に出る「承認待ち」から確認・承認できます。作業中の表示と完了結果も、この画面で確認できます。"
          : "会話・実務操作・自己進化・プログラム作成は、下のチャットから依頼できます。コードの変更案は入力欄の左に出る「承認待ち」から確認・承認できます。完了すると、このチャットに結果を表示します。"}</p>
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
          <Card className="flex-1 min-h-[40vh] overflow-y-auto p-4 space-y-4 bg-white">
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
                      {message.role === 'assistant' && message.metadata?.understanding && <details className="mt-2 text-xs">
                        <summary>AZが読み取った依頼</summary>
                        <p>{message.metadata.understanding.goal}</p>
                        {message.metadata.understanding.targetDescription && <p>対象: {message.metadata.understanding.targetDescription}</p>}
                        {message.metadata.understanding.constraints?.map((condition: string, index: number) => <p key={index}>条件: {condition}</p>)}
                      </details>}
                      {message.metadata?.everyday?.links?.map((link: { label: string; url: string }) =>
                        /^https:\/\//.test(link.url) ? <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-blue-700 underline">{link.label}</a> : null)}
                      {(message.metadata?.everyday?.kind === 'music' || message.metadata?.task?.steps?.some((step: { tool: string }) => step.tool === 'playMusic')) &&
                        <AZMusicPlayer accountId={accountId} action={message.metadata?.everyday?.action} />}
                      {message.metadata?.webSources?.map((source: { title: string; url: string; retrievedAt: number }, index: number) =>
                        /^https:\/\//.test(source.url) ? <a key={source.url + index} href={source.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-blue-700 underline">出典: {source.title}（取得 {new Date(source.retrievedAt).toLocaleString('ja-JP')}）</a> : null)}
                      {message.metadata?.webResearch?.learned && <p className="mt-1 text-xs">出典・取得日時を参考知識として記憶しました。</p>}
                      {message.metadata?.webResearch?.error && <p className="mt-1 text-xs text-red-700">ネット確認: {message.metadata.webResearch.error}</p>}
                      {message.metadata?.webResearch?.notes?.map((note: string, index: number) => <p key={index} className="mt-1 text-xs">{note}</p>)}
                      {message.metadata?.referenceImages?.map((reference: { id: string; name: string; sourceUrl: string }) => <details key={reference.id} className="mt-2 text-xs">
                        <summary>今回の参照画像（生成画像とは別・ここから編集できます）</summary><ChatPhoto id={reference.id} name={reference.name} accountId={accountId}
                          disabled={isLoading || isUploading || isPasting || authLoading} onEdit={() => { setEditTarget({ id: reference.id, name: reference.name }); setChatError(''); }} />
                        {/^https:\/\//.test(reference.sourceUrl) && <a href={reference.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">参照元を開く</a>}
                      </details>)}
                      {message.metadata?.editSourceImages?.map((photo: { id: string; name: string }) => <details key={photo.id} className="mt-2 text-xs">
                        <summary>今回の編集元（生成結果とは別）</summary>
                        <ChatPhoto id={photo.id} name={photo.name} accountId={accountId} disabled={isLoading || isUploading || isPasting || authLoading}
                          onEdit={() => { setEditTarget({ id: photo.id, name: photo.name }); setChatError(''); }} />
                      </details>)}
                      {message.metadata?.editMaskImages?.map((photo: { id: string; name: string }) => <details key={photo.id} className="mt-2 text-xs">
                        <summary>編集範囲（白が編集・黒が保護）</summary><ChatPhoto id={photo.id} name={photo.name} accountId={accountId} />
                      </details>)}
                      {message.metadata?.imageEditPlan && <details className="mt-2 text-xs">
                        <summary>AZが読み取った変更・保持条件</summary>
                        <p>変える内容：{message.metadata.imageEditPlan.change?.join(' ／ ')}</p>
                        <p>残す内容：{message.metadata.imageEditPlan.preserve?.join(' ／ ') || '指定なし'}</p>
                        {message.metadata.protectedPixelsPreserved && <p>黒く示した範囲の画素は、サイズを整えた編集元から保持しました。</p>}
                      </details>}
                      {message.metadata?.imageChangeEvidence && <details className="mt-2 text-xs">
                        <summary>実際の画像差分（形や意味の正しさの保証ではありません）</summary>
                        {message.metadata.imageChangeEvidence.regions?.map((region: { label: string; changedFraction: number; foregroundChangedFraction?: number }, index: number) => <p key={index}>{region.label}：編集範囲の変化 {(region.changedFraction * 100).toFixed(1)}％{region.foregroundChangedFraction !== undefined ? ' ／ 元の被写体部分の変化 ' + (region.foregroundChangedFraction * 100).toFixed(1) + '％' : ''}</p>)}
                        <p>候補の生成回数：{message.metadata.imageGenerationAttempts ?? 1}回。画像AIの肯定だけで完成とは判定しません。</p>
                      </details>}
                      {message.metadata?.imageAssessment && <div className="mt-2 text-xs">
                        <p>画像解析AIによる見立て（最終確認ではありません）</p>
                        <p>変更条件：{({ yes: '反映と推定', no: '不足を検出', uncertain: '未確認' } as Record<string, string>)[message.metadata.imageAssessment.changes] ?? '未確認'} ／ 保持条件：{({ yes: '反映と推定', no: '不一致を検出', uncertain: '未確認' } as Record<string, string>)[message.metadata.imageAssessment.preserved] ?? '未確認'}</p>
                        <p>元の依頼の網羅：{({ yes: '反映と推定', no: '読み落としを検出', uncertain: '未確認' } as Record<string, string>)[message.metadata.imageAssessment.instructionCoverage] ?? '未確認'}</p>
                        {message.metadata.imageAssessment.checks?.map((check: { id: string; status: string; before: string; after: string; evidence: string }) => <details key={check.id}>
                          <summary>{check.id.startsWith('c') ? '変更条件' : '保持条件'} {Number(check.id.slice(1)) + 1}：{({ yes: '反映と推定', no: '不足を検出', uncertain: '未確認' } as Record<string, string>)[check.status] ?? '未確認'}</summary>
                          <p>編集前：{check.before}</p><p>編集後：{check.after}</p><p>根拠：{check.evidence}</p>
                        </details>)}
                        <p>{message.metadata.imageAssessment.reason}</p>
                      </div>}
                      {message.metadata?.images?.map((photo: { id: string; name: string }) =>
                        <ChatPhoto key={photo.id} id={photo.id} name={photo.name} accountId={accountId}
                          disabled={isLoading || isUploading || isPasting || authLoading}
                          onEdit={() => { setEditTarget({ id: photo.id, name: photo.name }); setChatError(''); }} />)}
                      {message.metadata?.task && <details className="mt-2 text-xs">
                        <summary>実行記録（{message.metadata.task.status}）</summary>
                        {message.metadata.task.steps?.map((step: { tool: string; status: string; error?: string }, index: number) =>
                          <p key={index}>{step.tool}: {step.status}{step.error ? ' / ' + step.error : ''}</p>)}
                      </details>}
                      {message.metadata?.task?.steps?.map((step: { tool: string; result?: { sourceUrl?: string; roadUrl?: string } }, index: number) =>
                        step.result?.sourceUrl && /^https:\/\//.test(step.result.sourceUrl) ? <a key={index} href={step.result.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-blue-700 underline">{step.tool}の出典を開く</a> : null)}
                      {message.metadata?.task?.steps?.flatMap((step: { result?: { sources?: Array<{ title: string; url: string }> } }) => step.result?.sources ?? []).map((source: { title: string; url: string }, index: number) =>
                        /^https:\/\//.test(source.url) ? <a key={index} href={source.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-blue-700 underline">検索の出典: {source.title}</a> : null)}
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

          <AZPersonalReminderObserver key={"reminder-" + accountId} accountId={accountId} onError={setReminderError} />

          {editTarget && <div className="flex items-center gap-3 rounded-lg border bg-white p-2 text-sm" aria-label="画像の編集対象">
            <ChatPhoto id={editTarget.id} name={editTarget.name} accountId={accountId} />
            <span>この画像を編集します。変更したい内容を入力してください。</span>
            <button type="button" disabled={isLoading} onClick={() => setEditTarget(null)} className="underline">選択を解除</button>
          </div>}
          {attachments.length > 0 && <div className="flex flex-wrap gap-2" aria-label="添付資料">
            {attachments.map(item => <span key={item.file} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1 text-sm">
              {item.type === "image" && <ChatPhoto id={item.file} name={item.name} accountId={accountId} />}
              <span>{item.name}</span>
              <button type="button" aria-label={item.name + "の添付を外す"} disabled={isLoading || isUploading || isPasting}
                onClick={() => setAttachments(current => current.filter(file => file.file !== item.file))}>×</button>
            </span>)}
          </div>}
          {fileError && <p role="alert" className="text-red-700">{fileError}</p>}
          {chatError && <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 whitespace-pre-wrap">{chatError}</p>}
          {(authLoading || historyAccount !== accountId) && <p role="status" className="text-sm">アカウントを読み込んでいます...</p>}
          {isLoading && <p role="status" className="text-sm">AZが応答を作成しています...</p>}
          {isPasting && <p role="status" className="text-sm">画像を貼り付けています...</p>}
          {isUploading && <p role="status" className="text-sm">資料を添付しています...</p>}
          <div className="flex items-center gap-2">
            <input ref={attachmentInput} type="file" accept=".xlsx,.pdf,.jpg,.jpeg,.png,.webp" className="hidden" tabIndex={-1}
              aria-label="添付する資料または写真"
              onChange={event => {
                const file = event.target.files?.[0]; event.target.value = '';
                if (file) void uploadFile(file);
              }} />
            <Button type="button" variant="outline" aria-label="資料・写真を添付" title="写真（JPG / PNG / WebP、5MBまで）・Excel / PDF（10MBまで）"
              className="h-10 w-10 shrink-0 p-0 text-2xl"
              disabled={isLoading || isUploading || isPasting || authLoading || historyAccount !== accountId}
              onClick={() => attachmentInput.current?.click()}>＋</Button>
            <AZApprovalNotice key={"approval-" + accountId} />
            <Input
              value={input}
              aria-label="AZへのメッセージ"
              onPaste={event => { void handleImagePaste(event); }}
              title="画像はコピーしてCtrl＋Vでも添付できます"
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
                  event.preventDefault(); void handleSendMessage();
                }
              }}
              placeholder={isAppBuilder ? "作りたいアプリ・ソフトの機能や使い方を入力..." : "AZへの依頼を入力..."}
              disabled={isLoading}
              className="min-w-0 flex-1 border-cyan-300 focus:border-cyan-500"
            />
            <Button type="button"
              onClick={() => void handleSendMessage()}
              disabled={isLoading || isUploading || isPasting || authLoading || historyAccount !== accountId || (!input.trim() && !attachments.some(item => item.type === "image"))}
              className="px-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {isLoading ? <Spinner className="w-4 h-4" /> : "送信"}
            </Button>
          </div>

      </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={open => { setSettingsOpen(open); if (!open) setShowAuxiliaryTools(false); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>設定・ツール</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">通常の操作はチャットから依頼できます。ここでは一覧の確認、通知の許可、コード変更案の承認、補助ツールを利用できます。</p>
          {reminderError && <p role="alert" className="text-sm text-red-700">通知: {reminderError}</p>}
          <AZPersonalTasksPanel key={"personal-" + accountId} accountId={accountId} notifications={false} />
          <AZEvolutionPanel key={"review-" + accountId} reviewOnly />
        <details className="rounded-lg border bg-white p-3" onToggle={event => setShowAuxiliaryTools(event.currentTarget.open)}>
          <summary className="cursor-pointer text-sm text-gray-600">補助ツール（従来の分析・コード生成）</summary>
          <div className="mt-3 space-y-4">
          {showAuxiliaryTools && <AZEvolutionPanel key={accountId} />}
          <section className="flex flex-col gap-4">
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
          </section>
          <section className="flex flex-col gap-4">
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
          </section>
          </div>
        </details>
        </DialogContent>
      </Dialog>

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



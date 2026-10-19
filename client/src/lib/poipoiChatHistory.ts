export interface SavedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  type?: "text" | "code" | "evolution" | "program";
}

export interface SavedConversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: SavedMessage[];
}

const STORAGE_KEY = "poipoi_chat_history_v1";

export function loadConversations(): SavedConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: SavedConversation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function createConversation(): SavedConversation {
  return {
    id: `conversation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: "新しいチャット",
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

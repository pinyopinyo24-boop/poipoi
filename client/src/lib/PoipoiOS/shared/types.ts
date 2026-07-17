/**
 * PoipoiOS Shared Types
 * 共通型定義
 */

export interface AppState {
  errorCount: number;
  successCount: number;
  lastError?: string;
}

export interface Message {
  id: string;
  content: string;
  timestamp: string;
  sender: string;
}

export interface Task {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  priority: number;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

export interface Engine {
  id: string;
  name: string;
  version: string;
  status: "idle" | "running" | "error";
}

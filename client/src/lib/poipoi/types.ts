/**
 * Common Type Definitions for PoiPoi AI
 */

// Evolution Engine Types
export interface AppState {
  errorCount: number;
  messageCount: number;
  performanceScore: number;
}

export interface Proposal {
  type: "fix" | "optimize" | "feature" | "none";
  target?: string;
  message: string;
  action?: string;
}

export interface EvolutionStats {
  successful: number;
  failed: number;
  successRate: number;
  total: number;
}

// Memory Engine Types
export interface Memory {
  category: string;
  key: string;
  value: any;
  createdAt: string;
  accessCount: number;
  lastAccess: string | null;
}

export interface MemoryStats {
  total: number;
  categories: string[];
  categoryCount: number;
  avgAccess: number;
  usagePercent: number;
}

// Learning Engine Types
export interface LearningRecord {
  id: number;
  date: string;
  success: boolean;
  data?: any;
}

export interface LearningStats {
  total: number;
  success: number;
  fail: number;
  successRate: number;
}

// AI Manager Types
export interface AIProvider {
  id: string;
  name: string;
  chat: (message: string) => Promise<string>;
}

// Code Generator Types
export interface GeneratedCode {
  code: string;
  language: string;
  timestamp: string;
}

// Test Engine Types
export interface TestResult {
  name: string;
  status: "PASS" | "FAIL";
  time: number;
  date: string;
  error?: string;
}

// Security Engine Types
export interface SecurityIssue {
  level: "HIGH" | "MEDIUM" | "LOW";
  message: string;
}

export interface ScanResult {
  safe: boolean;
  issues?: SecurityIssue[];
}

// Plugin Manager Types
export interface Plugin {
  id: string;
  name: string;
  version?: string;
  description?: string;
  execute?: (...args: any[]) => any;
  enabled?: boolean;
  installedAt?: string;
}

// Logger Types
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

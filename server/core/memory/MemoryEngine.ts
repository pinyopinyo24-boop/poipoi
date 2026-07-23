import { v4 as uuidv4 } from 'uuid';

interface MemoryEntry {
  value: any;
  timestamp: number;
  expiresAt?: number;
  refreshOnAccess?: boolean;
}

interface UserMemory {
  [key: string]: MemoryEntry;
}

export class MemoryEngine {
  private static instance: MemoryEngine;
  private memory: Map<string, UserMemory>; // userId -> { key -> MemoryEntry }

  private constructor() {
    this.memory = new Map<string, UserMemory>();
  }

  public static getInstance(): MemoryEngine {
    if (!MemoryEngine.instance) {
      MemoryEngine.instance = new MemoryEngine();
    }
    return MemoryEngine.instance;
  }

  public setMemory(userId: string, key: string, value: any, expirationMs?: number, refreshOnAccess: boolean = false): void {
    const expiresAt = expirationMs ? Date.now() + expirationMs : undefined;
    const entry: MemoryEntry = {
      value: JSON.parse(JSON.stringify(value)), // Deep copy to prevent external modification
      timestamp: Date.now(),
      expiresAt,
      refreshOnAccess,
    };

    if (!this.memory.has(userId)) {
      this.memory.set(userId, {});
    }
    this.memory.get(userId)![key] = entry;
  }

  public getMemory<T>(userId: string, key: string): T | undefined {
    const userMemory = this.memory.get(userId);
    if (!userMemory) {
      return undefined;
    }

    const entry = userMemory[key];
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      // Memory expired, delete it
      delete userMemory[key];
      return undefined;
    }

    if (entry.refreshOnAccess && entry.expiresAt) {
      // Refresh expiration on access
      entry.expiresAt = Date.now() + (entry.expiresAt - entry.timestamp);
      entry.timestamp = Date.now();
    }

    return JSON.parse(JSON.stringify(entry.value)) as T; // Return deep copy
  }

  public deleteMemory(userId: string, key: string): void {
    const userMemory = this.memory.get(userId);
    if (userMemory) {
      delete userMemory[key];
    }
  }

  public clearUserMemory(userId: string): void {
    this.memory.delete(userId);
  }

  public clearAllMemory(): void {
    this.memory.clear();
  }
}

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
  private lastExpirationSweepAt = 0;
  private readonly expirationSweepIntervalMs = 30_000;

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
    const now = Date.now();
    this.sweepExpiredEntries(now);
    const expiresAt = expirationMs ? now + expirationMs : undefined;
    const entry: MemoryEntry = {
      value: JSON.parse(JSON.stringify(value)), // Deep copy to prevent external modification
      timestamp: now,
      expiresAt,
      refreshOnAccess,
    };

    if (!this.memory.has(userId)) {
      this.memory.set(userId, {});
    }
    this.memory.get(userId)![key] = entry;
  }

  public getMemory<T>(userId: string, key: string): T | undefined {
    const now = Date.now();
    this.sweepExpiredEntries(now);
    const userMemory = this.memory.get(userId);
    if (!userMemory) {
      return undefined;
    }

    const entry = userMemory[key];
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt && now > entry.expiresAt) {
      // Memory expired, delete it
      delete userMemory[key];
      if (Object.keys(userMemory).length === 0) this.memory.delete(userId);
      return undefined;
    }

    if (entry.refreshOnAccess && entry.expiresAt) {
      // Refresh expiration on access
      entry.expiresAt = now + (entry.expiresAt - entry.timestamp);
      entry.timestamp = now;
    }

    return JSON.parse(JSON.stringify(entry.value)) as T; // Return deep copy
  }

  public deleteMemory(userId: string, key: string): void {
    const userMemory = this.memory.get(userId);
    if (userMemory) {
      delete userMemory[key];
      if (Object.keys(userMemory).length === 0) this.memory.delete(userId);
    }
  }

  public clearUserMemory(userId: string): void {
    this.memory.delete(userId);
  }

  public getMemoryUsage(userId: string): number {
    this.sweepExpiredEntries(Date.now());
    const userMemory = this.memory.get(userId);
    return userMemory ? Object.keys(userMemory).length : 0;
  }

  public clearAllMemory(): void {
    this.memory.clear();
    this.lastExpirationSweepAt = 0;
  }

  private sweepExpiredEntries(now: number): void {
    if (now - this.lastExpirationSweepAt < this.expirationSweepIntervalMs) return;
    this.lastExpirationSweepAt = now;

    for (const [userId, userMemory] of this.memory) {
      for (const [key, entry] of Object.entries(userMemory)) {
        if (entry.expiresAt !== undefined && now > entry.expiresAt) {
          delete userMemory[key];
        }
      }
      if (Object.keys(userMemory).length === 0) {
        this.memory.delete(userId);
      }
    }
  }
}

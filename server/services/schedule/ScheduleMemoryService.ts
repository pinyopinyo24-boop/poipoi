<<<<<<< HEAD
export interface ScheduleMemoryItem {
  id: string;
  title: string;
  date: string;
  time?: string;
  reminder?: string;
  createdAt: string;
}

class ScheduleMemoryService {
  private schedules: ScheduleMemoryItem[] = [];

  addSchedule(
    item: Omit<ScheduleMemoryItem, "id" | "createdAt">
  ): ScheduleMemoryItem {
    const schedule: ScheduleMemoryItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    this.schedules.push(schedule);
    return schedule;
  }

  getSchedules(): ScheduleMemoryItem[] {
    return this.schedules;
  }

  deleteSchedule(id: string): boolean {
    const before = this.schedules.length;

    this.schedules = this.schedules.filter(
      (item) => item.id !== id
    );

    return before !== this.schedules.length;
  }
}

export const scheduleMemoryService =
  new ScheduleMemoryService();
=======
/**
 * Schedule Memory Service
 * Manages user schedules and AI memory for schedule-related tasks
 */

import { v4 as uuidv4 } from "uuid";

export interface Schedule {
  id: string;
  userId: number;
  title: string;
  description?: string;
  scheduledDate: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  category?: string;
  tags?: string[];
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleMemory {
  id: string;
  userId: number;
  memoryType: "pattern" | "preference" | "insight" | "suggestion";
  content: string;
  relatedScheduleIds?: string[];
  confidence: number; // 0.0 - 1.0
  tags?: string[];
  usageCount: number;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleContext {
  userId: number;
  schedules: Schedule[];
  memories: ScheduleMemory[];
  today: string;
}

export class ScheduleMemoryService {
  private schedules: Map<string, Schedule> = new Map();
  private memories: Map<string, ScheduleMemory> = new Map();

  /**
   * Add a new schedule
   */
  addSchedule(userId: number, schedule: Omit<Schedule, "id" | "createdAt" | "updatedAt">): Schedule {
    const id = uuidv4();
    const now = new Date();
    const newSchedule: Schedule = {
      ...schedule,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.schedules.set(id, newSchedule);
    return newSchedule;
  }

  /**
   * Get schedules for a user on a specific date
   */
  getSchedulesByDate(userId: number, date: string): Schedule[] {
    return Array.from(this.schedules.values()).filter(
      (s) => s.userId === userId && s.scheduledDate === date
    );
  }

  /**
   * Get all schedules for a user
   */
  getUserSchedules(userId: number): Schedule[] {
    return Array.from(this.schedules.values()).filter((s) => s.userId === userId);
  }

  /**
   * Get today's schedules
   */
  getTodaySchedules(userId: number): Schedule[] {
    const today = new Date().toISOString().split("T")[0];
    return this.getSchedulesByDate(userId, today);
  }

  /**
   * Get upcoming schedules (next 7 days)
   */
  getUpcomingSchedules(userId: number): Schedule[] {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startDate = today.toISOString().split("T")[0];
    const endDate = nextWeek.toISOString().split("T")[0];

    return Array.from(this.schedules.values()).filter(
      (s) =>
        s.userId === userId &&
        s.scheduledDate >= startDate &&
        s.scheduledDate <= endDate
    );
  }

  /**
   * Update a schedule
   */
  updateSchedule(id: string, updates: Partial<Schedule>): Schedule | null {
    const schedule = this.schedules.get(id);
    if (!schedule) return null;

    const updated: Schedule = {
      ...schedule,
      ...updates,
      updatedAt: new Date(),
    };

    this.schedules.set(id, updated);
    return updated;
  }

  /**
   * Delete a schedule
   */
  deleteSchedule(id: string): boolean {
    return this.schedules.delete(id);
  }

  /**
   * Add memory entry
   */
  addMemory(
    userId: number,
    memoryType: "pattern" | "preference" | "insight" | "suggestion",
    content: string,
    relatedScheduleIds?: string[]
  ): ScheduleMemory {
    const id = uuidv4();
    const now = new Date();
    const memory: ScheduleMemory = {
      id,
      userId,
      memoryType,
      content,
      relatedScheduleIds,
      confidence: 0.5,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.memories.set(id, memory);
    return memory;
  }

  /**
   * Get memories for a user
   */
  getUserMemories(userId: number, memoryType?: string): ScheduleMemory[] {
    return Array.from(this.memories.values()).filter(
      (m) => m.userId === userId && (!memoryType || m.memoryType === memoryType)
    );
  }

  /**
   * Get high-confidence patterns
   */
  getPatterns(userId: number): ScheduleMemory[] {
    return this.getUserMemories(userId, "pattern").filter((m) => m.confidence >= 0.7);
  }

  /**
   * Update memory confidence
   */
  updateMemoryConfidence(id: string, confidence: number): ScheduleMemory | null {
    const memory = this.memories.get(id);
    if (!memory) return null;

    memory.confidence = Math.max(0, Math.min(1, confidence));
    memory.usageCount++;
    memory.lastUsed = new Date();
    memory.updatedAt = new Date();

    this.memories.set(id, memory);
    return memory;
  }

  /**
   * Get schedule context for AI
   */
  getScheduleContext(userId: number): ScheduleContext {
    return {
      userId,
      schedules: this.getUserSchedules(userId),
      memories: this.getUserMemories(userId),
      today: new Date().toISOString().split("T")[0],
    };
  }

  /**
   * Get summary of today's schedule
   */
  getTodaySummary(userId: number): string {
    const todaySchedules = this.getTodaySchedules(userId);

    if (todaySchedules.length === 0) {
      return "現在登録されている予定はありません";
    }

    const sorted = todaySchedules.sort((a, b) => {
      const aTime = a.startTime || "23:59";
      const bTime = b.startTime || "23:59";
      return aTime.localeCompare(bTime);
    });

    const summary = sorted
      .map((s) => {
        const time = s.startTime ? `${s.startTime}` : "時間未設定";
        const priority = s.priority === "urgent" ? "【緊急】" : "";
        return `${time} ${priority}${s.title}`;
      })
      .join("\n");

    return `今日の予定:\n${summary}`;
  }

  /**
   * Get summary of upcoming schedules
   */
  getUpcomingSummary(userId: number): string {
    const upcoming = this.getUpcomingSchedules(userId);

    if (upcoming.length === 0) {
      return "今後7日間に登録されている予定はありません";
    }

    const grouped: Record<string, Schedule[]> = {};
    upcoming.forEach((s) => {
      if (!grouped[s.scheduledDate]) {
        grouped[s.scheduledDate] = [];
      }
      grouped[s.scheduledDate].push(s);
    });

    const summary = Object.entries(grouped)
      .map(([date, schedules]) => {
        const items = schedules
          .map((s) => `  ${s.startTime || "時間未設定"} ${s.title}`)
          .join("\n");
        return `${date}:\n${items}`;
      })
      .join("\n");

    return `今後7日間の予定:\n${summary}`;
  }

  /**
   * Analyze schedule patterns
   */
  analyzePatterns(userId: number): string {
    const schedules = this.getUserSchedules(userId);

    if (schedules.length === 0) {
      return "予定データがないため、パターン分析ができません";
    }

    const categories: Record<string, number> = {};
    const priorities: Record<string, number> = {};

    schedules.forEach((s) => {
      if (s.category) {
        categories[s.category] = (categories[s.category] || 0) + 1;
      }
      priorities[s.priority] = (priorities[s.priority] || 0) + 1;
    });

    let analysis = "予定パターン分析:\n";
    analysis += `総予定数: ${schedules.length}\n`;

    if (Object.keys(categories).length > 0) {
      analysis += "カテゴリ別:\n";
      Object.entries(categories).forEach(([cat, count]) => {
        analysis += `  ${cat}: ${count}件\n`;
      });
    }

    analysis += "優先度別:\n";
    Object.entries(priorities).forEach(([priority, count]) => {
      analysis += `  ${priority}: ${count}件\n`;
    });

    return analysis;
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.schedules.clear();
    this.memories.clear();
  }
}

// Singleton instance
export const scheduleMemoryService = new ScheduleMemoryService();
>>>>>>> phase13-18

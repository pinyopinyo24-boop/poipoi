/**
 * Schedule Database Helpers
 * Query helpers for schedule management
 */

import { getDb } from "./db";
import { schedules, scheduleMemories } from "../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface ScheduleInput {
  title: string;
  description?: string;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "pending" | "in-progress" | "completed" | "cancelled";
  category?: string;
  tags?: string[];
  location?: string;
}

export interface ScheduleMemoryInput {
  memoryType: "pattern" | "preference" | "insight" | "suggestion";
  content: string;
  relatedScheduleIds?: string[];
  confidence?: number;
  tags?: string[];
}

/**
 * Add a new schedule
 */
export async function addSchedule(userId: number, input: ScheduleInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = uuidv4();
  await db.insert(schedules).values({
    id,
    userId,
    title: input.title,
    description: input.description,
    scheduledDate: input.scheduledDate as any,
    startTime: input.startTime,
    endTime: input.endTime,
    priority: input.priority || "medium",
    status: input.status || "pending",
    category: input.category,
    tags: input.tags ? JSON.stringify(input.tags) : null,
    location: input.location,
  });
  return { id, ...input };
}

/**
 * Get schedules by user and date
 */
export async function getSchedulesByDate(userId: number, date: string) {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.userId, userId), eq(schedules.scheduledDate, date as any)));
  return results;
}

/**
 * Get today's schedules
 */
export async function getTodaySchedules(userId: number) {
  const today = new Date().toISOString().split("T")[0];
  return getSchedulesByDate(userId, today);
}

/**
 * Get upcoming schedules (next 7 days)
 */
export async function getUpcomingSchedules(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const todayStr = today.toISOString().split("T")[0];
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  const results = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.userId, userId),
        gte(schedules.scheduledDate, todayStr as any),
        lte(schedules.scheduledDate, nextWeekStr as any)
      )
    );
  return results;
}

/**
 * Get all schedules for user
 */
export async function getUserSchedules(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(schedules)
    .where(eq(schedules.userId, userId));
  return results;
}

/**
 * Update schedule
 */
export async function updateSchedule(userId: number, id: string, updates: Partial<ScheduleInput>) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .update(schedules)
    .set({
      ...updates,
      tags: updates.tags ? JSON.stringify(updates.tags) : undefined,
    } as any)
    .where(and(eq(schedules.id, id), eq(schedules.userId, userId)));
  return result;
}

/**
 * Delete schedule
 */
export async function deleteSchedule(userId: number, id: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .delete(schedules)
    .where(and(eq(schedules.id, id), eq(schedules.userId, userId)));
  return result;
}

/**
 * Add schedule memory
 */
export async function addScheduleMemory(
  userId: number,
  input: ScheduleMemoryInput
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const id = uuidv4();
  await db.insert(scheduleMemories).values({
    id,
    userId,
    memoryType: input.memoryType,
    content: input.content,
    relatedScheduleIds: input.relatedScheduleIds ? JSON.stringify(input.relatedScheduleIds) : null,
    confidence: input.confidence || 0.5,
    tags: input.tags ? JSON.stringify(input.tags) : null,
  } as any);
  return { id, ...input };
}

/**
 * Get schedule memories
 */
export async function getScheduleMemories(userId: number, memoryType?: string) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(scheduleMemories).where(eq(scheduleMemories.userId, userId)) as any;

  if (memoryType) {
    query = query.where(eq(scheduleMemories.memoryType, memoryType as any));
  }

  const results = await query;
  return results as any[];
}

/**
 * Update memory confidence
 */
export async function updateMemoryConfidence(userId: number, id: string, confidence: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .update(scheduleMemories)
    .set({ confidence: confidence.toString() as any })
    .where(and(eq(scheduleMemories.id, id), eq(scheduleMemories.userId, userId)));
  return result;
}

/**
 * Get schedule summary for today
 */
export async function getTodaySummary(userId: number): Promise<string> {
  const todaySchedules = await getTodaySchedules(userId);

  if (todaySchedules.length === 0) {
    return "現在登録されている予定はありません";
  }

  const summary = todaySchedules
    .map((s: any) => {
      const time = s.startTime ? `${s.startTime}` : "時間未設定";
      const priority = s.priority === "urgent" ? "🔴" : s.priority === "high" ? "🟠" : "";
      return `${priority} ${time} ${s.title}`;
    })
    .join("\n");

  return `今日の予定:\n${summary}`;
}

/**
 * Get upcoming summary
 */
export async function getUpcomingSummary(userId: number): Promise<string> {
  const upcomingSchedules = await getUpcomingSchedules(userId);

  if (upcomingSchedules.length === 0) {
    return "今後7日間に登録されている予定はありません";
  }

  const grouped = upcomingSchedules.reduce(
    (acc: Record<string, typeof upcomingSchedules>, s: any) => {
      if (!acc[s.scheduledDate]) {
        acc[s.scheduledDate] = [];
      }
      acc[s.scheduledDate].push(s);
      return acc;
    },
    {} as Record<string, typeof upcomingSchedules>
  );

  const summary = Object.entries(grouped)
    .map(([date, items]: [string, any]) => {
      const dateStr = new Date(date).toLocaleDateString("ja-JP");
      const itemsStr = items.map((s: any) => `  - ${s.startTime || "時間未設定"} ${s.title}`).join("\n");
      return `${dateStr}:\n${itemsStr}`;
    })
    .join("\n");

  return `今後の予定:\n${summary}`;
}

/**
 * Analyze schedule patterns
 */
export async function analyzeSchedulePatterns(userId: number): Promise<string> {
  const allSchedules = await getUserSchedules(userId);

  if (allSchedules.length === 0) {
    return "分析対象の予定がありません";
  }

  const categories = allSchedules.reduce(
    (acc: Record<string, number>, s: any) => {
      const cat = s.category || "未分類";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const priorities = allSchedules.reduce(
    (acc: Record<string, number>, s: any) => {
      acc[s.priority] = (acc[s.priority] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const analysis = [
    `総予定数: ${allSchedules.length}件`,
    `カテゴリ分布: ${Object.entries(categories)
      .map(([cat, count]) => `${cat}(${count}件)`)
      .join(", ")}`,
    `優先度分布: ${Object.entries(priorities)
      .map(([pri, count]) => `${pri}(${count}件)`)
      .join(", ")}`,
  ].join("\n");

  return `予定分析:\n${analysis}`;
}

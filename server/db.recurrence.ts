import { getDb } from "./db";
import { recurrenceRules, reminders, notificationHistory, notificationChannels } from "../drizzle/schema";
import { eq, and, lte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Recurrence Rules Management
 */

export async function addRecurrenceRule(
  userId: number,
  scheduleId: string,
  frequency: "daily" | "weekly" | "monthly" | "yearly",
  startDate: Date,
  options?: {
    interval?: number;
    daysOfWeek?: number[];
    daysOfMonth?: number[];
    monthsOfYear?: number[];
    endDate?: Date;
    occurrences?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = uuidv4();
  await db.insert(recurrenceRules).values({
    id,
    userId,
    scheduleId,
    frequency,
    interval: options?.interval || 1,
    daysOfWeek: options?.daysOfWeek ? JSON.stringify(options.daysOfWeek) : null,
    daysOfMonth: options?.daysOfMonth ? JSON.stringify(options.daysOfMonth) : null,
    monthsOfYear: options?.monthsOfYear ? JSON.stringify(options.monthsOfYear) : null,
    startDate,
    endDate: options?.endDate || null,
    occurrences: options?.occurrences || null,
  });
  return { id };
}

export async function getRecurrenceRule(userId: number, scheduleId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(recurrenceRules)
    .where(and(eq(recurrenceRules.userId, userId), eq(recurrenceRules.scheduleId, scheduleId)))
    .limit(1);
}

export async function updateRecurrenceRule(
  userId: number,
  ruleId: string,
  updates: Partial<typeof recurrenceRules.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(recurrenceRules)
    .set(updates)
    .where(and(eq(recurrenceRules.userId, userId), eq(recurrenceRules.id, ruleId)));
}

export async function deleteRecurrenceRule(userId: number, ruleId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .delete(recurrenceRules)
    .where(and(eq(recurrenceRules.userId, userId), eq(recurrenceRules.id, ruleId)));
}

export async function getActiveRecurrenceRules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(recurrenceRules)
    .where(and(eq(recurrenceRules.userId, userId), eq(recurrenceRules.isActive, true)));
}

/**
 * Reminders Management
 */

export async function addReminder(
  userId: number,
  scheduleId: string,
  reminderTime?: string,
  frequency: "once" | "daily" | "weekly" | "monthly" = "once"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = uuidv4();
  const now = new Date();
  const nextSendAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await db.insert(reminders).values({
    id,
    userId,
    scheduleId,
    reminderTime: reminderTime || null,
    frequency,
    isActive: true,
    nextSendAt,
  });
  return { id };
}

export async function getReminder(userId: number, reminderId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), eq(reminders.id, reminderId)))
    .limit(1);
}

export async function updateReminder(
  userId: number,
  reminderId: string,
  updates: Partial<typeof reminders.$inferInsert>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(reminders)
    .set(updates)
    .where(and(eq(reminders.userId, userId), eq(reminders.id, reminderId)));
}

export async function deleteReminder(userId: number, reminderId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .delete(reminders)
    .where(and(eq(reminders.userId, userId), eq(reminders.id, reminderId)));
}

export async function getActiveReminders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.userId, userId), eq(reminders.isActive, true)));
}

export async function getPendingReminders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return await db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        eq(reminders.isActive, true),
        lte(reminders.nextSendAt, now)
      )
    );
}

export async function updateReminderSentTime(userId: number, reminderId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  return await db
    .update(reminders)
    .set({
      lastSentAt: now,
      nextSendAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    })
    .where(and(eq(reminders.userId, userId), eq(reminders.id, reminderId)));
}

/**
 * Notification History Management
 */

export async function addNotificationHistory(
  userId: number,
  scheduleId: string | null,
  channel: "push" | "email" | "sms",
  status: "sent" | "failed" | "bounced" = "sent",
  response?: any
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = uuidv4();
  await db.insert(notificationHistory).values({
    id,
    userId,
    scheduleId,
    channel,
    status,
    response: response ? JSON.stringify(response) : null,
  });
  return { id };
}

export async function getNotificationHistory(userId: number, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(notificationHistory)
    .where(eq(notificationHistory.userId, userId))
    .limit(limit)
    .offset(offset);
}

export async function getNotificationHistoryBySchedule(userId: number, scheduleId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(notificationHistory)
    .where(and(eq(notificationHistory.userId, userId), eq(notificationHistory.scheduleId, scheduleId)));
}

/**
 * Notification Channels Management (Device Management)
 */

export async function registerDevice(
  userId: number,
  deviceId: string,
  fcmToken: string,
  platform: "android" | "ios" | "web"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = uuidv4();
  await db.insert(notificationChannels).values({
    id,
    userId,
    deviceId,
    fcmToken,
    platform,
    isActive: true,
  });
  return { id };
}

export async function getDevice(userId: number, deviceId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(notificationChannels)
    .where(and(eq(notificationChannels.userId, userId), eq(notificationChannels.deviceId, deviceId)))
    .limit(1);
}

export async function updateDevice(
  userId: number,
  deviceId: string,
  fcmToken: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .update(notificationChannels)
    .set({ fcmToken, lastUpdatedAt: new Date() })
    .where(and(eq(notificationChannels.userId, userId), eq(notificationChannels.deviceId, deviceId)));
}

export async function unregisterDevice(userId: number, deviceId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .delete(notificationChannels)
    .where(and(eq(notificationChannels.userId, userId), eq(notificationChannels.deviceId, deviceId)));
}

export async function getActiveDevices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(notificationChannels)
    .where(and(eq(notificationChannels.userId, userId), eq(notificationChannels.isActive, true)));
}

export async function getDevicesByPlatform(userId: number, platform: "android" | "ios" | "web") {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(notificationChannels)
    .where(
      and(
        eq(notificationChannels.userId, userId),
        eq(notificationChannels.platform, platform),
        eq(notificationChannels.isActive, true)
      )
    );
}

/**
 * Recurrence Occurrence Generation
 */

export function generateNextOccurrence(
  startDate: Date,
  frequency: "daily" | "weekly" | "monthly" | "yearly",
  interval: number = 1
): Date {
  const next = new Date(startDate);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + interval);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7 * interval);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + interval);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  return next;
}

export function generateOccurrences(
  startDate: Date,
  frequency: "daily" | "weekly" | "monthly" | "yearly",
  interval: number = 1,
  endDate?: Date,
  maxOccurrences?: number
): Date[] {
  const occurrences: Date[] = [];
  let current = new Date(startDate);
  let count = 0;

  while ((!endDate || current <= endDate) && (!maxOccurrences || count < maxOccurrences)) {
    occurrences.push(new Date(current));
    current = generateNextOccurrence(current, frequency, interval);
    count++;
  }

  return occurrences;
}

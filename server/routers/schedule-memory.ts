/**
 * Schedule Memory Router
 * tRPC procedures for schedule management and AI memory
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as scheduleDb from "../db.schedule";
import * as recurrenceDb from "../db.recurrence";
import { AIPriorityAssistant } from "../services/ai/AIPriorityAssistant";
import { AndroidNotificationService } from "../services/notification/AndroidNotificationService";

export const scheduleMemoryRouter = router({
  /**
   * Add a new schedule
   */
  addSchedule: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        status: z.enum(["pending", "in-progress", "completed", "cancelled"]).default("pending"),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return scheduleDb.addSchedule(ctx.user.id, input);
    }),

  /**
   * Get today's schedules
   */
  getToday: protectedProcedure.query(async ({ ctx }) => {
    const schedules = await scheduleDb.getTodaySchedules(ctx.user.id);
    const summary = await scheduleDb.getTodaySummary(ctx.user.id);
    return {
      schedules,
      summary,
    };
  }),

  /**
   * Get schedules for a specific date
   */
  getByDate: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const schedules = await scheduleDb.getSchedulesByDate(ctx.user.id, input.date);
      return { schedules };
    }),

  /**
   * Get upcoming schedules (next 7 days)
   */
  getUpcoming: protectedProcedure.query(async ({ ctx }) => {
    const schedules = await scheduleDb.getUpcomingSchedules(ctx.user.id);
    const summary = await scheduleDb.getUpcomingSummary(ctx.user.id);
    return {
      schedules,
      summary,
    };
  }),

  /**
   * Get all schedules for user
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return scheduleDb.getUserSchedules(ctx.user.id);
  }),

  /**
   * Update a schedule
   */
  updateSchedule: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        scheduledDate: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        status: z.enum(["pending", "in-progress", "completed", "cancelled"]).optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return scheduleDb.updateSchedule(ctx.user.id, id, updates);
    }),

  /**
   * Delete a schedule
   */
  deleteSchedule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return scheduleDb.deleteSchedule(ctx.user.id, input.id);
    }),

  /**
   * Add schedule memory
   */
  addMemory: protectedProcedure
    .input(
      z.object({
        memoryType: z.enum(["pattern", "preference", "insight", "suggestion"]),
        content: z.string().min(1),
        relatedScheduleIds: z.array(z.string()).optional(),
        confidence: z.number().min(0).max(1).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return scheduleDb.addScheduleMemory(ctx.user.id, input);
    }),

  /**
   * Get schedule memories
   */
  getMemories: protectedProcedure
    .input(
      z.object({
        memoryType: z.enum(["pattern", "preference", "insight", "suggestion"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return scheduleDb.getScheduleMemories(ctx.user.id, input.memoryType);
    }),

  /**
   * Update memory confidence
   */
  updateMemoryConfidence: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        confidence: z.number().min(0).max(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return scheduleDb.updateMemoryConfidence(ctx.user.id, input.id, input.confidence);
    }),

  /**
   * Analyze schedule patterns
   */
  analyzePatterns: protectedProcedure.query(async ({ ctx }) => {
    const analysis = await scheduleDb.analyzeSchedulePatterns(ctx.user.id);
    return { analysis };
  }),

  /**
   * Process natural language schedule request
   * Recognizes: "今日の予定を整理して", "明日の予定は？", "予定を追加して"
   */
  processNaturalLanguage: protectedProcedure
    .input(z.object({ query: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const query = input.query.toLowerCase();

      // Check for "today's schedules"
      if (query.includes("今日") || query.includes("きょう")) {
        if (query.includes("予定") || query.includes("整理")) {
          const summary = await scheduleDb.getTodaySummary(ctx.user.id);
          return {
            type: "today",
            response: summary,
          };
        }
      }

      // Check for "tomorrow's schedules"
      if (query.includes("明日") || query.includes("あした")) {
        if (query.includes("予定") || query.includes("？")) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split("T")[0];
          const schedules = await scheduleDb.getSchedulesByDate(ctx.user.id, tomorrowStr);

          if (schedules.length === 0) {
            return {
              type: "tomorrow",
              response: "明日の予定は登録されていません",
            };
          }

          const summary = schedules
            .map((s: any) => `${s.startTime || "時間未設定"} ${s.title}`)
            .join("\n");

          return {
            type: "tomorrow",
            response: `明日の予定:\n${summary}`,
          };
        }
      }

      // Check for "add schedule"
      if (query.includes("予定") && (query.includes("追加") || query.includes("登録"))) {
        return {
          type: "add_schedule",
          response: "予定を追加するには、以下の情報を教えてください:\n- タイトル\n- 日付 (YYYY-MM-DD)\n- 時間 (HH:MM, オプション)\n- 優先度 (low/medium/high/urgent, オプション)",
        };
      }

      // Check for "analyze patterns"
      if (query.includes("分析") || query.includes("パターン")) {
        const analysis = await scheduleDb.analyzeSchedulePatterns(ctx.user.id);
        return {
          type: "analyze",
          response: analysis,
        };
      }

      // Check for "upcoming schedules"
      if (query.includes("今後") || query.includes("来週") || query.includes("週末")) {
        const summary = await scheduleDb.getUpcomingSummary(ctx.user.id);
        return {
          type: "upcoming",
          response: summary,
        };
      }

      // Default: return no schedules message
      return {
        type: "default",
        response: "現在登録されている予定はありません",
      };
    }),

  /**
   * Add recurrence rule for a schedule
   */
  addRecurrence: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
        interval: z.number().min(1).default(1),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        daysOfWeek: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startDate = new Date();
      const endDate = input.endDate ? new Date(input.endDate) : undefined;
      return recurrenceDb.addRecurrenceRule(
        ctx.user.id,
        input.scheduleId,
        input.frequency,
        startDate,
        {
          interval: input.interval,
          daysOfWeek: input.daysOfWeek,
          endDate,
        }
      );
    }),

  /**
   * Get recurrence rules for user
   */
  getRecurrences: protectedProcedure.query(async ({ ctx }) => {
    return recurrenceDb.getActiveRecurrenceRules(ctx.user.id);
  }),

  /**
   * Update recurrence rule
   */
  updateRecurrence: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
        interval: z.number().min(1).optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        daysOfWeek: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const updateObj: any = {};
      if (updates.frequency) updateObj.frequency = updates.frequency;
      if (updates.interval) updateObj.interval = updates.interval;
      if (updates.endDate) updateObj.endDate = new Date(updates.endDate);
      if (updates.daysOfWeek) updateObj.daysOfWeek = JSON.stringify(updates.daysOfWeek);
      return recurrenceDb.updateRecurrenceRule(ctx.user.id, id, updateObj);
    }),

  /**
   * Delete recurrence rule
   */
  deleteRecurrence: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return recurrenceDb.deleteRecurrenceRule(ctx.user.id, input.id);
    }),

  /**
   * Analyze schedule priorities using AI
   */
  analyzePriorities: protectedProcedure.query(async ({ ctx }) => {
    return AIPriorityAssistant.analyzePriorities(ctx.user.id);
  }),

  /**
   * Get priority recommendation for a specific schedule
   */
  getSchedulePriority: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        title: z.string(),
        description: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return AIPriorityAssistant.getSchedulePriorityRecommendation(
        ctx.user.id,
        input.scheduleId,
        input.title,
        input.description
      );
    }),

  /**
   * Get daily focus recommendation
   */
  getDailyFocus: protectedProcedure.query(async ({ ctx }) => {
    return AIPriorityAssistant.getDailyFocusRecommendation(ctx.user.id);
  }),

  /**
   * Get time management suggestions
   */
  getTimeManagementSuggestions: protectedProcedure.query(async ({ ctx }) => {
    return AIPriorityAssistant.getTimeManagementSuggestions(ctx.user.id);
  }),

  /**
   * Send reminder notification
   */
  sendReminder: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        title: z.string(),
        minutesBefore: z.number().default(15),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return AndroidNotificationService.sendReminderNotification(
        ctx.user.id,
        input.title,
        input.scheduleId,
        input.minutesBefore
      );
    }),

  /**
   * Register Android device for notifications
   */
  registerAndroidDevice: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        fcmToken: z.string(),
        platform: z.enum(["android", "ios", "web"]).default("android"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return recurrenceDb.registerDevice(
        ctx.user.id,
        input.deviceId,
        input.fcmToken,
        input.platform
      );
    }),

  /**
   * Get notification history
   */
  getNotificationHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return recurrenceDb.getNotificationHistory(ctx.user.id, input.limit);
    }),

  /**
   * Update notification settings
   */
  updateNotificationSettings: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        fcmToken: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return recurrenceDb.updateDevice(
        ctx.user.id,
        input.deviceId,
        input.fcmToken
      );
    }),
});

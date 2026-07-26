/**
 * Schedule Memory Router
 * tRPC procedures for schedule management and AI memory
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { scheduleMemoryService } from "../services/schedule/ScheduleMemoryService";

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
    .mutation(({ ctx, input }) => {
      return scheduleMemoryService.addSchedule(ctx.user.id, input as any);
    }),

  /**
   * Get today's schedules
   */
  getToday: protectedProcedure
    .query(({ ctx }) => {
      const schedules = scheduleMemoryService.getTodaySchedules(ctx.user.id);
      return {
        schedules,
        summary: scheduleMemoryService.getTodaySummary(ctx.user.id),
      };
    }),

  /**
   * Get schedules for a specific date
   */
  getByDate: protectedProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(({ ctx, input }) => {
      const schedules = scheduleMemoryService.getSchedulesByDate(ctx.user.id, input.date);
      if (schedules.length === 0) {
        return {
          schedules: [],
          message: `${input.date}に登録されている予定はありません`,
        };
      }
      return { schedules, message: null };
    }),

  /**
   * Get upcoming schedules (next 7 days)
   */
  getUpcoming: protectedProcedure
    .query(({ ctx }) => {
      const schedules = scheduleMemoryService.getUpcomingSchedules(ctx.user.id);
      return {
        schedules,
        summary: scheduleMemoryService.getUpcomingSummary(ctx.user.id),
      };
    }),

  /**
   * Get all schedules for the user
   */
  getAll: protectedProcedure
    .query(({ ctx }) => {
      return scheduleMemoryService.getUserSchedules(ctx.user.id);
    }),

  /**
   * Update a schedule
   */
  updateSchedule: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        updates: z.object({
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
        }),
      })
    )
    .mutation(({ input }) => {
      return scheduleMemoryService.updateSchedule(input.id, input.updates);
    }),

  /**
   * Delete a schedule
   */
  deleteSchedule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return scheduleMemoryService.deleteSchedule(input.id);
    }),

  /**
   * Mark schedule as completed
   */
  completeSchedule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return scheduleMemoryService.updateSchedule(input.id, { status: "completed" });
    }),

  /**
   * Get schedule context for AI
   */
  getContext: protectedProcedure
    .query(({ ctx }) => {
      return scheduleMemoryService.getScheduleContext(ctx.user.id);
    }),

  /**
   * Get today's summary
   */
  getTodaySummary: protectedProcedure
    .query(({ ctx }) => {
      return {
        summary: scheduleMemoryService.getTodaySummary(ctx.user.id),
      };
    }),

  /**
   * Get upcoming summary
   */
  getUpcomingSummary: protectedProcedure
    .query(({ ctx }) => {
      return {
        summary: scheduleMemoryService.getUpcomingSummary(ctx.user.id),
      };
    }),

  /**
   * Analyze schedule patterns
   */
  analyzePatterns: protectedProcedure
    .query(({ ctx }) => {
      return {
        analysis: scheduleMemoryService.analyzePatterns(ctx.user.id),
      };
    }),

  /**
   * Add memory entry
   */
  addMemory: protectedProcedure
    .input(
      z.object({
        memoryType: z.enum(["pattern", "preference", "insight", "suggestion"]),
        content: z.string(),
        relatedScheduleIds: z.array(z.string()).optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      return scheduleMemoryService.addMemory(
        ctx.user.id,
        input.memoryType,
        input.content,
        input.relatedScheduleIds
      );
    }),

  /**
   * Get memories
   */
  getMemories: protectedProcedure
    .input(z.object({ memoryType: z.string().optional() }))
    .query(({ ctx, input }) => {
      return scheduleMemoryService.getUserMemories(ctx.user.id, input.memoryType);
    }),

  /**
   * Get patterns
   */
  getPatterns: protectedProcedure
    .query(({ ctx }) => {
      return scheduleMemoryService.getPatterns(ctx.user.id);
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
    .mutation(({ input }) => {
      return scheduleMemoryService.updateMemoryConfidence(input.id, input.confidence);
    }),
});

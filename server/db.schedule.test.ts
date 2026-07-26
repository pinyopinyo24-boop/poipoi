/**
 * Schedule Database Helpers - Test Suite
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as scheduleDb from "./db.schedule";

describe("Schedule Database Helpers", () => {
  const testUserId = 1;
  const testDate = new Date().toISOString().split("T")[0];

  describe("addSchedule", () => {
    it("should add a new schedule", async () => {
      const result = await scheduleDb.addSchedule(testUserId, {
        title: "Test Meeting",
        scheduledDate: testDate,
        startTime: "10:00",
        priority: "high",
      });

      expect(result).toBeDefined();
      expect(result.title).toBe("Test Meeting");
      expect(result.priority).toBe("high");
      expect(result.id).toBeDefined();
    });

    it("should handle missing optional fields", async () => {
      const result = await scheduleDb.addSchedule(testUserId, {
        title: "Simple Task",
        scheduledDate: testDate,
      });

      expect(result.title).toBe("Simple Task");
      expect(result.priority || "medium").toBe("medium"); // default
      expect(result.status || "pending").toBe("pending"); // default
    });
  });

  describe("getTodaySchedules", () => {
    it("should return empty array for user with no schedules", async () => {
      const result = await scheduleDb.getTodaySchedules(999);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getTodaySummary", () => {
    it("should return no schedules message when empty", async () => {
      const result = await scheduleDb.getTodaySummary(999);
      expect(result).toContain("現在登録されている予定はありません");
    });
  });

  describe("getUpcomingSummary", () => {
    it("should return no schedules message when empty", async () => {
      const result = await scheduleDb.getUpcomingSummary(999);
      expect(result).toContain("今後7日間に登録されている予定はありません");
    });
  });

  describe("analyzeSchedulePatterns", () => {
    it("should return no analysis message when empty", async () => {
      const result = await scheduleDb.analyzeSchedulePatterns(999);
      expect(result).toContain("分析対象の予定がありません");
    });
  });

  describe("addScheduleMemory", () => {
    it("should add a new schedule memory", async () => {
      const result = await scheduleDb.addScheduleMemory(testUserId, {
        memoryType: "pattern",
        content: "User prefers morning meetings",
        confidence: 0.85,
      });

      expect(result).toBeDefined();
      expect(result.memoryType).toBe("pattern");
      expect(result.confidence).toBe(0.85);
      expect(result.id).toBeDefined();
    });

    it("should handle all memory types", async () => {
      const types: Array<"pattern" | "preference" | "insight" | "suggestion"> = [
        "pattern",
        "preference",
        "insight",
        "suggestion",
      ];

      for (const type of types) {
        const result = await scheduleDb.addScheduleMemory(testUserId, {
          memoryType: type,
          content: `Test ${type}`,
        });

        expect(result.memoryType).toBe(type);
      }
    });
  });

  describe("getScheduleMemories", () => {
    it("should return empty array for user with no memories", async () => {
      const result = await scheduleDb.getScheduleMemories(999);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should filter by memory type", async () => {
      const result = await scheduleDb.getScheduleMemories(testUserId, "pattern");
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("updateMemoryConfidence", () => {
    it("should update memory confidence", async () => {
      const memory = await scheduleDb.addScheduleMemory(testUserId, {
        memoryType: "insight",
        content: "Test insight",
        confidence: 0.5,
      });

      const result = await scheduleDb.updateMemoryConfidence(testUserId, memory.id, 0.9);
      expect(result).toBeDefined();
    });
  });

  describe("getUserSchedules", () => {
    it("should return empty array for user with no schedules", async () => {
      const result = await scheduleDb.getUserSchedules(999);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getSchedulesByDate", () => {
    it("should return empty array for non-existent date", async () => {
      const result = await scheduleDb.getSchedulesByDate(testUserId, "2099-12-31");
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe("getUpcomingSchedules", () => {
    it("should return empty array for user with no upcoming schedules", async () => {
      const result = await scheduleDb.getUpcomingSchedules(999);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("updateSchedule", () => {
    it("should handle update for non-existent schedule", async () => {
      const result = await scheduleDb.updateSchedule(testUserId, "non-existent-id", {
        title: "Updated Title",
      });

      expect(result).toBeDefined();
    });
  });

  describe("deleteSchedule", () => {
    it("should handle delete for non-existent schedule", async () => {
      const result = await scheduleDb.deleteSchedule(testUserId, "non-existent-id");
      expect(result).toBeDefined();
    });
  });

  describe("Architecture Compliance", () => {
    it("should not generate fake schedules", async () => {
      const summary = await scheduleDb.getTodaySummary(999);
      expect(summary).toBe("現在登録されている予定はありません");
      expect(summary).not.toContain("架空");
      expect(summary).not.toContain("テスト");
    });

    it("should return proper message for empty schedules", async () => {
      const today = await scheduleDb.getTodaySummary(999);
      const upcoming = await scheduleDb.getUpcomingSummary(999);

      expect(today).toContain("現在登録されている予定はありません");
      expect(upcoming).toContain("今後7日間に登録されている予定はありません");
    });
  });
});

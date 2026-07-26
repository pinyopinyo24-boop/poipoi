/**
 * Schedule AI Integration
 * Integrates Schedule Memory with AI chat for natural language schedule management
 */

import { scheduleMemoryService } from "./ScheduleMemoryService";

export interface ScheduleRequest {
  type: "get_today" | "get_tomorrow" | "get_upcoming" | "add_schedule" | "analyze" | "list_all";
  date?: string;
  title?: string;
  description?: string;
  priority?: string;
  time?: string;
  category?: string;
  userId: number;
}

export interface ScheduleResponse {
  success: boolean;
  message: string;
  data?: any;
  schedules?: any[];
}

export class ScheduleAIIntegration {
  /**
   * Process natural language schedule requests
   */
  static processRequest(request: ScheduleRequest): ScheduleResponse {
    try {
      switch (request.type) {
        case "get_today":
          return this.getTodaySchedules(request.userId);

        case "get_tomorrow":
          return this.getTomorrowSchedules(request.userId);

        case "get_upcoming":
          return this.getUpcomingSchedules(request.userId);

        case "add_schedule":
          return this.addSchedule(request);

        case "analyze":
          return this.analyzeSchedules(request.userId);

        case "list_all":
          return this.listAllSchedules(request.userId);

        default:
          return {
            success: false,
            message: "不明なリクエストタイプです",
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `エラーが発生しました: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get today's schedules
   */
  private static getTodaySchedules(userId: number): ScheduleResponse {
    const schedules = scheduleMemoryService.getTodaySchedules(userId);

    if (schedules.length === 0) {
      return {
        success: true,
        message: "現在登録されている予定はありません",
        schedules: [],
      };
    }

    return {
      success: true,
      message: scheduleMemoryService.getTodaySummary(userId),
      schedules,
    };
  }

  /**
   * Get tomorrow's schedules
   */
  private static getTomorrowSchedules(userId: number): ScheduleResponse {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const schedules = scheduleMemoryService.getSchedulesByDate(userId, tomorrowStr);

    if (schedules.length === 0) {
      return {
        success: true,
        message: `${tomorrowStr}に登録されている予定はありません`,
        schedules: [],
      };
    }

    const summary = schedules
      .map((s) => `${s.startTime || "時間未設定"} ${s.title}`)
      .join("\n");

    return {
      success: true,
      message: `明日の予定:\n${summary}`,
      schedules,
    };
  }

  /**
   * Get upcoming schedules (next 7 days)
   */
  private static getUpcomingSchedules(userId: number): ScheduleResponse {
    const schedules = scheduleMemoryService.getUpcomingSchedules(userId);

    if (schedules.length === 0) {
      return {
        success: true,
        message: "今後7日間に登録されている予定はありません",
        schedules: [],
      };
    }

    return {
      success: true,
      message: scheduleMemoryService.getUpcomingSummary(userId),
      schedules,
    };
  }

  /**
   * Add a new schedule
   */
  private static addSchedule(request: ScheduleRequest): ScheduleResponse {
    if (!request.title) {
      return {
        success: false,
        message: "予定のタイトルが必要です",
      };
    }

    if (!request.date) {
      return {
        success: false,
        message: "予定の日付が必要です",
      };
    }

    const schedule = scheduleMemoryService.addSchedule(request.userId, {
      title: request.title,
      description: request.description,
      scheduledDate: request.date,
      startTime: request.time,
      priority: (request.priority || "medium") as any,
      status: "pending",
      category: request.category,
    } as any);

    return {
      success: true,
      message: `予定を追加しました: ${request.title}`,
      data: schedule,
    };
  }

  /**
   * Analyze schedules
   */
  private static analyzeSchedules(userId: number): ScheduleResponse {
    const analysis = scheduleMemoryService.analyzePatterns(userId);

    return {
      success: true,
      message: analysis,
    };
  }

  /**
   * List all schedules
   */
  private static listAllSchedules(userId: number): ScheduleResponse {
    const schedules = scheduleMemoryService.getUserSchedules(userId);

    if (schedules.length === 0) {
      return {
        success: true,
        message: "登録されている予定はありません",
        schedules: [],
      };
    }

    return {
      success: true,
      message: `${schedules.length}件の予定が登録されています`,
      schedules,
    };
  }

  /**
   * Parse natural language and extract schedule request
   */
  static parseNaturalLanguage(text: string, userId: number): ScheduleRequest | null {
    const lowerText = text.toLowerCase();

    // Get today's schedules
    if (
      lowerText.includes("今日") &&
      (lowerText.includes("予定") || lowerText.includes("整理") || lowerText.includes("確認"))
    ) {
      return { type: "get_today", userId };
    }

    // Get tomorrow's schedules
    if (lowerText.includes("明日") && lowerText.includes("予定")) {
      return { type: "get_tomorrow", userId };
    }

    // Get upcoming schedules
    if (
      (lowerText.includes("今後") || lowerText.includes("来週")) &&
      lowerText.includes("予定")
    ) {
      return { type: "get_upcoming", userId };
    }

    // Add schedule
    if (lowerText.includes("予定") && (lowerText.includes("追加") || lowerText.includes("登録"))) {
      return { type: "add_schedule", userId };
    }

    // Analyze schedules
    if (lowerText.includes("パターン") || lowerText.includes("分析")) {
      return { type: "analyze", userId };
    }

    // List all schedules
    if (lowerText.includes("全部") || lowerText.includes("一覧")) {
      return { type: "list_all", userId };
    }

    return null;
  }

  /**
   * Generate AI response for schedule request
   */
  static generateResponse(request: ScheduleRequest): string {
    const response = this.processRequest(request);

    if (!response.success) {
      return response.message;
    }

    return response.message;
  }
}

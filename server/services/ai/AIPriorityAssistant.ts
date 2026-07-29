import { invokeLLM } from "../../_core/llm";
import { getUserSchedules } from "../../db.schedule";

export interface PriorityAnalysis {
  scheduleId: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  reasoning: string;
  suggestedActions: string[];
  estimatedTime: number;
  dependencies?: string[];
}

export interface PriorityOptimization {
  analysis: PriorityAnalysis[];
  dailyPlan: string;
  recommendations: string[];
  focusAreas: string[];
}

/**
 * AI Priority Assistant - Analyzes schedules and provides priority recommendations
 */
export class AIPriorityAssistant {
  /**
   * Analyze schedule priorities using AI
   */
  static async analyzePriorities(userId: number): Promise<PriorityOptimization | null> {
    try {
      const schedules = await getUserSchedules(userId);

      if (!schedules || schedules.length === 0) {
        return {
          analysis: [],
          dailyPlan: "現在登録されている予定はありません",
          recommendations: [],
          focusAreas: [],
        };
      }

      const scheduleData = schedules.map((s: any) => ({
        id: s.id,
        title: s.title,
        scheduledDate: s.scheduledDate,
        priority: s.priority,
        category: s.category,
      }));

      const prompt = `Analyze these schedules and provide priority recommendations in JSON format with analysis array, dailyPlan, recommendations, and focusAreas.\\nSchedules: ${JSON.stringify(scheduleData)}`;

      const response = await invokeLLM({
        model: "gemini-2.0-flash",
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.choices?.[0]?.message?.content;
      if (!text) return null;

      try {
        return JSON.parse(text) as PriorityOptimization;
      } catch (e) {
        console.error("[AIPriorityAssistant] Parse error:", e);
        return null;
      }
    } catch (error) {
      console.error("[AIPriorityAssistant] Error:", error);
      return null;
    }
  }

  /**
   * Get priority recommendations for a specific schedule
   */
  static async getSchedulePriorityRecommendation(
    userId: number,
    scheduleId: string,
    scheduleTitle: string,
    scheduleDescription?: string
  ): Promise<PriorityAnalysis | null> {
    try {
      const prompt = `Analyze this schedule and provide priority analysis in JSON format.\\nTitle: ${scheduleTitle}\\nDescription: ${scheduleDescription || "No description"}\\nScheduleId: ${scheduleId}`;

      const response = await invokeLLM({
        model: "gemini-2.0-flash",
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.choices?.[0]?.message?.content;
      if (!text) return null;

      try {
        return JSON.parse(text) as PriorityAnalysis;
      } catch (e) {
        console.error("[AIPriorityAssistant] Parse error:", e);
        return null;
      }
    } catch (error) {
      console.error("[AIPriorityAssistant] Error:", error);
      return null;
    }
  }

  /**
   * Get daily focus recommendation
   */
  static async getDailyFocusRecommendation(userId: number): Promise<string | null> {
    try {
      const schedules = await getUserSchedules(userId);

      if (!schedules || schedules.length === 0) {
        return "今日の予定がありません。新しい予定を追加してみてください。";
      }

      const scheduleList = schedules.map((s: any) => `- ${s.title} (Priority: ${s.priority})`).join("\n");
      const prompt = `Based on these schedules, provide a brief daily focus recommendation (max 2 sentences).\\nSchedules:\\n${scheduleList}`;

      const response = await invokeLLM({
        model: "gemini-2.0-flash",
        messages: [{ role: "user", content: prompt }],
      });

      return response.choices?.[0]?.message?.content || null;
    } catch (error) {
      console.error("[AIPriorityAssistant] Error:", error);
      return null;
    }
  }

  /**
   * Get time management suggestions
   */
  static async getTimeManagementSuggestions(userId: number): Promise<string[] | null> {
    try {
      const schedules = await getUserSchedules(userId);

      if (!schedules || schedules.length === 0) {
        return ["予定を追加して、時間管理の提案を受け取ってください。"];
      }

      const totalSchedules = schedules.length;
      const highPriority = schedules.filter((s: any) => s.priority === "high" || s.priority === "critical").length;

      const prompt = `Based on these statistics, provide 3-4 time management suggestions as a JSON array.\\nTotal schedules: ${totalSchedules}\\nHigh priority items: ${highPriority}`;

      const response = await invokeLLM({
        model: "gemini-2.0-flash",
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.choices?.[0]?.message?.content;
      if (!text) return null;

      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : null;
      } catch (e) {
        console.error("[AIPriorityAssistant] Parse error:", e);
        return null;
      }
    } catch (error) {
      console.error("[AIPriorityAssistant] Error:", error);
      return null;
    }
  }
}

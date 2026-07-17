interface AnalyticsEvent {
  userId: string;
  eventType: string;
  timestamp: number;
  metadata: Record<string, any>;
}

interface UsageStatistics {
  totalRequests: number;
  requestsByTool: Record<string, number>;
  requestsByHour: Record<number, number>;
  requestsByUser: Record<string, number>;
  averageResponseTime: number;
  errorRate: number;
}

interface PerformanceMetrics {
  responseTime: number[];
  errorCount: number;
  successCount: number;
  throughput: number;
  resourceUsage: {
    memory: number;
    cpu: number;
  };
}

interface UserBehavior {
  userId: string;
  sessionCount: number;
  totalSessionTime: number;
  averageSessionTime: number;
  lastActive: number;
  favoriteTools: string[];
  conversionEvents: number;
}

export class AnalyticsManager {
  private events: AnalyticsEvent[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private userBehavior: Map<string, UserBehavior> = new Map();

  /**
   * Track event
   */
  trackEvent(userId: string, eventType: string, metadata: Record<string, any> = {}): void {
    const event: AnalyticsEvent = {
      userId,
      eventType,
      timestamp: Date.now(),
      metadata,
    };

    this.events.push(event);

    // Keep only last 100000 events
    if (this.events.length > 100000) {
      this.events = this.events.slice(-100000);
    }

    // Update user behavior
    this.updateUserBehavior(userId, eventType);
  }

  /**
   * Track performance metric
   */
  trackPerformance(responseTime: number, success: boolean, resourceUsage: { memory: number; cpu: number }): void {
    const metric: PerformanceMetrics = {
      responseTime: [responseTime],
      errorCount: success ? 0 : 1,
      successCount: success ? 1 : 0,
      throughput: 1,
      resourceUsage,
    };

    this.performanceMetrics.push(metric);

    // Keep only last 10000 metrics
    if (this.performanceMetrics.length > 10000) {
      this.performanceMetrics = this.performanceMetrics.slice(-10000);
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStatistics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): UsageStatistics {
    const now = Date.now();
    const rangeMs = this.getTimeRangeMs(timeRange);
    const startTime = now - rangeMs;

    const filteredEvents = this.events.filter(e => e.timestamp >= startTime);

    const requestsByTool: Record<string, number> = {};
    const requestsByHour: Record<number, number> = {};
    const requestsByUser: Record<string, number> = {};
    let totalResponseTime = 0;
    let errorCount = 0;

    filteredEvents.forEach((event) => {
      // Count by tool
      if (event.metadata.tool) {
        requestsByTool[event.metadata.tool] = (requestsByTool[event.metadata.tool] || 0) + 1;
      }

      // Count by hour
      const hour = Math.floor(event.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
      requestsByHour[hour] = (requestsByHour[hour] || 0) + 1;

      // Count by user
      requestsByUser[event.userId] = (requestsByUser[event.userId] || 0) + 1;

      // Collect response times
      if (event.metadata.responseTime) {
        totalResponseTime += event.metadata.responseTime;
      }

      // Count errors
      if (event.metadata.error) {
        errorCount++;
      }
    });

    return {
      totalRequests: filteredEvents.length,
      requestsByTool,
      requestsByHour,
      requestsByUser,
      averageResponseTime: filteredEvents.length > 0 ? totalResponseTime / filteredEvents.length : 0,
      errorRate: filteredEvents.length > 0 ? errorCount / filteredEvents.length : 0,
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): PerformanceMetrics {
    const now = Date.now();
    const rangeMs = this.getTimeRangeMs(timeRange);

    const allResponseTimes: number[] = [];
    let totalErrors = 0;
    let totalSuccess = 0;
    let totalThroughput = 0;
    let totalMemory = 0;
    let totalCpu = 0;
    let metricsCount = 0;

    this.performanceMetrics.forEach((metric) => {
      allResponseTimes.push(...metric.responseTime);
      totalErrors += metric.errorCount;
      totalSuccess += metric.successCount;
      totalThroughput += metric.throughput;
      totalMemory += metric.resourceUsage.memory;
      totalCpu += metric.resourceUsage.cpu;
      metricsCount++;
    });

    return {
      responseTime: allResponseTimes,
      errorCount: totalErrors,
      successCount: totalSuccess,
      throughput: metricsCount > 0 ? totalThroughput / metricsCount : 0,
      resourceUsage: {
        memory: metricsCount > 0 ? totalMemory / metricsCount : 0,
        cpu: metricsCount > 0 ? totalCpu / metricsCount : 0,
      },
    };
  }

  /**
   * Get user behavior
   */
  getUserBehavior(userId: string): UserBehavior | null {
    return this.userBehavior.get(userId) || null;
  }

  /**
   * Get top users
   */
  getTopUsers(limit = 10): UserBehavior[] {
    return Array.from(this.userBehavior.values())
      .sort((a, b) => b.totalSessionTime - a.totalSessionTime)
      .slice(0, limit);
  }

  /**
   * Get top tools
   */
  getTopTools(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day', limit = 10): Array<{ tool: string; count: number }> {
    const stats = this.getUsageStatistics(timeRange);
    return Object.entries(stats.requestsByTool)
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get conversion funnel
   */
  getConversionFunnel(): Record<string, number> {
    const funnel: Record<string, number> = {
      visitors: 0,
      active_users: 0,
      tool_users: 0,
      converted: 0,
    };

    // Count unique visitors
    const visitors = new Set(this.events.map(e => e.userId));
    funnel.visitors = visitors.size;

    // Count active users (with recent activity)
    const now = Date.now();
    const activeUsers = new Set(
      this.events
        .filter(e => now - e.timestamp < 24 * 60 * 60 * 1000)
        .map(e => e.userId)
    );
    funnel.active_users = activeUsers.size;

    // Count tool users
    const toolUsers = new Set(
      this.events
        .filter(e => e.metadata.tool)
        .map(e => e.userId)
    );
    funnel.tool_users = toolUsers.size;

    // Count converted (completed action)
    const converted = new Set(
      this.events
        .filter(e => e.metadata.conversion)
        .map(e => e.userId)
    );
    funnel.converted = converted.size;

    return funnel;
  }

  /**
   * Update user behavior
   */
  private updateUserBehavior(userId: string, eventType: string): void {
    let behavior = this.userBehavior.get(userId);

    if (!behavior) {
      behavior = {
        userId,
        sessionCount: 0,
        totalSessionTime: 0,
        averageSessionTime: 0,
        lastActive: Date.now(),
        favoriteTools: [],
        conversionEvents: 0,
      };
      this.userBehavior.set(userId, behavior);
    }

    behavior.lastActive = Date.now();

    if (eventType === 'SESSION_START') {
      behavior.sessionCount++;
    }

    if (eventType === 'TOOL_USED') {
      const tool = this.events[this.events.length - 1]?.metadata.tool;
      if (tool) {
        const index = behavior.favoriteTools.indexOf(tool);
        if (index > -1) {
          behavior.favoriteTools.splice(index, 1);
        }
        behavior.favoriteTools.unshift(tool);
        if (behavior.favoriteTools.length > 10) {
          behavior.favoriteTools.pop();
        }
      }
    }

    if (eventType === 'CONVERSION') {
      behavior.conversionEvents++;
    }
  }

  /**
   * Get time range in milliseconds
   */
  private getTimeRangeMs(timeRange: 'hour' | 'day' | 'week' | 'month'): number {
    const ranges: Record<string, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    return ranges[timeRange] || ranges.day;
  }
}

export const analyticsManager = new AnalyticsManager();

import { SecurityEngine } from '../security/SecurityEngine';

/**
 * Performance Metric
 */
export interface PerformanceMetric {
  name: string;
  duration: number; // milliseconds
  timestamp: number;
  component: string;
  status: 'fast' | 'normal' | 'slow' | 'critical';
}

/**
 * Bottleneck
 */
export interface Bottleneck {
  component: string;
  metric: string;
  avgDuration: number;
  maxDuration: number;
  occurrences: number;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Performance Analysis Result
 */
export interface PerformanceAnalysisResult {
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  totalRequests: number;
  bottlenecks: Bottleneck[];
  improvements: string[];
}

/**
 * Performance Analyzer
 */
export class PerformanceAnalyzer {
  private static instance: PerformanceAnalyzer;
  private securityEngine: SecurityEngine;
  private metrics: PerformanceMetric[];

  private constructor() {
    this.securityEngine = new SecurityEngine();
    this.metrics = [];
  }

  public static getInstance(): PerformanceAnalyzer {
    if (!PerformanceAnalyzer.instance) {
      PerformanceAnalyzer.instance = new PerformanceAnalyzer();
    }
    return PerformanceAnalyzer.instance;
  }

  /**
   * Record performance metric
   */
  public async recordMetric(
    userId: string,
    name: string,
    duration: number,
    component: string
  ): Promise<PerformanceMetric> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(
      userId,
      'performance:write'
    );
    if (!hasPermission) {
      throw new Error('User does not have permission to record performance metrics');
    }

    // Determine status
    let status: 'fast' | 'normal' | 'slow' | 'critical';
    if (duration < 100) {
      status = 'fast';
    } else if (duration < 500) {
      status = 'normal';
    } else if (duration < 2000) {
      status = 'slow';
    } else {
      status = 'critical';
    }

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      component,
      status,
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    return metric;
  }

  /**
   * Analyze performance
   */
  public async analyzePerformance(userId: string): Promise<PerformanceAnalysisResult> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(
      userId,
      'performance:read'
    );
    if (!hasPermission) {
      throw new Error('User does not have permission to read performance analysis');
    }

    if (this.metrics.length === 0) {
      return {
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        totalRequests: 0,
        bottlenecks: [],
        improvements: [],
      };
    }

    const durations = this.metrics.map((m) => m.duration);
    const avgResponseTime = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxResponseTime = Math.max(...durations);
    const minResponseTime = Math.min(...durations);

    // Detect bottlenecks
    const bottlenecks = this.detectBottlenecks();

    // Generate improvements
    const improvements = this.generateImprovements(avgResponseTime, bottlenecks);

    return {
      avgResponseTime,
      maxResponseTime,
      minResponseTime,
      totalRequests: this.metrics.length,
      bottlenecks,
      improvements,
    };
  }

  /**
   * Detect bottlenecks
   */
  private detectBottlenecks(): Bottleneck[] {
    const componentMetrics: Record<string, PerformanceMetric[]> = {};

    // Group metrics by component
    this.metrics.forEach((metric) => {
      if (!componentMetrics[metric.component]) {
        componentMetrics[metric.component] = [];
      }
      componentMetrics[metric.component].push(metric);
    });

    const bottlenecks: Bottleneck[] = [];

    // Analyze each component
    Object.entries(componentMetrics).forEach(([component, metrics]) => {
      const durations = metrics.map((m) => m.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const slowMetrics = metrics.filter((m) => m.status === 'slow' || m.status === 'critical');

      if (slowMetrics.length > 0) {
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (slowMetrics.length > metrics.length * 0.5) {
          severity = 'high';
        } else if (slowMetrics.length > metrics.length * 0.2) {
          severity = 'medium';
        }

        bottlenecks.push({
          component,
          metric: 'response_time',
          avgDuration,
          maxDuration,
          occurrences: slowMetrics.length,
          severity,
        });
      }
    });

    return bottlenecks.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /**
   * Generate improvements
   */
  private generateImprovements(avgResponseTime: number, bottlenecks: Bottleneck[]): string[] {
    const improvements: string[] = [];

    if (avgResponseTime > 1000) {
      improvements.push('Average response time exceeds 1 second - consider optimization');
    }

    if (bottlenecks.length > 0) {
      const topBottleneck = bottlenecks[0];
      improvements.push(
        `${topBottleneck.component} is a bottleneck (avg: ${topBottleneck.avgDuration}ms)`
      );
    }

    if (bottlenecks.some((b) => b.severity === 'high')) {
      improvements.push('Critical bottlenecks detected - immediate optimization needed');
    }

    if (improvements.length === 0) {
      improvements.push('Performance is acceptable');
    }

    return improvements;
  }

  /**
   * Get metrics by component
   */
  public async getMetricsByComponent(userId: string, component: string): Promise<PerformanceMetric[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(
      userId,
      'performance:read'
    );
    if (!hasPermission) {
      throw new Error('User does not have permission to read performance metrics');
    }

    return this.metrics.filter((m) => m.component === component);
  }

  /**
   * Get metrics by status
   */
  public async getMetricsByStatus(
    userId: string,
    status: string
  ): Promise<PerformanceMetric[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(
      userId,
      'performance:read'
    );
    if (!hasPermission) {
      throw new Error('User does not have permission to read performance metrics');
    }

    return this.metrics.filter((m) => m.status === status);
  }

  /**
   * Clear all data (for testing)
   */
  public clearAllData(): void {
    this.metrics = [];
  }
}

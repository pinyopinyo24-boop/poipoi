import { SecurityEngine } from '../security/SecurityEngine';

/**
 * Health Metric
 */
export interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'ok' | 'warning' | 'critical';
  timestamp: number;
}

/**
 * Service Status
 */
export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  lastCheck: number;
  responseTime: number;
}

/**
 * Health Monitor
 */
export class HealthMonitor {
  private static instance: HealthMonitor;
  private securityEngine: SecurityEngine;
  private metrics: Map<string, HealthMetric[]>;
  private serviceStatuses: Map<string, ServiceStatus>;

  private constructor() {
    this.securityEngine = new SecurityEngine();
    this.metrics = new Map();
    this.serviceStatuses = new Map();
  }

  public static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  /**
   * Get CPU usage
   */
  public async getCPUUsage(userId: string): Promise<HealthMetric> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'health:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read health metrics');
    }

    // Simulate CPU usage (in real scenario, would use os.cpus())
    const cpuUsage = Math.random() * 100;

    const metric: HealthMetric = {
      name: 'CPU Usage',
      value: cpuUsage,
      unit: '%',
      threshold: 80,
      status: cpuUsage > 80 ? 'critical' : cpuUsage > 60 ? 'warning' : 'ok',
      timestamp: Date.now(),
    };

    this.storeMetric('cpu_usage', metric);
    return metric;
  }

  /**
   * Get memory usage
   */
  public async getMemoryUsage(userId: string): Promise<HealthMetric> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'health:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read health metrics');
    }

    // Simulate memory usage (in real scenario, would use process.memoryUsage())
    const memUsage = Math.random() * 100;

    const metric: HealthMetric = {
      name: 'Memory Usage',
      value: memUsage,
      unit: '%',
      threshold: 85,
      status: memUsage > 85 ? 'critical' : memUsage > 70 ? 'warning' : 'ok',
      timestamp: Date.now(),
    };

    this.storeMetric('memory_usage', metric);
    return metric;
  }

  /**
   * Get API status
   */
  public async getAPIStatus(userId: string): Promise<ServiceStatus> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'health:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read health metrics');
    }

    // Simulate API status check
    const isRunning = Math.random() > 0.1; // 90% running
    const responseTime = Math.random() * 500; // 0-500ms

    const status: ServiceStatus = {
      name: 'API Server',
      status: isRunning ? 'running' : 'error',
      uptime: Date.now() - Math.random() * 86400000, // Random uptime in last 24h
      lastCheck: Date.now(),
      responseTime,
    };

    this.serviceStatuses.set('api', status);
    return status;
  }

  /**
   * Get database status
   */
  public async getDatabaseStatus(userId: string): Promise<ServiceStatus> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'health:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read health metrics');
    }

    // Simulate database status check
    const isRunning = Math.random() > 0.05; // 95% running
    const responseTime = Math.random() * 100; // 0-100ms

    const status: ServiceStatus = {
      name: 'Database',
      status: isRunning ? 'running' : 'error',
      uptime: Date.now() - Math.random() * 86400000,
      lastCheck: Date.now(),
      responseTime,
    };

    this.serviceStatuses.set('database', status);
    return status;
  }

  /**
   * Get all service statuses
   */
  public async getAllServiceStatuses(userId: string): Promise<ServiceStatus[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'health:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read health metrics');
    }

    await this.getAPIStatus(userId);
    await this.getDatabaseStatus(userId);

    return Array.from(this.serviceStatuses.values());
  }

  /**
   * Get all metrics
   */
  public async getAllMetrics(userId: string): Promise<HealthMetric[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'health:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read health metrics');
    }

    const cpu = await this.getCPUUsage(userId);
    const memory = await this.getMemoryUsage(userId);

    return [cpu, memory];
  }

  /**
   * Get metric history
   */
  public async getMetricHistory(
    userId: string,
    metricName: string,
    limit: number = 10
  ): Promise<HealthMetric[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'health:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read health metrics');
    }

    const history = this.metrics.get(metricName) || [];
    return history.slice(-limit);
  }

  /**
   * Store metric
   */
  private storeMetric(name: string, metric: HealthMetric): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(metric);

    // Keep only last 100 metrics per type
    const history = this.metrics.get(name)!;
    if (history.length > 100) {
      this.metrics.set(name, history.slice(-100));
    }
  }

  /**
   * Clear all data (for testing)
   */
  public clearAllData(): void {
    this.metrics.clear();
    this.serviceStatuses.clear();
  }
}

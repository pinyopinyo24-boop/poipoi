/**
 * Provider Connection Monitor
 * Monitors and tracks real-time connection status of AI providers
 */

export interface ProviderConnectionStatus {
  provider: string;
  mode: 'demo' | 'real';
  connected: boolean;
  lastChecked: string;
  responseTime?: number;
  error?: string;
  apiKeySet: boolean;
}

export interface ConnectionStatistics {
  provider: string;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  successRate: number;
  averageResponseTime: number;
  lastError?: string;
  lastErrorTime?: string;
}

export class ProviderConnectionMonitor {
  private statuses: Map<string, ProviderConnectionStatus> = new Map();
  private statistics: Map<string, ConnectionStatistics> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private checkIntervalMs = 30000; // 30 seconds

  constructor() {
    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring
   */
  private initializeMonitoring(): void {
    console.log('[ProviderConnectionMonitor] Initialized');
  }

  /**
   * Register provider for monitoring
   */
  registerProvider(
    provider: string,
    mode: 'demo' | 'real' = 'demo',
    apiKeySet: boolean = false
  ): void {
    const key = `${provider}-${mode}`;

    this.statuses.set(key, {
      provider,
      mode,
      connected: mode === 'demo' ? true : apiKeySet,
      lastChecked: new Date().toISOString(),
      apiKeySet,
    });

    if (!this.statistics.has(provider)) {
      this.statistics.set(provider, {
        provider,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        successRate: 0,
        averageResponseTime: 0,
      });
    }

    console.log(
      `[ProviderConnectionMonitor] Provider registered: ${provider} (${mode} mode)`
    );
  }

  /**
   * Update provider connection status
   */
  updateStatus(
    provider: string,
    mode: 'demo' | 'real',
    connected: boolean,
    responseTime?: number,
    error?: string
  ): void {
    const key = `${provider}-${mode}`;

    const status: ProviderConnectionStatus = {
      provider,
      mode,
      connected,
      lastChecked: new Date().toISOString(),
      responseTime,
      error,
      apiKeySet: mode === 'real' ? true : false,
    };

    this.statuses.set(key, status);

    // Update statistics
    const stats = this.statistics.get(provider);
    if (stats) {
      stats.totalChecks++;

      if (connected) {
        stats.successfulChecks++;
        if (responseTime) {
          stats.averageResponseTime =
            (stats.averageResponseTime * (stats.successfulChecks - 1) +
              responseTime) /
            stats.successfulChecks;
        }
      } else {
        stats.failedChecks++;
        stats.lastError = error;
        stats.lastErrorTime = new Date().toISOString();
      }

      stats.successRate =
        (stats.successfulChecks / stats.totalChecks) * 100;

      this.statistics.set(provider, stats);
    }

    console.log(
      `[ProviderConnectionMonitor] Status updated: ${provider} (${mode}) - ${connected ? 'connected' : 'disconnected'}`
    );
  }

  /**
   * Get provider status
   */
  getStatus(provider: string, mode: 'demo' | 'real'): ProviderConnectionStatus | undefined {
    const key = `${provider}-${mode}`;
    return this.statuses.get(key);
  }

  /**
   * Get all statuses
   */
  getAllStatuses(): ProviderConnectionStatus[] {
    return Array.from(this.statuses.values());
  }

  /**
   * Get provider statistics
   */
  getStatistics(provider: string): ConnectionStatistics | undefined {
    return this.statistics.get(provider);
  }

  /**
   * Get all statistics
   */
  getAllStatistics(): ConnectionStatistics[] {
    return Array.from(this.statistics.values());
  }

  /**
   * Check if provider is connected
   */
  isConnected(provider: string, mode: 'demo' | 'real'): boolean {
    const status = this.getStatus(provider, mode);
    return status?.connected ?? false;
  }

  /**
   * Get connection summary
   */
  getConnectionSummary(): Record<string, any> {
    const statuses = this.getAllStatuses();
    const stats = this.getAllStatistics();

    const summary = {
      totalProviders: new Set(statuses.map((s) => s.provider)).size,
      connectedProviders: statuses.filter((s) => s.connected).length,
      disconnectedProviders: statuses.filter((s) => !s.connected).length,
      providers: statuses.map((s) => ({
        name: s.provider,
        mode: s.mode,
        connected: s.connected,
        responseTime: s.responseTime,
        error: s.error,
      })),
      statistics: stats.map((s) => ({
        provider: s.provider,
        successRate: s.successRate.toFixed(2) + '%',
        totalChecks: s.totalChecks,
        successfulChecks: s.successfulChecks,
        failedChecks: s.failedChecks,
        averageResponseTime: s.averageResponseTime.toFixed(2) + 'ms',
        lastError: s.lastError,
      })),
    };

    return summary;
  }

  /**
   * Clear statistics
   */
  clearStatistics(): void {
    this.statistics.forEach((stats) => {
      stats.totalChecks = 0;
      stats.successfulChecks = 0;
      stats.failedChecks = 0;
      stats.successRate = 0;
      stats.averageResponseTime = 0;
      stats.lastError = undefined;
      stats.lastErrorTime = undefined;
    });
    console.log('[ProviderConnectionMonitor] Statistics cleared');
  }

  /**
   * Destroy monitor
   */
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('[ProviderConnectionMonitor] Destroyed');
  }
}

// Singleton instance
let monitorInstance: ProviderConnectionMonitor | null = null;

export function getConnectionMonitor(): ProviderConnectionMonitor {
  if (!monitorInstance) {
    monitorInstance = new ProviderConnectionMonitor();
  }
  return monitorInstance;
}

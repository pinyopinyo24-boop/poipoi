/**
 * ConnectionManager - Hybrid Local/Cloud Connection Management
 * Manages connections to both local and cloud servers with automatic failover
 */

export type ConnectionMode = 'auto' | 'local-only' | 'cloud-only';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'failed';
export type ConnectionType = 'local' | 'cloud';

export interface ConnectionConfig {
  localServerUrl: string;
  cloudServerUrl: string;
  connectionMode: ConnectionMode;
  healthCheckInterval: number; // milliseconds
  healthCheckTimeout: number; // milliseconds
  maxRetries: number;
}

export interface ConnectionState {
  type: ConnectionType;
  status: ConnectionStatus;
  lastConnected: number; // timestamp
  failureCount: number;
  responseTime: number; // milliseconds
}

export interface HealthCheckResult {
  healthy: boolean;
  responseTime: number;
  timestamp: number;
  error?: string;
}

/**
 * ConnectionManager - Manages hybrid connections
 */
export class ConnectionManager {
  private config: ConnectionConfig;
  private localState: ConnectionState;
  private cloudState: ConnectionState;
  private currentConnection: ConnectionType = 'cloud';
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Function[]> = new Map();

  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = {
      localServerUrl: config.localServerUrl || 'http://localhost:3000',
      cloudServerUrl: config.cloudServerUrl || 'https://poipoi.manus.space',
      connectionMode: config.connectionMode || 'auto',
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      healthCheckTimeout: config.healthCheckTimeout || 5000, // 5 seconds
      maxRetries: config.maxRetries || 3,
    };

    this.localState = {
      type: 'local',
      status: 'disconnected',
      lastConnected: 0,
      failureCount: 0,
      responseTime: 0,
    };

    this.cloudState = {
      type: 'cloud',
      status: 'disconnected',
      lastConnected: 0,
      failureCount: 0,
      responseTime: 0,
    };
  }

  /**
   * Initialize connection manager
   */
  async initialize(): Promise<void> {
    console.log('[ConnectionManager] Initializing...');

    // Initial health check
    await this.performHealthCheck();

    // Start periodic health checks
    this.startHealthCheckLoop();

    console.log('[ConnectionManager] Initialized');
  }

  /**
   * Perform health check on both servers
   */
  public async performHealthCheck(): Promise<{ local: boolean; cloud: boolean }> {
    console.log('[ConnectionManager] Performing health check...');

    const result = { local: false, cloud: false };

    // Check local server
    if (this.config.connectionMode !== 'cloud-only') {
      const localResult = await this.checkServerHealth(this.config.localServerUrl);
      this.updateConnectionState('local', localResult);
      result.local = localResult;
    }

    // Check cloud server
    if (this.config.connectionMode !== 'local-only') {
      const cloudResult = await this.checkServerHealth(this.config.cloudServerUrl);
      this.updateConnectionState('cloud', cloudResult);
      result.cloud = cloudResult;
    }

    // Determine current connection
    await this.determineConnection();

    return result;
  }

  /**
   * Check server health
   */
  private async checkServerHealth(serverUrl: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheckTimeout);

      const response = await fetch(`${serverUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          healthy: true,
          responseTime,
          timestamp: Date.now(),
        };
      } else {
        return {
          healthy: false,
          responseTime,
          timestamp: Date.now(),
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        healthy: false,
        responseTime,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update connection state
   */
  private updateConnectionState(type: ConnectionType, result: HealthCheckResult): void {
    const state = type === 'local' ? this.localState : this.cloudState;

    if (result.healthy) {
      state.status = 'connected';
      state.lastConnected = result.timestamp;
      state.failureCount = 0;
      state.responseTime = result.responseTime;
      console.log(`[ConnectionManager] ${type} server healthy (${result.responseTime}ms)`);
    } else {
      state.failureCount++;
      state.responseTime = result.responseTime;

      if (state.failureCount >= this.config.maxRetries) {
        state.status = 'failed';
        console.error(`[ConnectionManager] ${type} server failed: ${result.error}`);
      } else {
        state.status = 'disconnected';
        console.warn(`[ConnectionManager] ${type} server check failed: ${result.error}`);
      }
    }

    this.emit('connection-state-changed', { type, state });
  }

  /**
   * Determine current connection based on priority and mode
   */
  private async determineConnection(): Promise<void> {
    let newConnection: ConnectionType = this.currentConnection;

    if (this.config.connectionMode === 'auto') {
      // Priority: Local > Cloud
      if (this.localState.status === 'connected') {
        newConnection = 'local';
      } else if (this.cloudState.status === 'connected') {
        newConnection = 'cloud';
      }
    } else if (this.config.connectionMode === 'local-only') {
      newConnection = 'local';
    } else if (this.config.connectionMode === 'cloud-only') {
      newConnection = 'cloud';
    }

    if (newConnection !== this.currentConnection) {
      const oldConnection = this.currentConnection;
      this.currentConnection = newConnection;
      console.log(`[ConnectionManager] Switched from ${oldConnection} to ${newConnection}`);
      this.emit('connection-switched', { from: oldConnection, to: newConnection });
    }
  }

  /**
   * Start health check loop
   */
  private startHealthCheckLoop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);

    console.log(`[ConnectionManager] Health check loop started (interval: ${this.config.healthCheckInterval}ms)`);
  }

  /**
   * Get current server URL
   */
  getServerUrl(): string {
    if (this.currentConnection === 'local') {
      return this.config.localServerUrl;
    } else {
      return this.config.cloudServerUrl;
    }
  }

  /**
   * Get current connection type
   */
  getCurrentConnection(): ConnectionType {
    return this.currentConnection;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    current: ConnectionType;
    local: ConnectionState;
    cloud: ConnectionState;
    mode: ConnectionMode;
  } {
    return {
      current: this.currentConnection,
      local: { ...this.localState },
      cloud: { ...this.cloudState },
      mode: this.config.connectionMode,
    };
  }

  /**
   * Set connection mode
   */
  setConnectionMode(mode: ConnectionMode): void {
    this.config.connectionMode = mode;
    console.log(`[ConnectionManager] Connection mode changed to: ${mode}`);
    this.determineConnection();
    this.emit('connection-mode-changed', { mode });
  }

  /**
   * Get connection mode
   */
  getConnectionMode(): ConnectionMode {
    return this.config.connectionMode;
  }

  /**
   * Make API request with automatic failover
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; source: ConnectionType }> {
    const url = `${this.getServerUrl()}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return { data, source: this.currentConnection };
    } catch (error) {
      console.error(`[ConnectionManager] Request failed on ${this.currentConnection}:`, error);

      // If current connection fails and mode is auto, try failover
      if (this.config.connectionMode === 'auto') {
        const failoverServer = this.currentConnection === 'local' ? this.cloudState : this.localState;

        if (failoverServer.status === 'connected') {
          console.log(`[ConnectionManager] Attempting failover to ${failoverServer.type}`);
          const failoverUrl = `${failoverServer.type === 'local' ? this.config.localServerUrl : this.config.cloudServerUrl}${endpoint}`;

          try {
            const response = await fetch(failoverUrl, {
              ...options,
              headers: {
                'Content-Type': 'application/json',
                ...options.headers,
              },
            });

            if (response.ok) {
              const data = await response.json();
              this.currentConnection = failoverServer.type;
              this.emit('connection-switched', { from: this.currentConnection === 'local' ? 'cloud' : 'local', to: this.currentConnection });
              return { data, source: this.currentConnection };
            }
          } catch (failoverError) {
            console.error(`[ConnectionManager] Failover also failed:`, failoverError);
          }
        }
      }

      throw error;
    }
  }

  /**
   * Register event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.listeners.clear();
    console.log('[ConnectionManager] Destroyed');
  }
}

// Export singleton instance
let connectionManagerInstance: ConnectionManager | null = null;

export function getConnectionManager(config?: Partial<ConnectionConfig>): ConnectionManager {
  if (!connectionManagerInstance) {
    connectionManagerInstance = new ConnectionManager(config);
  }
  return connectionManagerInstance;
}

export function resetConnectionManager(): void {
  if (connectionManagerInstance) {
    connectionManagerInstance.destroy();
    connectionManagerInstance = null;
  }
}

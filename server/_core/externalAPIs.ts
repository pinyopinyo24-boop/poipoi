/**
 * ポイポイ AIエージェント - 外部API統合機能
 * 
 * 外部サービスとの連携・統合
 */

/**
 * API統合設定
 */
export interface APIIntegration {
  integrationId: string;
  name: string;
  apiType: "rest" | "graphql" | "webhook";
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  authentication?: "bearer" | "basic" | "api_key" | "oauth2";
  endpoints: APIEndpoint[];
  isActive: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

/**
 * APIエンドポイント
 */
export interface APIEndpoint {
  endpointId: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description?: string;
  parameters?: Record<string, any>;
  requestBody?: any;
  responseSchema?: any;
  rateLimit?: number; // requests per minute
}

/**
 * API呼び出し結果
 */
export interface APICallResult {
  success: boolean;
  statusCode?: number;
  data?: any;
  error?: string;
  executionTime: number; // ms
  timestamp: Date;
}

/**
 * 外部API統合エンジン
 */
export class ExternalAPIIntegrationEngine {
  private integrations: Map<string, APIIntegration> = new Map();
  private callHistory: Map<string, APICallResult[]> = new Map();
  private rateLimitTracking: Map<string, number[]> = new Map(); // endpointId -> timestamps

  /**
   * API統合を登録
   */
  registerIntegration(
    name: string,
    apiType: "rest" | "graphql" | "webhook",
    baseUrl: string,
    authentication?: "bearer" | "basic" | "api_key" | "oauth2",
    apiKey?: string,
    headers?: Record<string, string>
  ): APIIntegration {
    const integrationId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const integration: APIIntegration = {
      integrationId,
      name,
      apiType,
      baseUrl,
      apiKey,
      headers,
      authentication,
      endpoints: [],
      isActive: true,
      createdAt: new Date(),
    };

    this.integrations.set(integrationId, integration);
    this.callHistory.set(integrationId, []);
    return integration;
  }

  /**
   * エンドポイントを追加
   */
  addEndpoint(
    integrationId: string,
    name: string,
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    path: string,
    description?: string,
    parameters?: Record<string, any>,
    rateLimit?: number
  ): APIEndpoint | null {
    const integration = this.integrations.get(integrationId);
    if (!integration) return null;

    const endpointId = `endpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const endpoint: APIEndpoint = {
      endpointId,
      name,
      method,
      path,
      description,
      parameters,
      rateLimit,
    };

    integration.endpoints.push(endpoint);
    this.rateLimitTracking.set(endpointId, []);
    return endpoint;
  }

  /**
   * APIを呼び出し
   */
  async callAPI(
    integrationId: string,
    endpointName: string,
    params?: Record<string, any>,
    body?: any
  ): Promise<APICallResult> {
    const startTime = Date.now();
    const integration = this.integrations.get(integrationId);

    if (!integration) {
      return {
        success: false,
        error: "Integration not found",
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    const endpoint = integration.endpoints.find((e) => e.name === endpointName);
    if (!endpoint) {
      return {
        success: false,
        error: "Endpoint not found",
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    // レート制限をチェック
    if (!this.checkRateLimit(endpoint.endpointId, endpoint.rateLimit)) {
      return {
        success: false,
        statusCode: 429,
        error: "Rate limit exceeded",
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    try {
      // URLを構築
      let url = `${integration.baseUrl}${endpoint.path}`;
      if (params && endpoint.method === "GET") {
        const queryString = new URLSearchParams(params).toString();
        url += `?${queryString}`;
      }

      // ヘッダーを準備
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...integration.headers,
      };

      // 認証ヘッダーを追加
      if (integration.authentication === "bearer" && integration.apiKey) {
        headers.Authorization = `Bearer ${integration.apiKey}`;
      } else if (integration.authentication === "api_key" && integration.apiKey) {
        headers["X-API-Key"] = integration.apiKey;
      } else if (integration.authentication === "basic" && integration.apiKey) {
        headers.Authorization = `Basic ${Buffer.from(integration.apiKey).toString("base64")}`;
      }

      // リクエストを送信
      const response = await fetch(url, {
        method: endpoint.method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      const result: APICallResult = {
        success: response.ok,
        statusCode: response.status,
        data: response.ok ? data : undefined,
        error: !response.ok ? data.message || response.statusText : undefined,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      };

      // 呼び出し履歴を記録
      const history = this.callHistory.get(integrationId) || [];
      history.push(result);
      if (history.length > 1000) {
        history.shift(); // 古い履歴を削除
      }
      this.callHistory.set(integrationId, history);

      integration.lastUsedAt = new Date();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * レート制限をチェック
   */
  private checkRateLimit(endpointId: string, rateLimit?: number): boolean {
    if (!rateLimit) return true;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const timestamps = this.rateLimitTracking.get(endpointId) || [];

    // 1分以内の呼び出しをカウント
    const recentCalls = timestamps.filter((t) => t > oneMinuteAgo);

    if (recentCalls.length >= rateLimit) {
      return false;
    }

    // 新しいタイムスタンプを追加
    recentCalls.push(now);
    this.rateLimitTracking.set(endpointId, recentCalls);
    return true;
  }

  /**
   * GraphQL クエリを実行
   */
  async executeGraphQL(
    integrationId: string,
    query: string,
    variables?: Record<string, any>
  ): Promise<APICallResult> {
    const startTime = Date.now();
    const integration = this.integrations.get(integrationId);

    if (!integration || integration.apiType !== "graphql") {
      return {
        success: false,
        error: "GraphQL integration not found",
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...integration.headers,
      };

      if (integration.authentication === "bearer" && integration.apiKey) {
        headers.Authorization = `Bearer ${integration.apiKey}`;
      }

      const response = await fetch(integration.baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      });

      const data = await response.json();

      return {
        success: response.ok && !data.errors,
        statusCode: response.status,
        data: data.data || data,
        error: data.errors ? JSON.stringify(data.errors) : undefined,
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 呼び出し履歴を取得
   */
  getCallHistory(integrationId: string): APICallResult[] {
    return this.callHistory.get(integrationId) || [];
  }

  /**
   * 統計情報を取得
   */
  getStatistics(integrationId: string): {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageExecutionTime: number;
    successRate: number;
  } {
    const history = this.callHistory.get(integrationId) || [];

    if (history.length === 0) {
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageExecutionTime: 0,
        successRate: 0,
      };
    }

    const successful = history.filter((r) => r.success).length;
    const failed = history.length - successful;
    const avgTime =
      history.reduce((sum, r) => sum + r.executionTime, 0) / history.length;

    return {
      totalCalls: history.length,
      successfulCalls: successful,
      failedCalls: failed,
      averageExecutionTime: avgTime,
      successRate: (successful / history.length) * 100,
    };
  }

  /**
   * 統合を取得
   */
  getIntegration(integrationId: string): APIIntegration | null {
    return this.integrations.get(integrationId) || null;
  }

  /**
   * 全統合を取得
   */
  getAllIntegrations(): APIIntegration[] {
    return Array.from(this.integrations.values());
  }

  /**
   * 統合を削除
   */
  deleteIntegration(integrationId: string): boolean {
    const deleted = this.integrations.delete(integrationId);
    this.callHistory.delete(integrationId);
    return deleted;
  }

  /**
   * 統合を有効/無効にする
   */
  setIntegrationActive(integrationId: string, isActive: boolean): boolean {
    const integration = this.integrations.get(integrationId);
    if (!integration) return false;

    integration.isActive = isActive;
    return true;
  }
}

// グローバルインスタンス
export const externalAPIEngine = new ExternalAPIIntegrationEngine();

/**
 * APIAdapter - Unified API layer for local and cloud servers
 * Provides consistent interface regardless of connection source
 */

import { getConnectionManager } from './ConnectionManager';

export interface APIRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  source: 'local' | 'cloud';
  responseTime: number;
}

/**
 * APIAdapter - Unified API interface
 */
export class APIAdapter {
  private connectionManager = getConnectionManager();

  /**
   * Make unified API request
   */
  async request<T = any>(req: APIRequest): Promise<APIResponse<T>> {
    const startTime = Date.now();

    try {
      const serverUrl = this.connectionManager.getServerUrl();
      const url = `${serverUrl}${req.endpoint}`;

      const response = await fetch(url, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...req.headers,
        },
        body: req.data ? JSON.stringify(req.data) : undefined,
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
        source: this.connectionManager.getCurrentConnection(),
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: this.connectionManager.getCurrentConnection(),
        responseTime,
      };
    }
  }

  /**
   * Chat API - Send message
   */
  async sendChatMessage(message: string, conversationId?: string): Promise<APIResponse<{ response: string }>> {
    return this.request({
      endpoint: '/api/chat/send',
      method: 'POST',
      data: { message, conversationId },
    });
  }

  /**
   * Chat API - Get conversation history
   */
  async getChatHistory(conversationId: string, limit: number = 50): Promise<APIResponse<any[]>> {
    return this.request({
      endpoint: `/api/chat/history?conversationId=${conversationId}&limit=${limit}`,
      method: 'GET',
    });
  }

  /**
   * Memory API - Search memory
   */
  async searchMemory(query: string, limit: number = 10): Promise<APIResponse<any[]>> {
    return this.request({
      endpoint: '/api/memory/search',
      method: 'POST',
      data: { query, limit },
    });
  }

  /**
   * Memory API - Save to memory
   */
  async saveToMemory(data: any, type: string): Promise<APIResponse<{ id: string }>> {
    return this.request({
      endpoint: '/api/memory/save',
      method: 'POST',
      data: { data, type },
    });
  }

  /**
   * Learning API - Get learning suggestions
   */
  async getLearningsuggestions(): Promise<APIResponse<any[]>> {
    return this.request({
      endpoint: '/api/learning/suggestions',
      method: 'GET',
    });
  }

  /**
   * Learning API - Apply learning
   */
  async applyLearning(suggestionId: string): Promise<APIResponse<{ success: boolean }>> {
    return this.request({
      endpoint: '/api/learning/apply',
      method: 'POST',
      data: { suggestionId },
    });
  }

  /**
   * Production API - Analyze production data
   */
  async analyzeProduction(data: any): Promise<APIResponse<any>> {
    return this.request({
      endpoint: '/api/production/analyze',
      method: 'POST',
      data,
    });
  }

  /**
   * Production API - Get cost analysis
   */
  async getCostAnalysis(productionDataId: string): Promise<APIResponse<any>> {
    return this.request({
      endpoint: `/api/production/cost-analysis?id=${productionDataId}`,
      method: 'GET',
    });
  }

  /**
   * Analysis API - Analyze data
   */
  async analyzeData(data: any, analysisType: string): Promise<APIResponse<any>> {
    return this.request({
      endpoint: '/api/analysis/analyze',
      method: 'POST',
      data: { data, analysisType },
    });
  }

  /**
   * Analysis API - Get insights
   */
  async getInsights(limit: number = 10): Promise<APIResponse<any[]>> {
    return this.request({
      endpoint: `/api/analysis/insights?limit=${limit}`,
      method: 'GET',
    });
  }

  /**
   * Presentation API - Generate presentation
   */
  async generatePresentation(data: any): Promise<APIResponse<{ presentationId: string }>> {
    return this.request({
      endpoint: '/api/presentation/generate',
      method: 'POST',
      data,
    });
  }

  /**
   * Presentation API - Get presentation
   */
  async getPresentation(presentationId: string): Promise<APIResponse<any>> {
    return this.request({
      endpoint: `/api/presentation/${presentationId}`,
      method: 'GET',
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<APIResponse<{ status: string }>> {
    return this.request({
      endpoint: '/api/health',
      method: 'GET',
    });
  }
}

// Export singleton instance
let adapterInstance: APIAdapter | null = null;

export function getAPIAdapter(): APIAdapter {
  if (!adapterInstance) {
    adapterInstance = new APIAdapter();
  }
  return adapterInstance;
}

export function resetAPIAdapter(): void {
  adapterInstance = null;
}

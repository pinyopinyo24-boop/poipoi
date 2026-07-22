/**
 * API Client - Unified API client using tRPC hybrid router
 * Routes all API calls through the hybrid connection manager
 */

export interface APIRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  source: 'local' | 'cloud';
  responseTime: number;
}

/**
 * Make API request through hybrid connection
 * Uses tRPC hybrid router for connection management
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: APIRequestOptions = {}
): Promise<APIResponse<T>> {
  const startTime = Date.now();

  try {
    // Use the standard fetch with /api prefix
    // The hybrid connection is managed by the server-side hybrid router
    const url = `/api${endpoint}`;

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Connection source can be determined from response header
    const source = (response.headers.get('X-Connection-Source') as 'local' | 'cloud') || 'cloud';

    return {
      success: true,
      data,
      source,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'cloud',
      responseTime,
    };
  }
}

/**
 * Chat API calls
 */
export const chatAPI = {
  sendMessage: (message: string, conversationId?: string) =>
    apiRequest('/chat/send', {
      method: 'POST',
      body: { message, conversationId },
    }),

  getHistory: (conversationId: string, limit: number = 50) =>
    apiRequest(`/chat/history?conversationId=${conversationId}&limit=${limit}`),
};

/**
 * Memory API calls
 */
export const memoryAPI = {
  search: (query: string, limit: number = 10) =>
    apiRequest('/memory/search', {
      method: 'POST',
      body: { query, limit },
    }),

  save: (data: any, type: string) =>
    apiRequest('/memory/save', {
      method: 'POST',
      body: { data, type },
    }),
};

/**
 * Learning API calls
 */
export const learningAPI = {
  getSuggestions: () =>
    apiRequest('/learning/suggestions'),

  apply: (suggestionId: string) =>
    apiRequest('/learning/apply', {
      method: 'POST',
      body: { suggestionId },
    }),
};

/**
 * Production API calls
 */
export const productionAPI = {
  analyze: (data: any) =>
    apiRequest('/production/analyze', {
      method: 'POST',
      body: data,
    }),

  getCostAnalysis: (productionDataId: string) =>
    apiRequest(`/production/cost-analysis?id=${productionDataId}`),
};

/**
 * Analysis API calls
 */
export const analysisAPI = {
  analyze: (data: any, analysisType: string) =>
    apiRequest('/analysis/analyze', {
      method: 'POST',
      body: { data, analysisType },
    }),

  getInsights: (limit: number = 10) =>
    apiRequest(`/analysis/insights?limit=${limit}`),
};

/**
 * Presentation API calls
 */
export const presentationAPI = {
  generate: (data: any) =>
    apiRequest('/presentation/generate', {
      method: 'POST',
      body: data,
    }),

  get: (presentationId: string) =>
    apiRequest(`/presentation/${presentationId}`),
};

/**
 * Health check
 */
export const healthCheck = () =>
  apiRequest('/health');

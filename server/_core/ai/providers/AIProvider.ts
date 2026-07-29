/**
 * AIProvider Interface - Unified interface for multiple AI providers
 * Supports provider-agnostic AI operations
 */

export type AIProviderType = 'chatgpt' | 'gemini' | 'local';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  id: string;
  provider: AIProviderType;
  model: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AIInvokeOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  systemPrompt?: string;
  metadata?: Record<string, any>;
}

export interface AIModel {
  id: string;
  name: string;
  provider: AIProviderType;
  contextWindow: number;
  costPer1kPromptTokens: number;
  costPer1kCompletionTokens: number;
  capabilities: string[];
}

export interface AIProviderStatus {
  provider: AIProviderType;
  isAvailable: boolean;
  lastChecked: Date;
  errorMessage?: string;
  modelsAvailable: number;
}

/**
 * Base AIProvider interface
 * All AI providers must implement these methods
 */
export interface IAIProvider {
  /**
   * Get provider type
   */
  getProviderType(): AIProviderType;

  /**
   * Invoke AI with messages
   */
  invoke(messages: AIMessage[], options?: AIInvokeOptions): Promise<AIResponse>;

  /**
   * Get available models
   */
  getModels(): Promise<AIModel[]>;

  /**
   * Get provider status
   */
  getStatus(): Promise<AIProviderStatus>;

  /**
   * Validate provider configuration
   */
  validateConfig(): Promise<boolean>;

  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Get API key (masked for security)
   */
  getApiKeyStatus(): 'configured' | 'missing' | 'invalid';
}

/**
 * Abstract base class for AI providers
 */
export abstract class BaseAIProvider implements IAIProvider {
  protected providerType: AIProviderType;
  protected apiKey: string;
  protected apiUrl: string;

  constructor(providerType: AIProviderType, apiKey: string, apiUrl: string) {
    this.providerType = providerType;
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  getProviderType(): AIProviderType {
    return this.providerType;
  }

  abstract invoke(messages: AIMessage[], options?: AIInvokeOptions): Promise<AIResponse>;

  abstract getModels(): Promise<AIModel[]>;

  abstract getStatus(): Promise<AIProviderStatus>;

  abstract validateConfig(): Promise<boolean>;

  abstract getName(): string;

  getApiKeyStatus(): 'configured' | 'missing' | 'invalid' {
    if (!this.apiKey) {
      return 'missing';
    }
    if (this.apiKey.length < 10) {
      return 'invalid';
    }
    return 'configured';
  }

  protected generateRequestId(): string {
    return `${this.providerType}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  protected logRequest(method: string, data: any): void {
    console.log(`[AI Provider: ${this.providerType}] ${method}:`, {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }

  protected logError(method: string, error: any): void {
    console.error(`[AI Provider: ${this.providerType}] ${method} ERROR:`, {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

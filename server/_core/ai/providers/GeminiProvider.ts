/**
 * Gemini Provider Implementation
 * Integrates with Google's Gemini API
 */

import {
  BaseAIProvider,
  AIMessage,
  AIResponse,
  AIInvokeOptions,
  AIModel,
  AIProviderStatus,
} from './AIProvider';

export class GeminiProvider extends BaseAIProvider {
  private models: AIModel[] = [
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'gemini',
      contextWindow: 1000000,
      costPer1kPromptTokens: 0.075,
      costPer1kCompletionTokens: 0.3,
      capabilities: ['text', 'vision', 'code-generation', 'reasoning'],
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'gemini',
      contextWindow: 2000000,
      costPer1kPromptTokens: 1.25,
      costPer1kCompletionTokens: 5.0,
      capabilities: ['text', 'vision', 'code-generation', 'reasoning'],
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'gemini',
      contextWindow: 1000000,
      costPer1kPromptTokens: 0.075,
      costPer1kCompletionTokens: 0.3,
      capabilities: ['text', 'vision', 'code-generation'],
    },
  ];

  constructor(apiKey: string) {
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/';
    super('gemini', apiKey, apiUrl);
  }

  getName(): string {
    return 'Gemini (Google)';
  }

  async invoke(messages: AIMessage[], options?: AIInvokeOptions): Promise<AIResponse> {
    const requestId = this.generateRequestId();
    const model = options?.model || 'gemini-2.0-flash';

    this.logRequest('invoke', {
      requestId,
      model,
      messageCount: messages.length,
      temperature: options?.temperature,
    });

    try {
      const url = `${this.apiUrl}chat/completions`;
      const response = await globalThis.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2048,
          top_p: options?.topP ?? 0.9,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Gemini API error: ${response.statusText} - ${errorData}`);
      }

      const data = await response.json() as any;

      const aiResponse: AIResponse = {
        id: requestId,
        provider: 'gemini',
        model,
        content: data.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        timestamp: new Date(),
        metadata: {
          geminiId: data.id,
          finishReason: data.choices?.[0]?.finish_reason,
        },
      };

      this.logRequest('invoke_success', {
        requestId,
        model,
        tokens: aiResponse.usage?.totalTokens,
      });

      return aiResponse;
    } catch (error) {
      this.logError('invoke', error);
      throw error;
    }
  }

  async getModels(): Promise<AIModel[]> {
    this.logRequest('getModels', {});
    return this.models;
  }

  async getStatus(): Promise<AIProviderStatus> {
    const startTime = Date.now();

    try {
      // Test API connectivity with a simple request
      const response = await globalThis.fetch(`${this.apiUrl}chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gemini-2.0-flash',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 10,
        }),
      });

      const isAvailable = response.ok;
      const duration = Date.now() - startTime;

      this.logRequest('getStatus', {
        isAvailable,
        duration,
        statusCode: response.status,
      });

      return {
        provider: 'gemini',
        isAvailable,
        lastChecked: new Date(),
        modelsAvailable: isAvailable ? this.models.length : 0,
        errorMessage: isAvailable ? undefined : `API returned ${response.status}`,
      };
    } catch (error) {
      this.logError('getStatus', error);

      return {
        provider: 'gemini',
        isAvailable: false,
        lastChecked: new Date(),
        modelsAvailable: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    if (this.getApiKeyStatus() !== 'configured') {
      this.logError('validateConfig', 'API key not configured');
      return false;
    }

    try {
      const status = await this.getStatus();
      return status.isAvailable;
    } catch (error) {
      this.logError('validateConfig', error);
      return false;
    }
  }
}

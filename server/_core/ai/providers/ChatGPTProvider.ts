/**
 * ChatGPT Provider Implementation
 * Integrates with OpenAI's ChatGPT API
 */

import {
  BaseAIProvider,
  AIMessage,
  AIResponse,
  AIInvokeOptions,
  AIModel,
  AIProviderStatus,
} from './AIProvider';

export class ChatGPTProvider extends BaseAIProvider {
  private models: AIModel[] = [
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'chatgpt',
      contextWindow: 128000,
      costPer1kPromptTokens: 0.01,
      costPer1kCompletionTokens: 0.03,
      capabilities: ['text', 'reasoning', 'code-generation'],
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'chatgpt',
      contextWindow: 8192,
      costPer1kPromptTokens: 0.03,
      costPer1kCompletionTokens: 0.06,
      capabilities: ['text', 'reasoning', 'code-generation'],
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'chatgpt',
      contextWindow: 4096,
      costPer1kPromptTokens: 0.0005,
      costPer1kCompletionTokens: 0.0015,
      capabilities: ['text', 'code-generation'],
    },
  ];

  constructor(apiKey: string) {
    const apiUrl = 'https://api.openai.com/v1';
    super('chatgpt', apiKey, apiUrl);
  }

  getName(): string {
    return 'ChatGPT (OpenAI)';
  }

  async invoke(messages: AIMessage[], options?: AIInvokeOptions): Promise<AIResponse> {
    const requestId = this.generateRequestId();
    const model = options?.model || 'gpt-4-turbo';

    this.logRequest('invoke', {
      requestId,
      model,
      messageCount: messages.length,
      temperature: options?.temperature,
    });

    try {
      const response = await globalThis.fetch(`${this.apiUrl}/chat/completions`, {
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
        throw new Error(`ChatGPT API error: ${response.statusText} - ${errorData}`);
      }

      const data = await response.json() as any;

      const aiResponse: AIResponse = {
        id: requestId,
        provider: 'chatgpt',
        model,
        content: data.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        timestamp: new Date(),
        metadata: {
          openaiId: data.id,
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
      const response = await globalThis.fetch(`${this.apiUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const isAvailable = response.ok;
      const duration = Date.now() - startTime;

      this.logRequest('getStatus', {
        isAvailable,
        duration,
        statusCode: response.status,
      });

      return {
        provider: 'chatgpt',
        isAvailable,
        lastChecked: new Date(),
        modelsAvailable: isAvailable ? this.models.length : 0,
        errorMessage: isAvailable ? undefined : `API returned ${response.status}`,
      };
    } catch (error) {
      this.logError('getStatus', error);

      return {
        provider: 'chatgpt',
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

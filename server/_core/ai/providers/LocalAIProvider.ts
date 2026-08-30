import {
  BaseAIProvider,
  AIMessage,
  AIResponse,
  AIInvokeOptions,
  AIModel,
  AIProviderStatus,
} from './AIProvider';

export class LocalAIProvider extends BaseAIProvider {
  private models: AIModel[] = [
    {
      id: 'qwen2.5-coder:7b',
      name: 'Poipoi Local Model',
      provider: 'local',
      contextWindow: 32768,
      costPer1kPromptTokens: 0,
      costPer1kCompletionTokens: 0,
      capabilities: ['text', 'code-generation', 'reasoning'],
    },
  ];

  constructor(apiUrl: string = process.env.LOCAL_AI_URL || 'http://localhost:11434') {
    super('local', '', apiUrl.replace(/\/$/, ''));
  }

  getName(): string {
    return 'Poipoi Local AI';
  }

  async invoke(messages: AIMessage[], options?: AIInvokeOptions): Promise<AIResponse> {
    const requestId = this.generateRequestId();
    const model = options?.model || 'qwen2.5-coder:7b';

    try {
      const response = await globalThis.fetch(
        `${this.apiUrl}/api/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 2048,
            top_p: options?.topP ?? 0.9,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Local AI error: ${response.statusText} - ${errorData}`
        );
      }

      const data = await response.json() as any;

      return {
        id: requestId,
        provider: 'local',
        model,
        content: data.message?.content || data.choices?.[0]?.message?.content || '',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        timestamp: new Date(),
        metadata: {
          localId: data.id,
          finishReason: data.choices?.[0]?.finish_reason,
        },
      };
    } catch (error) {
      this.logError('invoke', error);
      throw error;
    }
  }

  async getModels(): Promise<AIModel[]> {
    return this.models;
  }

  async getStatus(): Promise<AIProviderStatus> {
    try {
      const response = await globalThis.fetch(
        `${this.apiUrl}/v1/models`
      );

      return {
        provider: 'local',
        isAvailable: response.ok,
        lastChecked: new Date(),
        modelsAvailable: response.ok ? this.models.length : 0,
        errorMessage: response.ok
          ? undefined
          : `API returned ${response.status}`,
      };
    } catch (error) {
      return {
        provider: 'local',
        isAvailable: false,
        lastChecked: new Date(),
        modelsAvailable: 0,
        errorMessage:
          error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async validateConfig(): Promise<boolean> {
    const status = await this.getStatus();
    return status.isAvailable;
  }
}


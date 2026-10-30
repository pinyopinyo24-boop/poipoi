import { invokeLLM } from '../../llm';
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
    const model = options?.model || process.env.LOCAL_CODER_MODEL || 'qwen2.5-coder:7b';
    const { PoiPoiIdentity } = await import('../../../core/PoiPoiIdentity');
    const response = await invokeLLM({
      model,
      temperature: options?.temperature,
      top_p: options?.topP,
      max_tokens: options?.maxTokens,
      messages: [
        { role: 'system', content: PoiPoiIdentity.getSystemPrompt() },
        ...messages,
      ],
    });
    const content = response.choices[0]?.message?.content;
    if (!content?.trim()) throw new Error('Local AI returned an empty response');
    return {
      id: requestId,
      provider: 'local',
      model: response.model,
      content,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      timestamp: new Date(),
    };
  }

  async getModels(): Promise<AIModel[]> {
    return this.models;
  }

  async getStatus(): Promise<AIProviderStatus> {
    let isConfigured = false;
    let isAvailable = false;
    let modelsAvailable = 0;
    let errorMessage: string | undefined;
    try {
      const url = new URL(this.apiUrl);
      isConfigured = url.protocol === 'http:' || url.protocol === 'https:';
      if (isConfigured) {
        const response = await globalThis.fetch(`${this.apiUrl}/api/tags`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error(`Ollama status ${response.status}`);
        const data = await response.json() as { models?: Array<{ name?: string }> };
        const models = Array.isArray(data.models) ? data.models : [];
        modelsAvailable = models.length;
        isAvailable = models.some(model => model.name === 'qwen2.5-coder:7b');
        if (!isAvailable) errorMessage = 'qwen2.5-coder:7b がインストールされていません';
      } else {
        errorMessage = 'ローカル推論サーバーのURL設定を確認してください';
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    return {
      provider: 'local',
      isAvailable,
      isConfigured,
      connectionVerified: isAvailable,
      lastChecked: new Date(),
      modelsAvailable,
      errorMessage,
    };
  }

  async validateConfig(): Promise<boolean> {
    return (await this.getStatus()).isConfigured === true;
  }
}

import { describeLocalAIError } from '../LocalAIError';
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
    super('local', '', apiUrl.trim().replace(/\/+$/, ''));
  }

  getName(): string {
    return 'Poipoi Local AI';
  }

  async invoke(messages: AIMessage[], options?: AIInvokeOptions): Promise<AIResponse> {
    const requestId = this.generateRequestId();
    const isChat = options?.metadata?.purpose === 'chat';
    const model = options?.model || (isChat ? this.chatModel() : process.env.LOCAL_CODER_MODEL || 'qwen2.5-coder:7b');
    const configuredOutput = Number(process.env.LOCAL_CHAT_MAX_TOKENS);
    // Keep caller limits and existing unlimited-output behavior unless a chat
    // output limit was explicitly configured.
    const maxTokens = options?.maxTokens ?? (isChat && Number.isFinite(configuredOutput) && configuredOutput > 0
      ? Math.min(8192, Math.max(1, Math.floor(configuredOutput))) : undefined);
    let contextWindow = options?.contextWindow;
    if (isChat && contextWindow === undefined) {
      const configuredContext = Number(process.env.LOCAL_CHAT_CONTEXT_SIZE ?? process.env.LOCAL_AI_CONTEXT_SIZE);
      if (Number.isFinite(configuredContext) && configuredContext >= 4096) {
        contextWindow = Math.min(32768, Math.floor(configuredContext));
      } else {
        // Estimate the actual conversation size; keep every supplied turn.
        let estimated = 1024 + (maxTokens ?? 2048);
        for (const message of messages) for (const char of message.content) estimated += char.codePointAt(0)! < 128 ? 0.35 : 1.3;
        contextWindow = estimated <= 8192 ? 8192 : estimated <= 16384 ? 16384 : 32768;
      }
    }
    const response = await invokeLLM({
      model,
      baseUrl: this.apiUrl,
      timeoutMs: options?.timeoutMs,
      contextWindow,
      learningContextIncluded: isChat,
      userId: typeof options?.metadata?.userId === 'string' ? options.metadata.userId : undefined,
      temperature: options?.temperature,
      top_p: options?.topP,
      max_tokens: maxTokens,
      messages,
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

  private chatModel(): string {
    return process.env.LOCAL_CHAT_MODEL?.trim() || process.env.LOCAL_CODER_MODEL?.trim() || 'qwen2.5-coder:7b';
  }

  async getModels(): Promise<AIModel[]> {
    return this.models;
  }

  async getStatus(): Promise<AIProviderStatus> {
    let isConfigured = false;
    let isAvailable = false;
    let modelsAvailable = 0;
    let connectionVerified = false;
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
        connectionVerified = true;
        const names = models.map(model => model.name).filter((name): name is string => typeof name === 'string' && Boolean(name.trim()));
        modelsAvailable = names.length;
        const canonical = (name: string) => name.includes(':') ? name : name + ':latest';
        isAvailable = names.some(name => canonical(name) === canonical(this.chatModel()));
        if (!isAvailable) errorMessage = '指定モデル「' + this.chatModel() + '」がインストールされていません';

      } else {
        errorMessage = 'ローカル推論サーバーのURL設定を確認してください';
      }
    } catch (error) {
      errorMessage = describeLocalAIError(error);
    }
    return {
      provider: 'local',
      isAvailable,
      isConfigured,
      connectionVerified,
      lastChecked: new Date(),
      modelsAvailable,
      errorMessage,
    };
  }

  async validateConfig(): Promise<boolean> {
    return (await this.getStatus()).isAvailable === true;
  }
}

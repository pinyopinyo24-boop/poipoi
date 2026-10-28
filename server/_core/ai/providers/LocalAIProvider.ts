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
          signal: AbortSignal.timeout(180000),
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content: (await import("../../../core/PoiPoiIdentity")).PoiPoiIdentity.getSystemPrompt(),
              },
              ...messages,
            ],
            options: { temperature: options?.temperature ?? 0.5, num_predict: options?.maxTokens ?? 2048, top_p: options?.topP ?? 0.9 },
            ...(messages.some(m => m.role === "system" && /JSON形式|JSON format|valid JSON|JSON object/i.test(m.content)) ? { format: "json" } : {}),
            stream: false,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Local AI error: ${response.statusText} - ${errorData}`
        );
      }

      const raw = await response.text();
      let data: any;
      try {
        data = JSON.parse(raw.trim());
      } catch {
        const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const last = lines[lines.length - 1];
        if (!last) throw new Error("Local AI response is empty");
        data = JSON.parse(last);
      }

      const content = data.message?.content || data.choices?.[0]?.message?.content || '';
      if (!content.trim()) throw new Error('Local AI returned an empty response');
      return {
        id: requestId,
        provider: 'local',
        model,
        content,
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

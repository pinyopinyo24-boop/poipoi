/**
 * AICore - Main AI integration hub
 * Provides unified interface for AI operations across PoiPoi OS
 */

import { IAIProvider, AIProviderType, AIProviderStatus } from './providers/AIProvider';
import { ChatGPTProvider } from './providers/ChatGPTProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { LocalAIProvider } from './providers/LocalAIProvider';
import { AgentManager, AgentManagerConfig, WorkflowStep, WorkflowResult } from './AgentManager';
import { BaseAgent, AgentType, AgentStatus, AgentExecutionResult } from './agents/BaseAgent';
import { getConnectionMonitor } from './ProviderConnectionMonitor';
import { ResilientAIProvider } from './ResilientAIProvider';
import { failsafeService } from '../../ai/FailsafeService';

export interface AICoreConfig {
  enableChatGPT: boolean;
  enableGemini: boolean;
  primaryProvider: AIProviderType;
  enableLogging: boolean;
}

/**
 * AICore - Main AI integration class
 */
export class AICore {
  private providers: Map<AIProviderType, IAIProvider> = new Map();
  private agentManager: AgentManager | null = null;
  private config: AICoreConfig;
  private initialized: boolean = false;
  private runtimeProvider: IAIProvider | null = null;
  private connectionMonitor = getConnectionMonitor();

  constructor(config: AICoreConfig) {
    this.config = config;
  }

  /**
   * Initialize AICore
   */
  async initialize(): Promise<void> {
    try {
      // Initialize providers
      if (this.config.enableChatGPT) {
        const apiKey = process.env.OPENAI_API_KEY || '';
        const isRealMode = !!(apiKey && apiKey !== 'demo-key');
        if (apiKey) {
          this.providers.set('chatgpt', new ChatGPTProvider(apiKey));
          this.connectionMonitor.registerProvider('ChatGPT', isRealMode ? 'real' : 'demo', isRealMode);
          console.log(`[AICore] ChatGPT provider initialized (${isRealMode ? 'real' : 'demo'} mode)`);
        } else {
          console.warn('[AICore] ChatGPT provider skipped - API key not found');
          this.connectionMonitor.registerProvider('ChatGPT', 'demo', false);
        }
      }

      if (this.config.enableGemini) {
        const apiKey = process.env.GEMINI_API_KEY || '';
        const isRealMode = !!(apiKey && apiKey !== 'demo-key');
        if (apiKey) {
          this.providers.set('gemini', new GeminiProvider(apiKey));
          this.connectionMonitor.registerProvider('Gemini', isRealMode ? 'real' : 'demo', isRealMode);
          console.log(`[AICore] Gemini provider initialized (${isRealMode ? 'real' : 'demo'} mode)`);
        } else {
          console.warn('[AICore] Gemini provider skipped - API key not found');
          this.connectionMonitor.registerProvider('Gemini', 'demo', false);
        }
      }

      // Get primary provider or use first available
      let primaryProvider = this.providers.get(this.config.primaryProvider);
      if (!primaryProvider && this.providers.size > 0) {
        console.warn(`[AICore] Primary provider '${this.config.primaryProvider}' not available, using first available`);
        primaryProvider = Array.from(this.providers.values())[0];
      }

      if (!primaryProvider) {
        console.warn('[AICore] No providers configured, using demo mode');
        // Use Ollama as local fallback
        primaryProvider = new LocalAIProvider(process.env.LOCAL_AI_URL || 'http://localhost:11434');
        this.providers.set('local', primaryProvider);
        this.connectionMonitor.registerProvider('Local', 'real', true);
      }

      // Skip validation for demo mode
      if (process.env.NODE_ENV !== 'development' || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
        const isValid = await primaryProvider.validateConfig();
        if (!isValid) {
          console.warn(`[AICore] Primary provider validation failed, continuing in demo mode`);
        }
      }

      const fallbackProviders = Array.from(this.providers.values()).filter(
        (provider) => provider.getProviderType() !== primaryProvider!.getProviderType(),
      );
      const resilientProvider = new ResilientAIProvider(primaryProvider, fallbackProviders);
      this.runtimeProvider = resilientProvider;

      // Initialize AgentManager using retry/fallback across configured existing providers.
      const managerConfig: AgentManagerConfig = {
        primaryProvider: resilientProvider,
        secondaryProvider: fallbackProviders[0],
        enableLogging: this.config.enableLogging,
        maxConcurrentTasks: 5,
      };

      this.agentManager = new AgentManager(managerConfig);
      this.initialized = true;

      console.log('[AICore] Initialization completed successfully');
    } catch (error) {
      console.error('[AICore] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if AICore is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get provider
   */
  getProvider(providerType: AIProviderType): IAIProvider | undefined {
    return this.providers.get(providerType);
  }

  /**
   * Get all providers
   */
  getAllProviders(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get primary provider
   */
  async invoke(messages: Parameters<IAIProvider["invoke"]>[0]): Promise<string> {
    if (!this.initialized || !this.runtimeProvider) {
      throw new Error("AICore is not initialized");
    }
    const response = await this.runtimeProvider.invoke(messages);
    return response.content;
  }
  getPrimaryProvider(): IAIProvider | undefined {
    return this.runtimeProvider || this.providers.get(this.config.primaryProvider);
  }

  /**
   * Get secondary provider
   */
  getSecondaryProvider(): IAIProvider | undefined {
    const primaryType = (this.runtimeProvider || this.providers.get(this.config.primaryProvider))?.getProviderType();
    let secondaryProvider: IAIProvider | undefined;
    this.providers.forEach((provider, type) => {
      if (type !== primaryType && !secondaryProvider) {
        secondaryProvider = provider;
      }
    });
    return secondaryProvider;
  }

  /**
   * Get provider status
   */
  async getProviderStatus(providerType: AIProviderType): Promise<AIProviderStatus | null> {
    const provider = this.providers.get(providerType);
    if (!provider) {
      return null;
    }
    return provider.getStatus();
  }

  /**
   * Get all provider statuses
   */
  async getAllProviderStatuses(): Promise<Record<AIProviderType, AIProviderStatus>> {
    const statuses: Record<string, AIProviderStatus> = {};
    await Promise.all(Array.from(this.providers.entries()).map(async ([type, provider]) => {
      try {
        statuses[type] = await provider.getStatus();
      } catch (error) {
        statuses[type] = {
          provider: type,
          isAvailable: false,
          lastChecked: new Date(),
          errorMessage: error instanceof Error ? error.message : String(error),
          modelsAvailable: 0,
        };
      }
    }));
    return statuses as Record<AIProviderType, AIProviderStatus>;
  }

  /**
   * Get agent manager
   */
  getAgentManager(): AgentManager | null {
    return this.agentManager;
  }

  /**
   * Get agent
   */
  getAgent(agentType: AgentType): BaseAgent | undefined {
    return this.agentManager?.getAgent(agentType);
  }

  /**
   * Get all agents
   */
  getAllAgents(): BaseAgent[] {
    return this.agentManager?.getAllAgents() || [];
  }

  /**
   * Get agent status
   */
  getAgentStatus(agentType: AgentType): AgentStatus | undefined {
    return this.agentManager?.getAgentStatus(agentType);
  }

  /**
   * Get all agent statuses
   */
  getAllAgentStatuses(): Record<AgentType, AgentStatus> {
    const defaultStatuses: Record<AgentType, AgentStatus> = {
      design: 'idle',
      implementation: 'idle',
      review: 'idle',
      task: 'idle',
      coordinator: 'idle',
    };
    return this.agentManager?.getAllAgentStatuses() || defaultStatuses;
  }

  /**
   * Execute task with agent
   */
  async executeTask(
    agentType: AgentType,
    description: string,
    input: Record<string, any>
  ): Promise<AgentExecutionResult> {
    if (!this.agentManager) {
      throw new Error('AgentManager not initialized');
    }
    return this.agentManager.executeTask(agentType, description, input);
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(
    workflowId: string,
    steps: WorkflowStep[]
  ): Promise<WorkflowResult> {
    if (!this.agentManager) {
      throw new Error('AgentManager not initialized');
    }
    return this.agentManager.executeWorkflow(workflowId, steps);
  }

  /**
   * Get workflow result
   */
  getWorkflowResult(workflowId: string): WorkflowResult | undefined {
    return this.agentManager?.getWorkflowResult(workflowId);
  }

  /**
   * Get system status
   */
  getSystemStatus(): Record<string, any> {
    return {
      initialized: this.initialized,
      providers: Array.from(this.providers.keys()),
      primaryProvider: this.config.primaryProvider,
      agentManager: this.agentManager?.getManagerStatus(),
      connectionStatus: this.connectionMonitor.getConnectionSummary(),
      failsafe: failsafeService.getStatistics(),
      circuitBreakers: failsafeService.getAllCircuitBreakerStates(),
    };
  }

  /**
   * Get connection monitor
   */
  getConnectionMonitor() {
    return this.connectionMonitor;
  }

  /**
   * Shutdown AICore
   */
  async shutdown(): Promise<void> {
    console.log('[AICore] Shutting down...');
    // Cleanup resources if needed
    this.initialized = false;
  }
}

/**
 * Global AICore instance
 */
let globalAICore: AICore | null = null;

/**
 * Initialize global AICore
 */
export async function initializeAICore(config?: Partial<AICoreConfig>): Promise<AICore> {
  if (globalAICore) {
    return globalAICore;
  }

  const defaultConfig: AICoreConfig = {
    enableChatGPT: !!process.env.OPENAI_API_KEY,
    enableGemini: !!process.env.GEMINI_API_KEY,
    primaryProvider: 'local',
    enableLogging: process.env.NODE_ENV !== 'production',
    ...config,
  };

  globalAICore = new AICore(defaultConfig);
  await globalAICore.initialize();

  return globalAICore;
}

/**
 * Get global AICore instance
 */
export function getAICore(): AICore | null {
  return globalAICore;
}

/**
 * Shutdown global AICore
 */
export async function shutdownAICore(): Promise<void> {
  if (globalAICore) {
    await globalAICore.shutdown();
    globalAICore = null;
  }
}


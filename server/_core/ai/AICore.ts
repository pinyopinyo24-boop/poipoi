/**
 * AICore - Main AI integration hub
 * Provides unified interface for AI operations across PoiPoi OS
 */

import { IAIProvider, AIProviderType, AIProviderStatus } from './providers/AIProvider';
import { ChatGPTProvider } from './providers/ChatGPTProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { AgentManager, AgentManagerConfig, WorkflowStep, WorkflowResult } from './AgentManager';
import { BaseAgent, AgentType, AgentStatus, AgentExecutionResult } from './agents/BaseAgent';

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
        if (apiKey) {
          this.providers.set('chatgpt', new ChatGPTProvider(apiKey));
          console.log('[AICore] ChatGPT provider initialized');
        } else {
          console.warn('[AICore] ChatGPT provider skipped - API key not found');
        }
      }

      if (this.config.enableGemini) {
        const apiKey = process.env.GEMINI_API_KEY || '';
        if (apiKey) {
          this.providers.set('gemini', new GeminiProvider(apiKey));
          console.log('[AICore] Gemini provider initialized');
        } else {
          console.warn('[AICore] Gemini provider skipped - API key not found');
        }
      }

      // Get primary provider
      const primaryProvider = this.providers.get(this.config.primaryProvider);
      if (!primaryProvider) {
        throw new Error(`Primary provider '${this.config.primaryProvider}' not available`);
      }

      // Validate primary provider
      const isValid = await primaryProvider.validateConfig();
      if (!isValid) {
        throw new Error(`Primary provider '${this.config.primaryProvider}' validation failed`);
      }

      // Initialize AgentManager
      const managerConfig: AgentManagerConfig = {
        primaryProvider,
        secondaryProvider: this.getSecondaryProvider(),
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
  getPrimaryProvider(): IAIProvider | undefined {
    return this.providers.get(this.config.primaryProvider);
  }

  /**
   * Get secondary provider
   */
  getSecondaryProvider(): IAIProvider | undefined {
    const primaryType = this.config.primaryProvider;
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
    this.providers.forEach((provider, type) => {
      provider.getStatus().then(status => {
        statuses[type] = status;
      });
    });
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
    };
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
    primaryProvider: process.env.GEMINI_API_KEY ? 'gemini' : 'chatgpt',
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

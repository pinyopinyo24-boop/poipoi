/**
 * AICore - Main AI integration hub
 * Provides unified interface for AI operations across PoiPoi OS
 */

import { IAIProvider, AIProviderType, AIProviderStatus } from './providers/AIProvider';
import { ChatGPTProvider } from './providers/ChatGPTProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { AgentManager, AgentManagerConfig, WorkflowStep, WorkflowResult } from './AgentManager';
import { BaseAgent, AgentType, AgentStatus, AgentExecutionResult } from './agents/BaseAgent';
import { getConnectionMonitor } from './ProviderConnectionMonitor';

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
        // Use Gemini as fallback with demo key
        primaryProvider = new GeminiProvider('demo-key');
        this.providers.set('gemini', primaryProvider);
        this.connectionMonitor.registerProvider('Gemini', 'demo', false);
      }

      // Skip validation for demo mode
      if (process.env.NODE_ENV !== 'development' || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
        const isValid = await primaryProvider.validateConfig();
        if (!isValid) {
          console.warn(`[AICore] Primary provider validation failed, continuing in demo mode`);
        }
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
      connectionStatus: this.connectionMonitor.getConnectionSummary(),
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

/**
 * AICore - Main AI integration hub
 * Provides unified interface for AI operations across PoiPoi OS
 */

import { IAIProvider, AIProviderType, AIProviderStatus } from './providers/AIProvider';
import { ChatGPTProvider } from './providers/ChatGPTProvider';
import { LocalAIProvider } from './providers/LocalAIProvider';
import { AgentManager, AgentManagerConfig, WorkflowStep, WorkflowResult } from './AgentManager';
import { BaseAgent, AgentType, AgentStatus, AgentExecutionResult } from './agents/BaseAgent';
import { getConnectionMonitor } from './ProviderConnectionMonitor';
import { ResilientAIProvider } from './ResilientAIProvider';
import { failsafeService } from '../../ai/FailsafeService';

export interface AICoreConfig {
  enableChatGPT: boolean;
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
      // PoiPoi runs exclusively on the configured local Ollama provider.
      // Cloud credentials and caller-supplied provider flags cannot change routing.
      this.providers.clear();
      const primaryProvider = new LocalAIProvider(
        process.env.LOCAL_AI_URL || 'http://localhost:11434'
      );
      this.providers.set('local', primaryProvider);
      this.connectionMonitor.registerProvider('Local', 'real', true);

      // Skip validation for demo mode
      const isValid = await primaryProvider.validateConfig();
      if (!isValid) {
        throw new Error('[AICore] Local provider unavailable');
      }

      const fallbackProviders: IAIProvider[] = [];
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
    return this.runtimeProvider || this.providers.get('local');
  }

  /**
   * Get secondary provider
   */
  getSecondaryProvider(): IAIProvider | undefined {
    return undefined;
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
      primaryProvider: 'local',
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
    enableLogging: process.env.NODE_ENV !== 'production',
    ...config,
    primaryProvider: 'local',
    enableChatGPT: false,
  };

  const candidate = new AICore(defaultConfig);
  await candidate.initialize();
  globalAICore = candidate;
  return candidate;
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


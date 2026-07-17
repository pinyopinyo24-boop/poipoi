/**
 * PoipoiCore - PoiPoi System Core
 * システムコア - 全エンジン統合
 */

import PoipoiKernel from "./PoipoiKernel";
import BrainEngine from "./BrainEngine";
import EvolutionEngine from "./EvolutionEngine";
import MemoryEngine from "./MemoryEngine";
import LearningEngine from "./LearningEngine";
import ReasoningEngine from "./ReasoningEngine";
import PlanningEngine from "./PlanningEngine";
import AIManager from "./AIManager";

class PoipoiCore {
  private kernel: PoipoiKernel;
  private brain: BrainEngine;
  private evolution: EvolutionEngine;
  private memory: MemoryEngine;
  private learning: LearningEngine;
  private reasoning: ReasoningEngine;
  private planning: PlanningEngine;
  private aiManager: AIManager;
  private isInitialized: boolean = false;

  constructor() {
    this.kernel = new PoipoiKernel();
    this.brain = new BrainEngine();
    this.evolution = new EvolutionEngine();
    this.memory = new MemoryEngine();
    this.learning = new LearningEngine();
    this.reasoning = new ReasoningEngine();
    this.planning = new PlanningEngine();
    this.aiManager = new AIManager();

    this.kernel.getLogger().info("Core", "PoiPoi Core initialized");
  }

  getKernel(): PoipoiKernel {
    return this.kernel;
  }

  getBrain(): BrainEngine {
    return this.brain;
  }

  getEvolution(): EvolutionEngine {
    return this.evolution;
  }

  getMemory(): MemoryEngine {
    return this.memory;
  }

  getLearning(): LearningEngine {
    return this.learning;
  }

  getReasoning(): ReasoningEngine {
    return this.reasoning;
  }

  getPlanning(): PlanningEngine {
    return this.planning;
  }

  getAIManager(): AIManager {
    return this.aiManager;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.kernel.getLogger().warn("Core", "Core already initialized");
      return;
    }

    this.kernel.getLogger().info("Core", "Initializing PoiPoi Core...");

    await this.kernel.start();
    this.isInitialized = true;

    this.kernel.getEventBus().emit("core:initialized");
    this.kernel.getLogger().info("Core", "PoiPoi Core initialized successfully");
  }

  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      this.kernel.getLogger().warn("Core", "Core not initialized");
      return;
    }

    this.kernel.getLogger().info("Core", "Shutting down PoiPoi Core...");

    await this.kernel.stop();
    this.isInitialized = false;

    this.kernel.getEventBus().emit("core:shutdown");
    this.kernel.getLogger().info("Core", "PoiPoi Core shutdown complete");
  }

  isInitialized_(): boolean {
    return this.isInitialized;
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      kernel: this.kernel.getStatus(),
      brain: this.brain.getStats(),
      learning: this.learning.getSummary(),
      reasoning: this.reasoning.getStats(),
      planning: this.planning.getStats(),
    };
  }
}

export default PoipoiCore;

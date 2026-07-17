/**
 * PoiPoi - Core AI Platform
 * Integrates all engines: Evolution, Memory, CodeGenerator, Test, Plugin, Learning, Security, AI
 */

import EvolutionEngine from "./evolutionEngine";
import MemoryEngine from "./memoryEngine";
import CodeGenerator from "./codeGenerator";
import TestEngine from "./testEngine";
import PluginManager from "./pluginManager";
import LearningEngine from "./learningEngine";
import SecurityEngine from "./securityEngine";
import AIManager from "./aiManager";

export interface PoiPoiConfig {
  name?: string;
  version?: string;
  debug?: boolean;
}

class PoiPoi {
  private evolution: EvolutionEngine;
  private memory: MemoryEngine;
  private codeGen: CodeGenerator;
  private test: TestEngine;
  private plugins: PluginManager;
  private learning: LearningEngine;
  private security: SecurityEngine;
  private ai: AIManager;

  private config: Required<PoiPoiConfig>;
  private startTime: number;

  constructor(config: PoiPoiConfig = {}) {
    this.config = {
      name: config.name || "PoiPoi",
      version: config.version || "1.0.0",
      debug: config.debug || false,
    };

    this.startTime = Date.now();

    // Initialize all engines
    this.evolution = new EvolutionEngine();
    this.memory = new MemoryEngine();
    this.codeGen = new CodeGenerator();
    this.test = new TestEngine();
    this.plugins = new PluginManager();
    this.learning = new LearningEngine();
    this.security = new SecurityEngine();
    this.ai = new AIManager();

    this.log(`🚀 PoiPoi ${this.config.version} 初期化完了`);
  }

  /**
   * Get Evolution Engine
   */
  getEvolution(): EvolutionEngine {
    return this.evolution;
  }

  /**
   * Get Memory Engine
   */
  getMemory(): MemoryEngine {
    return this.memory;
  }

  /**
   * Get Code Generator
   */
  getCodeGenerator(): CodeGenerator {
    return this.codeGen;
  }

  /**
   * Get Test Engine
   */
  getTestEngine(): TestEngine {
    return this.test;
  }

  /**
   * Get Plugin Manager
   */
  getPluginManager(): PluginManager {
    return this.plugins;
  }

  /**
   * Get Learning Engine
   */
  getLearningEngine(): LearningEngine {
    return this.learning;
  }

  /**
   * Get Security Engine
   */
  getSecurityEngine(): SecurityEngine {
    return this.security;
  }

  /**
   * Get AI Manager
   */
  getAIManager(): AIManager {
    return this.ai;
  }

  /**
   * Log message
   */
  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[${this.config.name}] ${message}`);
    }
  }

  /**
   * Get platform status
   */
  getStatus() {
    const uptime = Date.now() - this.startTime;

    return {
      name: this.config.name,
      version: this.config.version,
      uptime: `${(uptime / 1000).toFixed(2)}s`,
      engines: {
        evolution: this.evolution.getStats(),
        memory: this.memory.stats(),
        codeGen: this.codeGen.getStats(),
        test: {
          total: this.test.getResults().length,
          passed: this.test.getResults().filter((r) => r.status === "PASS").length,
          failed: this.test.getFailedTests().length,
          successRate: this.test.getSuccessRate(),
        },
        plugins: this.plugins.getStats(),
        learning: this.learning.getSummary(),
        security: this.security.getStats(),
        ai: this.ai.getStats(),
      },
    };
  }

  /**
   * Get comprehensive report
   */
  getReport(): string {
    const status = this.getStatus();

    return `
╔════════════════════════════════════════════════════════════╗
║                   PoiPoi Platform Report                   ║
╚════════════════════════════════════════════════════════════╝

📊 プラットフォーム情報:
  名前: ${status.name}
  バージョン: ${status.version}
  稼働時間: ${status.uptime}

🧬 進化エンジン:
  成功: ${status.engines.evolution.successful}
  失敗: ${status.engines.evolution.failed}
  成功率: ${status.engines.evolution.successRate.toFixed(1)}%

💾 メモリエンジン:
  総記憶数: ${status.engines.memory.total}
  カテゴリ: ${status.engines.memory.categories.join(", ")}

🤖 コードジェネレータ:
  総生成数: ${status.engines.codeGen.total}
  言語: ${status.engines.codeGen.languages.join(", ")}

✓ テストエンジン:
  総テスト数: ${status.engines.test.total}
  成功: ${status.engines.test.passed}
  失敗: ${status.engines.test.failed}
  成功率: ${status.engines.test.successRate.toFixed(1)}%

🔌 プラグインマネージャー:
  総プラグイン数: ${status.engines.plugins.total}
  有効: ${status.engines.plugins.enabled}
  無効: ${status.engines.plugins.disabled}

📚 学習エンジン:
  総学習数: ${status.engines.learning.total}
  成功: ${status.engines.learning.success}
  失敗: ${status.engines.learning.fail}
  成功率: ${status.engines.learning.successRate}%

🔒 セキュリティエンジン:
  総ログ数: ${status.engines.security.totalLogs}
  コード検査: ${status.engines.security.codeScans}
  プラグイン検査: ${status.engines.security.pluginScans}

🤖 AIマネージャー:
  AIプロバイダー数: ${status.engines.ai.totalProviders}
  チャット数: ${status.engines.ai.chatCount}

═══════════════════════════════════════════════════════════════
`;
  }

  /**
   * Export all data
   */
  export() {
    return {
      platform: {
        name: this.config.name,
        version: this.config.version,
      },
      engines: {
        evolution: this.evolution.getStats(),
        memory: this.memory.getAll(),
        codeGen: this.codeGen.getHistory(),
        test: this.test.getResults(),
        plugins: this.plugins.getStats(),
        learning: this.learning.getRecords(),
        security: this.security.getLogs(),
        ai: this.ai.getChatHistory(),
      },
      exportedAt: new Date().toISOString(),
    };
  }
}

export default PoiPoi;

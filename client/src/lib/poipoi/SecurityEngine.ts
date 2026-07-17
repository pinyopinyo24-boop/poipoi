/**
 * Security Engine - PoiPoi AI Core
 * セキュリティ検査
 */

export interface SecurityIssue {
  level: "HIGH" | "MEDIUM" | "LOW";
  message: string;
}

export interface ScanResult {
  safe: boolean;
  issues?: SecurityIssue[];
}

class SecurityEngine {
  private blockedWords: string[] = [
    "eval(",
    "Function(",
    "document.write(",
    "innerHTML =",
    "child_process",
    "exec(",
    "spawn(",
  ];

  private logs: { date: string; type: string; message: string }[] = [];

  scanCode(code: string): ScanResult {
    const issues: SecurityIssue[] = [];

    this.blockedWords.forEach((word) => {
      if (code.includes(word)) {
        issues.push({
          level: "HIGH",
          message: `${word} が検出されました`,
        });
      }
    });

    const result: ScanResult = {
      safe: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
    };

    this.addLog("CODE_SCAN", `コード検査完了: ${result.safe ? "安全" : "問題あり"}`);

    return result;
  }

  scanPlugin(plugin: any): ScanResult {
    if (!plugin.id || !plugin.name) {
      this.addLog("PLUGIN_SCAN", "プラグイン情報不足");
      return {
        safe: false,
      };
    }

    this.addLog("PLUGIN_SCAN", `プラグイン検査完了: ${plugin.name}`);
    return {
      safe: true,
    };
  }

  addLog(type: string, message: string): void {
    this.logs.push({
      date: new Date().toISOString(),
      type,
      message,
    });

    console.log(`🔒 [${type}] ${message}`);
  }

  getLogs(): any[] {
    return [...this.logs];
  }

  getStats(): { totalLogs: number; codeScans: number; pluginScans: number } {
    return {
      totalLogs: this.logs.length,
      codeScans: this.logs.filter((l) => l.type === "CODE_SCAN").length,
      pluginScans: this.logs.filter((l) => l.type === "PLUGIN_SCAN").length,
    };
  }
}

export default SecurityEngine;

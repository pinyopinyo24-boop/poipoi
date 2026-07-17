/**
 * Security Engine for PoiPoi AI
 * Scans code and plugins for security issues
 */

export interface SecurityIssue {
  level: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  code?: string;
}

export interface ScanResult {
  safe: boolean;
  issues?: SecurityIssue[];
  reason?: string;
}

export interface SecurityLog {
  date: string;
  type: string;
  message: string;
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
    "require('fs')",
    "require('os')",
    "__proto__",
    "constructor",
    "prototype",
  ];

  private logs: SecurityLog[] = [];
  private maxLogs = 10000;

  /**
   * Scan code for security issues
   */
  scanCode(code: string): ScanResult {
    const issues: SecurityIssue[] = [];

    this.blockedWords.forEach((word) => {
      if (code.includes(word)) {
        issues.push({
          level: "HIGH",
          message: `${word} が検出されました`,
          code: word,
        });
      }
    });

    // Check for suspicious patterns
    if (code.includes("window.location") && code.includes("=")) {
      issues.push({
        level: "MEDIUM",
        message: "ウィンドウロケーション操作が検出されました",
      });
    }

    if (code.includes("localStorage") || code.includes("sessionStorage")) {
      issues.push({
        level: "LOW",
        message: "ストレージアクセスが検出されました",
      });
    }

    const result: ScanResult = {
      safe: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined,
    };

    this.addLog("CODE_SCAN", `コード検査完了: ${result.safe ? "安全" : "問題あり"}`);

    return result;
  }

  /**
   * Scan plugin for security issues
   */
  scanPlugin(plugin: any): ScanResult {
    if (!plugin.id || !plugin.name) {
      this.addLog("PLUGIN_SCAN", "プラグイン情報不足");
      return {
        safe: false,
        reason: "プラグイン情報不足",
      };
    }

    // Check if plugin has execute method
    if (plugin.execute && typeof plugin.execute === "string") {
      const scanResult = this.scanCode(plugin.execute);
      if (!scanResult.safe) {
        this.addLog("PLUGIN_SCAN", `危険なプラグイン検出: ${plugin.name}`);
        return scanResult;
      }
    }

    this.addLog("PLUGIN_SCAN", `プラグイン検査完了: ${plugin.name}`);
    return {
      safe: true,
    };
  }

  /**
   * Add security log
   */
  addLog(type: string, message: string): void {
    this.logs.push({
      date: new Date().toISOString(),
      type,
      message,
    });

    // Keep logs manageable
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    console.log(`🔒 [${type}] ${message}`);
  }

  /**
   * Get all security logs
   */
  getLogs(): SecurityLog[] {
    return [...this.logs];
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 10): SecurityLog[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get logs by type
   */
  getLogsByType(type: string): SecurityLog[] {
    return this.logs.filter((log) => log.type === type);
  }

  /**
   * Check permission
   */
  checkPermission(user: any, action: string): boolean {
    if (!user) {
      this.addLog("PERMISSION", `権限チェック失敗: ユーザーなし`);
      return false;
    }

    // Simple permission check
    const allowedActions = ["read", "write", "execute"];
    const hasPermission = allowedActions.includes(action);

    if (!hasPermission) {
      this.addLog("PERMISSION", `権限なし: ${user.name || "Unknown"} - ${action}`);
    }

    return hasPermission;
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    console.log("🧹 セキュリティログをクリアしました");
  }

  /**
   * Get security statistics
   */
  getStats() {
    const codeScans = this.getLogsByType("CODE_SCAN").length;
    const pluginScans = this.getLogsByType("PLUGIN_SCAN").length;
    const permissions = this.getLogsByType("PERMISSION").length;

    return {
      totalLogs: this.logs.length,
      codeScans,
      pluginScans,
      permissions,
      lastLog: this.logs[this.logs.length - 1],
    };
  }

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        logs: this.logs,
        stats: this.getStats(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

export default SecurityEngine;

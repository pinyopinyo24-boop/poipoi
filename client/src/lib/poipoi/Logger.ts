/**
 * Logger - PoiPoi System Core
 * ログシステム
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  log(level: LogLevel, module: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    };

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    console.log(`[${level}] [${module}] ${message}`, data || "");
  }

  debug(module: string, message: string, data?: any): void {
    this.log("DEBUG", module, message, data);
  }

  info(module: string, message: string, data?: any): void {
    this.log("INFO", module, message, data);
  }

  warn(module: string, message: string, data?: any): void {
    this.log("WARN", module, message, data);
  }

  error(module: string, message: string, data?: any): void {
    this.log("ERROR", module, message, data);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (!level) return [...this.logs];
    return this.logs.filter((log) => log.level === level);
  }

  getByModule(module: string): LogEntry[] {
    return this.logs.filter((log) => log.module === module);
  }

  clear(): void {
    this.logs = [];
  }

  export(): LogEntry[] {
    return [...this.logs];
  }
}

export default Logger;

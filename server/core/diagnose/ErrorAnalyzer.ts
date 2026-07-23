import { SecurityEngine } from '../security/SecurityEngine';

/**
 * Error Entry
 */
export interface ErrorEntry {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  resolved: boolean;
}

/**
 * Error Analysis
 */
export interface ErrorAnalysis {
  totalErrors: number;
  errorsByComponent: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorsByCategory: Record<string, number>;
  mostCommonErrors: Array<{ message: string; count: number }>;
  recentErrors: ErrorEntry[];
}

/**
 * Error Analyzer
 */
export class ErrorAnalyzer {
  private static instance: ErrorAnalyzer;
  private securityEngine: SecurityEngine;
  private errorLog: ErrorEntry[];

  private constructor() {
    this.securityEngine = new SecurityEngine();
    this.errorLog = [];
  }

  public static getInstance(): ErrorAnalyzer {
    if (!ErrorAnalyzer.instance) {
      ErrorAnalyzer.instance = new ErrorAnalyzer();
    }
    return ErrorAnalyzer.instance;
  }

  /**
   * Log error
   */
  public async logError(
    userId: string,
    message: string,
    component: string,
    stack?: string
  ): Promise<ErrorEntry> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'error:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to log errors');
    }

    // Classify error
    const { severity, category } = this.classifyError(message);

    const error: ErrorEntry = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      message,
      stack,
      component,
      severity,
      category,
      resolved: false,
    };

    this.errorLog.push(error);

    // Log to security
    await this.securityEngine.logSecurityEvent('ERROR_LOGGED', userId, {
      errorId: error.id,
      component,
      severity,
      category,
    });

    return error;
  }

  /**
   * Classify error
   */
  private classifyError(message: string): { severity: 'low' | 'medium' | 'high' | 'critical'; category: string } {
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium' as const;
    let category = 'unknown';

    const lowerMessage = message.toLowerCase();

    // Determine severity
    if (
      lowerMessage.includes('critical') ||
      lowerMessage.includes('fatal') ||
      lowerMessage.includes('crash')
    ) {
      severity = 'critical';
    } else if (
      lowerMessage.includes('error') ||
      lowerMessage.includes('fail') ||
      lowerMessage.includes('exception')
    ) {
      severity = 'high';
    } else if (lowerMessage.includes('warning') || lowerMessage.includes('warn')) {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    // Determine category
    if (lowerMessage.includes('database') || lowerMessage.includes('db')) {
      category = 'database';
    } else if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      category = 'network';
    } else if (lowerMessage.includes('authentication') || lowerMessage.includes('auth')) {
      category = 'authentication';
    } else if (lowerMessage.includes('permission') || lowerMessage.includes('access')) {
      category = 'authorization';
    } else if (lowerMessage.includes('memory') || lowerMessage.includes('heap')) {
      category = 'memory';
    } else if (lowerMessage.includes('timeout')) {
      category = 'timeout';
    } else if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      category = 'validation';
    } else {
      category = 'other';
    }

    return { severity, category };
  }

  /**
   * Analyze errors
   */
  public async analyzeErrors(userId: string): Promise<ErrorAnalysis> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'error:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read error analysis');
    }

    const analysis: ErrorAnalysis = {
      totalErrors: this.errorLog.length,
      errorsByComponent: {},
      errorsBySeverity: {},
      errorsByCategory: {},
      mostCommonErrors: [],
      recentErrors: this.errorLog.slice(-10),
    };

    // Count errors by component
    this.errorLog.forEach((error) => {
      analysis.errorsByComponent[error.component] =
        (analysis.errorsByComponent[error.component] || 0) + 1;
      analysis.errorsBySeverity[error.severity] =
        (analysis.errorsBySeverity[error.severity] || 0) + 1;
      analysis.errorsByCategory[error.category] =
        (analysis.errorsByCategory[error.category] || 0) + 1;
    });

    // Find most common errors
    const errorCounts: Record<string, number> = {};
    this.errorLog.forEach((error) => {
      errorCounts[error.message] = (errorCounts[error.message] || 0) + 1;
    });

    analysis.mostCommonErrors = Object.entries(errorCounts)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return analysis;
  }

  /**
   * Get errors by component
   */
  public async getErrorsByComponent(userId: string, component: string): Promise<ErrorEntry[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'error:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read errors');
    }

    return this.errorLog.filter((e) => e.component === component);
  }

  /**
   * Get errors by severity
   */
  public async getErrorsBySeverity(
    userId: string,
    severity: string
  ): Promise<ErrorEntry[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'error:read');
    if (!hasPermission) {
      throw new Error('User does not have permission to read errors');
    }

    return this.errorLog.filter((e) => e.severity === severity);
  }

  /**
   * Resolve error
   */
  public async resolveError(userId: string, errorId: string): Promise<void> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(userId, 'error:write');
    if (!hasPermission) {
      throw new Error('User does not have permission to resolve errors');
    }

    const error = this.errorLog.find((e) => e.id === errorId);
    if (!error) {
      throw new Error('Error not found');
    }

    error.resolved = true;

    await this.securityEngine.logSecurityEvent('ERROR_RESOLVED', userId, {
      errorId,
      component: error.component,
    });
  }

  /**
   * Clear all data (for testing)
   */
  public clearAllData(): void {
    this.errorLog = [];
  }
}

import { SecurityEngine } from '../security/SecurityEngine';
import { MemoryEngine } from '../memory/MemoryEngine';
import { KnowledgeEngine } from '../knowledge/KnowledgeEngine';

/**
 * System Health Status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown',
}

/**
 * Diagnostic Report
 */
export interface DiagnosticReport {
  id: string;
  timestamp: number;
  status: HealthStatus;
  components: ComponentDiagnosis[];
  issues: Issue[];
  recommendations: string[];
  overallScore: number;
}

/**
 * Component Diagnosis
 */
export interface ComponentDiagnosis {
  name: string;
  status: HealthStatus;
  metrics: Record<string, any>;
  lastCheck: number;
  issues: string[];
}

/**
 * Issue
 */
export interface Issue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  description: string;
  timestamp: number;
  resolved: boolean;
}

/**
 * Self Diagnose Engine
 */
export class SelfDiagnoseEngine {
  private static instance: SelfDiagnoseEngine;
  private securityEngine: SecurityEngine;
  private memoryEngine: MemoryEngine;
  private knowledgeEngine: KnowledgeEngine;
  private diagnosticHistory: DiagnosticReport[];
  private issueHistory: Issue[];

  private constructor() {
    this.securityEngine = new SecurityEngine();
    this.memoryEngine = MemoryEngine.getInstance();
    this.knowledgeEngine = KnowledgeEngine.getInstance();
    this.diagnosticHistory = [];
    this.issueHistory = [];
  }

  public static getInstance(): SelfDiagnoseEngine {
    if (!SelfDiagnoseEngine.instance) {
      SelfDiagnoseEngine.instance = new SelfDiagnoseEngine();
    }
    return SelfDiagnoseEngine.instance;
  }

  /**
   * Run full system diagnosis
   */
  public async runFullDiagnosis(userId: string): Promise<DiagnosticReport> {
    // Initialize security engine if needed
    if (!this.securityEngine.isReady()) {
      await this.securityEngine.initialize();
    }

    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(
      userId,
      'diagnose:read'
    );
    if (!hasPermission) {
      throw new Error('User does not have permission to run diagnostics');
    }

    const report: DiagnosticReport = {
      id: `diag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      status: HealthStatus.HEALTHY,
      components: [],
      issues: [],
      recommendations: [],
      overallScore: 100,
    };

    // Diagnose each component
    const securityDiag = await this.diagnoseSecurity();
    const memoryDiag = await this.diagnoseMemory();
    const knowledgeDiag = await this.diagnoseKnowledge();

    report.components.push(securityDiag, memoryDiag, knowledgeDiag);

    // Aggregate issues
    report.components.forEach((comp) => {
      report.issues.push(
        ...comp.issues.map((issue) => ({
          id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          severity: (comp.status === HealthStatus.CRITICAL ? 'critical' : 'medium') as 'low' | 'medium' | 'high' | 'critical',
          component: comp.name,
          description: issue,
          timestamp: Date.now(),
          resolved: false,
        }))
      );
    });

    // Determine overall status
    const hassCritical = report.components.some((c) => c.status === HealthStatus.CRITICAL);
    const hasWarning = report.components.some((c) => c.status === HealthStatus.WARNING);

    if (hassCritical) {
      report.status = HealthStatus.CRITICAL;
      report.overallScore = 30;
    } else if (hasWarning) {
      report.status = HealthStatus.WARNING;
      report.overallScore = 70;
    }

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    // Save to history
    this.diagnosticHistory.push(report);
    this.issueHistory.push(...report.issues);

    // Save to memory
    await this.memoryEngine.setMemory(userId, `diagnostic_${report.id}`, report);

    // Log to security
    await this.securityEngine.logSecurityEvent('DIAGNOSIS_RUN', userId, {
      reportId: report.id,
      status: report.status,
      issueCount: report.issues.length,
    });

    return report;
  }

  /**
   * Diagnose Security Engine
   */
  private async diagnoseSecurity(): Promise<ComponentDiagnosis> {
    const diagnosis: ComponentDiagnosis = {
      name: 'SecurityEngine',
      status: HealthStatus.HEALTHY,
      metrics: {
        isReady: this.securityEngine.isReady(),
        contextCount: (this.securityEngine as any).userContexts?.size || 0,
        eventLogSize: (this.securityEngine as any).securityLog?.length || 0,
      },
      lastCheck: Date.now(),
      issues: [],
    };

    // Check if initialized
    if (!this.securityEngine.isReady()) {
      diagnosis.status = HealthStatus.WARNING;
      diagnosis.issues.push('SecurityEngine not initialized');
    }

    // Check event log size
    const logSize = (this.securityEngine as any).securityLog?.length || 0;
    if (logSize > 10000) {
      diagnosis.status = HealthStatus.WARNING;
      diagnosis.issues.push(`Security log size is large: ${logSize} events`);
    }

    return diagnosis;
  }

  /**
   * Diagnose Memory Engine
   */
  private async diagnoseMemory(): Promise<ComponentDiagnosis> {
    const diagnosis: ComponentDiagnosis = {
      name: 'MemoryEngine',
      status: HealthStatus.HEALTHY,
      metrics: {
        userCount: (this.memoryEngine as any).memory?.size || 0,
        totalMemoryEntries: this.countMemoryEntries(),
      },
      lastCheck: Date.now(),
      issues: [],
    };

    // Check memory size
    const totalEntries = this.countMemoryEntries();
    if (totalEntries > 5000) {
      diagnosis.status = HealthStatus.WARNING;
      diagnosis.issues.push(`Memory entries exceed threshold: ${totalEntries}`);
    }

    return diagnosis;
  }

  /**
   * Diagnose Knowledge Engine
   */
  private async diagnoseKnowledge(): Promise<ComponentDiagnosis> {
    const diagnosis: ComponentDiagnosis = {
      name: 'KnowledgeEngine',
      status: HealthStatus.HEALTHY,
      metrics: {
        knowledgeCount: (this.knowledgeEngine as any).knowledge?.size || 0,
        graphNodeCount: (this.knowledgeEngine as any).graph?.nodes?.size || 0,
      },
      lastCheck: Date.now(),
      issues: [],
    };

    // Check knowledge base size
    const knowledgeCount = (this.knowledgeEngine as any).knowledge?.size || 0;
    if (knowledgeCount > 10000) {
      diagnosis.status = HealthStatus.WARNING;
      diagnosis.issues.push(`Knowledge base is large: ${knowledgeCount} items`);
    }

    return diagnosis;
  }

  /**
   * Count total memory entries
   */
  private countMemoryEntries(): number {
    let total = 0;
    const memory = (this.memoryEngine as any).memory as Map<string, any>;
    if (memory) {
      for (const userMemory of Array.from(memory.values())) {
        total += Object.keys(userMemory).length;
      }
    }
    return total;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(report: DiagnosticReport): string[] {
    const recommendations: string[] = [];

    // Check for critical issues
    const criticalIssues = report.issues.filter((i) => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push('Immediate action required: Critical issues detected');
      recommendations.push('Review security logs for unauthorized access attempts');
    }

    // Check for memory issues
    const memoryIssues = report.issues.filter((i) => i.component === 'MemoryEngine');
    if (memoryIssues.length > 0) {
      recommendations.push('Consider clearing old memory entries');
      recommendations.push('Review memory usage patterns');
    }

    // Check for knowledge issues
    const knowledgeIssues = report.issues.filter((i) => i.component === 'KnowledgeEngine');
    if (knowledgeIssues.length > 0) {
      recommendations.push('Archive old knowledge entries');
      recommendations.push('Optimize knowledge graph structure');
    }

    // General recommendations
    if (report.overallScore < 50) {
      recommendations.push('System requires maintenance');
      recommendations.push('Schedule system optimization');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is operating normally');
      recommendations.push('Continue monitoring for changes');
    }

    return recommendations;
  }

  /**
   * Get diagnostic history
   */
  public async getDiagnosticHistory(
    userId: string,
    limit: number = 10
  ): Promise<DiagnosticReport[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(
      userId,
      'diagnose:read'
    );
    if (!hasPermission) {
      throw new Error('User does not have permission to read diagnostic history');
    }

    return this.diagnosticHistory.slice(-limit);
  }

  /**
   * Get issues
   */
  public async getIssues(userId: string, resolved?: boolean): Promise<Issue[]> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(
      userId,
      'diagnose:read'
    );
    if (!hasPermission) {
      throw new Error('User does not have permission to read issues');
    }

    if (resolved !== undefined) {
      return this.issueHistory.filter((i) => i.resolved === resolved);
    }

    return this.issueHistory;
  }

  /**
   * Resolve issue
   */
  public async resolveIssue(userId: string, issueId: string): Promise<void> {
    // Security check
    const hasPermission = await this.securityEngine.checkAuthorization(
      userId,
      'diagnose:write'
    );
    if (!hasPermission) {
      throw new Error('User does not have permission to resolve issues');
    }

    const issue = this.issueHistory.find((i) => i.id === issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    issue.resolved = true;

    await this.securityEngine.logSecurityEvent('ISSUE_RESOLVED', userId, {
      issueId,
      component: issue.component,
    });
  }

  /**
   * Clear all data (for testing)
   */
  public clearAllData(): void {
    this.diagnosticHistory = [];
    this.issueHistory = [];
  }
}

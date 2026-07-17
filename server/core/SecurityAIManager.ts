/**
 * SecurityAIManager - エンタープライズセキュリティ管理
 * ユーザー権限、データアクセス制御、リスク検出
 */

export interface UserPermission {
  userId: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  permissions: string[];
  dataAccessLevel: 'full' | 'department' | 'limited' | 'none';
  timestamp: number;
}

export interface DataAccessControl {
  resourceId: string;
  resourceType: 'document' | 'data' | 'system' | 'report';
  allowedRoles: string[];
  allowedUsers: string[];
  accessLevel: 'public' | 'internal' | 'restricted' | 'confidential';
  timestamp: number;
}

export interface SecurityEvent {
  id: string;
  userId: string;
  action: string;
  resource: string;
  result: 'success' | 'denied' | 'error';
  timestamp: number;
  details?: string;
}

export interface RiskAlert {
  id: string;
  type: 'unauthorized_access' | 'suspicious_activity' | 'policy_violation' | 'anomaly';
  severity: 'critical' | 'high' | 'medium' | 'low';
  userId?: string;
  description: string;
  timestamp: number;
  resolved: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  changes?: Record<string, unknown>;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
}

export class SecurityAIManager {
  private permissions: Map<string, UserPermission> = new Map();
  private accessControls: Map<string, DataAccessControl> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private riskAlerts: RiskAlert[] = [];
  private auditLogs: AuditLog[] = [];
  private securityMetrics: Map<string, number> = new Map();

  constructor() {
    this.initializeMetrics();
  }

  /**
   * メトリクスを初期化
   */
  private initializeMetrics(): void {
    this.securityMetrics.set('totalEvents', 0);
    this.securityMetrics.set('deniedAccess', 0);
    this.securityMetrics.set('riskAlerts', 0);
    this.securityMetrics.set('securityScore', 100);
  }

  /**
   * ユーザー権限を設定
   */
  setUserPermission(permission: Omit<UserPermission, 'timestamp'>): string {
    const perm: UserPermission = {
      ...permission,
      timestamp: Date.now(),
    };

    this.permissions.set(permission.userId, perm);
    return permission.userId;
  }

  /**
   * ユーザー権限を取得
   */
  getUserPermission(userId: string): UserPermission | undefined {
    return this.permissions.get(userId);
  }

  /**
   * アクセス制御を設定
   */
  setAccessControl(control: Omit<DataAccessControl, 'timestamp'>): string {
    const ac: DataAccessControl = {
      ...control,
      timestamp: Date.now(),
    };

    this.accessControls.set(control.resourceId, ac);
    return control.resourceId;
  }

  /**
   * アクセス権限を確認
   */
  checkAccess(userId: string, resourceId: string): boolean {
    const permission = this.permissions.get(userId);
    const control = this.accessControls.get(resourceId);

    if (!permission || !control) {
      return false;
    }

    // ロールベースチェック
    if (control.allowedRoles.includes(permission.role)) {
      return true;
    }

    // ユーザーベースチェック
    if (control.allowedUsers.includes(userId)) {
      return true;
    }

    // データアクセスレベルチェック
    const levelMap = { full: 4, department: 3, limited: 2, none: 0 };
    const accessMap = { public: 0, internal: 1, restricted: 2, confidential: 3 };

    return levelMap[permission.dataAccessLevel] >= accessMap[control.accessLevel];
  }

  /**
   * セキュリティイベントを記録
   */
  recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): string {
    const id = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const secEvent: SecurityEvent = {
      ...event,
      id,
      timestamp: Date.now(),
    };

    this.securityEvents.push(secEvent);

    // メトリクスを更新
    this.securityMetrics.set('totalEvents', (this.securityMetrics.get('totalEvents') || 0) + 1);
    if (event.result === 'denied') {
      this.securityMetrics.set('deniedAccess', (this.securityMetrics.get('deniedAccess') || 0) + 1);
    }

    return id;
  }

  /**
   * リスク検出
   */
  detectRisks(): RiskAlert[] {
    const alerts: RiskAlert[] = [];

    // 不正アクセス試行を検出
    const deniedCount = this.securityEvents.filter((e) => e.result === 'denied').length;
    if (deniedCount > 10) {
      alerts.push({
        id: `alert-${Date.now()}-1`,
        type: 'unauthorized_access',
        severity: 'high',
        description: `Multiple unauthorized access attempts detected (${deniedCount} attempts)`,
        timestamp: Date.now(),
        resolved: false,
      });
    }

    // 異常なアクティビティを検出
    const recentEvents = this.securityEvents.slice(-20);
    const errorCount = recentEvents.filter((e) => e.result === 'error').length;
    if (errorCount > 5) {
      alerts.push({
        id: `alert-${Date.now()}-2`,
        type: 'suspicious_activity',
        severity: 'medium',
        description: `Unusual error rate detected (${errorCount} errors in recent events)`,
        timestamp: Date.now(),
        resolved: false,
      });
    }

    // ポリシー違反を検出
    this.permissions.forEach((perm) => {
      if (perm.dataAccessLevel === 'none' && perm.permissions.length > 0) {
        alerts.push({
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'policy_violation',
          severity: 'medium',
          userId: perm.userId,
          description: `User with no data access has permissions assigned`,
          timestamp: Date.now(),
          resolved: false,
        });
      }
    });

    this.riskAlerts = alerts;
    this.securityMetrics.set('riskAlerts', alerts.length);

    return alerts;
  }

  /**
   * 監査ログを記録
   */
  recordAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): string {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const auditLog: AuditLog = {
      ...log,
      id,
      timestamp: Date.now(),
    };

    this.auditLogs.push(auditLog);
    return id;
  }

  /**
   * セキュリティスコアを計算
   */
  calculateSecurityScore(): number {
    let score = 100;

    // 不正アクセス試行によるペナルティ
    const deniedCount = this.securityMetrics.get('deniedAccess') || 0;
    score -= Math.min(deniedCount * 2, 30);

    // リスクアラートによるペナルティ
    const alertCount = this.securityMetrics.get('riskAlerts') || 0;
    score -= Math.min(alertCount * 5, 30);

    // ポリシー違反によるペナルティ
    let violationCount = 0;
    this.permissions.forEach((perm) => {
      if (perm.dataAccessLevel === 'none' && perm.permissions.length > 0) {
        violationCount++;
      }
    });
    score -= Math.min(violationCount * 3, 20);

    // 最小スコアは0
    return Math.max(score, 0);
  }

  /**
   * AI操作のセキュリティを検証
   */
  validateAIAction(userId: string, action: string, resource: string): {
    allowed: boolean;
    reason?: string;
  } {
    const permission = this.permissions.get(userId);

    if (!permission) {
      return { allowed: false, reason: 'User not found' };
    }

    // 管理者は全て許可
    if (permission.role === 'admin') {
      return { allowed: true };
    }

    // 権限チェック
    if (!permission.permissions.includes(action)) {
      return { allowed: false, reason: `User lacks permission for ${action}` };
    }

    // リソースアクセスチェック
    if (!this.checkAccess(userId, resource)) {
      return { allowed: false, reason: `User cannot access resource ${resource}` };
    }

    return { allowed: true };
  }

  /**
   * セキュリティイベント履歴を取得
   */
  getSecurityEventHistory(limit: number = 10): SecurityEvent[] {
    return this.securityEvents.slice(-limit).reverse();
  }

  /**
   * リスクアラートを取得
   */
  getRiskAlerts(resolved: boolean = false): RiskAlert[] {
    return this.riskAlerts.filter((a) => a.resolved === resolved);
  }

  /**
   * アラートを解決
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.riskAlerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * 監査ログを取得
   */
  getAuditLogs(userId?: string, limit: number = 10): AuditLog[] {
    let logs = this.auditLogs;

    if (userId) {
      logs = logs.filter((l) => l.userId === userId);
    }

    return logs.slice(-limit).reverse();
  }

  /**
   * セキュリティメトリクスを取得
   */
  getSecurityMetrics(): Record<string, number> {
    const metrics = new Map(this.securityMetrics);

    metrics.set('totalEvents', this.securityEvents.length);
    metrics.set('riskAlerts', this.riskAlerts.filter((a) => !a.resolved).length);
    metrics.set('securityScore', this.calculateSecurityScore());
    metrics.set('totalUsers', this.permissions.size);
    metrics.set('totalResources', this.accessControls.size);

    return Object.fromEntries(metrics);
  }

  /**
   * セキュリティレポートを生成
   */
  generateSecurityReport(): {
    score: number;
    totalEvents: number;
    deniedAccess: number;
    riskAlerts: number;
    auditLogs: number;
    recommendations: string[];
  } {
    const score = this.calculateSecurityScore();
    const totalEvents = this.securityEvents.length;
    const deniedAccess = this.securityEvents.filter((e) => e.result === 'denied').length;
    const riskAlerts = this.riskAlerts.filter((a) => !a.resolved).length;
    const auditLogs = this.auditLogs.length;

    const recommendations: string[] = [];

    if (score < 70) {
      recommendations.push('Immediate security review required');
    }

    if (deniedAccess > 10) {
      recommendations.push('Investigate unauthorized access attempts');
    }

    if (riskAlerts > 5) {
      recommendations.push('Address active security alerts');
    }

    if (this.permissions.size === 0) {
      recommendations.push('Configure user permissions');
    }

    return {
      score,
      totalEvents,
      deniedAccess,
      riskAlerts,
      auditLogs,
      recommendations,
    };
  }

  /**
   * データをエクスポート
   */
  export(): {
    permissions: UserPermission[];
    accessControls: DataAccessControl[];
    events: SecurityEvent[];
    alerts: RiskAlert[];
    logs: AuditLog[];
  } {
    return {
      permissions: Array.from(this.permissions.values()),
      accessControls: Array.from(this.accessControls.values()),
      events: this.securityEvents,
      alerts: this.riskAlerts,
      logs: this.auditLogs,
    };
  }

  /**
   * データをインポート
   */
  import(data: {
    permissions?: UserPermission[];
    accessControls?: DataAccessControl[];
    events?: SecurityEvent[];
    alerts?: RiskAlert[];
    logs?: AuditLog[];
  }): void {
    if (data.permissions) {
      this.permissions.clear();
      data.permissions.forEach((p) => this.permissions.set(p.userId, p));
    }

    if (data.accessControls) {
      this.accessControls.clear();
      data.accessControls.forEach((ac) => this.accessControls.set(ac.resourceId, ac));
    }

    if (data.events) {
      this.securityEvents = data.events;
    }

    if (data.alerts) {
      this.riskAlerts = data.alerts;
    }

    if (data.logs) {
      this.auditLogs = data.logs;
    }
  }

  /**
   * データをクリア
   */
  clear(): void {
    this.permissions.clear();
    this.accessControls.clear();
    this.securityEvents = [];
    this.riskAlerts = [];
    this.auditLogs = [];
    this.initializeMetrics();
  }
}

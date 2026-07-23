/**
 * MemoryOptimizationService
 * メモリ使用量最適化・ガベージコレクション・メモリリーク検出
 */

export interface MemoryProfile {
  profileId: string;
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  status: 'optimal' | 'good' | 'warning' | 'critical';
}

export interface MemoryOptimization {
  optimizationId: string;
  timestamp: number;
  optimizationType: 'gc' | 'cache_clear' | 'buffer_pool' | 'lazy_load' | 'compression';
  targetComponent: string;
  memoryFreed: number;
  duration: number;
  success: boolean;
}

export interface MemoryLeak {
  leakId: string;
  timestamp: number;
  component: string;
  growthRate: number;
  estimatedLeakSize: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'confirmed' | 'fixed';
}

export class MemoryOptimizationService {
  private memoryProfiles: Map<string, MemoryProfile> = new Map();
  private optimizations: Map<string, MemoryOptimization> = new Map();
  private leaks: Map<string, MemoryLeak> = new Map();
  private profilesByStatus: Map<string, string[]> = new Map();
  private leaksByComponent: Map<string, string[]> = new Map();

  /**
   * メモリプロファイルを記録
   */
  recordMemoryProfile(
    heapUsed: number,
    heapTotal: number,
    external: number,
    rss: number,
    arrayBuffers: number
  ): MemoryProfile {
    const profileId = `MP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let status: 'optimal' | 'good' | 'warning' | 'critical' = 'optimal';
    const heapUsagePercent = (heapUsed / heapTotal) * 100;
    
    if (heapUsagePercent > 90) status = 'critical';
    else if (heapUsagePercent > 75) status = 'warning';
    else if (heapUsagePercent > 50) status = 'good';

    const profile: MemoryProfile = {
      profileId,
      timestamp: Date.now(),
      heapUsed,
      heapTotal,
      external,
      rss,
      arrayBuffers,
      status,
    };

    this.memoryProfiles.set(profileId, profile);

    if (!this.profilesByStatus.has(status)) {
      this.profilesByStatus.set(status, []);
    }
    this.profilesByStatus.get(status)!.push(profileId);

    return profile;
  }

  /**
   * メモリプロファイルを取得
   */
  getMemoryProfile(profileId: string): MemoryProfile | undefined {
    return this.memoryProfiles.get(profileId);
  }

  /**
   * ステータス別プロファイルを取得
   */
  getProfilesByStatus(status: string): MemoryProfile[] {
    const ids = this.profilesByStatus.get(status) || [];
    return ids
      .map(id => this.memoryProfiles.get(id))
      .filter((p): p is MemoryProfile => p !== undefined);
  }

  /**
   * 最新メモリプロファイルを取得
   */
  getLatestMemoryProfile(): MemoryProfile | undefined {
    const all = Array.from(this.memoryProfiles.values());
    if (all.length === 0) return undefined;
    return all.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  /**
   * メモリ最適化を実行
   */
  recordOptimization(
    optimizationType: 'gc' | 'cache_clear' | 'buffer_pool' | 'lazy_load' | 'compression',
    targetComponent: string,
    memoryFreed: number,
    duration: number,
    success: boolean
  ): MemoryOptimization {
    const optimizationId = `MO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const optimization: MemoryOptimization = {
      optimizationId,
      timestamp: Date.now(),
      optimizationType,
      targetComponent,
      memoryFreed,
      duration,
      success,
    };

    this.optimizations.set(optimizationId, optimization);
    return optimization;
  }

  /**
   * メモリ最適化を取得
   */
  getOptimization(optimizationId: string): MemoryOptimization | undefined {
    return this.optimizations.get(optimizationId);
  }

  /**
   * 全最適化を取得
   */
  getAllOptimizations(): MemoryOptimization[] {
    return Array.from(this.optimizations.values());
  }

  /**
   * メモリリークを検出
   */
  detectMemoryLeak(
    component: string,
    growthRate: number,
    estimatedLeakSize: number
  ): MemoryLeak {
    const leakId = `ML-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (estimatedLeakSize > 500) severity = 'critical';
    else if (estimatedLeakSize > 200) severity = 'high';
    else if (estimatedLeakSize > 50) severity = 'medium';

    const leak: MemoryLeak = {
      leakId,
      timestamp: Date.now(),
      component,
      growthRate,
      estimatedLeakSize,
      severity,
      status: 'detected',
    };

    this.leaks.set(leakId, leak);

    if (!this.leaksByComponent.has(component)) {
      this.leaksByComponent.set(component, []);
    }
    this.leaksByComponent.get(component)!.push(leakId);

    return leak;
  }

  /**
   * メモリリークを取得
   */
  getMemoryLeak(leakId: string): MemoryLeak | undefined {
    return this.leaks.get(leakId);
  }

  /**
   * コンポーネント別リークを取得
   */
  getLeaksByComponent(component: string): MemoryLeak[] {
    const ids = this.leaksByComponent.get(component) || [];
    return ids
      .map(id => this.leaks.get(id))
      .filter((l): l is MemoryLeak => l !== undefined);
  }

  /**
   * メモリリークを修正
   */
  fixMemoryLeak(leakId: string): MemoryLeak | undefined {
    const leak = this.leaks.get(leakId);
    if (!leak) return undefined;

    leak.status = 'fixed';
    return leak;
  }

  /**
   * メモリ統計を計算
   */
  getMemoryStats(): {
    totalProfiles: number;
    totalOptimizations: number;
    totalLeaks: number;
    optimalProfiles: number;
    warningProfiles: number;
    criticalProfiles: number;
    successfulOptimizations: number;
    totalMemoryFreed: number;
    fixedLeaks: number;
  } {
    const allProfiles = Array.from(this.memoryProfiles.values());
    const allOptimizations = Array.from(this.optimizations.values());
    const allLeaks = Array.from(this.leaks.values());

    let totalMemoryFreed = 0;
    for (const opt of allOptimizations) {
      if (opt.success) totalMemoryFreed += opt.memoryFreed;
    }

    return {
      totalProfiles: allProfiles.length,
      totalOptimizations: allOptimizations.length,
      totalLeaks: allLeaks.length,
      optimalProfiles: allProfiles.filter(p => p.status === 'optimal').length,
      warningProfiles: allProfiles.filter(p => p.status === 'warning').length,
      criticalProfiles: allProfiles.filter(p => p.status === 'critical').length,
      successfulOptimizations: allOptimizations.filter(o => o.success).length,
      totalMemoryFreed,
      fixedLeaks: allLeaks.filter(l => l.status === 'fixed').length,
    };
  }

  /**
   * メモリプロファイルを削除
   */
  deleteMemoryProfile(profileId: string): boolean {
    const profile = this.memoryProfiles.get(profileId);
    if (!profile) return false;

    const statusIds = this.profilesByStatus.get(profile.status) || [];
    const index = statusIds.indexOf(profileId);
    if (index > -1) statusIds.splice(index, 1);

    this.memoryProfiles.delete(profileId);
    return true;
  }

  /**
   * メモリリークを削除
   */
  deleteMemoryLeak(leakId: string): boolean {
    const leak = this.leaks.get(leakId);
    if (!leak) return false;

    const componentIds = this.leaksByComponent.get(leak.component) || [];
    const index = componentIds.indexOf(leakId);
    if (index > -1) componentIds.splice(index, 1);

    this.leaks.delete(leakId);
    return true;
  }

  /**
   * 高リスクリークを取得
   */
  getHighRiskLeaks(): MemoryLeak[] {
    return Array.from(this.leaks.values()).filter(l => l.severity === 'critical' || l.severity === 'high');
  }

  /**
   * 平均ヒープ使用率を計算
   */
  getAverageHeapUsage(): number {
    const profiles = Array.from(this.memoryProfiles.values());
    if (profiles.length === 0) return 0;

    const totalUsage = profiles.reduce((sum, p) => sum + (p.heapUsed / p.heapTotal) * 100, 0);
    return totalUsage / profiles.length;
  }
}

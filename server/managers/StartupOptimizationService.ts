/**
 * StartupOptimizationService
 * 起動時間最適化・初期化管理・リソース事前読み込み
 */

export interface StartupMetric {
  metricId: string;
  timestamp: number;
  phase: 'initialization' | 'resource_loading' | 'ui_rendering' | 'api_connection' | 'cache_loading';
  duration: number;
  status: 'fast' | 'normal' | 'slow' | 'critical';
}

export interface StartupOptimization {
  optimizationId: string;
  timestamp: number;
  optimizationType: 'lazy_loading' | 'code_splitting' | 'resource_prefetch' | 'cache_preload' | 'parallel_init';
  targetPhase: string;
  timeSaved: number;
  applied: boolean;
}

export interface ResourcePreload {
  preloadId: string;
  timestamp: number;
  resourceType: 'script' | 'style' | 'image' | 'font' | 'data';
  resourceName: string;
  size: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  preloaded: boolean;
}

export class StartupOptimizationService {
  private startupMetrics: Map<string, StartupMetric> = new Map();
  private optimizations: Map<string, StartupOptimization> = new Map();
  private preloads: Map<string, ResourcePreload> = new Map();
  private metricsByPhase: Map<string, string[]> = new Map();
  private preloadsByType: Map<string, string[]> = new Map();

  /**
   * 起動メトリクスを記録
   */
  recordStartupMetric(
    phase: 'initialization' | 'resource_loading' | 'ui_rendering' | 'api_connection' | 'cache_loading',
    duration: number
  ): StartupMetric {
    const metricId = `SM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let status: 'fast' | 'normal' | 'slow' | 'critical' = 'normal';
    if (duration < 500) status = 'fast';
    else if (duration < 1000) status = 'normal';
    else if (duration < 2000) status = 'slow';
    else status = 'critical';

    const metric: StartupMetric = {
      metricId,
      timestamp: Date.now(),
      phase,
      duration,
      status,
    };

    this.startupMetrics.set(metricId, metric);

    if (!this.metricsByPhase.has(phase)) {
      this.metricsByPhase.set(phase, []);
    }
    this.metricsByPhase.get(phase)!.push(metricId);

    return metric;
  }

  /**
   * 起動メトリクスを取得
   */
  getStartupMetric(metricId: string): StartupMetric | undefined {
    return this.startupMetrics.get(metricId);
  }

  /**
   * フェーズ別メトリクスを取得
   */
  getMetricsByPhase(phase: string): StartupMetric[] {
    const ids = this.metricsByPhase.get(phase) || [];
    return ids
      .map(id => this.startupMetrics.get(id))
      .filter((m): m is StartupMetric => m !== undefined);
  }

  /**
   * 最適化を記録
   */
  recordOptimization(
    optimizationType: 'lazy_loading' | 'code_splitting' | 'resource_prefetch' | 'cache_preload' | 'parallel_init',
    targetPhase: string,
    timeSaved: number,
    applied: boolean
  ): StartupOptimization {
    const optimizationId = `SO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const optimization: StartupOptimization = {
      optimizationId,
      timestamp: Date.now(),
      optimizationType,
      targetPhase,
      timeSaved,
      applied,
    };

    this.optimizations.set(optimizationId, optimization);
    return optimization;
  }

  /**
   * 最適化を取得
   */
  getOptimization(optimizationId: string): StartupOptimization | undefined {
    return this.optimizations.get(optimizationId);
  }

  /**
   * 全最適化を取得
   */
  getAllOptimizations(): StartupOptimization[] {
    return Array.from(this.optimizations.values());
  }

  /**
   * リソース事前読み込みを記録
   */
  recordResourcePreload(
    resourceType: 'script' | 'style' | 'image' | 'font' | 'data',
    resourceName: string,
    size: number,
    priority: 'critical' | 'high' | 'medium' | 'low',
    preloaded: boolean
  ): ResourcePreload {
    const preloadId = `RP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const preload: ResourcePreload = {
      preloadId,
      timestamp: Date.now(),
      resourceType,
      resourceName,
      size,
      priority,
      preloaded,
    };

    this.preloads.set(preloadId, preload);

    if (!this.preloadsByType.has(resourceType)) {
      this.preloadsByType.set(resourceType, []);
    }
    this.preloadsByType.get(resourceType)!.push(preloadId);

    return preload;
  }

  /**
   * リソース事前読み込みを取得
   */
  getResourcePreload(preloadId: string): ResourcePreload | undefined {
    return this.preloads.get(preloadId);
  }

  /**
   * リソースタイプ別事前読み込みを取得
   */
  getPreloadsByType(resourceType: string): ResourcePreload[] {
    const ids = this.preloadsByType.get(resourceType) || [];
    return ids
      .map(id => this.preloads.get(id))
      .filter((p): p is ResourcePreload => p !== undefined);
  }

  /**
   * 起動時間を計算
   */
  calculateTotalStartupTime(): number {
    const metrics = Array.from(this.startupMetrics.values());
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.duration, 0);
  }

  /**
   * 起動統計を計算
   */
  getStartupStats(): {
    totalMetrics: number;
    totalOptimizations: number;
    totalPreloads: number;
    fastMetrics: number;
    slowMetrics: number;
    criticalMetrics: number;
    appliedOptimizations: number;
    totalTimeSaved: number;
    preloadedResources: number;
    averageStartupTime: number;
  } {
    const allMetrics = Array.from(this.startupMetrics.values());
    const allOptimizations = Array.from(this.optimizations.values());
    const allPreloads = Array.from(this.preloads.values());

    let totalTimeSaved = 0;
    for (const opt of allOptimizations) {
      if (opt.applied) totalTimeSaved += opt.timeSaved;
    }

    const averageStartupTime = allMetrics.length > 0 ? allMetrics.reduce((sum, m) => sum + m.duration, 0) / allMetrics.length : 0;

    return {
      totalMetrics: allMetrics.length,
      totalOptimizations: allOptimizations.length,
      totalPreloads: allPreloads.length,
      fastMetrics: allMetrics.filter(m => m.status === 'fast').length,
      slowMetrics: allMetrics.filter(m => m.status === 'slow').length,
      criticalMetrics: allMetrics.filter(m => m.status === 'critical').length,
      appliedOptimizations: allOptimizations.filter(o => o.applied).length,
      totalTimeSaved,
      preloadedResources: allPreloads.filter(p => p.preloaded).length,
      averageStartupTime,
    };
  }

  /**
   * 起動メトリクスを削除
   */
  deleteStartupMetric(metricId: string): boolean {
    const metric = this.startupMetrics.get(metricId);
    if (!metric) return false;

    const phaseIds = this.metricsByPhase.get(metric.phase) || [];
    const index = phaseIds.indexOf(metricId);
    if (index > -1) phaseIds.splice(index, 1);

    this.startupMetrics.delete(metricId);
    return true;
  }

  /**
   * リソース事前読み込みを削除
   */
  deleteResourcePreload(preloadId: string): boolean {
    const preload = this.preloads.get(preloadId);
    if (!preload) return false;

    const typeIds = this.preloadsByType.get(preload.resourceType) || [];
    const index = typeIds.indexOf(preloadId);
    if (index > -1) typeIds.splice(index, 1);

    this.preloads.delete(preloadId);
    return true;
  }

  /**
   * 遅いフェーズを取得
   */
  getSlowPhases(threshold: number = 1000): StartupMetric[] {
    return Array.from(this.startupMetrics.values()).filter(m => m.duration > threshold);
  }

  /**
   * 高優先度リソースを取得
   */
  getHighPriorityResources(): ResourcePreload[] {
    return Array.from(this.preloads.values()).filter(p => p.priority === 'critical' || p.priority === 'high');
  }

  /**
   * 全起動メトリクスを取得
   */
  getAllStartupMetrics(): StartupMetric[] {
    return Array.from(this.startupMetrics.values());
  }

  /**
   * 全リソース事前読み込みを取得
   */
  getAllResourcePreloads(): ResourcePreload[] {
    return Array.from(this.preloads.values());
  }
}

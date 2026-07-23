/**
 * ManufacturingMonitorPanel - 製造監視パネル
 * 
 * 機能:
 * - 生産ラインモニタリング
 * - 効率分析
 * - 品質管理
 * - レポート生成
 */

export interface ProductionLine {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'maintenance' | 'error';
  efficiency: number;
  qualityScore: number;
  producedUnits: number;
  defectiveUnits: number;
  lastUpdate: number;
}

export interface EfficiencyMetric {
  timestamp: number;
  lineId: string;
  efficiency: number;
  throughput: number;
  downtime: number;
  oee: number; // Overall Equipment Effectiveness
}

export interface QualityReport {
  reportId: string;
  timestamp: number;
  totalUnits: number;
  defectiveUnits: number;
  defectRate: number;
  criticalDefects: number;
  minorDefects: number;
  recommendations: string[];
}

export class ManufacturingMonitorPanel {
  private static instance: ManufacturingMonitorPanel;
  private productionLines: Map<string, ProductionLine> = new Map();
  private efficiencyMetrics: EfficiencyMetric[] = [];
  private qualityReports: QualityReport[] = [];
  private reportCounter: number = 0;

  private constructor() {
    this.initializeProductionLines();
  }

  static getInstance(): ManufacturingMonitorPanel {
    if (!ManufacturingMonitorPanel.instance) {
      ManufacturingMonitorPanel.instance = new ManufacturingMonitorPanel();
    }
    return ManufacturingMonitorPanel.instance;
  }

  /**
   * 生産ライン初期化
   */
  private initializeProductionLines(): void {
    const lines = ['Line-A', 'Line-B', 'Line-C', 'Line-D'];

    lines.forEach((line: string) => {
      this.productionLines.set(line, {
        id: line,
        name: line,
        status: 'idle',
        efficiency: 0,
        qualityScore: 100,
        producedUnits: 0,
        defectiveUnits: 0,
        lastUpdate: Date.now(),
      });
    });
  }

  /**
   * 生産ライン状態更新
   */
  updateProductionLine(
    lineId: string,
    status: 'running' | 'idle' | 'maintenance' | 'error',
    efficiency: number,
    qualityScore: number,
    producedUnits: number,
    defectiveUnits: number
  ): ProductionLine {
    const line: ProductionLine = {
      id: lineId,
      name: lineId,
      status,
      efficiency,
      qualityScore,
      producedUnits,
      defectiveUnits,
      lastUpdate: Date.now(),
    };

    this.productionLines.set(lineId, line);
    return line;
  }

  /**
   * 生産ライン取得
   */
  getProductionLine(lineId: string): ProductionLine | null {
    return this.productionLines.get(lineId) || null;
  }

  /**
   * すべての生産ライン取得
   */
  getAllProductionLines(): ProductionLine[] {
    return Array.from(this.productionLines.values());
  }

  /**
   * 効率メトリクス記録
   */
  recordEfficiencyMetric(
    lineId: string,
    efficiency: number,
    throughput: number,
    downtime: number,
    oee: number
  ): EfficiencyMetric {
    const metric: EfficiencyMetric = {
      timestamp: Date.now(),
      lineId,
      efficiency,
      throughput,
      downtime,
      oee,
    };

    this.efficiencyMetrics.push(metric);

    // 最新10000件のみ保持
    if (this.efficiencyMetrics.length > 10000) {
      this.efficiencyMetrics.shift();
    }

    return metric;
  }

  /**
   * 効率メトリクス取得
   */
  getEfficiencyMetrics(lineId: string, limit: number = 100): EfficiencyMetric[] {
    return this.efficiencyMetrics
      .filter((m: EfficiencyMetric) => m.lineId === lineId)
      .slice(-limit);
  }

  /**
   * 品質レポート生成
   */
  generateQualityReport(totalUnits: number, defectiveUnits: number): QualityReport {
    const reportId = `report_${++this.reportCounter}_${Date.now()}`;
    const defectRate = totalUnits > 0 ? (defectiveUnits / totalUnits) * 100 : 0;

    const criticalDefects = Math.floor(defectiveUnits * 0.3);
    const minorDefects = defectiveUnits - criticalDefects;

    const recommendations: string[] = [];
    if (defectRate > 5) {
      recommendations.push('品質管理プロセスの見直しが必要です');
      recommendations.push('不良品の原因分析を実施してください');
    }
    if (criticalDefects > 10) {
      recommendations.push('重大な不良が多く発生しています');
      recommendations.push('生産ラインの点検を実施してください');
    }

    const report: QualityReport = {
      reportId,
      timestamp: Date.now(),
      totalUnits,
      defectiveUnits,
      defectRate,
      criticalDefects,
      minorDefects,
      recommendations,
    };

    this.qualityReports.push(report);

    // 最新1000件のみ保持
    if (this.qualityReports.length > 1000) {
      this.qualityReports.shift();
    }

    return report;
  }

  /**
   * 品質レポート取得
   */
  getQualityReport(reportId: string): QualityReport | null {
    return this.qualityReports.find((r: QualityReport) => r.reportId === reportId) || null;
  }

  /**
   * 品質レポート履歴取得
   */
  getQualityReportHistory(limit: number = 50): QualityReport[] {
    const start = Math.max(0, this.qualityReports.length - limit);
    return this.qualityReports.slice(start);
  }

  /**
   * 製造統計取得
   */
  getManufacturingStatistics(): {
    totalLines: number;
    runningLines: number;
    idleLines: number;
    maintenanceLines: number;
    errorLines: number;
    averageEfficiency: number;
    averageQualityScore: number;
  } {
    const lines = this.getAllProductionLines();
    const runningCount = lines.filter((l: ProductionLine) => l.status === 'running').length;
    const idleCount = lines.filter((l: ProductionLine) => l.status === 'idle').length;
    const maintenanceCount = lines.filter((l: ProductionLine) => l.status === 'maintenance').length;
    const errorCount = lines.filter((l: ProductionLine) => l.status === 'error').length;

    const avgEfficiency =
      lines.length > 0 ? lines.reduce((sum: number, l: ProductionLine) => sum + l.efficiency, 0) / lines.length : 0;
    const avgQuality =
      lines.length > 0 ? lines.reduce((sum: number, l: ProductionLine) => sum + l.qualityScore, 0) / lines.length : 0;

    return {
      totalLines: lines.length,
      runningLines: runningCount,
      idleLines: idleCount,
      maintenanceLines: maintenanceCount,
      errorLines: errorCount,
      averageEfficiency: avgEfficiency,
      averageQualityScore: avgQuality,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.productionLines.clear();
    this.efficiencyMetrics = [];
    this.qualityReports = [];
  }
}

export const manufacturingMonitorPanel = ManufacturingMonitorPanel.getInstance();
export default manufacturingMonitorPanel;

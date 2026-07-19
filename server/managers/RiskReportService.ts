/**
 * RiskReportService - リスクレポートサービス
 * 
 * 機能:
 * - リスク分析
 * - リスクスコア計算
 * - リスク分類
 * - リスクレポート生成
 */

export interface RiskAnalysis {
  id: string;
  userId: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Map<string, number>;
  timestamp: number;
  recommendations: string[];
}

export interface RiskReport {
  reportId: string;
  userId: number;
  timestamp: number;
  riskScore: number;
  riskLevel: string;
  trend: 'improving' | 'stable' | 'declining';
  topRisks: string[];
  recommendations: string[];
  summary: string;
}

export class RiskReportService {
  private static instance: RiskReportService;
  private analyses: Map<string, RiskAnalysis> = new Map();
  private reports: Map<string, RiskReport> = new Map();
  private analysisCounter: number = 0;
  private reportCounter: number = 0;

  private constructor() {}

  static getInstance(): RiskReportService {
    if (!RiskReportService.instance) {
      RiskReportService.instance = new RiskReportService();
    }
    return RiskReportService.instance;
  }

  /**
   * リスク分析実行
   */
  analyzeRisk(
    userId: number,
    factors: Map<string, number>
  ): RiskAnalysis {
    const analysisId = `risk_${++this.analysisCounter}_${Date.now()}`;

    let riskScore = 0;
    factors.forEach((value: number) => {
      riskScore += value;
    });

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore >= 80) riskLevel = 'critical';
    else if (riskScore >= 60) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';

    const recommendations: string[] = [];
    if (riskLevel === 'critical') {
      recommendations.push('緊急対応が必要です');
      recommendations.push('リスク軽減策を即座に実施してください');
    } else if (riskLevel === 'high') {
      recommendations.push('リスク軽減策の実施を検討してください');
    }

    const analysis: RiskAnalysis = {
      id: analysisId,
      userId,
      riskScore,
      riskLevel,
      factors,
      timestamp: Date.now(),
      recommendations,
    };

    this.analyses.set(analysisId, analysis);
    return analysis;
  }

  /**
   * 分析取得
   */
  getAnalysis(analysisId: string): RiskAnalysis | null {
    return this.analyses.get(analysisId) || null;
  }

  /**
   * ユーザー分析取得
   */
  getUserAnalyses(userId: number): RiskAnalysis[] {
    const userAnalyses: RiskAnalysis[] = [];
    this.analyses.forEach((analysis: RiskAnalysis) => {
      if (analysis.userId === userId) {
        userAnalyses.push(analysis);
      }
    });
    return userAnalyses.sort((a: RiskAnalysis, b: RiskAnalysis) => b.timestamp - a.timestamp);
  }

  /**
   * リスク分類
   */
  classifyRisk(riskScore: number): {
    level: string;
    description: string;
    priority: number;
  } {
    if (riskScore >= 80) {
      return {
        level: 'CRITICAL',
        description: 'クリティカルリスク - 即座の対応が必要',
        priority: 1,
      };
    } else if (riskScore >= 60) {
      return {
        level: 'HIGH',
        description: '高リスク - 対応を検討してください',
        priority: 2,
      };
    } else if (riskScore >= 40) {
      return {
        level: 'MEDIUM',
        description: '中リスク - 監視が必要',
        priority: 3,
      };
    } else {
      return {
        level: 'LOW',
        description: '低リスク - 通常の監視で対応',
        priority: 4,
      };
    }
  }

  /**
   * リスクレポート生成
   */
  generateReport(userId: number): RiskReport {
    const reportId = `report_${++this.reportCounter}_${Date.now()}`;
    const analyses = this.getUserAnalyses(userId);

    let riskScore = 0;
    let riskLevel = 'low';
    let trend: 'improving' | 'stable' | 'declining' = 'stable';

    if (analyses.length > 0) {
      const latestAnalysis = analyses[0];
      riskScore = latestAnalysis.riskScore;
      riskLevel = latestAnalysis.riskLevel;

      if (analyses.length > 1) {
        const previousAnalysis = analyses[1];
        if (riskScore < previousAnalysis.riskScore) {
          trend = 'improving';
        } else if (riskScore > previousAnalysis.riskScore) {
          trend = 'declining';
        }
      }
    }

    const topRisks: string[] = [];
    const recommendations: string[] = [];

    if (analyses.length > 0) {
      const latestAnalysis = analyses[0];
      const factorArray = Array.from(latestAnalysis.factors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      topRisks.push(...factorArray.map(([factor]) => factor));
      recommendations.push(...latestAnalysis.recommendations);
    }

    const classification = this.classifyRisk(riskScore);
    const summary = `${classification.description} (スコア: ${riskScore})`;

    const report: RiskReport = {
      reportId,
      userId,
      timestamp: Date.now(),
      riskScore,
      riskLevel,
      trend,
      topRisks,
      recommendations,
      summary,
    };

    this.reports.set(reportId, report);
    return report;
  }

  /**
   * レポート取得
   */
  getReport(reportId: string): RiskReport | null {
    return this.reports.get(reportId) || null;
  }

  /**
   * ユーザーレポート取得
   */
  getUserReports(userId: number): RiskReport[] {
    const userReports: RiskReport[] = [];
    this.reports.forEach((report: RiskReport) => {
      if (report.userId === userId) {
        userReports.push(report);
      }
    });
    return userReports.sort((a: RiskReport, b: RiskReport) => b.timestamp - a.timestamp);
  }

  /**
   * リスク傾向分析
   */
  analyzeTrend(userId: number): {
    trend: string;
    direction: 'improving' | 'stable' | 'declining';
    changePercent: number;
  } {
    const analyses = this.getUserAnalyses(userId);
    if (analyses.length < 2) {
      return {
        trend: 'データ不足',
        direction: 'stable',
        changePercent: 0,
      };
    }

    const latest = analyses[0].riskScore;
    const previous = analyses[1].riskScore;
    const change = latest - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;

    let direction: 'improving' | 'stable' | 'declining' = 'stable';
    if (change < -5) direction = 'improving';
    else if (change > 5) direction = 'declining';

    return {
      trend: `${change > 0 ? '+' : ''}${change.toFixed(1)}ポイント`,
      direction,
      changePercent,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(userId?: number): void {
    if (userId) {
      const toDeleteAnalyses: string[] = [];
      const toDeleteReports: string[] = [];

      this.analyses.forEach((analysis: RiskAnalysis, id: string) => {
        if (analysis.userId === userId) {
          toDeleteAnalyses.push(id);
        }
      });

      this.reports.forEach((report: RiskReport, id: string) => {
        if (report.userId === userId) {
          toDeleteReports.push(id);
        }
      });

      toDeleteAnalyses.forEach(id => this.analyses.delete(id));
      toDeleteReports.forEach(id => this.reports.delete(id));
    } else {
      this.analyses.clear();
      this.reports.clear();
    }
  }
}

export const riskReportService = RiskReportService.getInstance();
export default riskReportService;

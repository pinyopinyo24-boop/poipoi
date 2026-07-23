/**
 * AnalysisEngine
 * Excel/PDF データの分析と改善提案生成
 */

import { ExcelAnalysisManager, ExcelAnalysisResult } from './ExcelAnalysisManager';
import { PDFAnalysisManager, PDFAnalysisResult } from './PDFAnalysisManager';

export interface AnalysisResult {
  summary: string;
  findings: Array<{
    category: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    impact: string;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    estimatedImpact: string;
    implementationSteps: string[];
  }>;
  metrics: {
    totalIssues: number;
    criticalIssues: number;
    improvementPotential: number;
  };
}

export class AnalysisEngine {
  private excelManager: ExcelAnalysisManager;
  private pdfManager: PDFAnalysisManager;

  constructor() {
    this.excelManager = new ExcelAnalysisManager();
    this.pdfManager = new PDFAnalysisManager();
  }

  /**
   * Excel データを分析
   */
  analyzeExcel(excelResult: ExcelAnalysisResult): AnalysisResult {
    const findings: AnalysisResult['findings'] = [];
    const recommendations: AnalysisResult['recommendations'] = [];

    // 数値データの分析
    for (const [key, stats] of Object.entries(excelResult.numericalData)) {
      // 異常値検出
      if (stats.max > stats.average * 2) {
        findings.push({
          category: 'Outlier Detection',
          issue: `${key}: 異常値を検出（最大値が平均の2倍以上）`,
          severity: 'medium',
          impact: 'データの信頼性に影響',
        });
      }

      // 変動性の大きさ
      if (stats.max - stats.min > stats.average) {
        findings.push({
          category: 'Variability',
          issue: `${key}: 変動性が大きい`,
          severity: 'low',
          impact: '安定性の欠如',
        });
      }
    }

    // 改善提案の生成
    if (findings.some(f => f.category === 'Outlier Detection')) {
      recommendations.push({
        id: 'rec_001',
        title: '異常値の検査と修正',
        description: 'データセット内の異常値を特定し、根本原因を調査します。',
        priority: 'high',
        estimatedImpact: 'データ品質の向上（15-20%）',
        implementationSteps: [
          '異常値を特定',
          '根本原因を分析',
          'データを修正または除外',
          '検証を実施',
        ],
      });
    }

    if (findings.some(f => f.category === 'Variability')) {
      recommendations.push({
        id: 'rec_002',
        title: 'プロセス標準化',
        description: 'プロセスの標準化により、変動性を低減します。',
        priority: 'medium',
        estimatedImpact: '変動性の削減（20-30%）',
        implementationSteps: [
          'プロセスマッピング',
          'ボトルネック特定',
          '標準化ガイドライン作成',
          '実装と監視',
        ],
      });
    }

    const summary = `
Excel データ分析結果:
- シート数: ${excelResult.statistics.sheetCount}
- 総行数: ${excelResult.statistics.totalRows}
- 検出された問題: ${findings.length}
- 改善提案: ${recommendations.length}
    `.trim();

    return {
      summary,
      findings,
      recommendations,
      metrics: {
        totalIssues: findings.length,
        criticalIssues: findings.filter(f => f.severity === 'high').length,
        improvementPotential: Math.min(100, recommendations.length * 10),
      },
    };
  }

  /**
   * PDF データを分析
   */
  async analyzePDF(pdfResult: PDFAnalysisResult): Promise<AnalysisResult> {
    const findings: AnalysisResult['findings'] = [];
    const recommendations: AnalysisResult['recommendations'] = [];

    // ページ数の分析
    if (pdfResult.pageCount > 50) {
      findings.push({
        category: 'Document Structure',
        issue: 'ドキュメントが長い（50ページ以上）',
        severity: 'low',
        impact: '読みやすさの低下',
      });

      recommendations.push({
        id: 'rec_pdf_001',
        title: 'ドキュメント構造の改善',
        description: 'ドキュメントを複数の部分に分割し、読みやすさを向上させます。',
        priority: 'medium',
        estimatedImpact: '読みやすさの向上（25-35%）',
        implementationSteps: [
          'コンテンツの分類',
          '章立ての再構成',
          '目次の作成',
          'ナビゲーション機能の追加',
        ],
      });
    }

    // 構造の分析
    const structureIssues = pdfResult.structure.headings.length === 0;
    if (structureIssues) {
      findings.push({
        category: 'Content Organization',
        issue: '見出しが不足している',
        severity: 'medium',
        impact: 'ドキュメント構造が不明確',
      });

      recommendations.push({
        id: 'rec_pdf_002',
        title: '見出しの追加',
        description: 'ドキュメント内に適切な見出しを追加します。',
        priority: 'high',
        estimatedImpact: 'ナビゲーション性の向上（40-50%）',
        implementationSteps: [
          'コンテンツの分析',
          '見出しレベルの決定',
          '見出しの追加',
          'フォーマットの統一',
        ],
      });
    }

    const summary = `
PDF データ分析結果:
- ページ数: ${pdfResult.pageCount}
- 見出し: ${pdfResult.structure.headings.length}
- 段落: ${pdfResult.structure.paragraphs.length}
- 検出された問題: ${findings.length}
- 改善提案: ${recommendations.length}
    `.trim();

    return {
      summary,
      findings,
      recommendations,
      metrics: {
        totalIssues: findings.length,
        criticalIssues: findings.filter(f => f.severity === 'high').length,
        improvementPotential: Math.min(100, recommendations.length * 15),
      },
    };
  }

  /**
   * 分析結果から Presentation 用データを生成
   */
  generatePresentationData(analysis: AnalysisResult): {
    title: string;
    slides: Array<{
      title: string;
      content: string;
      layout: string;
    }>;
  } {
    const slides: Array<{ title: string; content: string; layout: string }> = [];

    // タイトルスライド
    slides.push({
      title: '分析結果報告',
      content: analysis.summary,
      layout: 'title',
    });

    // 問題点スライド
    if (analysis.findings.length > 0) {
      slides.push({
        title: '検出された問題',
        content: analysis.findings
          .map(f => `• ${f.issue} (${f.severity})`)
          .join('\n'),
        layout: 'content',
      });
    }

    // 改善提案スライド
    for (const rec of analysis.recommendations) {
      slides.push({
        title: rec.title,
        content: `
説明: ${rec.description}
優先度: ${rec.priority}
期待効果: ${rec.estimatedImpact}

実装ステップ:
${rec.implementationSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
        `.trim(),
        layout: 'content',
      });
    }

    // メトリクススライド
    slides.push({
      title: '改善効果',
      content: `
総問題数: ${analysis.metrics.totalIssues}
重大問題: ${analysis.metrics.criticalIssues}
改善ポテンシャル: ${analysis.metrics.improvementPotential}%
      `.trim(),
      layout: 'chart',
    });

    return {
      title: '分析結果プレゼンテーション',
      slides,
    };
  }

  /**
   * JSON に変換
   */
  toJSON(analysis: AnalysisResult): string {
    return JSON.stringify(analysis, null, 2);
  }
}

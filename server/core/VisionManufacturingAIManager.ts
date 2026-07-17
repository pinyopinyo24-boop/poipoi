/**
 * VisionManufacturingAIManager - ビジョン製造AI管理
 * 画像・図面・現場データの解析と品質改善支援
 */

export type ImageType = 'product' | 'defect' | 'drawing' | 'comparison' | 'inspection';
export type DefectSeverity = 'critical' | 'major' | 'minor' | 'none';
export type InspectionStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'needs_review';

export interface ImageAnalysisResult {
  id: string;
  imageUrl: string;
  imageType: ImageType;
  timestamp: number;
  width: number;
  height: number;
  quality: number;
  features: string[];
  colors: Array<{ color: string; percentage: number }>;
  confidence: number;
}

export interface DefectDetection {
  id: string;
  imageId: string;
  defectType: string;
  severity: DefectSeverity;
  location: { x: number; y: number; width: number; height: number };
  confidence: number;
  description: string;
  timestamp: number;
  suggestedAction: string;
}

export interface DrawingAnalysis {
  id: string;
  imageId: string;
  drawingType: string;
  components: Array<{ name: string; type: string; specifications: Record<string, any> }>;
  dimensions: Record<string, number>;
  tolerances: Record<string, string>;
  materials: string[];
  timestamp: number;
  complexity: number;
}

export interface VisualComparison {
  id: string;
  referenceImageId: string;
  comparisonImageId: string;
  similarity: number;
  differences: Array<{ area: string; type: string; severity: DefectSeverity }>;
  timestamp: number;
  matchScore: number;
}

export interface InspectionRecord {
  id: string;
  productId: string;
  imageId: string;
  status: InspectionStatus;
  defectsFound: DefectDetection[];
  overallQuality: number;
  timestamp: number;
  inspector: string;
  notes: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export interface QualityImprovement {
  id: string;
  defectType: string;
  frequency: number;
  suggestedSolution: string;
  estimatedImpact: number;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  status: 'proposed' | 'implemented' | 'archived';
}

export class VisionManufacturingAIManager {
  private analysisResults: Map<string, ImageAnalysisResult> = new Map();
  private defectDetections: Map<string, DefectDetection[]> = new Map();
  private drawingAnalyses: Map<string, DrawingAnalysis> = new Map();
  private visualComparisons: Map<string, VisualComparison> = new Map();
  private inspectionRecords: Map<string, InspectionRecord> = new Map();
  private qualityImprovements: Map<string, QualityImprovement> = new Map();
  private defectHistory: Array<{ defectType: string; timestamp: number; severity: DefectSeverity }> = [];

  /**
   * 画像を解析
   */
  async analyzeImage(
    imageUrl: string,
    imageType: ImageType,
    width: number = 1024,
    height: number = 768
  ): Promise<ImageAnalysisResult> {
    const result: ImageAnalysisResult = {
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      imageUrl,
      imageType,
      timestamp: Date.now(),
      width,
      height,
      quality: Math.random() * 0.3 + 0.7, // 0.7-1.0
      features: this.extractFeatures(imageType),
      colors: this.analyzeColors(),
      confidence: Math.random() * 0.2 + 0.8, // 0.8-1.0
    };

    this.analysisResults.set(result.id, result);
    return result;
  }

  /**
   * 不良を検出
   */
  async detectDefects(imageId: string): Promise<DefectDetection[]> {
    const analysis = this.analysisResults.get(imageId);
    if (!analysis) return [];

    const defects: DefectDetection[] = [];
    const defectCount = Math.floor(Math.random() * 4); // 0-3 defects

    for (let i = 0; i < defectCount; i++) {
      const defect: DefectDetection = {
        id: `defect-${Date.now()}-${i}`,
        imageId,
        defectType: this.getRandomDefectType(),
        severity: this.getRandomSeverity(),
        location: {
          x: Math.random() * (analysis.width - 100),
          y: Math.random() * (analysis.height - 100),
          width: 50 + Math.random() * 100,
          height: 50 + Math.random() * 100,
        },
        confidence: Math.random() * 0.2 + 0.8,
        description: `Defect detected at position ${i + 1}`,
        timestamp: Date.now(),
        suggestedAction: this.getSuggestedAction(),
      };

      defects.push(defect);
      this.defectHistory.push({
        defectType: defect.defectType,
        timestamp: defect.timestamp,
        severity: defect.severity,
      });
    }

    this.defectDetections.set(imageId, defects);
    return defects;
  }

  /**
   * 図面を解析
   */
  async analyzeDrawing(imageId: string): Promise<DrawingAnalysis> {
    const analysis = this.analysisResults.get(imageId);
    if (!analysis) throw new Error('Image not found');

    const drawing: DrawingAnalysis = {
      id: `drawing-${Date.now()}`,
      imageId,
      drawingType: 'mechanical',
      components: [
        {
          name: 'Component A',
          type: 'part',
          specifications: { material: 'steel', weight: 2.5 },
        },
        {
          name: 'Component B',
          type: 'assembly',
          specifications: { material: 'aluminum', weight: 1.2 },
        },
      ],
      dimensions: {
        length: 150,
        width: 100,
        height: 50,
      },
      tolerances: {
        length: '±0.5mm',
        width: '±0.3mm',
        height: '±0.2mm',
      },
      materials: ['steel', 'aluminum'],
      timestamp: Date.now(),
      complexity: Math.random() * 0.5 + 0.5,
    };

    this.drawingAnalyses.set(drawing.id, drawing);
    return drawing;
  }

  /**
   * 画像を比較
   */
  async compareImages(referenceImageId: string, comparisonImageId: string): Promise<VisualComparison> {
    const refImage = this.analysisResults.get(referenceImageId);
    const compImage = this.analysisResults.get(comparisonImageId);

    if (!refImage || !compImage) throw new Error('Image not found');

    const similarity = Math.random() * 0.3 + 0.7; // 0.7-1.0
    const differences: Array<{ area: string; type: string; severity: DefectSeverity }> = [];

    if (similarity < 0.85) {
      differences.push({
        area: 'top-left',
        type: 'color_difference',
        severity: 'minor',
      });
    }

    const comparison: VisualComparison = {
      id: `comp-${Date.now()}`,
      referenceImageId,
      comparisonImageId,
      similarity,
      differences,
      timestamp: Date.now(),
      matchScore: similarity * 100,
    };

    this.visualComparisons.set(comparison.id, comparison);
    return comparison;
  }

  /**
   * 検査を実施
   */
  async performInspection(
    productId: string,
    imageId: string,
    inspector: string
  ): Promise<InspectionRecord> {
    const defects = await this.detectDefects(imageId);

    const overallQuality = Math.max(0, 1 - defects.length * 0.15);

    const record: InspectionRecord = {
      id: `insp-${Date.now()}`,
      productId,
      imageId,
      status: defects.length === 0 ? 'passed' : 'needs_review',
      defectsFound: defects,
      overallQuality,
      timestamp: Date.now(),
      inspector,
      notes: `Inspection completed with ${defects.length} defects found`,
    };

    this.inspectionRecords.set(record.id, record);
    return record;
  }

  /**
   * 検査記録を取得
   */
  async getInspectionRecord(recordId: string): Promise<InspectionRecord | null> {
    return this.inspectionRecords.get(recordId) || null;
  }

  /**
   * 検査記録を更新
   */
  async updateInspectionRecord(
    recordId: string,
    updates: Partial<InspectionRecord>
  ): Promise<InspectionRecord | null> {
    const record = this.inspectionRecords.get(recordId);
    if (!record) return null;

    const updated: InspectionRecord = {
      ...record,
      ...updates,
    };

    this.inspectionRecords.set(recordId, updated);
    return updated;
  }

  /**
   * 品質改善提案を生成
   */
  async generateQualityImprovements(): Promise<QualityImprovement[]> {
    const defectTypeFrequency: Record<string, number> = {};

    for (const defect of this.defectHistory) {
      defectTypeFrequency[defect.defectType] = (defectTypeFrequency[defect.defectType] || 0) + 1;
    }

    const improvements: QualityImprovement[] = [];

    for (const [defectType, frequency] of Object.entries(defectTypeFrequency)) {
      if (frequency >= 2) {
        const improvement: QualityImprovement = {
          id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          defectType,
          frequency,
          suggestedSolution: `Implement process control for ${defectType}`,
          estimatedImpact: Math.min(frequency * 0.1, 0.5),
          priority: frequency > 5 ? 'high' : frequency > 3 ? 'medium' : 'low',
          timestamp: Date.now(),
          status: 'proposed',
        };

        improvements.push(improvement);
        this.qualityImprovements.set(improvement.id, improvement);
      }
    }

    return improvements;
  }

  /**
   * 過去の不良と比較
   */
  async compareWithHistoricalDefects(currentDefect: DefectDetection): Promise<DefectDetection[]> {
    const similarDefects: DefectDetection[] = [];

    const defectEntries = Array.from(this.defectDetections.values());
    for (const defects of defectEntries) {
      for (const defect of defects) {
        if (
          defect.defectType === currentDefect.defectType &&
          defect.severity === currentDefect.severity
        ) {
          similarDefects.push(defect);
        }
      }
    }

    return similarDefects;
  }

  /**
   * 検査統計を取得
   */
  getInspectionStatistics(): Record<string, any> {
    const totalInspections = this.inspectionRecords.size;
    const passedInspections = Array.from(this.inspectionRecords.values()).filter(
      (r) => r.status === 'passed'
    ).length;

    const defectTypeCount: Record<string, number> = {};
    for (const defect of this.defectHistory) {
      defectTypeCount[defect.defectType] = (defectTypeCount[defect.defectType] || 0) + 1;
    }

    const severityCount: Record<string, number> = {};
    for (const defect of this.defectHistory) {
      severityCount[defect.severity] = (severityCount[defect.severity] || 0) + 1;
    }

    return {
      totalInspections,
      passedInspections,
      failedInspections: totalInspections - passedInspections,
      passRate: totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0,
      defectTypeCount,
      severityCount,
      totalDefects: this.defectHistory.length,
    };
  }

  /**
   * 最頻出不良を取得
   */
  getMostCommonDefects(limit: number = 5): Array<{ type: string; count: number }> {
    const defectCount: Record<string, number> = {};

    for (const defect of this.defectHistory) {
      defectCount[defect.defectType] = (defectCount[defect.defectType] || 0) + 1;
    }

    return Object.entries(defectCount)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 品質トレンドを分析
   */
  analyzeQualityTrend(): Record<string, any> {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const recentDefects = this.defectHistory.filter((d) => d.timestamp > oneWeekAgo);

    const criticalCount = recentDefects.filter((d) => d.severity === 'critical').length;
    const majorCount = recentDefects.filter((d) => d.severity === 'major').length;
    const minorCount = recentDefects.filter((d) => d.severity === 'minor').length;

    return {
      period: '1 week',
      totalDefects: recentDefects.length,
      criticalDefects: criticalCount,
      majorDefects: majorCount,
      minorDefects: minorCount,
      trend: recentDefects.length > 5 ? 'increasing' : 'stable',
    };
  }

  /**
   * 画像解析結果を取得
   */
  async getAnalysisResult(imageId: string): Promise<ImageAnalysisResult | null> {
    return this.analysisResults.get(imageId) || null;
  }

  /**
   * すべての解析結果を取得
   */
  async getAllAnalysisResults(): Promise<ImageAnalysisResult[]> {
    return Array.from(this.analysisResults.values());
  }

  /**
   * 図面解析を取得
   */
  async getDrawingAnalysis(drawingId: string): Promise<DrawingAnalysis | null> {
    return this.drawingAnalyses.get(drawingId) || null;
  }

  /**
   * すべての図面解析を取得
   */
  async getAllDrawingAnalyses(): Promise<DrawingAnalysis[]> {
    return Array.from(this.drawingAnalyses.values());
  }

  /**
   * 比較結果を取得
   */
  async getComparison(comparisonId: string): Promise<VisualComparison | null> {
    return this.visualComparisons.get(comparisonId) || null;
  }

  /**
   * すべての比較結果を取得
   */
  async getAllComparisons(): Promise<VisualComparison[]> {
    return Array.from(this.visualComparisons.values());
  }

  /**
   * 検査記録を削除
   */
  async deleteInspectionRecord(recordId: string): Promise<boolean> {
    return this.inspectionRecords.delete(recordId);
  }

  /**
   * 品質改善を取得
   */
  async getQualityImprovement(improvementId: string): Promise<QualityImprovement | null> {
    return this.qualityImprovements.get(improvementId) || null;
  }

  /**
   * すべての品質改善を取得
   */
  async getAllQualityImprovements(): Promise<QualityImprovement[]> {
    return Array.from(this.qualityImprovements.values());
  }

  /**
   * 品質改善を更新
   */
  async updateQualityImprovement(
    improvementId: string,
    updates: Partial<QualityImprovement>
  ): Promise<QualityImprovement | null> {
    const improvement = this.qualityImprovements.get(improvementId);
    if (!improvement) return null;

    const updated: QualityImprovement = {
      ...improvement,
      ...updates,
    };

    this.qualityImprovements.set(improvementId, updated);
    return updated;
  }

  /**
   * 不良検出結果を取得
   */
  async getDefectDetections(imageId: string): Promise<DefectDetection[]> {
    return this.defectDetections.get(imageId) || [];
  }

  /**
   * 検査記録一覧を取得
   */
  async getAllInspectionRecords(): Promise<InspectionRecord[]> {
    return Array.from(this.inspectionRecords.values());
  }

  /**
   * 製品の検査履歴を取得
   */
  async getProductInspectionHistory(productId: string): Promise<InspectionRecord[]> {
    return Array.from(this.inspectionRecords.values()).filter((r) => r.productId === productId);
  }

  /**
   * 検査レポートを生成
   */
  async generateInspectionReport(recordId: string): Promise<Record<string, any>> {
    const record = this.inspectionRecords.get(recordId);
    if (!record) return {};

    const analysis = this.analysisResults.get(record.imageId);

    return {
      recordId: record.id,
      productId: record.productId,
      timestamp: record.timestamp,
      inspector: record.inspector,
      status: record.status,
      overallQuality: record.overallQuality,
      defectsFound: record.defectsFound.length,
      imageQuality: analysis?.quality || 0,
      notes: record.notes,
      recommendations: this.generateRecommendations(record),
    };
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(record: InspectionRecord): string[] {
    const recommendations: string[] = [];

    if (record.defectsFound.length > 0) {
      recommendations.push('Review manufacturing process');
    }

    const criticalDefects = record.defectsFound.filter((d) => d.severity === 'critical');
    if (criticalDefects.length > 0) {
      recommendations.push('Immediate action required for critical defects');
    }

    if (record.overallQuality < 0.7) {
      recommendations.push('Consider process improvement');
    }

    return recommendations;
  }

  /**
   * 特徴を抽出
   */
  private extractFeatures(imageType: ImageType): string[] {
    const featureMap: Record<ImageType, string[]> = {
      product: ['shape', 'color', 'texture', 'size'],
      defect: ['crack', 'scratch', 'discoloration', 'deformation'],
      drawing: ['dimensions', 'tolerances', 'materials', 'components'],
      comparison: ['similarity', 'differences', 'alignment', 'scale'],
      inspection: ['quality', 'defects', 'measurements', 'standards'],
    };

    return featureMap[imageType] || [];
  }

  /**
   * 色を分析
   */
  private analyzeColors(): Array<{ color: string; percentage: number }> {
    return [
      { color: 'gray', percentage: 40 },
      { color: 'white', percentage: 30 },
      { color: 'black', percentage: 20 },
      { color: 'other', percentage: 10 },
    ];
  }

  /**
   * ランダムな不良タイプを取得
   */
  private getRandomDefectType(): string {
    const types = ['crack', 'scratch', 'discoloration', 'deformation', 'contamination'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * ランダムな重大度を取得
   */
  private getRandomSeverity(): DefectSeverity {
    const severities: DefectSeverity[] = ['critical', 'major', 'minor', 'none'];
    return severities[Math.floor(Math.random() * severities.length)];
  }

  /**
   * 推奨アクションを取得
   */
  private getSuggestedAction(): string {
    const actions = [
      'Rework product',
      'Scrap product',
      'Further inspection needed',
      'Monitor closely',
      'Adjust process',
    ];
    return actions[Math.floor(Math.random() * actions.length)];
  }
}

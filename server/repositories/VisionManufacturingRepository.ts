/**
 * VisionManufacturingRepository - ビジョン製造データリポジトリ
 */

export interface ImageRecord {
  id: string;
  url: string;
  type: string;
  quality: number;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface DefectRecord {
  id: string;
  imageId: string;
  type: string;
  severity: string;
  location: { x: number; y: number; width: number; height: number };
  confidence: number;
  timestamp: number;
}

export interface InspectionRecord {
  id: string;
  productId: string;
  imageId: string;
  status: string;
  defectCount: number;
  quality: number;
  timestamp: number;
  inspector: string;
}

export class VisionManufacturingRepository {
  private images: Map<string, ImageRecord> = new Map();
  private defects: Map<string, DefectRecord> = new Map();
  private inspections: Map<string, InspectionRecord> = new Map();
  private imageDefectIndex: Map<string, string[]> = new Map();

  /**
   * 画像を保存
   */
  async saveImage(record: ImageRecord): Promise<void> {
    this.images.set(record.id, record);
  }

  /**
   * 画像を取得
   */
  async getImage(id: string): Promise<ImageRecord | null> {
    return this.images.get(id) || null;
  }

  /**
   * すべての画像を取得
   */
  async getAllImages(): Promise<ImageRecord[]> {
    return Array.from(this.images.values());
  }

  /**
   * 画像を削除
   */
  async deleteImage(id: string): Promise<boolean> {
    return this.images.delete(id);
  }

  /**
   * 不良を保存
   */
  async saveDefect(record: DefectRecord): Promise<void> {
    this.defects.set(record.id, record);
    
    // インデックスを更新
    if (!this.imageDefectIndex.has(record.imageId)) {
      this.imageDefectIndex.set(record.imageId, []);
    }
    this.imageDefectIndex.get(record.imageId)!.push(record.id);
  }

  /**
   * 不良を取得
   */
  async getDefect(id: string): Promise<DefectRecord | null> {
    return this.defects.get(id) || null;
  }

  /**
   * 画像の不良を取得
   */
  async getImageDefects(imageId: string): Promise<DefectRecord[]> {
    const defectIds = this.imageDefectIndex.get(imageId) || [];
    return defectIds
      .map((id) => this.defects.get(id))
      .filter((d) => d !== undefined) as DefectRecord[];
  }

  /**
   * すべての不良を取得
   */
  async getAllDefects(): Promise<DefectRecord[]> {
    return Array.from(this.defects.values());
  }

  /**
   * 不良を削除
   */
  async deleteDefect(id: string): Promise<boolean> {
    const defect = this.defects.get(id);
    if (!defect) return false;

    this.defects.delete(id);
    
    // インデックスから削除
    const defectIds = this.imageDefectIndex.get(defect.imageId) || [];
    const index = defectIds.indexOf(id);
    if (index > -1) {
      defectIds.splice(index, 1);
    }

    return true;
  }

  /**
   * 検査記録を保存
   */
  async saveInspection(record: InspectionRecord): Promise<void> {
    this.inspections.set(record.id, record);
  }

  /**
   * 検査記録を取得
   */
  async getInspection(id: string): Promise<InspectionRecord | null> {
    return this.inspections.get(id) || null;
  }

  /**
   * すべての検査記録を取得
   */
  async getAllInspections(): Promise<InspectionRecord[]> {
    return Array.from(this.inspections.values());
  }

  /**
   * 製品の検査記録を取得
   */
  async getProductInspections(productId: string): Promise<InspectionRecord[]> {
    return Array.from(this.inspections.values()).filter((i) => i.productId === productId);
  }

  /**
   * 検査記録を更新
   */
  async updateInspection(id: string, updates: Partial<InspectionRecord>): Promise<InspectionRecord | null> {
    const record = this.inspections.get(id);
    if (!record) return null;

    const updated = { ...record, ...updates };
    this.inspections.set(id, updated);
    return updated;
  }

  /**
   * 検査記録を削除
   */
  async deleteInspection(id: string): Promise<boolean> {
    return this.inspections.delete(id);
  }

  /**
   * 統計情報を取得
   */
  async getStatistics(): Promise<Record<string, any>> {
    const images = Array.from(this.images.values());
    const defects = Array.from(this.defects.values());
    const inspections = Array.from(this.inspections.values());

    const defectBySeverity: Record<string, number> = {};
    for (const defect of defects) {
      defectBySeverity[defect.severity] = (defectBySeverity[defect.severity] || 0) + 1;
    }

    const inspectionByStatus: Record<string, number> = {};
    for (const inspection of inspections) {
      inspectionByStatus[inspection.status] = (inspectionByStatus[inspection.status] || 0) + 1;
    }

    return {
      totalImages: images.length,
      totalDefects: defects.length,
      totalInspections: inspections.length,
      averageImageQuality: images.length > 0 ? images.reduce((sum, i) => sum + i.quality, 0) / images.length : 0,
      defectBySeverity,
      inspectionByStatus,
    };
  }

  /**
   * 品質トレンドを取得
   */
  async getQualityTrend(days: number = 7): Promise<Array<{ date: string; quality: number }>> {
    const now = Date.now();
    const periodMs = days * 24 * 60 * 60 * 1000;
    const startTime = now - periodMs;

    const inspections = Array.from(this.inspections.values()).filter((i) => i.timestamp > startTime);

    const trend: Record<string, number[]> = {};
    for (const inspection of inspections) {
      const date = new Date(inspection.timestamp).toISOString().split('T')[0];
      if (!trend[date]) {
        trend[date] = [];
      }
      trend[date].push(inspection.quality);
    }

    return Object.entries(trend)
      .map(([date, qualities]) => ({
        date,
        quality: qualities.reduce((sum, q) => sum + q, 0) / qualities.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 不良タイプの分布を取得
   */
  async getDefectDistribution(): Promise<Record<string, number>> {
    const distribution: Record<string, number> = {};
    const defects = Array.from(this.defects.values());

    for (const defect of defects) {
      distribution[defect.type] = (distribution[defect.type] || 0) + 1;
    }

    return distribution;
  }

  /**
   * リポジトリをクリア
   */
  async clear(): Promise<void> {
    this.images.clear();
    this.defects.clear();
    this.inspections.clear();
    this.imageDefectIndex.clear();
  }
}

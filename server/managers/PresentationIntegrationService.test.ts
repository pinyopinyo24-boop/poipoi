import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * PresentationIntegrationService Test Suite
 * ImageGeneration・PDF/Excel・ChatUI連携の包括的なテスト
 */

interface IntegrationConfig {
  enableImageGeneration: boolean;
  enablePDFAnalysis: boolean;
  enableExcelAnalysis: boolean;
  enableChatUI: boolean;
}

interface GeneratedPresentation {
  id: string;
  title: string;
  slides: Array<{
    id: string;
    title: string;
    content: string;
    images: string[];
    charts: string[];
  }>;
  metadata: Record<string, any>;
}

class PresentationIntegrationService {
  private config: IntegrationConfig;
  private presentations: Map<string, GeneratedPresentation> = new Map();
  private history: Array<{ action: string; timestamp: Date }> = [];

  constructor(config: Partial<IntegrationConfig> = {}) {
    this.config = {
      enableImageGeneration: config.enableImageGeneration ?? true,
      enablePDFAnalysis: config.enablePDFAnalysis ?? true,
      enableExcelAnalysis: config.enableExcelAnalysis ?? true,
      enableChatUI: config.enableChatUI ?? true,
    };
  }

  generatePresentationFromPDF(pdfContent: string, title: string): string {
    if (!this.config.enablePDFAnalysis) return '';

    const id = `pres_pdf_${Date.now()}_${Math.random()}`;

    const slides = this.extractSlidesFromPDF(pdfContent);
    const presentation: GeneratedPresentation = {
      id,
      title,
      slides,
      metadata: { source: 'PDF', generatedAt: new Date() },
    };

    this.presentations.set(id, presentation);
    this.recordHistory('generate-from-pdf');
    return id;
  }

  generatePresentationFromExcel(excelData: string, title: string): string {
    if (!this.config.enableExcelAnalysis) return '';

    const id = `pres_excel_${Date.now()}_${Math.random()}`;

    const slides = this.extractSlidesFromExcel(excelData);
    const presentation: GeneratedPresentation = {
      id,
      title,
      slides,
      metadata: { source: 'Excel', generatedAt: new Date() },
    };

    this.presentations.set(id, presentation);
    this.recordHistory('generate-from-excel');
    return id;
  }

  addImagesToSlides(presentationId: string, slideIndex: number, imagePrompts: string[]): boolean {
    const pres = this.presentations.get(presentationId);
    if (!pres || !this.config.enableImageGeneration) return false;

    const slide = pres.slides[slideIndex];
    if (!slide) return false;

    imagePrompts.forEach(prompt => {
      const imageUrl = this.generateImage(prompt);
      slide.images.push(imageUrl);
    });

    this.recordHistory('add-images-to-slides');
    return true;
  }

  generateImage(prompt: string): string {
    if (!this.config.enableImageGeneration) return '';

    const imageId = `img_${Date.now()}_${Math.random()}`;
    return `/images/${imageId}.png`;
  }

  addChartsToSlides(presentationId: string, slideIndex: number, chartData: Array<{ type: string; data: any }>): boolean {
    const pres = this.presentations.get(presentationId);
    if (!pres) return false;

    const slide = pres.slides[slideIndex];
    if (!slide) return false;

    chartData.forEach(chart => {
      const chartUrl = this.generateChart(chart.type, chart.data);
      slide.charts.push(chartUrl);
    });

    this.recordHistory('add-charts-to-slides');
    return true;
  }

  generateChart(type: string, data: any): string {
    const chartId = `chart_${Date.now()}_${Math.random()}`;
    return `/charts/${chartId}.svg`;
  }

  exportToChatUI(presentationId: string): string {
    const pres = this.presentations.get(presentationId);
    if (!pres || !this.config.enableChatUI) return '';

    const chatFormat = this.formatForChat(pres);
    this.recordHistory('export-to-chat-ui');
    return chatFormat;
  }

  formatForChat(pres: GeneratedPresentation): string {
    let chatContent = `# ${pres.title}\n\n`;

    pres.slides.forEach((slide, index) => {
      chatContent += `## スライド ${index + 1}: ${slide.title}\n`;
      chatContent += `${slide.content}\n\n`;

      if (slide.images.length > 0) {
        chatContent += `**画像:**\n`;
        slide.images.forEach(img => {
          chatContent += `- ${img}\n`;
        });
        chatContent += '\n';
      }

      if (slide.charts.length > 0) {
        chatContent += `**グラフ:**\n`;
        slide.charts.forEach(chart => {
          chatContent += `- ${chart}\n`;
        });
        chatContent += '\n';
      }
    });

    return chatContent;
  }

  generateExecutiveSummary(presentationId: string): string {
    const pres = this.presentations.get(presentationId);
    if (!pres) return '';

    const summary = pres.slides.map(slide => `• ${slide.title}: ${slide.content.substring(0, 100)}...`).join('\n');

    this.recordHistory('generate-executive-summary');
    return summary;
  }

  generateMeetingNotes(presentationId: string): string {
    const pres = this.presentations.get(presentationId);
    if (!pres) return '';

    const notes = `会議資料: ${pres.title}\n生成日時: ${new Date().toLocaleString('ja-JP')}\n\n` + pres.slides.map(slide => `【${slide.title}】\n${slide.content}`).join('\n\n');

    this.recordHistory('generate-meeting-notes');
    return notes;
  }

  generateManufacturingImprovementPresentation(improvementData: any): string {
    const id = `pres_mfg_${Date.now()}_${Math.random()}`;

    const slides = [
      {
        id: 'slide_1',
        title: '改善概要',
        content: improvementData.title || '製造改善案',
        images: [],
        charts: [],
      },
      {
        id: 'slide_2',
        title: '現状分析',
        content: improvementData.currentState || '現在の状況',
        images: [],
        charts: [],
      },
      {
        id: 'slide_3',
        title: '改善案',
        content: improvementData.proposal || '提案内容',
        images: [],
        charts: [],
      },
      {
        id: 'slide_4',
        title: '期待効果',
        content: improvementData.expectedEffect || '期待される効果',
        images: [],
        charts: [],
      },
    ];

    const presentation: GeneratedPresentation = {
      id,
      title: `製造改善資料: ${improvementData.title}`,
      slides,
      metadata: { type: 'manufacturing-improvement', createdAt: new Date() },
    };

    this.presentations.set(id, presentation);
    this.recordHistory('generate-manufacturing-improvement');
    return id;
  }

  generateCostReductionPresentation(costData: any): string {
    const id = `pres_cost_${Date.now()}_${Math.random()}`;

    const slides = [
      {
        id: 'slide_1',
        title: '原価改善案',
        content: costData.title || '原価削減提案',
        images: [],
        charts: [],
      },
      {
        id: 'slide_2',
        title: '現在のコスト構成',
        content: costData.currentCost || 'コスト分析',
        images: [],
        charts: [],
      },
      {
        id: 'slide_3',
        title: '改善方法',
        content: costData.improvementMethod || '改善方法',
        images: [],
        charts: [],
      },
      {
        id: 'slide_4',
        title: '削減効果',
        content: costData.savingsEffect || `削減額: ${costData.savingsAmount || '未定'}`,
        images: [],
        charts: [],
      },
    ];

    const presentation: GeneratedPresentation = {
      id,
      title: `原価改善資料: ${costData.title}`,
      slides,
      metadata: { type: 'cost-reduction', createdAt: new Date() },
    };

    this.presentations.set(id, presentation);
    this.recordHistory('generate-cost-reduction');
    return id;
  }

  generatePresidentPresentation(businessData: any): string {
    const id = `pres_pres_${Date.now()}_${Math.random()}`;

    const slides = [
      {
        id: 'slide_1',
        title: '経営方針',
        content: businessData.strategy || '経営戦略',
        images: [],
        charts: [],
      },
      {
        id: 'slide_2',
        title: '事業成績',
        content: businessData.performance || '事業実績',
        images: [],
        charts: [],
      },
      {
        id: 'slide_3',
        title: '今年度の重点施策',
        content: businessData.initiatives || '重点施策',
        images: [],
        charts: [],
      },
      {
        id: 'slide_4',
        title: '中期経営計画',
        content: businessData.midTermPlan || '中期計画',
        images: [],
        charts: [],
      },
    ];

    const presentation: GeneratedPresentation = {
      id,
      title: `経営方針説明資料: ${businessData.title || ''}`,
      slides,
      metadata: { type: 'president-presentation', createdAt: new Date() },
    };

    this.presentations.set(id, presentation);
    this.recordHistory('generate-president-presentation');
    return id;
  }

  private extractSlidesFromPDF(content: string): GeneratedPresentation['slides'] {
    const sections = content.split('\n\n').slice(0, 5);
    return sections.map((section, index) => ({
      id: `slide_${index}`,
      title: `スライド ${index + 1}`,
      content: section.substring(0, 200),
      images: [],
      charts: [],
    }));
  }

  private extractSlidesFromExcel(data: string): GeneratedPresentation['slides'] {
    const rows = data.split('\n').slice(0, 5);
    return rows.map((row, index) => ({
      id: `slide_${index}`,
      title: `データ ${index + 1}`,
      content: row.substring(0, 200),
      images: [],
      charts: [],
    }));
  }

  private recordHistory(action: string): void {
    this.history.push({
      action,
      timestamp: new Date(),
    });
  }

  getHistory() {
    return this.history;
  }

  reset(): void {
    this.presentations.clear();
    this.history = [];
  }
}

describe('PresentationIntegrationService', () => {
  let service: PresentationIntegrationService;

  beforeEach(() => {
    service = new PresentationIntegrationService();
  });

  afterEach(() => {
    service.reset();
    service = null as any;
  });

  describe('PDF Integration', () => {
    it('should generate presentation from PDF', () => {
      const id = service.generatePresentationFromPDF('PDF Content', 'PDF Presentation');
      expect(id).toBeDefined();
      expect(id).toContain('pres_pdf_');
    });

    it('should handle disabled PDF analysis', () => {
      const disabledService = new PresentationIntegrationService({ enablePDFAnalysis: false });
      const id = disabledService.generatePresentationFromPDF('PDF Content', 'PDF Presentation');
      expect(id).toBe('');
    });
  });

  describe('Excel Integration', () => {
    it('should generate presentation from Excel', () => {
      const id = service.generatePresentationFromExcel('Excel Data', 'Excel Presentation');
      expect(id).toBeDefined();
      expect(id).toContain('pres_excel_');
    });

    it('should handle disabled Excel analysis', () => {
      const disabledService = new PresentationIntegrationService({ enableExcelAnalysis: false });
      const id = disabledService.generatePresentationFromExcel('Excel Data', 'Excel Presentation');
      expect(id).toBe('');
    });
  });

  describe('Image Generation', () => {
    it('should add images to slides', () => {
      const presId = service.generatePresentationFromPDF('PDF Content', 'PDF Presentation');
      const result = service.addImagesToSlides(presId, 0, ['Image 1', 'Image 2']);

      expect(result).toBe(true);
    });

    it('should handle disabled image generation', () => {
      const disabledService = new PresentationIntegrationService({ enableImageGeneration: false });
      const presId = disabledService.generatePresentationFromPDF('PDF Content', 'PDF Presentation');
      const result = disabledService.addImagesToSlides(presId, 0, ['Image 1']);

      expect(result).toBe(false);
    });
  });

  describe('Chart Generation', () => {
    it('should add charts to slides', () => {
      const presId = service.generatePresentationFromExcel('Excel Data', 'Excel Presentation');
      const result = service.addChartsToSlides(presId, 0, [{ type: 'bar', data: { values: [1, 2, 3] } }]);

      expect(result).toBe(true);
    });
  });

  describe('Chat UI Export', () => {
    it('should export to chat UI', () => {
      const presId = service.generatePresentationFromPDF('PDF Content', 'PDF Presentation');
      const chatContent = service.exportToChatUI(presId);

      expect(chatContent).toContain('PDF Presentation');
    });

    it('should handle disabled chat UI', () => {
      const disabledService = new PresentationIntegrationService({ enableChatUI: false });
      const presId = disabledService.generatePresentationFromPDF('PDF Content', 'PDF Presentation');
      const chatContent = disabledService.exportToChatUI(presId);

      expect(chatContent).toBe('');
    });
  });

  describe('Executive Summary', () => {
    it('should generate executive summary', () => {
      const presId = service.generatePresentationFromPDF('PDF Content', 'PDF Presentation');
      const summary = service.generateExecutiveSummary(presId);

      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);
    });
  });

  describe('Meeting Notes', () => {
    it('should generate meeting notes', () => {
      const presId = service.generatePresentationFromPDF('PDF Content', 'PDF Presentation');
      const notes = service.generateMeetingNotes(presId);

      expect(notes).toContain('会議資料');
      expect(notes).toContain('PDF Presentation');
    });
  });

  describe('Manufacturing Improvement', () => {
    it('should generate manufacturing improvement presentation', () => {
      const presId = service.generateManufacturingImprovementPresentation({
        title: 'ライン改善',
        currentState: '現在の生産効率は80%',
        proposal: 'ロボット導入',
        expectedEffect: '生産効率を95%に向上',
      });

      expect(presId).toBeDefined();
      expect(presId).toContain('pres_mfg_');
    });
  });

  describe('Cost Reduction', () => {
    it('should generate cost reduction presentation', () => {
      const presId = service.generateCostReductionPresentation({
        title: '材料費削減',
        currentCost: '現在の材料費は1000万円',
        improvementMethod: 'サプライヤー変更',
        savingsAmount: '200万円',
      });

      expect(presId).toBeDefined();
      expect(presId).toContain('pres_cost_');
    });
  });

  describe('President Presentation', () => {
    it('should generate president presentation', () => {
      const presId = service.generatePresidentPresentation({
        title: '2026年度経営方針',
        strategy: 'グローバル展開',
        performance: '売上高100億円達成',
        initiatives: 'デジタル化推進',
        midTermPlan: '2030年売上200億円',
      });

      expect(presId).toBeDefined();
      expect(presId).toContain('pres_pres_');
    });
  });

  describe('History', () => {
    it('should record history', () => {
      service.generatePresentationFromPDF('PDF Content', 'PDF Presentation');
      const history = service.getHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].action).toBe('generate-from-pdf');
    });
  });

  describe('Complex Workflows', () => {
    it('should create complete manufacturing improvement presentation', () => {
      const presId = service.generateManufacturingImprovementPresentation({
        title: 'ライン改善プロジェクト',
        currentState: '生産効率80%',
        proposal: 'ロボット導入',
        expectedEffect: '生産効率95%に向上',
      });

      service.addImagesToSlides(presId, 0, ['ロボット画像', 'ライン画像']);
      service.addChartsToSlides(presId, 1, [{ type: 'bar', data: { before: 80, after: 95 } }]);

      const chatContent = service.exportToChatUI(presId);
      expect(chatContent).toContain('ライン改善プロジェクト');
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * PowerPointGenerationService Test Suite
 * PowerPoint生成・最適化・エクスポート機能の包括的なテスト
 */

interface PowerPointConfig {
  title: string;
  author: string;
  subject: string;
  theme: 'modern' | 'classic' | 'minimal' | 'corporate';
  colorScheme: string;
  fontFamily: string;
}

interface ExportOptions {
  format: 'pptx' | 'pdf' | 'odp';
  quality: 'low' | 'medium' | 'high';
  compression: boolean;
}

class PowerPointGenerationService {
  private presentations: Map<string, any> = new Map();
  private templates: Map<string, any> = new Map();

  createPresentation(config: PowerPointConfig): string {
    const id = `pptx_${Date.now()}_${Math.random()}`;
    this.presentations.set(id, {
      id,
      config,
      slides: [],
      metadata: { created: new Date(), modified: new Date() },
    });
    return id;
  }

  addSlideFromTemplate(presentationId: string, templateName: string, content: any): boolean {
    const pres = this.presentations.get(presentationId);
    if (!pres) return false;

    const slide = {
      id: `slide_${Date.now()}_${Math.random()}`,
      template: templateName,
      content,
      elements: [],
    };
    pres.slides.push(slide);
    pres.metadata.modified = new Date();
    return true;
  }

  applyTheme(presentationId: string, theme: string): boolean {
    const pres = this.presentations.get(presentationId);
    if (!pres) return false;

    pres.config.theme = theme;
    pres.metadata.modified = new Date();
    return true;
  }

  setColorScheme(presentationId: string, colors: string[]): boolean {
    const pres = this.presentations.get(presentationId);
    if (!pres) return false;

    pres.config.colorScheme = colors.join(',');
    pres.metadata.modified = new Date();
    return true;
  }

  export(presentationId: string, options: ExportOptions): { filename: string; size: number; format: string } | null {
    const pres = this.presentations.get(presentationId);
    if (!pres) return null;

    const filename = `${pres.config.title.replace(/\s+/g, '_')}_${Date.now()}.${options.format}`;
    const baseSize = pres.slides.length * 100000;
    const size = options.quality === 'high' ? baseSize * 1.5 : options.quality === 'low' ? baseSize * 0.5 : baseSize;

    return {
      filename,
      size: Math.floor(size),
      format: options.format,
    };
  }

  optimizeForWeb(presentationId: string): boolean {
    const pres = this.presentations.get(presentationId);
    if (!pres) return false;

    pres.metadata.optimized = true;
    pres.metadata.modified = new Date();
    return true;
  }

  getPresentation(presentationId: string) {
    return this.presentations.get(presentationId);
  }

  reset(): void {
    this.presentations.clear();
    this.templates.clear();
  }
}

describe('PowerPointGenerationService', () => {
  let service: PowerPointGenerationService;

  beforeEach(() => {
    service = new PowerPointGenerationService();
  });

  afterEach(() => {
    service.reset();
    service = null as any;
  });

  describe('Presentation Creation', () => {
    it('should create a presentation with config', () => {
      const config: PowerPointConfig = {
        title: 'Test Presentation',
        author: 'Test Author',
        subject: 'Test Subject',
        theme: 'modern',
        colorScheme: '#0066CC',
        fontFamily: 'Arial',
      };

      const id = service.createPresentation(config);
      expect(id).toBeDefined();
      expect(id).toContain('pptx_');

      const pres = service.getPresentation(id);
      expect(pres).not.toBeNull();
      expect(pres.config.title).toBe('Test Presentation');
    });

    it('should create multiple presentations', () => {
      const config1: PowerPointConfig = {
        title: 'Pres 1',
        author: 'Author 1',
        subject: 'Subject 1',
        theme: 'modern',
        colorScheme: '#0066CC',
        fontFamily: 'Arial',
      };

      const config2: PowerPointConfig = {
        title: 'Pres 2',
        author: 'Author 2',
        subject: 'Subject 2',
        theme: 'classic',
        colorScheme: '#333333',
        fontFamily: 'Times New Roman',
      };

      const id1 = service.createPresentation(config1);
      const id2 = service.createPresentation(config2);

      expect(id1).not.toBe(id2);
      expect(service.getPresentation(id1)).not.toBeNull();
      expect(service.getPresentation(id2)).not.toBeNull();
    });

    it('should initialize with empty slides', () => {
      const config: PowerPointConfig = {
        title: 'Test',
        author: 'Author',
        subject: 'Subject',
        theme: 'modern',
        colorScheme: '#0066CC',
        fontFamily: 'Arial',
      };

      const id = service.createPresentation(config);
      const pres = service.getPresentation(id);

      expect(pres.slides).toHaveLength(0);
    });
  });

  describe('Slide Management', () => {
    let presentationId: string;

    beforeEach(() => {
      const config: PowerPointConfig = {
        title: 'Test',
        author: 'Author',
        subject: 'Subject',
        theme: 'modern',
        colorScheme: '#0066CC',
        fontFamily: 'Arial',
      };
      presentationId = service.createPresentation(config);
    });

    it('should add slide from template', () => {
      const result = service.addSlideFromTemplate(presentationId, 'title-slide', {
        title: 'My Title',
        subtitle: 'My Subtitle',
      });

      expect(result).toBe(true);
      const pres = service.getPresentation(presentationId);
      expect(pres.slides).toHaveLength(1);
    });

    it('should add multiple slides', () => {
      service.addSlideFromTemplate(presentationId, 'title-slide', { title: 'Title' });
      service.addSlideFromTemplate(presentationId, 'content-slide', { content: 'Content' });
      service.addSlideFromTemplate(presentationId, 'two-column', { left: 'Left', right: 'Right' });

      const pres = service.getPresentation(presentationId);
      expect(pres.slides).toHaveLength(3);
    });

    it('should handle non-existent presentation', () => {
      const result = service.addSlideFromTemplate('non-existent', 'title-slide', {});
      expect(result).toBe(false);
    });
  });

  describe('Theme and Color Management', () => {
    let presentationId: string;

    beforeEach(() => {
      const config: PowerPointConfig = {
        title: 'Test',
        author: 'Author',
        subject: 'Subject',
        theme: 'modern',
        colorScheme: '#0066CC',
        fontFamily: 'Arial',
      };
      presentationId = service.createPresentation(config);
    });

    it('should apply theme', () => {
      const result = service.applyTheme(presentationId, 'corporate');
      expect(result).toBe(true);

      const pres = service.getPresentation(presentationId);
      expect(pres.config.theme).toBe('corporate');
    });

    it('should set color scheme', () => {
      const colors = ['#FF0000', '#00FF00', '#0000FF'];
      const result = service.setColorScheme(presentationId, colors);

      expect(result).toBe(true);
      const pres = service.getPresentation(presentationId);
      expect(pres.config.colorScheme).toBe('#FF0000,#00FF00,#0000FF');
    });

    it('should handle invalid theme application', () => {
      const result = service.applyTheme('non-existent', 'corporate');
      expect(result).toBe(false);
    });

    it('should handle invalid color scheme', () => {
      const result = service.setColorScheme('non-existent', ['#FF0000']);
      expect(result).toBe(false);
    });
  });

  describe('Export Functionality', () => {
    let presentationId: string;

    beforeEach(() => {
      const config: PowerPointConfig = {
        title: 'Export Test',
        author: 'Author',
        subject: 'Subject',
        theme: 'modern',
        colorScheme: '#0066CC',
        fontFamily: 'Arial',
      };
      presentationId = service.createPresentation(config);

      service.addSlideFromTemplate(presentationId, 'title-slide', { title: 'Title' });
      service.addSlideFromTemplate(presentationId, 'content-slide', { content: 'Content' });
    });

    it('should export to PPTX', () => {
      const result = service.export(presentationId, {
        format: 'pptx',
        quality: 'high',
        compression: false,
      });

      expect(result).not.toBeNull();
      expect(result?.filename).toContain('Export_Test');
      expect(result?.filename).toContain('.pptx');
      expect(result?.format).toBe('pptx');
    });

    it('should export to PDF', () => {
      const result = service.export(presentationId, {
        format: 'pdf',
        quality: 'medium',
        compression: true,
      });

      expect(result).not.toBeNull();
      expect(result?.filename).toContain('.pdf');
      expect(result?.format).toBe('pdf');
    });

    it('should export to ODP', () => {
      const result = service.export(presentationId, {
        format: 'odp',
        quality: 'low',
        compression: true,
      });

      expect(result).not.toBeNull();
      expect(result?.filename).toContain('.odp');
      expect(result?.format).toBe('odp');
    });

    it('should adjust size based on quality', () => {
      const highQuality = service.export(presentationId, {
        format: 'pptx',
        quality: 'high',
        compression: false,
      });

      const lowQuality = service.export(presentationId, {
        format: 'pptx',
        quality: 'low',
        compression: false,
      });

      expect(highQuality?.size).toBeGreaterThan(lowQuality?.size || 0);
    });

    it('should handle non-existent presentation export', () => {
      const result = service.export('non-existent', {
        format: 'pptx',
        quality: 'high',
        compression: false,
      });

      expect(result).toBeNull();
    });
  });

  describe('Optimization', () => {
    let presentationId: string;

    beforeEach(() => {
      const config: PowerPointConfig = {
        title: 'Optimization Test',
        author: 'Author',
        subject: 'Subject',
        theme: 'modern',
        colorScheme: '#0066CC',
        fontFamily: 'Arial',
      };
      presentationId = service.createPresentation(config);
    });

    it('should optimize for web', () => {
      const result = service.optimizeForWeb(presentationId);
      expect(result).toBe(true);

      const pres = service.getPresentation(presentationId);
      expect(pres.metadata.optimized).toBe(true);
    });

    it('should handle optimization of non-existent presentation', () => {
      const result = service.optimizeForWeb('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Metadata Management', () => {
    it('should track creation time', () => {
      const config: PowerPointConfig = {
        title: 'Test',
        author: 'Author',
        subject: 'Subject',
        theme: 'modern',
        colorScheme: '#0066CC',
        fontFamily: 'Arial',
      };

      const id = service.createPresentation(config);
      const pres = service.getPresentation(id);

      expect(pres.metadata.created).toBeDefined();
      expect(pres.metadata.created instanceof Date).toBe(true);
    });

    it('should update modification time on changes', () => {
      const config: PowerPointConfig = {
        title: 'Test',
        author: 'Author',
        subject: 'Subject',
        theme: 'modern',
        colorScheme: '#0066CC',
        fontFamily: 'Arial',
      };

      const id = service.createPresentation(config);
      const pres1 = service.getPresentation(id);
      const created = pres1.metadata.modified;

      // Wait a bit to ensure time difference
      service.addSlideFromTemplate(id, 'title-slide', {});

      const pres2 = service.getPresentation(id);
      expect(pres2.metadata.modified.getTime()).toBeGreaterThanOrEqual(created.getTime());
    });
  });

  describe('Complex Workflows', () => {
    it('should create, populate, and export presentation', () => {
      const config: PowerPointConfig = {
        title: 'Complete Workflow',
        author: 'Test Author',
        subject: 'Complete Test',
        theme: 'modern',
        colorScheme: '#0066CC',
        fontFamily: 'Arial',
      };

      const id = service.createPresentation(config);

      service.addSlideFromTemplate(id, 'title-slide', { title: 'Title', subtitle: 'Subtitle' });
      service.addSlideFromTemplate(id, 'content-slide', { content: 'Content 1' });
      service.addSlideFromTemplate(id, 'content-slide', { content: 'Content 2' });

      service.applyTheme(id, 'corporate');
      service.setColorScheme(id, ['#FF0000', '#00FF00']);
      service.optimizeForWeb(id);

      const result = service.export(id, {
        format: 'pptx',
        quality: 'high',
        compression: false,
      });

      expect(result).not.toBeNull();
      expect(result?.filename).toContain('Complete_Workflow');

      const pres = service.getPresentation(id);
      expect(pres.slides).toHaveLength(3);
      expect(pres.config.theme).toBe('corporate');
      expect(pres.metadata.optimized).toBe(true);
    });

    it('should handle multiple presentations independently', () => {
      const config1: PowerPointConfig = {
        title: 'Pres 1',
        author: 'Author 1',
        subject: 'Subject 1',
        theme: 'modern',
        colorScheme: '#0066CC',
        fontFamily: 'Arial',
      };

      const config2: PowerPointConfig = {
        title: 'Pres 2',
        author: 'Author 2',
        subject: 'Subject 2',
        theme: 'classic',
        colorScheme: '#333333',
        fontFamily: 'Times New Roman',
      };

      const id1 = service.createPresentation(config1);
      const id2 = service.createPresentation(config2);

      service.addSlideFromTemplate(id1, 'title-slide', { title: 'Pres 1 Title' });
      service.addSlideFromTemplate(id2, 'title-slide', { title: 'Pres 2 Title' });

      service.applyTheme(id1, 'corporate');
      service.applyTheme(id2, 'minimal');

      const pres1 = service.getPresentation(id1);
      const pres2 = service.getPresentation(id2);

      expect(pres1.config.theme).toBe('corporate');
      expect(pres2.config.theme).toBe('minimal');
      expect(pres1.slides).toHaveLength(1);
      expect(pres2.slides).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle null configuration', () => {
      const config: PowerPointConfig = {
        title: '',
        author: '',
        subject: '',
        theme: 'modern',
        colorScheme: '',
        fontFamily: '',
      };

      const id = service.createPresentation(config);
      expect(id).toBeDefined();
    });

    it('should handle empty color scheme', () => {
      const config: PowerPointConfig = {
        title: 'Test',
        author: 'Author',
        subject: 'Subject',
        theme: 'modern',
        colorScheme: '#0066CC',
        fontFamily: 'Arial',
      };

      const id = service.createPresentation(config);
      const result = service.setColorScheme(id, []);

      expect(result).toBe(true);
    });
  });
});

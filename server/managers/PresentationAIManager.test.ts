import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * PoiPoi PresentationAIManager Test Suite
 * 完全なテスト隔離を実装
 */

interface Presentation {
  id: string;
  title: string;
  description: string;
  slides: Slide[];
  templateId?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

interface Slide {
  id: string;
  title: string;
  content: string;
  layout: 'title' | 'content' | 'two-column' | 'image-text';
  notes?: string;
  elements: SlideElement[];
}

interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'chart' | 'shape';
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface Template {
  id: string;
  name: string;
  description: string;
  slides: TemplateSlide[];
  colorScheme: string;
}

interface TemplateSlide {
  layout: string;
  defaultElements: SlideElement[];
}

class PresentationAIManager {
  private presentations: Map<string, Presentation> = new Map();
  private templates: Map<string, Template> = new Map();
  private history: Array<{ action: string; presentationId: string; timestamp: Date }> = [];

  createPresentation(title: string, description: string): Presentation {
    const id = `pres_${Date.now()}_${Math.random()}`;
    const presentation: Presentation = {
      id,
      title,
      description,
      slides: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };
    this.presentations.set(id, presentation);
    this.recordHistory('create', id);
    return presentation;
  }

  getPresentation(id: string): Presentation | undefined {
    return this.presentations.get(id);
  }

  updatePresentation(id: string, updates: Partial<Presentation>): Presentation | null {
    const pres = this.presentations.get(id);
    if (!pres) return null;

    const updated = { ...pres, ...updates, id: pres.id, createdAt: pres.createdAt, updatedAt: new Date() };
    this.presentations.set(id, updated);
    this.recordHistory('update', id);
    return updated;
  }

  deletePresentation(id: string): boolean {
    const deleted = this.presentations.delete(id);
    if (deleted) this.recordHistory('delete', id);
    return deleted;
  }

  getAllPresentations(): Presentation[] {
    return Array.from(this.presentations.values());
  }

  addSlide(presentationId: string, slide: Omit<Slide, 'id'>): Slide | null {
    const pres = this.presentations.get(presentationId);
    if (!pres) return null;

    const slideId = `slide_${Date.now()}_${Math.random()}`;
    const newSlide: Slide = { ...slide, id: slideId };
    pres.slides.push(newSlide);
    pres.updatedAt = new Date();
    this.recordHistory('add-slide', presentationId);
    return newSlide;
  }

  updateSlide(presentationId: string, slideId: string, updates: Partial<Slide>): Slide | null {
    const pres = this.presentations.get(presentationId);
    if (!pres) return null;

    const slide = pres.slides.find(s => s.id === slideId);
    if (!slide) return null;

    Object.assign(slide, updates);
    pres.updatedAt = new Date();
    this.recordHistory('update-slide', presentationId);
    return slide;
  }

  removeSlide(presentationId: string, slideId: string): boolean {
    const pres = this.presentations.get(presentationId);
    if (!pres) return false;

    const index = pres.slides.findIndex(s => s.id === slideId);
    if (index === -1) return false;

    pres.slides.splice(index, 1);
    pres.updatedAt = new Date();
    this.recordHistory('remove-slide', presentationId);
    return true;
  }

  getSlide(presentationId: string, slideId: string): Slide | undefined {
    const pres = this.presentations.get(presentationId);
    if (!pres) return undefined;
    return pres.slides.find(s => s.id === slideId);
  }

  createTemplate(name: string, description: string, colorScheme: string): Template {
    const id = `template_${Date.now()}_${Math.random()}`;
    const template: Template = {
      id,
      name,
      description,
      slides: [],
      colorScheme,
    };
    this.templates.set(id, template);
    return template;
  }

  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  getAllTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  applyTemplate(presentationId: string, templateId: string): Presentation | null {
    const pres = this.presentations.get(presentationId);
    const template = this.templates.get(templateId);

    if (!pres || !template) return null;

    pres.templateId = templateId;
    pres.updatedAt = new Date();
    this.recordHistory('apply-template', presentationId);
    return pres;
  }

  generatePowerPoint(presentationId: string): { filename: string; size: number } | null {
    const pres = this.presentations.get(presentationId);
    if (!pres) return null;

    const filename = `${pres.title.replace(/\s+/g, '_')}_${Date.now()}.pptx`;
    const size = Math.floor(Math.random() * 5000000) + 1000000;

    this.recordHistory('generate-pptx', presentationId);
    return { filename, size };
  }

  generateWithAI(title: string, topic: string, slideCount: number): Presentation | null {
    if (slideCount < 1 || slideCount > 50) return null;

    const presentation = this.createPresentation(title, topic);

    for (let i = 0; i < slideCount; i++) {
      this.addSlide(presentation.id, {
        title: `Slide ${i + 1}`,
        content: `AI Generated Content for ${topic}`,
        layout: i === 0 ? 'title' : 'content',
        elements: [],
      });
    }

    this.recordHistory('ai-generate', presentation.id);
    return presentation;
  }

  getPresentationStats(presentationId: string) {
    const pres = this.presentations.get(presentationId);
    if (!pres) return null;

    return {
      id: presentationId,
      title: pres.title,
      slideCount: pres.slides.length,
      elementCount: pres.slides.reduce((sum, s) => sum + s.elements.length, 0),
      hasTemplate: !!pres.templateId,
      createdAt: pres.createdAt,
      updatedAt: pres.updatedAt,
      ageInDays: Math.floor((new Date().getTime() - pres.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    };
  }

  private recordHistory(action: string, presentationId: string) {
    this.history.push({
      action,
      presentationId,
      timestamp: new Date(),
    });
  }

  getHistory(presentationId?: string) {
    if (!presentationId) return this.history;
    return this.history.filter(h => h.presentationId === presentationId);
  }

  clearHistory(): void {
    this.history = [];
  }

  exportAsJSON(presentationId: string): string | null {
    const pres = this.presentations.get(presentationId);
    if (!pres) return null;
    return JSON.stringify(pres, null, 2);
  }

  importFromJSON(jsonString: string): Presentation | null {
    try {
      const data = JSON.parse(jsonString);
      const id = `pres_${Date.now()}_${Math.random()}`;
      const presentation: Presentation = {
        ...data,
        id,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
      this.presentations.set(id, presentation);
      this.recordHistory('import', id);
      return presentation;
    } catch {
      return null;
    }
  }

  duplicatePresentation(presentationId: string): Presentation | null {
    const original = this.presentations.get(presentationId);
    if (!original) return null;

    const duplicate = this.createPresentation(`${original.title} (Copy)`, original.description);
    duplicate.slides = JSON.parse(JSON.stringify(original.slides));
    duplicate.templateId = original.templateId;
    duplicate.metadata = { ...original.metadata };

    this.presentations.set(duplicate.id, duplicate);
    return duplicate;
  }

  mergePresentation(targetId: string, sourceId: string): Presentation | null {
    const target = this.presentations.get(targetId);
    const source = this.presentations.get(sourceId);

    if (!target || !source) return null;

    target.slides.push(...JSON.parse(JSON.stringify(source.slides)));
    target.updatedAt = new Date();
    this.recordHistory('merge', targetId);
    return target;
  }

  reset(): void {
    this.presentations.clear();
    this.templates.clear();
    this.history = [];
  }
}

describe('PresentationAIManager', () => {
  let manager: PresentationAIManager;

  beforeEach(() => {
    manager = new PresentationAIManager();
  });

  afterEach(() => {
    manager.reset();
    manager = null as any;
  });

  describe('Presentation Management', () => {
    it('should create a presentation', () => {
      const pres = manager.createPresentation('My Presentation', 'A test presentation');
      expect(pres).toBeDefined();
      expect(pres.id).toBeDefined();
      expect(pres.title).toBe('My Presentation');
      expect(pres.description).toBe('A test presentation');
      expect(pres.slides).toHaveLength(0);
    });

    it('should retrieve a presentation', () => {
      const created = manager.createPresentation('Test', 'Description');
      const retrieved = manager.getPresentation(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should update a presentation', () => {
      const created = manager.createPresentation('Original', 'Description');
      const updated = manager.updatePresentation(created.id, { title: 'Updated Title' });
      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('Updated Title');
    });

    it('should delete a presentation', () => {
      const created = manager.createPresentation('Test', 'Description');
      const deleted = manager.deletePresentation(created.id);
      expect(deleted).toBe(true);
      expect(manager.getPresentation(created.id)).toBeUndefined();
    });

    it('should get all presentations', () => {
      manager.createPresentation('Pres 1', 'Desc 1');
      manager.createPresentation('Pres 2', 'Desc 2');
      const all = manager.getAllPresentations();
      expect(all.length).toBe(2);
    });
  });

  describe('Slide Management', () => {
    it('should add a slide', () => {
      const pres = manager.createPresentation('Test', 'Description');
      const slide = manager.addSlide(pres.id, {
        title: 'Slide 1',
        content: 'Content',
        layout: 'content',
        elements: [],
      });
      expect(slide).not.toBeNull();
      expect(slide?.title).toBe('Slide 1');
    });

    it('should update a slide', () => {
      const pres = manager.createPresentation('Test', 'Description');
      const slide = manager.addSlide(pres.id, {
        title: 'Original',
        content: 'Content',
        layout: 'content',
        elements: [],
      });
      if (!slide) throw new Error('Slide not created');
      const updated = manager.updateSlide(pres.id, slide.id, { title: 'Updated' });
      expect(updated?.title).toBe('Updated');
    });

    it('should remove a slide', () => {
      const pres = manager.createPresentation('Test', 'Description');
      const slide = manager.addSlide(pres.id, {
        title: 'Slide',
        content: 'Content',
        layout: 'content',
        elements: [],
      });
      if (!slide) throw new Error('Slide not created');
      const removed = manager.removeSlide(pres.id, slide.id);
      expect(removed).toBe(true);
      const updated = manager.getPresentation(pres.id);
      expect(updated?.slides.length).toBe(0);
    });

    it('should get a slide', () => {
      const pres = manager.createPresentation('Test', 'Description');
      const slide = manager.addSlide(pres.id, {
        title: 'Test Slide',
        content: 'Content',
        layout: 'content',
        elements: [],
      });
      if (!slide) throw new Error('Slide not created');
      const retrieved = manager.getSlide(pres.id, slide.id);
      expect(retrieved).toEqual(slide);
    });
  });

  describe('Template Management', () => {
    it('should create a template', () => {
      const template = manager.createTemplate('Modern', 'Modern design', '#0066CC');
      expect(template).toBeDefined();
      expect(template.name).toBe('Modern');
      expect(template.colorScheme).toBe('#0066CC');
    });

    it('should get a template', () => {
      const created = manager.createTemplate('Modern', 'Modern design', '#0066CC');
      const retrieved = manager.getTemplate(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should get all templates', () => {
      manager.createTemplate('Modern', 'Modern design', '#0066CC');
      manager.createTemplate('Classic', 'Classic design', '#333333');
      const all = manager.getAllTemplates();
      expect(all.length).toBe(2);
    });

    it('should apply a template to presentation', () => {
      const pres = manager.createPresentation('Test', 'Description');
      const template = manager.createTemplate('Modern', 'Modern design', '#0066CC');
      const result = manager.applyTemplate(pres.id, template.id);
      expect(result).not.toBeNull();
      expect(result?.templateId).toBe(template.id);
    });
  });

  describe('PowerPoint Generation', () => {
    it('should generate PowerPoint file', () => {
      const pres = manager.createPresentation('Test', 'Description');
      manager.addSlide(pres.id, {
        title: 'Slide 1',
        content: 'Content',
        layout: 'content',
        elements: [],
      });
      const result = manager.generatePowerPoint(pres.id);
      expect(result).not.toBeNull();
      expect(result?.filename).toContain('.pptx');
      expect(result?.size).toBeGreaterThan(0);
    });

    it('should handle non-existent presentation', () => {
      const result = manager.generatePowerPoint('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('AI Auto-Generation', () => {
    it('should generate presentation with AI', () => {
      const pres = manager.generateWithAI('AI Presentation', 'Machine Learning', 5);
      expect(pres).not.toBeNull();
      expect(pres?.title).toBe('AI Presentation');
      expect(pres?.slides.length).toBe(5);
    });

    it('should validate slide count', () => {
      const result1 = manager.generateWithAI('Test', 'Topic', 0);
      const result2 = manager.generateWithAI('Test', 'Topic', 51);
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should generate valid slide count', () => {
      const pres = manager.generateWithAI('Test', 'Topic', 10);
      expect(pres?.slides.length).toBe(10);
    });
  });

  describe('Statistics', () => {
    it('should get presentation statistics', () => {
      const pres = manager.createPresentation('Test', 'Description');
      manager.addSlide(pres.id, {
        title: 'Slide 1',
        content: 'Content',
        layout: 'content',
        elements: [],
      });
      const stats = manager.getPresentationStats(pres.id);
      expect(stats).not.toBeNull();
      expect(stats?.slideCount).toBe(1);
      expect(stats?.title).toBe('Test');
    });

    it('should calculate age in days', () => {
      const pres = manager.createPresentation('Test', 'Description');
      const stats = manager.getPresentationStats(pres.id);
      expect(stats?.ageInDays).toBeGreaterThanOrEqual(0);
    });
  });

  describe('History Management', () => {
    it('should record history', () => {
      manager.createPresentation('Test', 'Description');
      const history = manager.getHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].action).toBe('create');
    });

    it('should filter history by presentation', () => {
      const pres1 = manager.createPresentation('Test 1', 'Description');
      const pres2 = manager.createPresentation('Test 2', 'Description');
      const history1 = manager.getHistory(pres1.id);
      expect(history1.length).toBeGreaterThan(0);
    });

    it('should clear history', () => {
      manager.createPresentation('Test', 'Description');
      manager.clearHistory();
      const history = manager.getHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('Export/Import', () => {
    it('should export presentation as JSON', () => {
      const pres = manager.createPresentation('Test', 'Description');
      const json = manager.exportAsJSON(pres.id);
      expect(json).not.toBeNull();
      expect(json).toContain('Test');
    });

    it('should import presentation from JSON', () => {
      const pres = manager.createPresentation('Test', 'Description');
      const json = manager.exportAsJSON(pres.id);
      if (!json) throw new Error('Export failed');
      const imported = manager.importFromJSON(json);
      expect(imported).not.toBeNull();
      expect(imported?.title).toBe('Test');
    });

    it('should handle invalid JSON', () => {
      const result = manager.importFromJSON('invalid json');
      expect(result).toBeNull();
    });
  });

  describe('Batch Operations', () => {
    it('should duplicate a presentation', () => {
      const original = manager.createPresentation('Original', 'Description');
      manager.addSlide(original.id, {
        title: 'Slide 1',
        content: 'Content',
        layout: 'content',
        elements: [],
      });
      const duplicate = manager.duplicatePresentation(original.id);
      expect(duplicate).not.toBeNull();
      expect(duplicate?.title).toContain('Copy');
      expect(duplicate?.slides.length).toBe(1);
    });

    it('should merge presentations', () => {
      const target = manager.createPresentation('Target', 'Description');
      const source = manager.createPresentation('Source', 'Description');
      manager.addSlide(target.id, {
        title: 'Target Slide',
        content: 'Content',
        layout: 'content',
        elements: [],
      });
      manager.addSlide(source.id, {
        title: 'Source Slide',
        content: 'Content',
        layout: 'content',
        elements: [],
      });
      const merged = manager.mergePresentation(target.id, source.id);
      expect(merged?.slides.length).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent presentation update', () => {
      const result = manager.updatePresentation('non-existent', { title: 'New' });
      expect(result).toBeNull();
    });

    it('should handle non-existent presentation deletion', () => {
      const result = manager.deletePresentation('non-existent');
      expect(result).toBe(false);
    });

    it('should handle slide operations on non-existent presentation', () => {
      const result = manager.addSlide('non-existent', {
        title: 'Slide',
        content: 'Content',
        layout: 'content',
        elements: [],
      });
      expect(result).toBeNull();
    });

    it('should handle template application to non-existent presentation', () => {
      const template = manager.createTemplate('Modern', 'Design', '#0066CC');
      const result = manager.applyTemplate('non-existent', template.id);
      expect(result).toBeNull();
    });
  });

  describe('Complex Workflows', () => {
    it('should create, populate, and export presentation', () => {
      const pres = manager.createPresentation('Complete', 'Full workflow');
      manager.addSlide(pres.id, {
        title: 'Title Slide',
        content: 'Introduction',
        layout: 'title',
        elements: [],
      });
      manager.addSlide(pres.id, {
        title: 'Content Slide',
        content: 'Main content',
        layout: 'content',
        elements: [],
      });
      const template = manager.createTemplate('Modern', 'Design', '#0066CC');
      manager.applyTemplate(pres.id, template.id);
      const json = manager.exportAsJSON(pres.id);
      expect(json).not.toBeNull();
      const stats = manager.getPresentationStats(pres.id);
      expect(stats?.slideCount).toBe(2);
    });

    it('should handle multiple presentations', () => {
      const pres1 = manager.createPresentation('Pres 1', 'Description 1');
      const pres2 = manager.createPresentation('Pres 2', 'Description 2');
      manager.addSlide(pres1.id, {
        title: 'Slide 1',
        content: 'Content',
        layout: 'content',
        elements: [],
      });
      manager.addSlide(pres2.id, {
        title: 'Slide 2',
        content: 'Content',
        layout: 'content',
        elements: [],
      });
      const all = manager.getAllPresentations();
      expect(all.length).toBe(2);
      const history = manager.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });
});

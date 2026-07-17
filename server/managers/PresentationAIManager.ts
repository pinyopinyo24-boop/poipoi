/**
 * PoiPoi PresentationAIManager
 * プレゼンテーション管理・AI生成・エクスポート
 */

import { PresentationRepository } from './PresentationRepository';

export interface Presentation {
  id: string;
  title: string;
  description: string;
  slides: Slide[];
  templateId?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface Slide {
  id: string;
  title: string;
  content: string;
  layout: 'title' | 'content' | 'two-column' | 'image-text' | 'chart' | 'table';
  notes?: string;
  elements: SlideElement[];
}

export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'chart' | 'shape';
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface Template {
  id: string;
  name: string;
  description: string;
  slides: TemplateSlide[];
  colorScheme: string;
}

export interface TemplateSlide {
  layout: string;
  defaultElements: SlideElement[];
}

export class PresentationAIManager {
  private presentations: Map<string, Presentation> = new Map();
  private templates: Map<string, Template> = new Map();
  private history: Array<{ action: string; presentationId: string; timestamp: Date }> = [];
  private repository: PresentationRepository;

  constructor(repository: PresentationRepository) {
    this.repository = repository;
  }

  createPresentation(title: string, description: string): Presentation {
    const id = `pres_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

    const slideId = `slide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    pres.metadata.colorScheme = template.colorScheme;
    pres.updatedAt = new Date();
    this.recordHistory('apply-template', presentationId);
    return pres;
  }

  generateWithAI(presentationId: string, slideCount: number): Presentation | null {
    const pres = this.presentations.get(presentationId);
    if (!pres) return null;

    if (slideCount < 1 || slideCount > 50) {
      console.error('[PresentationAIManager] Invalid slide count:', slideCount);
      return null;
    }

    for (let i = 0; i < slideCount; i++) {
      this.addSlide(presentationId, {
        title: `Slide ${i + 1}`,
        content: `Content for slide ${i + 1}`,
        layout: i === 0 ? 'title' : 'content',
        elements: [],
      });
    }

    this.recordHistory('generate-ai', presentationId);
    return pres;
  }

  exportPowerPoint(presentationId: string): Buffer | null {
    const pres = this.presentations.get(presentationId);
    if (!pres) return null;

    // シミュレーション: 実際のPPTX生成は別のサービスで実装
    const content = JSON.stringify(pres);
    this.recordHistory('export-pptx', presentationId);
    return Buffer.from(content);
  }

  exportPDF(presentationId: string): Buffer | null {
    const pres = this.presentations.get(presentationId);
    if (!pres) return null;

    // シミュレーション: 実際のPDF生成は別のサービスで実装
    const content = JSON.stringify(pres);
    this.recordHistory('export-pdf', presentationId);
    return Buffer.from(content);
  }

  exportJSON(presentationId: string): string | null {
    const pres = this.presentations.get(presentationId);
    if (!pres) return null;

    this.recordHistory('export-json', presentationId);
    return JSON.stringify(pres, null, 2);
  }

  importJSON(json: string): Presentation | null {
    try {
      const data = JSON.parse(json) as Presentation;
      const id = `pres_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const presentation: Presentation = {
        ...data,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.presentations.set(id, presentation);
      this.recordHistory('import-json', id);
      return presentation;
    } catch {
      return null;
    }
  }

  addNote(presentationId: string, slideId: string, note: string): Slide | null {
    const slide = this.getSlide(presentationId, slideId);
    if (!slide) return null;

    slide.notes = note;
    this.recordHistory('add-note', presentationId);
    return slide;
  }

  getNotes(presentationId: string): Array<{ slideId: string; notes: string }> {
    const pres = this.presentations.get(presentationId);
    if (!pres) return [];

    return pres.slides
      .filter(s => s.notes)
      .map(s => ({ slideId: s.id, notes: s.notes || '' }));
  }

  search(query: string): Presentation[] {
    return Array.from(this.presentations.values()).filter(
      p => p.title.includes(query) || p.description.includes(query)
    );
  }

  getStatistics(): Record<string, unknown> {
    const presentations = Array.from(this.presentations.values());
    const totalSlides = presentations.reduce((sum, p) => sum + p.slides.length, 0);

    return {
      totalPresentations: presentations.length,
      totalSlides,
      totalTemplates: this.templates.size,
      averageSlidesPerPresentation: presentations.length > 0 ? totalSlides / presentations.length : 0,
      totalActions: this.history.length,
    };
  }

  getHistory(): Array<{ action: string; presentationId: string; timestamp: Date }> {
    return [...this.history];
  }

  private recordHistory(action: string, presentationId: string): void {
    this.history.push({
      action,
      presentationId,
      timestamp: new Date(),
    });
  }

  clear(): void {
    this.presentations.clear();
    this.templates.clear();
    this.history = [];
  }
}

let managerInstance: PresentationAIManager | null = null;

export function getPresentationAIManager(repository: PresentationRepository): PresentationAIManager {
  if (!managerInstance) {
    managerInstance = new PresentationAIManager(repository);
  }
  return managerInstance;
}

export function resetPresentationAIManager(): void {
  managerInstance = null;
}

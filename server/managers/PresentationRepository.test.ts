import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * PresentationRepository Test Suite
 * プレゼンテーション永続化・バージョン管理・テンプレート保存の包括的なテスト
 */

interface PresentationData {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  author: string;
  tags: string[];
  isTemplate: boolean;
}

interface RepositoryStats {
  totalPresentations: number;
  totalTemplates: number;
  totalVersions: number;
  oldestPresentation: Date | null;
  newestPresentation: Date | null;
}

class PresentationRepository {
  private presentations: Map<string, PresentationData> = new Map();
  private versions: Map<string, PresentationData[]> = new Map();
  private templates: Map<string, PresentationData> = new Map();

  save(presentation: Omit<PresentationData, 'version'>): string {
    const id = presentation.id || `pres_${Date.now()}_${Math.random()}`;
    const data: PresentationData = {
      ...presentation,
      id,
      version: 1,
    };

    this.presentations.set(id, data);

    if (!this.versions.has(id)) {
      this.versions.set(id, []);
    }
    this.versions.get(id)!.push({ ...data });

    if (presentation.isTemplate) {
      this.templates.set(id, data);
    }

    return id;
  }

  findById(id: string): PresentationData | undefined {
    return this.presentations.get(id);
  }

  findAll(): PresentationData[] {
    return Array.from(this.presentations.values());
  }

  findByTitle(title: string): PresentationData[] {
    return Array.from(this.presentations.values()).filter(p => p.title.includes(title));
  }

  findByAuthor(author: string): PresentationData[] {
    return Array.from(this.presentations.values()).filter(p => p.author === author);
  }

  findByTag(tag: string): PresentationData[] {
    return Array.from(this.presentations.values()).filter(p => p.tags.includes(tag));
  }

  findTemplates(): PresentationData[] {
    return Array.from(this.templates.values());
  }

  update(id: string, updates: Partial<PresentationData>): PresentationData | null {
    const current = this.presentations.get(id);
    if (!current) return null;

    const updated: PresentationData = {
      ...current,
      ...updates,
      id: current.id,
      createdAt: current.createdAt,
      version: current.version + 1,
      updatedAt: new Date(),
    };

    this.presentations.set(id, updated);

    const versionHistory = this.versions.get(id) || [];
    versionHistory.push({ ...updated });
    this.versions.set(id, versionHistory);

    if (updates.isTemplate) {
      this.templates.set(id, updated);
    }

    return updated;
  }

  delete(id: string): boolean {
    const deleted = this.presentations.delete(id);
    if (deleted) {
      this.versions.delete(id);
      this.templates.delete(id);
    }
    return deleted;
  }

  getVersionHistory(id: string): PresentationData[] {
    return this.versions.get(id) || [];
  }

  getVersion(id: string, version: number): PresentationData | undefined {
    const history = this.versions.get(id);
    if (!history) return undefined;

    return history.find(v => v.version === version);
  }

  revertToVersion(id: string, version: number): PresentationData | null {
    const targetVersion = this.getVersion(id, version);
    if (!targetVersion) return null;

    const current = this.presentations.get(id);
    if (!current) return null;

    const reverted: PresentationData = {
      ...targetVersion,
      id: current.id,
      version: current.version + 1,
      updatedAt: new Date(),
    };

    this.presentations.set(id, reverted);

    const versionHistory = this.versions.get(id) || [];
    versionHistory.push({ ...reverted });
    this.versions.set(id, versionHistory);

    return reverted;
  }

  saveAsTemplate(id: string, templateName: string): string | null {
    const pres = this.presentations.get(id);
    if (!pres) return null;

    const templateId = `template_${Date.now()}_${Math.random()}`;
    const template: PresentationData = {
      ...pres,
      id: templateId,
      title: templateName,
      isTemplate: true,
      version: 1,
    };

    this.templates.set(templateId, template);
    this.presentations.set(templateId, template);

    return templateId;
  }

  getStats(): RepositoryStats {
    const allPresentations = Array.from(this.presentations.values());

    return {
      totalPresentations: allPresentations.length,
      totalTemplates: this.templates.size,
      totalVersions: Array.from(this.versions.values()).reduce((sum, v) => sum + v.length, 0),
      oldestPresentation: allPresentations.length > 0 ? new Date(Math.min(...allPresentations.map(p => p.createdAt.getTime()))) : null,
      newestPresentation: allPresentations.length > 0 ? new Date(Math.max(...allPresentations.map(p => p.updatedAt.getTime()))) : null,
    };
  }

  search(query: string): PresentationData[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.presentations.values()).filter(
      p => p.title.toLowerCase().includes(lowerQuery) || p.description.toLowerCase().includes(lowerQuery) || p.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }

  export(id: string): string | null {
    const pres = this.presentations.get(id);
    if (!pres) return null;

    return JSON.stringify(pres, null, 2);
  }

  import(jsonString: string): string | null {
    try {
      const data = JSON.parse(jsonString) as PresentationData;
      const id = `pres_${Date.now()}_${Math.random()}`;

      const imported: PresentationData = {
        ...data,
        id,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        version: 1,
      };

      this.presentations.set(id, imported);
      this.versions.set(id, [{ ...imported }]);

      return id;
    } catch {
      return null;
    }
  }

  reset(): void {
    this.presentations.clear();
    this.versions.clear();
    this.templates.clear();
  }
}

describe('PresentationRepository', () => {
  let repo: PresentationRepository;

  beforeEach(() => {
    repo = new PresentationRepository();
  });

  afterEach(() => {
    repo.reset();
    repo = null as any;
  });

  describe('Save and Retrieve', () => {
    it('should save a presentation', () => {
      const id = repo.save({
        title: 'Test Presentation',
        description: 'Test Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Test Author',
        tags: ['test'],
        isTemplate: false,
      });

      expect(id).toBeDefined();
      const pres = repo.findById(id);
      expect(pres).not.toBeNull();
      expect(pres?.title).toBe('Test Presentation');
    });

    it('should find presentation by id', () => {
      const id = repo.save({
        title: 'Test',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: [],
        isTemplate: false,
      });

      const pres = repo.findById(id);
      expect(pres?.id).toBe(id);
    });

    it('should find all presentations', () => {
      repo.save({
        title: 'Pres 1',
        description: 'Desc 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author 1',
        tags: [],
        isTemplate: false,
      });

      repo.save({
        title: 'Pres 2',
        description: 'Desc 2',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author 2',
        tags: [],
        isTemplate: false,
      });

      const all = repo.findAll();
      expect(all.length).toBe(2);
    });
  });

  describe('Search', () => {
    beforeEach(() => {
      repo.save({
        title: 'Sales Presentation',
        description: 'Q4 Sales Report',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Sales Team',
        tags: ['sales', 'q4'],
        isTemplate: false,
      });

      repo.save({
        title: 'Product Launch',
        description: 'New Product Announcement',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Product Team',
        tags: ['product', 'launch'],
        isTemplate: false,
      });
    });

    it('should find by title', () => {
      const results = repo.findByTitle('Sales');
      expect(results.length).toBe(1);
      expect(results[0].title).toContain('Sales');
    });

    it('should find by author', () => {
      const results = repo.findByAuthor('Sales Team');
      expect(results.length).toBe(1);
      expect(results[0].author).toBe('Sales Team');
    });

    it('should find by tag', () => {
      const results = repo.findByTag('sales');
      expect(results.length).toBe(1);
    });

    it('should search by query', () => {
      const results = repo.search('sales');
      expect(results.length).toBe(1);
    });
  });

  describe('Update', () => {
    it('should update presentation', () => {
      const id = repo.save({
        title: 'Original',
        description: 'Original Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: [],
        isTemplate: false,
      });

      const updated = repo.update(id, { title: 'Updated' });
      expect(updated?.title).toBe('Updated');
      expect(updated?.version).toBe(2);
    });

    it('should increment version on update', () => {
      const id = repo.save({
        title: 'Test',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: [],
        isTemplate: false,
      });

      repo.update(id, { title: 'Updated 1' });
      repo.update(id, { title: 'Updated 2' });

      const pres = repo.findById(id);
      expect(pres?.version).toBe(3);
    });
  });

  describe('Delete', () => {
    it('should delete presentation', () => {
      const id = repo.save({
        title: 'Test',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: [],
        isTemplate: false,
      });

      const deleted = repo.delete(id);
      expect(deleted).toBe(true);
      expect(repo.findById(id)).toBeUndefined();
    });
  });

  describe('Version Management', () => {
    it('should track version history', () => {
      const id = repo.save({
        title: 'Version 1',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: [],
        isTemplate: false,
      });

      repo.update(id, { title: 'Version 2' });
      repo.update(id, { title: 'Version 3' });

      const history = repo.getVersionHistory(id);
      expect(history.length).toBe(3);
      expect(history[0].version).toBe(1);
      expect(history[2].version).toBe(3);
    });

    it('should get specific version', () => {
      const id = repo.save({
        title: 'V1',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: [],
        isTemplate: false,
      });

      repo.update(id, { title: 'V2' });
      repo.update(id, { title: 'V3' });

      const v2 = repo.getVersion(id, 2);
      expect(v2?.title).toBe('V2');
    });

    it('should revert to previous version', () => {
      const id = repo.save({
        title: 'V1',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: [],
        isTemplate: false,
      });

      repo.update(id, { title: 'V2' });
      repo.update(id, { title: 'V3' });

      const reverted = repo.revertToVersion(id, 1);
      expect(reverted?.title).toBe('V1');
      expect(reverted?.version).toBe(4);
    });
  });

  describe('Template Management', () => {
    it('should find templates', () => {
      repo.save({
        title: 'Regular',
        description: 'Regular Presentation',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: [],
        isTemplate: false,
      });

      repo.save({
        title: 'Template',
        description: 'Template Presentation',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: [],
        isTemplate: true,
      });

      const templates = repo.findTemplates();
      expect(templates.length).toBe(1);
      expect(templates[0].isTemplate).toBe(true);
    });

    it('should save presentation as template', () => {
      const id = repo.save({
        title: 'Original',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: [],
        isTemplate: false,
      });

      const templateId = repo.saveAsTemplate(id, 'New Template');
      expect(templateId).not.toBeNull();

      const template = repo.findById(templateId!);
      expect(template?.isTemplate).toBe(true);
      expect(template?.title).toBe('New Template');
    });
  });

  describe('Statistics', () => {
    it('should get repository statistics', () => {
      repo.save({
        title: 'Pres 1',
        description: 'Desc 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: [],
        isTemplate: false,
      });

      repo.save({
        title: 'Pres 2',
        description: 'Desc 2',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: [],
        isTemplate: true,
      });

      const stats = repo.getStats();
      expect(stats.totalPresentations).toBe(2);
      expect(stats.totalTemplates).toBe(1);
    });
  });

  describe('Export/Import', () => {
    it('should export presentation', () => {
      const id = repo.save({
        title: 'Export Test',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: ['test'],
        isTemplate: false,
      });

      const json = repo.export(id);
      expect(json).not.toBeNull();
      expect(json).toContain('Export Test');
    });

    it('should import presentation', () => {
      const id = repo.save({
        title: 'Original',
        description: 'Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Author',
        tags: [],
        isTemplate: false,
      });

      const json = repo.export(id);
      if (!json) throw new Error('Export failed');

      const importedId = repo.import(json);
      expect(importedId).not.toBeNull();

      const imported = repo.findById(importedId!);
      expect(imported?.title).toBe('Original');
    });
  });

  describe('Complex Workflows', () => {
    it('should manage complete presentation lifecycle', () => {
      const id = repo.save({
        title: 'Complete Workflow',
        description: 'Full lifecycle test',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'Test Author',
        tags: ['test', 'workflow'],
        isTemplate: false,
      });

      repo.update(id, { title: 'Updated Title' });
      repo.update(id, { description: 'Updated Description' });

      const history = repo.getVersionHistory(id);
      expect(history.length).toBe(3);

      const templateId = repo.saveAsTemplate(id, 'Workflow Template');
      expect(templateId).not.toBeNull();

      const stats = repo.getStats();
      expect(stats.totalPresentations).toBe(2);
      expect(stats.totalTemplates).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent presentation', () => {
      const result = repo.findById('non-existent');
      expect(result).toBeUndefined();
    });

    it('should handle invalid import', () => {
      const result = repo.import('invalid json');
      expect(result).toBeNull();
    });
  });
});

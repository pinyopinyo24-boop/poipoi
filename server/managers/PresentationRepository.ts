/**
 * PoiPoi PresentationRepository
 * プレゼンテーション永続化・バージョン管理・テンプレート保存
 */

export interface PresentationData {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  author: string;
  tags: string[];
  isTemplate: boolean;
  metadata?: Record<string, unknown>;
}

export interface RepositoryStats {
  totalPresentations: number;
  totalTemplates: number;
  totalVersions: number;
  oldestPresentation: Date | null;
  newestPresentation: Date | null;
}

export class PresentationRepository {
  private presentations: Map<string, PresentationData> = new Map();
  private versions: Map<string, PresentationData[]> = new Map();
  private templates: Map<string, PresentationData> = new Map();

  save(presentation: Omit<PresentationData, 'version'>): string {
    const id = presentation.id || `pres_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    return this.presentations.delete(id);
  }

  getVersionHistory(id: string): PresentationData[] {
    return this.versions.get(id) || [];
  }

  rollbackToVersion(id: string, version: number): PresentationData | null {
    const history = this.versions.get(id) || [];
    const targetVersion = history.find(v => v.version === version);
    if (!targetVersion) return null;

    const restored: PresentationData = {
      ...targetVersion,
      version: (this.presentations.get(id)?.version || 0) + 1,
      updatedAt: new Date(),
    };

    this.presentations.set(id, restored);
    history.push(restored);
    this.versions.set(id, history);

    return restored;
  }

  getStats(): RepositoryStats {
    const presentations = Array.from(this.presentations.values());
    const templates = Array.from(this.templates.values());
    const allVersions = Array.from(this.versions.values()).flat();

    const dates = presentations.map(p => p.createdAt);
    const oldestPresentation = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
    const newestPresentation = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

    return {
      totalPresentations: presentations.length,
      totalTemplates: templates.length,
      totalVersions: allVersions.length,
      oldestPresentation,
      newestPresentation,
    };
  }

  exportAsJSON(id: string): string | null {
    const pres = this.presentations.get(id);
    if (!pres) return null;

    return JSON.stringify(pres, null, 2);
  }

  importFromJSON(json: string): string | null {
    try {
      const data = JSON.parse(json) as Omit<PresentationData, 'version'>;
      return this.save(data);
    } catch {
      return null;
    }
  }

  clear(): void {
    this.presentations.clear();
    this.versions.clear();
    this.templates.clear();
  }
}

let repositoryInstance: PresentationRepository | null = null;

export function getPresentationRepository(): PresentationRepository {
  if (!repositoryInstance) {
    repositoryInstance = new PresentationRepository();
  }
  return repositoryInstance;
}

export function resetPresentationRepository(): void {
  repositoryInstance = null;
}

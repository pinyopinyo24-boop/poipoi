import { describe, it, expect, beforeEach } from 'vitest';

/**
 * ReleaseNotesService
 * リリースノート生成・管理サービス
 */
export interface FeatureEntry {
  id: string;
  title: string;
  description: string;
  category: 'feature' | 'improvement' | 'bugfix' | 'security';
  impact: 'high' | 'medium' | 'low';
}

export interface ReleaseNotes {
  notesId: string;
  version: string;
  releaseDate: Date;
  title: string;
  summary: string;
  features: FeatureEntry[];
  improvements: FeatureEntry[];
  bugfixes: FeatureEntry[];
  securityUpdates: FeatureEntry[];
  knownIssues: string[];
  downloadLinks: { platform: string; url: string }[];
  content: string;
}

export class ReleaseNotesService {
  private releaseNotes: Map<string, ReleaseNotes> = new Map();
  private notesHistory: ReleaseNotes[] = [];

  /**
   * リリースノートを作成
   */
  createReleaseNotes(version: string, title: string, summary: string): ReleaseNotes {
    const notesId = `notes-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notes: ReleaseNotes = {
      notesId,
      version,
      releaseDate: new Date(),
      title,
      summary,
      features: [],
      improvements: [],
      bugfixes: [],
      securityUpdates: [],
      knownIssues: [],
      downloadLinks: [],
      content: '',
    };

    this.releaseNotes.set(notesId, notes);
    return notes;
  }

  /**
   * 機能を追加
   */
  addFeature(notesId: string, title: string, description: string, impact: 'high' | 'medium' | 'low'): FeatureEntry {
    const notes = this.releaseNotes.get(notesId);
    if (!notes) {
      throw new Error('Release notes not found');
    }

    const entry: FeatureEntry = {
      id: `feat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      category: 'feature',
      impact,
    };

    notes.features.push(entry);
    return entry;
  }

  /**
   * 改善を追加
   */
  addImprovement(notesId: string, title: string, description: string, impact: 'high' | 'medium' | 'low'): FeatureEntry {
    const notes = this.releaseNotes.get(notesId);
    if (!notes) {
      throw new Error('Release notes not found');
    }

    const entry: FeatureEntry = {
      id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      category: 'improvement',
      impact,
    };

    notes.improvements.push(entry);
    return entry;
  }

  /**
   * バグ修正を追加
   */
  addBugfix(notesId: string, title: string, description: string, impact: 'high' | 'medium' | 'low'): FeatureEntry {
    const notes = this.releaseNotes.get(notesId);
    if (!notes) {
      throw new Error('Release notes not found');
    }

    const entry: FeatureEntry = {
      id: `bug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      category: 'bugfix',
      impact,
    };

    notes.bugfixes.push(entry);
    return entry;
  }

  /**
   * セキュリティアップデートを追加
   */
  addSecurityUpdate(notesId: string, title: string, description: string, impact: 'high' | 'medium' | 'low'): FeatureEntry {
    const notes = this.releaseNotes.get(notesId);
    if (!notes) {
      throw new Error('Release notes not found');
    }

    const entry: FeatureEntry = {
      id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      category: 'security',
      impact,
    };

    notes.securityUpdates.push(entry);
    return entry;
  }

  /**
   * 既知の問題を追加
   */
  addKnownIssue(notesId: string, issue: string): void {
    const notes = this.releaseNotes.get(notesId);
    if (!notes) {
      throw new Error('Release notes not found');
    }

    notes.knownIssues.push(issue);
  }

  /**
   * ダウンロードリンクを追加
   */
  addDownloadLink(notesId: string, platform: string, url: string): void {
    const notes = this.releaseNotes.get(notesId);
    if (!notes) {
      throw new Error('Release notes not found');
    }

    notes.downloadLinks.push({ platform, url });
  }

  /**
   * リリースノートを生成
   */
  generateReleaseNotes(notesId: string): string {
    const notes = this.releaseNotes.get(notesId);
    if (!notes) {
      throw new Error('Release notes not found');
    }

    let content = `# ${notes.title}

**Version:** ${notes.version}
**Release Date:** ${notes.releaseDate.toISOString()}

## Summary
${notes.summary}

`;

    if (notes.features.length > 0) {
      content += `## New Features
${notes.features.map((f) => `- **${f.title}** (${f.impact}): ${f.description}`).join('\n')}

`;
    }

    if (notes.improvements.length > 0) {
      content += `## Improvements
${notes.improvements.map((i) => `- **${i.title}** (${i.impact}): ${i.description}`).join('\n')}

`;
    }

    if (notes.bugfixes.length > 0) {
      content += `## Bug Fixes
${notes.bugfixes.map((b) => `- **${b.title}** (${b.impact}): ${b.description}`).join('\n')}

`;
    }

    if (notes.securityUpdates.length > 0) {
      content += `## Security Updates
${notes.securityUpdates.map((s) => `- **${s.title}** (${s.impact}): ${s.description}`).join('\n')}

`;
    }

    if (notes.knownIssues.length > 0) {
      content += `## Known Issues
${notes.knownIssues.map((issue) => `- ${issue}`).join('\n')}

`;
    }

    if (notes.downloadLinks.length > 0) {
      content += `## Downloads
${notes.downloadLinks.map((link) => `- [${link.platform}](${link.url})`).join('\n')}

`;
    }

    notes.content = content;
    return content;
  }

  /**
   * リリースノートを取得
   */
  getReleaseNotes(notesId: string): ReleaseNotes | undefined {
    return this.releaseNotes.get(notesId);
  }

  /**
   * バージョン別ノートを取得
   */
  getReleaseNotesByVersion(version: string): ReleaseNotes | undefined {
    return Array.from(this.releaseNotes.values()).find((n) => n.version === version);
  }

  /**
   * リリースノート履歴を取得
   */
  getReleaseNotesHistory(): ReleaseNotes[] {
    return [...this.notesHistory];
  }

  /**
   * リリースノートを公開
   */
  publishReleaseNotes(notesId: string): boolean {
    const notes = this.releaseNotes.get(notesId);
    if (!notes) {
      throw new Error('Release notes not found');
    }

    this.notesHistory.push(notes);
    return true;
  }

  /**
   * 統計を計算
   */
  calculateStats(notesId: string): {
    totalFeatures: number;
    totalImprovements: number;
    totalBugfixes: number;
    totalSecurityUpdates: number;
    highImpactItems: number;
  } {
    const notes = this.releaseNotes.get(notesId);
    if (!notes) {
      throw new Error('Release notes not found');
    }

    const allItems = [...notes.features, ...notes.improvements, ...notes.bugfixes, ...notes.securityUpdates];
    const highImpactItems = allItems.filter((item) => item.impact === 'high').length;

    return {
      totalFeatures: notes.features.length,
      totalImprovements: notes.improvements.length,
      totalBugfixes: notes.bugfixes.length,
      totalSecurityUpdates: notes.securityUpdates.length,
      highImpactItems,
    };
  }
}

// ============ TESTS ============

describe('ReleaseNotesService', () => {
  let service: ReleaseNotesService;

  beforeEach(() => {
    service = new ReleaseNotesService();
  });

  describe('createReleaseNotes', () => {
    it('should create release notes', () => {
      const notes = service.createReleaseNotes('1.0.0', 'PoiPoi v1.0 Official Release', 'First official release');
      expect(notes.version).toBe('1.0.0');
      expect(notes.title).toBe('PoiPoi v1.0 Official Release');
      expect(notes.features).toHaveLength(0);
    });

    it('should generate unique notes IDs', () => {
      const notes1 = service.createReleaseNotes('1.0.0', 'Release 1', 'Summary 1');
      const notes2 = service.createReleaseNotes('1.0.1', 'Release 2', 'Summary 2');
      expect(notes1.notesId).not.toBe(notes2.notesId);
    });
  });

  describe('addFeature', () => {
    it('should add feature', () => {
      const notes = service.createReleaseNotes('1.0.0', 'Release', 'Summary');
      const feature = service.addFeature(notes.notesId, 'New Chat UI', 'Improved chat interface', 'high');

      expect(feature.title).toBe('New Chat UI');
      expect(feature.category).toBe('feature');
      expect(feature.impact).toBe('high');
    });

    it('should add multiple features', () => {
      const notes = service.createReleaseNotes('1.0.0', 'Release', 'Summary');
      service.addFeature(notes.notesId, 'Feature 1', 'Description 1', 'high');
      service.addFeature(notes.notesId, 'Feature 2', 'Description 2', 'medium');

      const updated = service.getReleaseNotes(notes.notesId);
      expect(updated?.features).toHaveLength(2);
    });

    it('should throw error for non-existent notes', () => {
      expect(() => service.addFeature('non-existent', 'Feature', 'Description', 'high')).toThrow();
    });
  });

  describe('addImprovement', () => {
    it('should add improvement', () => {
      const notes = service.createReleaseNotes('1.0.0', 'Release', 'Summary');
      const improvement = service.addImprovement(notes.notesId, 'Performance', 'Improved response time', 'medium');

      expect(improvement.category).toBe('improvement');
    });
  });

  describe('addBugfix', () => {
    it('should add bugfix', () => {
      const notes = service.createReleaseNotes('1.0.0', 'Release', 'Summary');
      const bugfix = service.addBugfix(notes.notesId, 'Chat Crash', 'Fixed crash in chat', 'high');

      expect(bugfix.category).toBe('bugfix');
    });
  });

  describe('addSecurityUpdate', () => {
    it('should add security update', () => {
      const notes = service.createReleaseNotes('1.0.0', 'Release', 'Summary');
      const security = service.addSecurityUpdate(notes.notesId, 'XSS Fix', 'Fixed XSS vulnerability', 'high');

      expect(security.category).toBe('security');
    });
  });

  describe('addKnownIssue', () => {
    it('should add known issue', () => {
      const notes = service.createReleaseNotes('1.0.0', 'Release', 'Summary');
      service.addKnownIssue(notes.notesId, 'Occasional lag on slow connections');

      const updated = service.getReleaseNotes(notes.notesId);
      expect(updated?.knownIssues).toHaveLength(1);
    });
  });

  describe('addDownloadLink', () => {
    it('should add download link', () => {
      const notes = service.createReleaseNotes('1.0.0', 'Release', 'Summary');
      service.addDownloadLink(notes.notesId, 'Android', 'https://play.google.com/store/apps/details?id=com.poipoi');

      const updated = service.getReleaseNotes(notes.notesId);
      expect(updated?.downloadLinks).toHaveLength(1);
    });
  });

  describe('generateReleaseNotes', () => {
    it('should generate release notes content', () => {
      const notes = service.createReleaseNotes('1.0.0', 'PoiPoi v1.0', 'Official release');
      service.addFeature(notes.notesId, 'New Chat UI', 'Improved interface', 'high');
      service.addBugfix(notes.notesId, 'Chat Crash', 'Fixed crash', 'high');

      const content = service.generateReleaseNotes(notes.notesId);
      expect(content).toContain('PoiPoi v1.0');
      expect(content).toContain('New Chat UI');
      expect(content).toContain('Chat Crash');
    });

    it('should include all sections', () => {
      const notes = service.createReleaseNotes('1.0.0', 'Release', 'Summary');
      service.addFeature(notes.notesId, 'Feature', 'Description', 'high');
      service.addImprovement(notes.notesId, 'Improvement', 'Description', 'medium');
      service.addBugfix(notes.notesId, 'Bugfix', 'Description', 'high');
      service.addSecurityUpdate(notes.notesId, 'Security', 'Description', 'high');
      service.addKnownIssue(notes.notesId, 'Known issue');
      service.addDownloadLink(notes.notesId, 'Android', 'https://example.com');

      const content = service.generateReleaseNotes(notes.notesId);
      expect(content).toContain('New Features');
      expect(content).toContain('Improvements');
      expect(content).toContain('Bug Fixes');
      expect(content).toContain('Security Updates');
      expect(content).toContain('Known Issues');
      expect(content).toContain('Downloads');
    });
  });

  describe('getReleaseNotes', () => {
    it('should return release notes', () => {
      const notes = service.createReleaseNotes('1.0.0', 'Release', 'Summary');
      const retrieved = service.getReleaseNotes(notes.notesId);
      expect(retrieved).toEqual(notes);
    });

    it('should return undefined for non-existent notes', () => {
      const retrieved = service.getReleaseNotes('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getReleaseNotesByVersion', () => {
    it('should return notes by version', () => {
      const notes = service.createReleaseNotes('1.0.0', 'Release', 'Summary');
      const retrieved = service.getReleaseNotesByVersion('1.0.0');
      expect(retrieved).toEqual(notes);
    });

    it('should return undefined for non-existent version', () => {
      const retrieved = service.getReleaseNotesByVersion('2.0.0');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('publishReleaseNotes', () => {
    it('should publish release notes', () => {
      const notes = service.createReleaseNotes('1.0.0', 'Release', 'Summary');
      const result = service.publishReleaseNotes(notes.notesId);
      expect(result).toBe(true);
    });

    it('should add to history', () => {
      const notes = service.createReleaseNotes('1.0.0', 'Release', 'Summary');
      service.publishReleaseNotes(notes.notesId);

      const history = service.getReleaseNotesHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe('calculateStats', () => {
    it('should calculate statistics', () => {
      const notes = service.createReleaseNotes('1.0.0', 'Release', 'Summary');
      service.addFeature(notes.notesId, 'Feature 1', 'Description', 'high');
      service.addFeature(notes.notesId, 'Feature 2', 'Description', 'medium');
      service.addImprovement(notes.notesId, 'Improvement', 'Description', 'low');
      service.addBugfix(notes.notesId, 'Bugfix', 'Description', 'high');
      service.addSecurityUpdate(notes.notesId, 'Security', 'Description', 'high');

      const stats = service.calculateStats(notes.notesId);
      expect(stats.totalFeatures).toBe(2);
      expect(stats.totalImprovements).toBe(1);
      expect(stats.totalBugfixes).toBe(1);
      expect(stats.totalSecurityUpdates).toBe(1);
      expect(stats.highImpactItems).toBe(3);
    });
  });

  describe('Complete release notes workflow', () => {
    it('should handle complete workflow', () => {
      const notes = service.createReleaseNotes('1.0.0', 'PoiPoi v1.0 Official Release', 'First official release');

      // Add features
      service.addFeature(notes.notesId, 'Conversation Memory', 'AI remembers conversation history', 'high');
      service.addFeature(notes.notesId, 'Voice Input', 'Support for voice commands', 'high');

      // Add improvements
      service.addImprovement(notes.notesId, 'Performance', 'Improved response time by 30%', 'high');

      // Add bugfixes
      service.addBugfix(notes.notesId, 'Chat Crash', 'Fixed crash when sending large files', 'high');

      // Add security updates
      service.addSecurityUpdate(notes.notesId, 'XSS Prevention', 'Enhanced XSS protection', 'high');

      // Add known issues
      service.addKnownIssue(notes.notesId, 'Occasional lag on slow connections');

      // Add download links
      service.addDownloadLink(notes.notesId, 'Android', 'https://play.google.com/store/apps/details?id=com.poipoi');
      service.addDownloadLink(notes.notesId, 'PC', 'https://example.com/poipoi-windows.exe');

      // Generate content
      const content = service.generateReleaseNotes(notes.notesId);
      expect(content).toContain('PoiPoi v1.0 Official Release');

      // Publish
      service.publishReleaseNotes(notes.notesId);

      // Verify
      const history = service.getReleaseNotesHistory();
      expect(history).toHaveLength(1);
      expect(history[0].version).toBe('1.0.0');
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * UserManualService
 * ユーザーマニュアル・ドキュメント生成サービス
 */
export interface ManualSection {
  sectionId: string;
  title: string;
  content: string;
  order: number;
  subsections: ManualSection[];
}

export interface UserManual {
  manualId: string;
  version: string;
  title: string;
  language: 'ja' | 'en';
  sections: ManualSection[];
  tableOfContents: string;
  index: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserManualService {
  private manuals: Map<string, UserManual> = new Map();
  private manualHistory: UserManual[] = [];

  /**
   * ユーザーマニュアルを作成
   */
  createUserManual(version: string, title: string, language: 'ja' | 'en' = 'ja'): UserManual {
    const manualId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const manual: UserManual = {
      manualId,
      version,
      title,
      language,
      sections: [],
      tableOfContents: '',
      index: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.manuals.set(manualId, manual);
    return manual;
  }

  /**
   * セクションを追加
   */
  addSection(manualId: string, title: string, content: string, order: number = 0): ManualSection {
    const manual = this.manuals.get(manualId);
    if (!manual) {
      throw new Error('Manual not found');
    }

    const section: ManualSection = {
      sectionId: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      content,
      order,
      subsections: [],
    };

    manual.sections.push(section);
    manual.sections.sort((a, b) => a.order - b.order);
    manual.updatedAt = new Date();

    return section;
  }

  /**
   * サブセクションを追加
   */
  addSubsection(manualId: string, parentSectionId: string, title: string, content: string, order: number = 0): ManualSection {
    const manual = this.manuals.get(manualId);
    if (!manual) {
      throw new Error('Manual not found');
    }

    const parentSection = manual.sections.find((s) => s.sectionId === parentSectionId);
    if (!parentSection) {
      throw new Error('Parent section not found');
    }

    const subsection: ManualSection = {
      sectionId: `subsec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      content,
      order,
      subsections: [],
    };

    parentSection.subsections.push(subsection);
    parentSection.subsections.sort((a, b) => a.order - b.order);
    manual.updatedAt = new Date();

    return subsection;
  }

  /**
   * 目次を生成
   */
  generateTableOfContents(manualId: string): string {
    const manual = this.manuals.get(manualId);
    if (!manual) {
      throw new Error('Manual not found');
    }

    let toc = '# 目次\n\n';
    manual.sections.forEach((section, index) => {
      toc += `${index + 1}. [${section.title}](#${section.sectionId})\n`;
      section.subsections.forEach((subsection, subIndex) => {
        toc += `   ${index + 1}.${subIndex + 1}. [${subsection.title}](#${subsection.sectionId})\n`;
      });
    });

    manual.tableOfContents = toc;
    return toc;
  }

  /**
   * インデックスを生成
   */
  generateIndex(manualId: string): string {
    const manual = this.manuals.get(manualId);
    if (!manual) {
      throw new Error('Manual not found');
    }

    const keywords: Set<string> = new Set();
    manual.sections.forEach((section) => {
      keywords.add(section.title);
      section.subsections.forEach((subsection) => {
        keywords.add(subsection.title);
      });
    });

    let index = '# インデックス\n\n';
    Array.from(keywords)
      .sort()
      .forEach((keyword) => {
        index += `- ${keyword}\n`;
      });

    manual.index = index;
    return index;
  }

  /**
   * マニュアルコンテンツを生成
   */
  generateManualContent(manualId: string): string {
    const manual = this.manuals.get(manualId);
    if (!manual) {
      throw new Error('Manual not found');
    }

    let content = `# ${manual.title}\n\n`;
    content += `**Version:** ${manual.version}\n`;
    content += `**Language:** ${manual.language === 'ja' ? '日本語' : 'English'}\n\n`;

    content += this.generateTableOfContents(manualId);
    content += '\n\n---\n\n';

    manual.sections.forEach((section) => {
      content += `## ${section.title}\n\n`;
      content += `${section.content}\n\n`;

      section.subsections.forEach((subsection) => {
        content += `### ${subsection.title}\n\n`;
        content += `${subsection.content}\n\n`;
      });
    });

    content += '---\n\n';
    content += this.generateIndex(manualId);

    return content;
  }

  /**
   * マニュアルを取得
   */
  getUserManual(manualId: string): UserManual | undefined {
    return this.manuals.get(manualId);
  }

  /**
   * バージョン別マニュアルを取得
   */
  getManualByVersion(version: string): UserManual | undefined {
    return Array.from(this.manuals.values()).find((m) => m.version === version);
  }

  /**
   * マニュアル履歴を取得
   */
  getManualHistory(): UserManual[] {
    return [...this.manualHistory];
  }

  /**
   * マニュアルを公開
   */
  publishManual(manualId: string): boolean {
    const manual = this.manuals.get(manualId);
    if (!manual) {
      throw new Error('Manual not found');
    }

    this.manualHistory.push(manual);
    return true;
  }

  /**
   * セクション数を取得
   */
  getSectionCount(manualId: string): number {
    const manual = this.manuals.get(manualId);
    if (!manual) {
      throw new Error('Manual not found');
    }

    let count = manual.sections.length;
    manual.sections.forEach((section) => {
      count += section.subsections.length;
    });

    return count;
  }

  /**
   * 統計を計算
   */
  calculateStats(manualId: string): {
    totalSections: number;
    totalSubsections: number;
    totalContent: number;
  } {
    const manual = this.manuals.get(manualId);
    if (!manual) {
      throw new Error('Manual not found');
    }

    let totalSubsections = 0;
    let totalContent = 0;

    manual.sections.forEach((section) => {
      totalContent += section.content.length;
      section.subsections.forEach((subsection) => {
        totalSubsections++;
        totalContent += subsection.content.length;
      });
    });

    return {
      totalSections: manual.sections.length,
      totalSubsections,
      totalContent,
    };
  }
}

// ============ TESTS ============

describe('UserManualService', () => {
  let service: UserManualService;

  beforeEach(() => {
    service = new UserManualService();
  });

  describe('createUserManual', () => {
    it('should create user manual', () => {
      const manual = service.createUserManual('1.0.0', 'PoiPoi ユーザーマニュアル');
      expect(manual.version).toBe('1.0.0');
      expect(manual.title).toBe('PoiPoi ユーザーマニュアル');
      expect(manual.language).toBe('ja');
    });

    it('should support multiple languages', () => {
      const manualJa = service.createUserManual('1.0.0', 'PoiPoi Manual', 'ja');
      const manualEn = service.createUserManual('1.0.0', 'PoiPoi Manual', 'en');

      expect(manualJa.language).toBe('ja');
      expect(manualEn.language).toBe('en');
    });
  });

  describe('addSection', () => {
    it('should add section', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      const section = service.addSection(manual.manualId, 'はじめに', 'PoiPoiへようこそ', 1);

      expect(section.title).toBe('はじめに');
      expect(section.content).toBe('PoiPoiへようこそ');
    });

    it('should add multiple sections', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      service.addSection(manual.manualId, 'Section 1', 'Content 1', 1);
      service.addSection(manual.manualId, 'Section 2', 'Content 2', 2);

      const updated = service.getUserManual(manual.manualId);
      expect(updated?.sections).toHaveLength(2);
    });

    it('should sort sections by order', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      service.addSection(manual.manualId, 'Section 2', 'Content 2', 2);
      service.addSection(manual.manualId, 'Section 1', 'Content 1', 1);

      const updated = service.getUserManual(manual.manualId);
      expect(updated?.sections[0].title).toBe('Section 1');
      expect(updated?.sections[1].title).toBe('Section 2');
    });
  });

  describe('addSubsection', () => {
    it('should add subsection', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      const section = service.addSection(manual.manualId, 'Main Section', 'Main content', 1);
      const subsection = service.addSubsection(
        manual.manualId,
        section.sectionId,
        'Subsection',
        'Subsection content',
        1
      );

      expect(subsection.title).toBe('Subsection');
    });

    it('should throw error for non-existent parent section', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      expect(() => service.addSubsection(manual.manualId, 'non-existent', 'Sub', 'Content', 1)).toThrow();
    });
  });

  describe('generateTableOfContents', () => {
    it('should generate table of contents', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      service.addSection(manual.manualId, 'Section 1', 'Content 1', 1);
      service.addSection(manual.manualId, 'Section 2', 'Content 2', 2);

      const toc = service.generateTableOfContents(manual.manualId);
      expect(toc).toContain('目次');
      expect(toc).toContain('Section 1');
      expect(toc).toContain('Section 2');
    });

    it('should include subsections in TOC', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      const section = service.addSection(manual.manualId, 'Main', 'Content', 1);
      service.addSubsection(manual.manualId, section.sectionId, 'Sub', 'Sub content', 1);

      const toc = service.generateTableOfContents(manual.manualId);
      expect(toc).toContain('Sub');
    });
  });

  describe('generateIndex', () => {
    it('should generate index', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      service.addSection(manual.manualId, 'Getting Started', 'Content', 1);
      service.addSection(manual.manualId, 'Features', 'Content', 2);

      const index = service.generateIndex(manual.manualId);
      expect(index).toContain('インデックス');
      expect(index).toContain('Getting Started');
      expect(index).toContain('Features');
    });
  });

  describe('generateManualContent', () => {
    it('should generate complete manual content', () => {
      const manual = service.createUserManual('1.0.0', 'PoiPoi Manual');
      service.addSection(manual.manualId, 'Introduction', 'Welcome to PoiPoi', 1);
      service.addSection(manual.manualId, 'Features', 'PoiPoi features', 2);

      const content = service.generateManualContent(manual.manualId);
      expect(content).toContain('PoiPoi Manual');
      expect(content).toContain('Introduction');
      expect(content).toContain('Features');
      expect(content).toContain('目次');
      expect(content).toContain('インデックス');
    });
  });

  describe('getUserManual', () => {
    it('should return user manual', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      const retrieved = service.getUserManual(manual.manualId);
      expect(retrieved).toEqual(manual);
    });

    it('should return undefined for non-existent manual', () => {
      const retrieved = service.getUserManual('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getManualByVersion', () => {
    it('should return manual by version', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      const retrieved = service.getManualByVersion('1.0.0');
      expect(retrieved).toEqual(manual);
    });

    it('should return undefined for non-existent version', () => {
      const retrieved = service.getManualByVersion('2.0.0');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('publishManual', () => {
    it('should publish manual', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      const result = service.publishManual(manual.manualId);
      expect(result).toBe(true);
    });

    it('should add to history', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      service.publishManual(manual.manualId);

      const history = service.getManualHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe('getSectionCount', () => {
    it('should count sections and subsections', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      const section = service.addSection(manual.manualId, 'Main', 'Content', 1);
      service.addSubsection(manual.manualId, section.sectionId, 'Sub 1', 'Content', 1);
      service.addSubsection(manual.manualId, section.sectionId, 'Sub 2', 'Content', 2);

      const count = service.getSectionCount(manual.manualId);
      expect(count).toBe(3); // 1 main + 2 subsections
    });
  });

  describe('calculateStats', () => {
    it('should calculate statistics', () => {
      const manual = service.createUserManual('1.0.0', 'Manual');
      const section = service.addSection(manual.manualId, 'Main', 'Main content here', 1);
      service.addSubsection(manual.manualId, section.sectionId, 'Sub', 'Subsection content', 1);

      const stats = service.calculateStats(manual.manualId);
      expect(stats.totalSections).toBe(1);
      expect(stats.totalSubsections).toBe(1);
      expect(stats.totalContent).toBeGreaterThan(0);
    });
  });

  describe('Complete manual workflow', () => {
    it('should handle complete workflow', () => {
      const manual = service.createUserManual('1.0.0', 'PoiPoi ユーザーマニュアル', 'ja');

      // Add sections
      const intro = service.addSection(manual.manualId, 'はじめに', 'PoiPoiへようこそ', 1);
      const features = service.addSection(manual.manualId, '機能', 'PoiPoiの主な機能', 2);
      const support = service.addSection(manual.manualId, 'サポート', 'サポート情報', 3);

      // Add subsections
      service.addSubsection(manual.manualId, intro.sectionId, 'インストール', 'インストール手順', 1);
      service.addSubsection(manual.manualId, features.sectionId, 'チャット機能', 'チャット機能の説明', 1);
      service.addSubsection(manual.manualId, features.sectionId, '音声入力', '音声入力の説明', 2);

      // Generate content
      const content = service.generateManualContent(manual.manualId);
      expect(content).toContain('PoiPoi ユーザーマニュアル');

      // Publish
      service.publishManual(manual.manualId);

      // Verify
      const history = service.getManualHistory();
      expect(history).toHaveLength(1);
      expect(history[0].version).toBe('1.0.0');
    });
  });

  describe('Multi-language support', () => {
    it('should support Japanese manual', () => {
      const manual = service.createUserManual('1.0.0', 'PoiPoi マニュアル', 'ja');
      service.addSection(manual.manualId, 'はじめに', '日本語の内容', 1);

      expect(manual.language).toBe('ja');
    });

    it('should support English manual', () => {
      const manual = service.createUserManual('1.0.0', 'PoiPoi Manual', 'en');
      service.addSection(manual.manualId, 'Introduction', 'English content', 1);

      expect(manual.language).toBe('en');
    });
  });
});

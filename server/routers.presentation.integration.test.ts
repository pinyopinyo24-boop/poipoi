/**
 * PoiPoi Presentation Integration Test
 * PoiPoiChatUI → Presentation Engine フロー確認
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PresentationAIManager } from './managers/PresentationAIManager';
import { PresentationRepository } from './managers/PresentationRepository';

describe('PoiPoiChatUI Presentation Integration', () => {
  let repository: PresentationRepository;
  let manager: PresentationAIManager;

  beforeEach(() => {
    repository = new PresentationRepository();
    manager = new PresentationAIManager(repository);
  });

  describe('フロー1: プレゼンテーション作成', () => {
    it('「社長向け原価改善報告資料を作成」で新規プレゼンテーション作成', () => {
      const presentation = manager.createPresentation(
        '社長向け原価改善報告資料',
        '原価改善活動の成果報告'
      );

      expect(presentation).toBeDefined();
      expect(presentation.id).toBeDefined();
      expect(presentation.title).toBe('社長向け原価改善報告資料');
      expect(presentation.description).toBe('原価改善活動の成果報告');
      expect(presentation.slides).toHaveLength(0);
    });
  });

  describe('フロー2: AI生成でスライド作成', () => {
    it('AI生成で5スライド作成', () => {
      const presentation = manager.createPresentation(
        '社長向け原価改善報告資料',
        '原価改善活動の成果報告'
      );

      const result = manager.generateWithAI(presentation.id, 5);

      expect(result).toBeDefined();
      expect(result?.slides.length).toBeGreaterThan(0);
      expect(result?.slides[0]?.title).toBeDefined();
      expect(result?.slides[0]?.layout).toBeDefined();
    });

    it('各スライドのレイアウトが正しく設定される', () => {
      const presentation = manager.createPresentation(
        '社長向け原価改善報告資料',
        ''
      );

      const result = manager.generateWithAI(presentation.id, 3);

      expect(result?.slides).toBeDefined();
      result?.slides.forEach(slide => {
        expect(['title', 'content', 'two-column', 'image-text', 'chart', 'table']).toContain(
          slide.layout
        );
      });
    });
  });

  describe('フロー3: テーマ適用', () => {
    it('Corporateテーマを適用', () => {
      const presentation = manager.createPresentation(
        '社長向け原価改善報告資料',
        ''
      );

      manager.generateWithAI(presentation.id, 3);

      const updated = manager.updatePresentation(presentation.id, {
        metadata: {
          themeId: 'corporate',
        },
      } as any);

      expect(updated).toBeDefined();
      expect(updated?.metadata?.themeId).toBe('corporate');
    });
  });

  describe('フロー4: SpeakerNotes生成', () => {
    it('スライドの台本を生成', () => {
      const presentation = manager.createPresentation(
        '社長向け原価改善報告資料',
        ''
      );

      const result = manager.generateWithAI(presentation.id, 2);

      expect(result?.slides).toBeDefined();
      if (result?.slides[0]) {
        const notes = manager.getNotes(presentation.id);

        expect(notes).toBeDefined();
        expect(Array.isArray(notes)).toBe(true);
      }
    });
  });

  describe('フロー5: Export確認', () => {
    it('PowerPoint形式でエクスポート', () => {
      const presentation = manager.createPresentation(
        '社長向け原価改善報告資料',
        ''
      );

      manager.generateWithAI(presentation.id, 2);

      const pptx = manager.exportPowerPoint(presentation.id);

      expect(pptx).toBeDefined();
      expect(pptx).not.toBeNull();
    });

    it('PDF形式でエクスポート', () => {
      const presentation = manager.createPresentation(
        '社長向け原価改善報告資料',
        ''
      );

      manager.generateWithAI(presentation.id, 2);

      const pdf = manager.exportPDF(presentation.id);

      expect(pdf).toBeDefined();
      expect(pdf).not.toBeNull();
    });

    it('JSON形式でエクスポート', () => {
      const presentation = manager.createPresentation(
        '社長向け原価改善報告資料',
        ''
      );

      manager.generateWithAI(presentation.id, 2);

      const json = manager.exportJSON(presentation.id);

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(parsed.title).toBe('社長向け原価改善報告資料');
      expect(parsed.slides).toBeDefined();
    });
  });

  describe('フロー6: 完全統合フロー', () => {
    it('「社長向け原価改善報告資料を作成」の完全フロー', () => {
      // 1. プレゼンテーション作成
      const presentation = manager.createPresentation(
        '社長向け原価改善報告資料',
        '原価改善活動の成果報告'
      );
      expect(presentation).toBeDefined();

      // 2. AI生成
      const generated = manager.generateWithAI(presentation.id, 5);
      expect(generated?.slides.length).toBeGreaterThan(0);

      // 3. テーマ適用
      const themed = manager.updatePresentation(presentation.id, {
        metadata: { themeId: 'corporate' },
      } as any);
      expect(themed?.metadata?.themeId).toBe('corporate');

      // 4. SpeakerNotes生成
      const notes = manager.getNotes(presentation.id);
      expect(notes).toBeDefined();

      // 5. Export確認
      const pptx = manager.exportPowerPoint(presentation.id);
      const pdf = manager.exportPDF(presentation.id);
      const json = manager.exportJSON(presentation.id);

      expect(pptx).toBeDefined();
      expect(pdf).toBeDefined();
      expect(json).toBeDefined();

      // 6. 統計確認
      const stats = manager.getStatistics();
      expect(stats.totalPresentations).toBeGreaterThan(0);
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないプレゼンテーションを取得', () => {
      const result = manager.getPresentation('nonexistent');
      expect(result).toBeUndefined();
    });

    it('存在しないプレゼンテーションを削除', () => {
      const result = manager.deletePresentation('nonexistent');
      expect(result).toBe(false);
    });

    it('存在しないプレゼンテーションにスライドを追加', () => {
      const result = manager.addSlide('nonexistent', {
        title: 'Test',
        content: 'Test',
        layout: 'title',
        elements: [],
      });
      expect(result).toBeNull();
    });
  });

  describe('パフォーマンス', () => {
    it('複数プレゼンテーション作成', () => {
      const presentations = [];
      for (let i = 0; i < 10; i++) {
        presentations.push(
          manager.createPresentation(`プレゼン${i}`, `説明${i}`)
        );
      }

      expect(presentations).toHaveLength(10);
      const all = manager.getAllPresentations();
      expect(all.length).toBeGreaterThanOrEqual(10);
    });

    it('大量スライド作成', () => {
      const presentation = manager.createPresentation('大量スライド', '');

      const result = manager.generateWithAI(presentation.id, 50);

      expect(result?.slides.length).toBeGreaterThan(0);
    });
  });

  describe('データ整合性', () => {
    it('バージョン管理', () => {
      const presentation = manager.createPresentation('テスト', '');
      const v1 = manager.getPresentation(presentation.id);

      manager.updatePresentation(presentation.id, {
        title: '更新後',
      } as any);
      const v2 = manager.getPresentation(presentation.id);

      expect(v1?.title).toBe('テスト');
      expect(v2?.title).toBe('更新後');
    });

    it('スライド順序保持', () => {
      const presentation = manager.createPresentation('テスト', '');

      manager.addSlide(presentation.id, {
        title: 'スライド1',
        content: 'コンテンツ1',
        layout: 'title',
        elements: [],
      });

      manager.addSlide(presentation.id, {
        title: 'スライド2',
        content: 'コンテンツ2',
        layout: 'content',
        elements: [],
      });

      const updated = manager.getPresentation(presentation.id);

      expect(updated?.slides[0]?.title).toBe('スライド1');
      expect(updated?.slides[1]?.title).toBe('スライド2');
    });
  });
});

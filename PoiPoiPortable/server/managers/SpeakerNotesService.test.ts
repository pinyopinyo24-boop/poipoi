import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * SpeakerNotesService Test Suite
 * 発表用台本・スライド要約・発表時間予測の包括的なテスト
 */

interface SpeakerNote {
  id: string;
  slideId: string;
  content: string;
  summary: string;
  estimatedTime: number;
  keyPoints: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface PresentationScript {
  id: string;
  presentationId: string;
  totalTime: number;
  notes: SpeakerNote[];
  language: 'ja' | 'en';
}

class SpeakerNotesService {
  private notes: Map<string, SpeakerNote> = new Map();
  private scripts: Map<string, PresentationScript> = new Map();
  private history: Array<{ action: string; timestamp: Date }> = [];

  createNote(slideId: string, content: string): string {
    const id = `note_${Date.now()}_${Math.random()}`;
    const summary = this.generateSummary(content);
    const estimatedTime = this.estimateTime(content);

    this.notes.set(id, {
      id,
      slideId,
      content,
      summary,
      estimatedTime,
      keyPoints: this.extractKeyPoints(content),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.recordHistory('create-note');
    return id;
  }

  getNote(noteId: string): SpeakerNote | undefined {
    return this.notes.get(noteId);
  }

  updateNote(noteId: string, content: string): SpeakerNote | null {
    const note = this.notes.get(noteId);
    if (!note) return null;

    note.content = content;
    note.summary = this.generateSummary(content);
    note.estimatedTime = this.estimateTime(content);
    note.keyPoints = this.extractKeyPoints(content);
    note.updatedAt = new Date();

    this.recordHistory('update-note');
    return note;
  }

  deleteNote(noteId: string): boolean {
    const deleted = this.notes.delete(noteId);
    if (deleted) this.recordHistory('delete-note');
    return deleted;
  }

  createScript(presentationId: string, language: 'ja' | 'en' = 'ja'): string {
    const id = `script_${Date.now()}_${Math.random()}`;
    this.scripts.set(id, {
      id,
      presentationId,
      totalTime: 0,
      notes: [],
      language,
    });

    this.recordHistory('create-script');
    return id;
  }

  getScript(scriptId: string): PresentationScript | undefined {
    return this.scripts.get(scriptId);
  }

  addNoteToScript(scriptId: string, noteId: string): boolean {
    const script = this.scripts.get(scriptId);
    const note = this.notes.get(noteId);

    if (!script || !note) return false;

    script.notes.push(note);
    script.totalTime = script.notes.reduce((sum, n) => sum + n.estimatedTime, 0);

    this.recordHistory('add-note-to-script');
    return true;
  }

  removeNoteFromScript(scriptId: string, noteId: string): boolean {
    const script = this.scripts.get(scriptId);
    if (!script) return false;

    const index = script.notes.findIndex(n => n.id === noteId);
    if (index === -1) return false;

    script.notes.splice(index, 1);
    script.totalTime = script.notes.reduce((sum, n) => sum + n.estimatedTime, 0);

    this.recordHistory('remove-note-from-script');
    return true;
  }

  generateSummary(content: string): string {
    const sentences = content.split('。').filter(s => s.trim());
    if (sentences.length === 0) return '';

    const summaryLength = Math.max(1, Math.ceil(sentences.length / 3));
    return sentences.slice(0, summaryLength).join('。') + '。';
  }

  estimateTime(content: string): number {
    const wordCount = content.length;
    const wordsPerMinute = 150;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return Math.max(1, minutes);
  }

  extractKeyPoints(content: string): string[] {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.slice(0, 5).map(l => l.trim());
  }

  generateFullScript(scriptId: string): string {
    const script = this.scripts.get(scriptId);
    if (!script) return '';

    let fullScript = '';
    script.notes.forEach((note, index) => {
      fullScript += `\n【スライド ${index + 1}】\n`;
      fullScript += `発表時間: 約${note.estimatedTime}分\n`;
      fullScript += `要点:\n`;
      note.keyPoints.forEach(point => {
        fullScript += `  • ${point}\n`;
      });
      fullScript += `\n台本:\n${note.content}\n`;
      fullScript += `\n---\n`;
    });

    return fullScript;
  }

  calculateTotalTime(scriptId: string): number {
    const script = this.scripts.get(scriptId);
    if (!script) return 0;

    return script.notes.reduce((sum, note) => sum + note.estimatedTime, 0);
  }

  getScriptStats(scriptId: string) {
    const script = this.scripts.get(scriptId);
    if (!script) return null;

    const totalWords = script.notes.reduce((sum, note) => sum + note.content.length, 0);
    const totalKeyPoints = script.notes.reduce((sum, note) => sum + note.keyPoints.length, 0);

    return {
      scriptId,
      slideCount: script.notes.length,
      totalTime: script.totalTime,
      totalWords,
      avgTimePerSlide: script.notes.length > 0 ? script.totalTime / script.notes.length : 0,
      totalKeyPoints,
      language: script.language,
    };
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
    this.notes.clear();
    this.scripts.clear();
    this.history = [];
  }
}

describe('SpeakerNotesService', () => {
  let service: SpeakerNotesService;

  beforeEach(() => {
    service = new SpeakerNotesService();
  });

  afterEach(() => {
    service.reset();
    service = null as any;
  });

  describe('Note Management', () => {
    it('should create a note', () => {
      const noteId = service.createNote('slide_1', 'これは発表用の台本です。');
      expect(noteId).toBeDefined();
      expect(noteId).toContain('note_');

      const note = service.getNote(noteId);
      expect(note).not.toBeNull();
      expect(note?.content).toBe('これは発表用の台本です。');
    });

    it('should generate summary', () => {
      const noteId = service.createNote('slide_1', '最初の文。次の文。最後の文。');
      const note = service.getNote(noteId);

      expect(note?.summary).toBeDefined();
      expect(note?.summary).toContain('最初の文');
    });

    it('should estimate time', () => {
      const noteId = service.createNote('slide_1', 'これは発表用の台本です。' + 'テキスト'.repeat(50));
      const note = service.getNote(noteId);

      expect(note?.estimatedTime).toBeGreaterThan(0);
    });

    it('should extract key points', () => {
      const content = '要点1\n要点2\n要点3\n要点4\n要点5';
      const noteId = service.createNote('slide_1', content);
      const note = service.getNote(noteId);

      expect(note?.keyPoints).toHaveLength(5);
      expect(note?.keyPoints[0]).toBe('要点1');
    });

    it('should update note', () => {
      const noteId = service.createNote('slide_1', '最初の内容');
      const updated = service.updateNote(noteId, '更新された内容');

      expect(updated).not.toBeNull();
      expect(updated?.content).toBe('更新された内容');
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(updated?.createdAt.getTime() || 0);
    });

    it('should delete note', () => {
      const noteId = service.createNote('slide_1', '内容');
      const deleted = service.deleteNote(noteId);

      expect(deleted).toBe(true);
      expect(service.getNote(noteId)).toBeUndefined();
    });
  });

  describe('Script Management', () => {
    it('should create a script', () => {
      const scriptId = service.createScript('pres_1', 'ja');
      expect(scriptId).toBeDefined();
      expect(scriptId).toContain('script_');

      const script = service.getScript(scriptId);
      expect(script).not.toBeNull();
      expect(script?.language).toBe('ja');
      expect(script?.notes).toHaveLength(0);
    });

    it('should create script in English', () => {
      const scriptId = service.createScript('pres_1', 'en');
      const script = service.getScript(scriptId);

      expect(script?.language).toBe('en');
    });

    it('should add note to script', () => {
      const noteId = service.createNote('slide_1', '台本内容');
      const scriptId = service.createScript('pres_1', 'ja');

      const result = service.addNoteToScript(scriptId, noteId);
      expect(result).toBe(true);

      const script = service.getScript(scriptId);
      expect(script?.notes).toHaveLength(1);
    });

    it('should add multiple notes to script', () => {
      const noteId1 = service.createNote('slide_1', '台本1');
      const noteId2 = service.createNote('slide_2', '台本2');
      const scriptId = service.createScript('pres_1', 'ja');

      service.addNoteToScript(scriptId, noteId1);
      service.addNoteToScript(scriptId, noteId2);

      const script = service.getScript(scriptId);
      expect(script?.notes).toHaveLength(2);
    });

    it('should remove note from script', () => {
      const noteId = service.createNote('slide_1', '台本内容');
      const scriptId = service.createScript('pres_1', 'ja');

      service.addNoteToScript(scriptId, noteId);
      const result = service.removeNoteFromScript(scriptId, noteId);

      expect(result).toBe(true);
      const script = service.getScript(scriptId);
      expect(script?.notes).toHaveLength(0);
    });

    it('should calculate total time', () => {
      const noteId1 = service.createNote('slide_1', '台本' + 'テキスト'.repeat(50));
      const noteId2 = service.createNote('slide_2', '台本' + 'テキスト'.repeat(30));
      const scriptId = service.createScript('pres_1', 'ja');

      service.addNoteToScript(scriptId, noteId1);
      service.addNoteToScript(scriptId, noteId2);

      const totalTime = service.calculateTotalTime(scriptId);
      expect(totalTime).toBeGreaterThan(0);
    });
  });

  describe('Script Generation', () => {
    it('should generate full script', () => {
      const noteId1 = service.createNote('slide_1', '最初のスライド');
      const noteId2 = service.createNote('slide_2', '次のスライド');
      const scriptId = service.createScript('pres_1', 'ja');

      service.addNoteToScript(scriptId, noteId1);
      service.addNoteToScript(scriptId, noteId2);

      const fullScript = service.generateFullScript(scriptId);

      expect(fullScript).toContain('スライド 1');
      expect(fullScript).toContain('スライド 2');
      expect(fullScript).toContain('発表時間');
    });

    it('should handle empty script', () => {
      const scriptId = service.createScript('pres_1', 'ja');
      const fullScript = service.generateFullScript(scriptId);

      expect(fullScript).toBe('');
    });
  });

  describe('Statistics', () => {
    it('should get script statistics', () => {
      const noteId1 = service.createNote('slide_1', '台本1');
      const noteId2 = service.createNote('slide_2', '台本2');
      const scriptId = service.createScript('pres_1', 'ja');

      service.addNoteToScript(scriptId, noteId1);
      service.addNoteToScript(scriptId, noteId2);

      const stats = service.getScriptStats(scriptId);

      expect(stats).not.toBeNull();
      expect(stats?.slideCount).toBe(2);
      expect(stats?.totalTime).toBeGreaterThan(0);
      expect(stats?.language).toBe('ja');
    });

    it('should calculate average time per slide', () => {
      const noteId1 = service.createNote('slide_1', '台本' + 'テキスト'.repeat(50));
      const noteId2 = service.createNote('slide_2', '台本' + 'テキスト'.repeat(50));
      const scriptId = service.createScript('pres_1', 'ja');

      service.addNoteToScript(scriptId, noteId1);
      service.addNoteToScript(scriptId, noteId2);

      const stats = service.getScriptStats(scriptId);
      expect(stats?.avgTimePerSlide).toBeGreaterThan(0);
    });
  });

  describe('History', () => {
    it('should record history', () => {
      service.createNote('slide_1', '内容');
      const history = service.getHistory();

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].action).toBe('create-note');
    });
  });

  describe('Complex Workflows', () => {
    it('should create complete presentation script', () => {
      const note1 = service.createNote('slide_1', 'スライド1の台本です。これは重要な情報です。');
      const note2 = service.createNote('slide_2', 'スライド2の台本です。次のポイントに移ります。');
      const note3 = service.createNote('slide_3', 'スライド3の台本です。最後のまとめです。');

      const scriptId = service.createScript('pres_1', 'ja');

      service.addNoteToScript(scriptId, note1);
      service.addNoteToScript(scriptId, note2);
      service.addNoteToScript(scriptId, note3);

      const stats = service.getScriptStats(scriptId);
      expect(stats?.slideCount).toBe(3);

      const fullScript = service.generateFullScript(scriptId);
      expect(fullScript).toContain('スライド 1');
      expect(fullScript).toContain('スライド 2');
      expect(fullScript).toContain('スライド 3');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent note', () => {
      const result = service.updateNote('non-existent', '新しい内容');
      expect(result).toBeNull();
    });

    it('should handle non-existent script', () => {
      const result = service.getScript('non-existent');
      expect(result).toBeUndefined();
    });

    it('should handle adding non-existent note to script', () => {
      const scriptId = service.createScript('pres_1', 'ja');
      const result = service.addNoteToScript(scriptId, 'non-existent');

      expect(result).toBe(false);
    });
  });
});

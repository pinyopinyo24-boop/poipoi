/**
 * PoiPoi SpeakerNotesService
 * スピーカーノート・台本管理
 */

export interface SpeakerNote {
  id: string;
  presentationId: string;
  slideId: string;
  content: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
  history: Array<{ content: string; timestamp: string }>;
}

export class SpeakerNotesService {
  private notes: Map<string, SpeakerNote> = new Map();

  createNote(presentationId: string, slideId: string, content: string, duration: number = 0): SpeakerNote {
    const id = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const note: SpeakerNote = {
      id,
      presentationId,
      slideId,
      content,
      duration,
      createdAt: now,
      updatedAt: now,
      history: [{ content, timestamp: now }],
    };

    this.notes.set(id, note);
    return note;
  }

  getNote(noteId: string): SpeakerNote | undefined {
    return this.notes.get(noteId);
  }

  updateNote(noteId: string, content: string, duration?: number): SpeakerNote | null {
    const note = this.notes.get(noteId);
    if (!note) return null;

    const now = new Date().toISOString();
    note.history.push({ content: note.content, timestamp: note.updatedAt });
    note.content = content;
    note.updatedAt = now;
    if (duration !== undefined) {
      note.duration = duration;
    }

    return note;
  }

  deleteNote(noteId: string): boolean {
    return this.notes.delete(noteId);
  }

  generateNote(slideTitle: string, slideContent: string, purpose: string = ''): string {
    const templates: Record<string, string> = {
      default: `スライド「${slideTitle}」について説明します。\n\n${slideContent}\n\n${purpose ? `目的: ${purpose}` : ''}`,
      formal: `本スライドでは「${slideTitle}」についてご説明申し上げます。${slideContent}`,
      casual: `今から「${slideTitle}」についてお話しします。${slideContent}`,
    };

    return templates.default;
  }

  getNotesBySlide(presentationId: string, slideId: string): SpeakerNote[] {
    return Array.from(this.notes.values()).filter(
      n => n.presentationId === presentationId && n.slideId === slideId
    );
  }

  getNotesByPresentation(presentationId: string): SpeakerNote[] {
    return Array.from(this.notes.values()).filter(n => n.presentationId === presentationId);
  }

  searchNotes(keyword: string): SpeakerNote[] {
    return Array.from(this.notes.values()).filter(n => n.content.includes(keyword));
  }

  estimateDuration(content: string): number {
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount * 0.5);
  }

  getHistory(noteId: string): Array<{ content: string; timestamp: string }> | null {
    const note = this.notes.get(noteId);
    if (!note) return null;
    return [...note.history];
  }

  restoreFromHistory(noteId: string, historyIndex: number): SpeakerNote | null {
    const note = this.notes.get(noteId);
    if (!note || !note.history[historyIndex]) return null;

    const historicalContent = note.history[historyIndex];
    const now = new Date().toISOString();

    note.history.push({ content: note.content, timestamp: note.updatedAt });
    note.content = historicalContent.content;
    note.updatedAt = now;

    return note;
  }

  getStats(): Record<string, unknown> {
    const allNotes = Array.from(this.notes.values());
    const totalDuration = allNotes.reduce((sum, n) => sum + n.duration, 0);
    const averageLength = allNotes.length > 0 ? allNotes.reduce((sum, n) => sum + n.content.length, 0) / allNotes.length : 0;

    return {
      totalNotes: allNotes.length,
      totalDuration,
      averageDuration: allNotes.length > 0 ? totalDuration / allNotes.length : 0,
      averageLength,
    };
  }

  clear(): void {
    this.notes.clear();
  }
}

let serviceInstance: SpeakerNotesService | null = null;

export function getSpeakerNotesService(): SpeakerNotesService {
  if (!serviceInstance) {
    serviceInstance = new SpeakerNotesService();
  }
  return serviceInstance;
}

export function resetSpeakerNotesService(): void {
  serviceInstance = null;
}

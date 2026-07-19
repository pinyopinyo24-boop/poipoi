/**
 * BrainEngine - PoiPoi AI Core
 * 脳エンジン - 認知処理
 */

export interface Thought {
  id: string;
  content: string;
  confidence: number;
  timestamp: string;
}

class BrainEngine {
  private thoughts: Thought[] = [];
  private activeThoughts: Map<string, Thought> = new Map();

  think(content: string, confidence: number = 0.5): Thought {
    const thought: Thought = {
      id: `thought_${Date.now()}`,
      content,
      confidence: Math.min(1, Math.max(0, confidence)),
      timestamp: new Date().toISOString(),
    };

    this.thoughts.push(thought);
    this.activeThoughts.set(thought.id, thought);

    console.log(`🧠 思考: ${content} (信頼度: ${(confidence * 100).toFixed(1)}%)`);

    return thought;
  }

  getThoughts(): Thought[] {
    return [...this.thoughts];
  }

  getActiveThoughts(): Thought[] {
    return Array.from(this.activeThoughts.values());
  }

  focusOn(id: string): Thought | undefined {
    return this.activeThoughts.get(id);
  }

  forget(id: string): boolean {
    return this.activeThoughts.delete(id);
  }

  getStats() {
    return {
      totalThoughts: this.thoughts.length,
      activeThoughts: this.activeThoughts.size,
      averageConfidence:
        this.thoughts.length > 0
          ? this.thoughts.reduce((sum, t) => sum + t.confidence, 0) / this.thoughts.length
          : 0,
    };
  }
}

export default BrainEngine;

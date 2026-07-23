/**
 * KnowledgeIntelligenceAIManager - AI知識インテリジェンス管理
 * 社内知識、製造情報、過去データの検索・分析・管理
 */

export type DocumentType = 'manual' | 'procedure' | 'case_study' | 'improvement' | 'report' | 'faq';
export type KnowledgeCategory = 'manufacturing' | 'quality' | 'maintenance' | 'safety' | 'efficiency' | 'other';
export type RelevanceLevel = 'high' | 'medium' | 'low';

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  type: DocumentType;
  category: KnowledgeCategory;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  author: string;
  relevanceScore: number;
  viewCount: number;
  useCount: number;
  embedding?: number[];
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
  connections: string[];
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export interface SearchResult {
  documentId: string;
  title: string;
  content: string;
  relevance: number;
  matchedTerms: string[];
  category: KnowledgeCategory;
}

export interface CaseStudy {
  id: string;
  title: string;
  problem: string;
  solution: string;
  result: string;
  category: KnowledgeCategory;
  tags: string[];
  createdAt: number;
  successRate: number;
  applicableTo: string[];
}

export interface ImprovementCase {
  id: string;
  title: string;
  description: string;
  beforeMetrics: Record<string, number>;
  afterMetrics: Record<string, number>;
  improvements: string[];
  createdAt: number;
  implementedAt?: number;
  status: 'proposed' | 'approved' | 'implemented' | 'archived';
}

export class KnowledgeIntelligenceAIManager {
  private documents: Map<string, KnowledgeDocument> = new Map();
  private caseStudies: Map<string, CaseStudy> = new Map();
  private improvementCases: Map<string, ImprovementCase> = new Map();
  private knowledgeGraph: Map<string, KnowledgeGraphNode> = new Map();
  private graphEdges: Map<string, KnowledgeGraphEdge> = new Map();
  private searchIndex: Map<string, string[]> = new Map(); // word -> documentIds
  private accessLog: Array<{ documentId: string; timestamp: number }> = [];

  /**
   * 知識文書を追加
   */
  async addDocument(
    title: string,
    content: string,
    type: DocumentType,
    category: KnowledgeCategory,
    author: string,
    tags: string[] = []
  ): Promise<KnowledgeDocument> {
    const document: KnowledgeDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      content,
      type,
      category,
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author,
      relevanceScore: 0.5,
      viewCount: 0,
      useCount: 0,
    };

    this.documents.set(document.id, document);
    this.indexDocument(document);
    this.updateKnowledgeGraph(document);

    return document;
  }

  /**
   * 知識文書を検索
   */
  async searchDocuments(query: string, category?: KnowledgeCategory): Promise<SearchResult[]> {
    const terms = query.toLowerCase().split(/\s+/);
    const results: Map<string, SearchResult> = new Map();

    // インデックスから候補を取得
    for (const term of terms) {
      const docIds = this.searchIndex.get(term) || [];
      for (const docId of docIds) {
        const doc = this.documents.get(docId);
        if (!doc) continue;

        if (category && doc.category !== category) continue;

        const relevance = this.calculateRelevance(query, doc);
        if (relevance > 0.1) {
          results.set(docId, {
            documentId: doc.id,
            title: doc.title,
            content: doc.content.substring(0, 200),
            relevance,
            matchedTerms: terms.filter((t) => doc.content.toLowerCase().includes(t)),
            category: doc.category,
          });
        }
      }
    }

    // 関連度でソート
    return Array.from(results.values()).sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * 類似文書を検索
   */
  async findSimilarDocuments(documentId: string, limit: number = 5): Promise<SearchResult[]> {
    const doc = this.documents.get(documentId);
    if (!doc) return [];

    const results: SearchResult[] = [];

    const docEntries = Array.from(this.documents.entries());
    for (const [id, candidate] of docEntries) {
      if (id === documentId) continue;

      const similarity = this.calculateSimilarity(doc, candidate);
      if (similarity > 0.3) {
        results.push({
          documentId: candidate.id,
          title: candidate.title,
          content: candidate.content.substring(0, 200),
          relevance: similarity,
          matchedTerms: [],
          category: candidate.category,
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
  }

  /**
   * ケーススタディを追加
   */
  async addCaseStudy(
    title: string,
    problem: string,
    solution: string,
    result: string,
    category: KnowledgeCategory,
    tags: string[] = []
  ): Promise<CaseStudy> {
    const caseStudy: CaseStudy = {
      id: `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      problem,
      solution,
      result,
      category,
      tags,
      createdAt: Date.now(),
      successRate: 0.8,
      applicableTo: [],
    };

    this.caseStudies.set(caseStudy.id, caseStudy);
    return caseStudy;
  }

  /**
   * 改善事例を追加
   */
  async addImprovementCase(
    title: string,
    description: string,
    beforeMetrics: Record<string, number>,
    afterMetrics: Record<string, number>
  ): Promise<ImprovementCase> {
    const improvements: string[] = [];
    for (const [key, before] of Object.entries(beforeMetrics)) {
      const after = afterMetrics[key] || 0;
      const improvement = ((after - before) / before) * 100;
      if (improvement !== 0) {
        improvements.push(`${key}: ${improvement.toFixed(2)}%`);
      }
    }

    const improvementCase: ImprovementCase = {
      id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      beforeMetrics,
      afterMetrics,
      improvements,
      createdAt: Date.now(),
      status: 'proposed',
    };

    this.improvementCases.set(improvementCase.id, improvementCase);
    return improvementCase;
  }

  /**
   * 知識グラフを生成
   */
  async generateKnowledgeGraph(): Promise<{
    nodes: KnowledgeGraphNode[];
    edges: KnowledgeGraphEdge[];
  }> {
    const nodes: KnowledgeGraphNode[] = [];
    const edges: KnowledgeGraphEdge[] = [];

    // ノードを作成
    const docEntries = Array.from(this.documents.entries());
    for (const [id, doc] of docEntries) {
      const node: KnowledgeGraphNode = {
        id,
        label: doc.title,
        type: doc.type,
        properties: {
          category: doc.category,
          tags: doc.tags,
          relevance: doc.relevanceScore,
        },
        connections: [],
      };
      nodes.push(node);
      this.knowledgeGraph.set(id, node);
    }

    // エッジを作成
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const doc1 = this.documents.get(nodes[i].id);
        const doc2 = this.documents.get(nodes[j].id);
        if (!doc1 || !doc2) continue;

        const similarity = this.calculateSimilarity(doc1, doc2);
        if (similarity > 0.4) {
          const edge: KnowledgeGraphEdge = {
            id: `edge-${i}-${j}`,
            source: nodes[i].id,
            target: nodes[j].id,
            relationship: 'related',
            weight: similarity,
          };
          edges.push(edge);
          this.graphEdges.set(edge.id, edge);

          nodes[i].connections.push(nodes[j].id);
          nodes[j].connections.push(nodes[i].id);
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * 過去事例から改善提案を生成
   */
  async generateImprovementSuggestions(
    currentMetrics: Record<string, number>
  ): Promise<ImprovementCase[]> {
    const suggestions: ImprovementCase[] = [];

    const improvementEntries = Array.from(this.improvementCases.entries());
    for (const [id, improvementCase] of improvementEntries) {
      if (improvementCase.status !== 'implemented') continue;

      // 現在のメトリクスと比較
      let applicability = 0;
      for (const [key, value] of Object.entries(currentMetrics)) {
        const before = improvementCase.beforeMetrics[key];
        if (before && Math.abs(value - before) < before * 0.2) {
          applicability += 0.25;
        }
      }

      if (applicability > 0.5) {
        suggestions.push(improvementCase);
      }
    }

    return suggestions.sort((a, b) => {
      const improvementA = Object.values(a.afterMetrics).reduce((sum, val) => sum + val, 0);
      const improvementB = Object.values(b.afterMetrics).reduce((sum, val) => sum + val, 0);
      return improvementB - improvementA;
    });
  }

  /**
   * 文書を更新
   */
  async updateDocument(
    documentId: string,
    updates: Partial<KnowledgeDocument>
  ): Promise<KnowledgeDocument | null> {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    const updated: KnowledgeDocument = {
      ...doc,
      ...updates,
      updatedAt: Date.now(),
    };

    this.documents.set(documentId, updated);
    this.reindexDocument(updated);

    return updated;
  }

  /**
   * 文書にアクセス
   */
  async accessDocument(documentId: string): Promise<KnowledgeDocument | null> {
    const doc = this.documents.get(documentId);
    if (!doc) return null;

    doc.viewCount++;
    this.accessLog.push({ documentId, timestamp: Date.now() });

    // 関連度スコアを更新
    doc.relevanceScore = Math.min(1, doc.relevanceScore + 0.01);

    return doc;
  }

  /**
   * 文書を削除
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const doc = this.documents.get(documentId);
    if (!doc) return false;

    this.documents.delete(documentId);
    this.knowledgeGraph.delete(documentId);

    // インデックスをクリーンアップ
    const indexEntries = Array.from(this.searchIndex.entries());
    for (const [term, docIds] of indexEntries) {
      const filtered = docIds.filter((id: string) => id !== documentId);
      if (filtered.length === 0) {
        this.searchIndex.delete(term);
      } else {
        this.searchIndex.set(term, filtered);
      }
    }

    return true;
  }

  /**
   * カテゴリ別に文書を取得
   */
  async getDocumentsByCategory(category: KnowledgeCategory): Promise<KnowledgeDocument[]> {
    const docs = Array.from(this.documents.values());
    return docs
      .filter((doc) => doc.category === category)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * タグで文書を検索
   */
  async searchByTags(tags: string[]): Promise<KnowledgeDocument[]> {
    const results: Map<string, KnowledgeDocument> = new Map();

    for (const tag of tags) {
      const docEntries = Array.from(this.documents.entries());
      for (const [id, doc] of docEntries) {
        if (doc.tags.includes(tag)) {
          results.set(id, doc);
        }
      }
    }

    return Array.from(results.values());
  }

  /**
   * 知識統計を取得
   */
  getStatistics(): Record<string, any> {
    const categories: Record<string, number> = {};
    const types: Record<string, number> = {};

    const docs = Array.from(this.documents.values());
    for (const doc of docs) {
      categories[doc.category] = (categories[doc.category] || 0) + 1;
      types[doc.type] = (types[doc.type] || 0) + 1;
    }

    const totalViews = this.accessLog.length;
    const totalDocuments = this.documents.size;
    const totalCaseStudies = this.caseStudies.size;
    const totalImprovements = this.improvementCases.size;

    return {
      totalDocuments,
      totalCaseStudies,
      totalImprovements,
      totalViews,
      categories,
      types,
      graphNodes: this.knowledgeGraph.size,
      graphEdges: this.graphEdges.size,
    };
  }

  /**
   * 最頻出タグを取得
   */
  getFrequentTags(limit: number = 10): Array<{ tag: string; count: number }> {
    const tagCounts: Record<string, number> = {};

    const docs = Array.from(this.documents.values());
    for (const doc of docs) {
      for (const tag of doc.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 最も閲覧されたドキュメントを取得
   */
  getMostViewedDocuments(limit: number = 10): KnowledgeDocument[] {
    return Array.from(this.documents.values())
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);
  }

  /**
   * 最近追加されたドキュメントを取得
   */
  getRecentDocuments(limit: number = 10): KnowledgeDocument[] {
    return Array.from(this.documents.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * 関連度を計算
   */
  private calculateRelevance(query: string, doc: KnowledgeDocument): number {
    const queryTerms = query.toLowerCase().split(/\s+/);
    let matches = 0;

    for (const term of queryTerms) {
      if (doc.title.toLowerCase().includes(term)) matches += 2;
      if (doc.content.toLowerCase().includes(term)) matches += 1;
      if (doc.tags.some((tag) => tag.toLowerCase().includes(term))) matches += 1.5;
    }

    const baseRelevance = Math.min(1, matches / (queryTerms.length * 2));
    const scoreBoost = doc.relevanceScore * 0.2;

    return baseRelevance + scoreBoost;
  }

  /**
   * 類似度を計算
   */
  private calculateSimilarity(doc1: KnowledgeDocument, doc2: KnowledgeDocument): number {
    let similarity = 0;

    // カテゴリが同じ
    if (doc1.category === doc2.category) similarity += 0.2;

    // タグの重複
    const commonTags = doc1.tags.filter((tag) => doc2.tags.includes(tag)).length;
    const allTags = [...doc1.tags, ...doc2.tags];
    const totalTags = new Set(allTags).size;
    if (totalTags > 0) {
      similarity += (commonTags / totalTags) * 0.3;
    }

    // コンテンツの類似性
    const words1 = new Set(doc1.content.toLowerCase().split(/\s+/));
    const words2 = new Set(doc2.content.toLowerCase().split(/\s+/));
    const commonWords = Array.from(words1).filter((w) => words2.has(w)).length;
    const allWords = Array.from(words1).concat(Array.from(words2));
    const totalWords = new Set(allWords).size;
    if (totalWords > 0) {
      similarity += (commonWords / totalWords) * 0.5;
    }

    return Math.min(1, similarity);
  }

  /**
   * 文書をインデックス
   */
  private indexDocument(doc: KnowledgeDocument): void {
    const words: string[] = [];

    // タイトルから単語を抽出
    doc.title.toLowerCase().split(/\s+/).forEach((word) => {
      if (!words.includes(word)) words.push(word);
    });

    // コンテンツから単語を抽出（最初の500文字）
    doc.content
      .toLowerCase()
      .substring(0, 500)
      .split(/\s+/)
      .forEach((word) => {
        if (word.length > 2 && !words.includes(word)) words.push(word);
      });

    // タグを追加
    doc.tags.forEach((tag) => {
      const lowerTag = tag.toLowerCase();
      if (!words.includes(lowerTag)) words.push(lowerTag);
    });

    // インデックスを更新
    for (const word of words) {
      const docIds = this.searchIndex.get(word) || [];
      if (!docIds.includes(doc.id)) {
        docIds.push(doc.id);
        this.searchIndex.set(word, docIds);
      }
    }
  }

  /**
   * 文書を再インデックス
   */
  private reindexDocument(doc: KnowledgeDocument): void {
    // 古いインデックスをクリア
    const indexEntries = Array.from(this.searchIndex.entries());
    for (const [term, docIds] of indexEntries) {
      const filtered = docIds.filter((id: string) => id !== doc.id);
      if (filtered.length === 0) {
        this.searchIndex.delete(term);
      } else {
        this.searchIndex.set(term, filtered);
      }
    }

    // 新しいインデックスを作成
    this.indexDocument(doc);
  }

  /**
   * 知識グラフを更新
   */
  private updateKnowledgeGraph(doc: KnowledgeDocument): void {
    const node: KnowledgeGraphNode = {
      id: doc.id,
      label: doc.title,
      type: doc.type,
      properties: {
        category: doc.category,
        tags: doc.tags,
      },
      connections: [],
    };

    this.knowledgeGraph.set(doc.id, node);
  }

  /**
   * 文書を取得
   */
  async getDocument(documentId: string): Promise<KnowledgeDocument | null> {
    return this.documents.get(documentId) || null;
  }

  /**
   * すべての文書を取得
   */
  async getAllDocuments(): Promise<KnowledgeDocument[]> {
    return Array.from(this.documents.values());
  }

  /**
   * ケーススタディを取得
   */
  async getCaseStudy(caseStudyId: string): Promise<CaseStudy | null> {
    return this.caseStudies.get(caseStudyId) || null;
  }

  /**
   * すべてのケーススタディを取得
   */
  async getAllCaseStudies(): Promise<CaseStudy[]> {
    return Array.from(this.caseStudies.values());
  }

  /**
   * 改善事例を取得
   */
  async getImprovementCase(caseId: string): Promise<ImprovementCase | null> {
    return this.improvementCases.get(caseId) || null;
  }

  /**
   * すべての改善事例を取得
   */
  async getAllImprovementCases(): Promise<ImprovementCase[]> {
    return Array.from(this.improvementCases.values());
  }

  /**
   * 改善事例を更新
   */
  async updateImprovementCase(
    caseId: string,
    updates: Partial<ImprovementCase>
  ): Promise<ImprovementCase | null> {
    const improvementCase = this.improvementCases.get(caseId);
    if (!improvementCase) return null;

    const updated: ImprovementCase = {
      ...improvementCase,
      ...updates,
    };

    this.improvementCases.set(caseId, updated);
    return updated;
  }

  /**
   * 推奨文書を取得
   */
  async getRecommendedDocuments(
    userId: string,
    limit: number = 5
  ): Promise<KnowledgeDocument[]> {
    // ユーザーのアクセス履歴に基づいて推奨
    const userAccessLog = this.accessLog.filter((log) => {
      const doc = this.documents.get(log.documentId);
      return doc !== undefined;
    });

    const recommendedDocs = new Map<string, number>();

    for (const log of userAccessLog.slice(-50)) {
      const doc = this.documents.get(log.documentId);
      if (!doc) continue;

      // 同じカテゴリの文書を推奨
      const docEntries = Array.from(this.documents.entries());
      for (const [id, candidate] of docEntries) {
        if (candidate.category === doc.category && id !== doc.id) {
          recommendedDocs.set(id, (recommendedDocs.get(id) || 0) + 1);
        }
      }
    }

    const entries = Array.from(recommendedDocs.entries());
    return entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.documents.get(id)!)
      .filter((doc) => doc !== undefined);
  }

  /**
   * 知識ベースの品質を評価
   */
  evaluateKnowledgeBaseQuality(): Record<string, any> {
    const totalDocs = this.documents.size;
    const avgViewCount = totalDocs > 0
      ? Array.from(this.documents.values()).reduce((sum, doc) => sum + doc.viewCount, 0) / totalDocs
      : 0;

    const avgRelevance = totalDocs > 0
      ? Array.from(this.documents.values()).reduce((sum, doc) => sum + doc.relevanceScore, 0) / totalDocs
      : 0;

    const categoryCoverage = new Set(Array.from(this.documents.values()).map((doc) => doc.category)).size;

    return {
      totalDocuments: totalDocs,
      averageViewCount: avgViewCount,
      averageRelevanceScore: avgRelevance,
      categoryCoverage,
      totalCaseStudies: this.caseStudies.size,
      totalImprovements: this.improvementCases.size,
      graphCompleteness: this.graphEdges.size / Math.max(1, (totalDocs * (totalDocs - 1)) / 2),
    };
  }
}

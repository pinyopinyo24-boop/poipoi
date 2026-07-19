/**
 * KnowledgeBaseEnhancer - RAG基盤実装
 * 社内データを知識として利用できるRAGシステム
 */

export interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  source: string;
}

export interface VectorEmbedding {
  documentId: string;
  vector: number[];
  chunkIndex: number;
  text: string;
}

export interface SearchResult {
  documentId: string;
  title: string;
  content: string;
  relevanceScore: number;
  matchedText: string;
}

export interface KnowledgeRetrievalConfig {
  maxResults: number;
  minRelevanceScore: number;
  chunkSize: number;
  overlapSize: number;
  enableSemanticSearch: boolean;
  enableVectorSearch: boolean;
}

export class KnowledgeBaseEnhancer {
  private documents: Map<string, Document> = new Map();
  private embeddings: VectorEmbedding[] = [];
  private indexes: Map<string, Set<string>> = new Map(); // keyword -> documentIds
  private config: KnowledgeRetrievalConfig;

  constructor(config?: Partial<KnowledgeRetrievalConfig>) {
    this.config = {
      maxResults: 10,
      minRelevanceScore: 0.5,
      chunkSize: 500,
      overlapSize: 50,
      enableSemanticSearch: true,
      enableVectorSearch: true,
      ...config,
    };
  }

  /**
   * ドキュメントを追加
   */
  addDocument(doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const document: Document = {
      ...doc,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.documents.set(id, document);
    this.indexDocument(document);
    this.createEmbeddings(document);

    return id;
  }

  /**
   * ドキュメントを更新
   */
  updateDocument(id: string, updates: Partial<Document>): boolean {
    const doc = this.documents.get(id);
    if (!doc) return false;

    const updated: Document = {
      ...doc,
      ...updates,
      id,
      createdAt: doc.createdAt,
      updatedAt: Date.now(),
    };

    this.documents.set(id, updated);
    this.reindexDocument(updated);
    this.createEmbeddings(updated);

    return true;
  }

  /**
   * ドキュメントを削除
   */
  deleteDocument(id: string): boolean {
    const doc = this.documents.get(id);
    if (!doc) return false;

    this.documents.delete(id);
    this.removeFromIndex(id);
    this.removeEmbeddings(id);

    return true;
  }

  /**
   * ドキュメントを取得
   */
  getDocument(id: string): Document | undefined {
    return this.documents.get(id);
  }

  /**
   * すべてのドキュメントを取得
   */
  getAllDocuments(): Document[] {
    return Array.from(this.documents.values());
  }

  /**
   * カテゴリ別にドキュメントを取得
   */
  getDocumentsByCategory(category: string): Document[] {
    return Array.from(this.documents.values()).filter((d) => d.category === category);
  }

  /**
   * ドキュメントにインデックスを作成
   */
  private indexDocument(doc: Document): void {
    const keywords = this.extractKeywords(doc.content);
    keywords.forEach((keyword) => {
      if (!this.indexes.has(keyword)) {
        this.indexes.set(keyword, new Set());
      }
      this.indexes.get(keyword)!.add(doc.id);
    });

    // タグもインデックス
    doc.tags.forEach((tag) => {
      if (!this.indexes.has(tag)) {
        this.indexes.set(tag, new Set());
      }
      this.indexes.get(tag)!.add(doc.id);
    });
  }

  /**
   * ドキュメントのインデックスを再作成
   */
  private reindexDocument(doc: Document): void {
    this.removeFromIndex(doc.id);
    this.indexDocument(doc);
  }

  /**
   * インデックスからドキュメントを削除
   */
  private removeFromIndex(docId: string): void {
    this.indexes.forEach((docIds) => {
      docIds.delete(docId);
    });
  }

  /**
   * キーワードを抽出
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'is',
      'are',
      'was',
      'were',
    ]);

    return words
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 20);
  }

  /**
   * ドキュメントのエンベディングを作成
   */
  private createEmbeddings(doc: Document): void {
    const chunks = this.chunkText(doc.content);
    chunks.forEach((chunk, index) => {
      const vector = this.generateVector(chunk);
      this.embeddings.push({
        documentId: doc.id,
        vector,
        chunkIndex: index,
        text: chunk,
      });
    });
  }

  /**
   * テキストをチャンク分割
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    const chunkSize = this.config.chunkSize;
    const overlapSize = this.config.overlapSize;

    for (let i = 0; i < text.length; i += chunkSize - overlapSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }

    return chunks;
  }

  /**
   * ベクトル表現を生成（簡略版）
   */
  private generateVector(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const vector: number[] = [];

    // 簡略版: 単語の出現頻度をベースにベクトル生成
    for (let i = 0; i < 100; i++) {
      const hash = words.reduce((acc, word) => {
        return (acc * 31 + word.charCodeAt(i % word.length)) % 1000;
      }, 0);
      vector.push(hash / 1000);
    }

    return vector;
  }

  /**
   * エンベディングを削除
   */
  private removeEmbeddings(docId: string): void {
    this.embeddings = this.embeddings.filter((e) => e.documentId !== docId);
  }

  /**
   * キーワード検索
   */
  keywordSearch(query: string): SearchResult[] {
    const keywords = this.extractKeywords(query);
    const documentScores = new Map<string, number>();

    keywords.forEach((keyword) => {
      const docIds = this.indexes.get(keyword);
      if (docIds) {
        docIds.forEach((docId) => {
          documentScores.set(docId, (documentScores.get(docId) || 0) + 1);
        });
      }
    });

    return Array.from(documentScores.entries())
      .filter(([_, score]) => score >= this.config.minRelevanceScore)
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.config.maxResults)
      .map(([docId, score]) => {
        const doc = this.documents.get(docId)!;
        return {
          documentId: docId,
          title: doc.title,
          content: doc.content,
          relevanceScore: score / keywords.length,
          matchedText: doc.content.substring(0, 200),
        };
      });
  }

  /**
   * セマンティック検索
   */
  semanticSearch(query: string): SearchResult[] {
    if (!this.config.enableSemanticSearch) {
      return [];
    }

    const queryVector = this.generateVector(query);
    const similarities: Array<{
      docId: string;
      chunkIndex: number;
      similarity: number;
      text: string;
    }> = [];

    this.embeddings.forEach((embedding) => {
      const similarity = this.cosineSimilarity(queryVector, embedding.vector);
      if (similarity >= this.config.minRelevanceScore) {
        similarities.push({
          docId: embedding.documentId,
          chunkIndex: embedding.chunkIndex,
          similarity,
          text: embedding.text,
        });
      }
    });

    // 結果をグループ化してドキュメント単位にする
    const documentResults = new Map<string, SearchResult>();

    similarities.forEach(({ docId, similarity, text }) => {
      const doc = this.documents.get(docId)!;
      if (!documentResults.has(docId)) {
        documentResults.set(docId, {
          documentId: docId,
          title: doc.title,
          content: doc.content,
          relevanceScore: similarity,
          matchedText: text,
        });
      } else {
        const existing = documentResults.get(docId)!;
        existing.relevanceScore = Math.max(existing.relevanceScore, similarity);
      }
    });

    return Array.from(documentResults.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, this.config.maxResults);
  }

  /**
   * ベクトル検索
   */
  vectorSearch(query: string): SearchResult[] {
    if (!this.config.enableVectorSearch) {
      return [];
    }

    return this.semanticSearch(query);
  }

  /**
   * コサイン類似度を計算
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * ハイブリッド検索
   */
  hybridSearch(query: string): SearchResult[] {
    const keywordResults = this.keywordSearch(query);
    const semanticResults = this.semanticSearch(query);

    const combined = new Map<string, SearchResult>();

    keywordResults.forEach((result) => {
      combined.set(result.documentId, {
        ...result,
        relevanceScore: result.relevanceScore * 0.4,
      });
    });

    semanticResults.forEach((result) => {
      if (combined.has(result.documentId)) {
        const existing = combined.get(result.documentId)!;
        existing.relevanceScore = existing.relevanceScore * 0.6 + result.relevanceScore * 0.4;
      } else {
        combined.set(result.documentId, {
          ...result,
          relevanceScore: result.relevanceScore * 0.4,
        });
      }
    });

    return Array.from(combined.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, this.config.maxResults);
  }

  /**
   * 回答根拠を管理
   */
  getAnswerEvidence(query: string): {
    answer: string;
    sources: SearchResult[];
    confidence: number;
  } {
    const sources = this.hybridSearch(query);

    if (sources.length === 0) {
      return {
        answer: 'No relevant information found',
        sources: [],
        confidence: 0,
      };
    }

    const avgConfidence = sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length;

    return {
      answer: sources.map((s) => s.matchedText).join(' ... '),
      sources,
      confidence: Math.min(avgConfidence, 1),
    };
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalDocuments: number;
    totalEmbeddings: number;
    indexSize: number;
    categories: Record<string, number>;
  } {
    const categories: Record<string, number> = {};
    this.documents.forEach((doc) => {
      categories[doc.category] = (categories[doc.category] || 0) + 1;
    });

    return {
      totalDocuments: this.documents.size,
      totalEmbeddings: this.embeddings.length,
      indexSize: this.indexes.size,
      categories,
    };
  }

  /**
   * 設定を取得
   */
  getConfig(): KnowledgeRetrievalConfig {
    return this.config;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<KnowledgeRetrievalConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * ナレッジベースをクリア
   */
  clear(): void {
    this.documents.clear();
    this.embeddings = [];
    this.indexes.clear();
  }

  /**
   * ナレッジベースをエクスポート
   */
  export(): {
    documents: Document[];
    embeddings: VectorEmbedding[];
  } {
    return {
      documents: Array.from(this.documents.values()),
      embeddings: this.embeddings,
    };
  }

  /**
   * ナレッジベースをインポート
   */
  import(data: { documents: Document[]; embeddings: VectorEmbedding[] }): void {
    this.clear();

    data.documents.forEach((doc) => {
      this.documents.set(doc.id, doc);
      this.indexDocument(doc);
    });

    this.embeddings = data.embeddings;
  }
}

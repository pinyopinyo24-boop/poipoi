/**
 * PDFAnalysisManager
 * PDF ファイルの解析とテキスト抽出
 */

export interface PDFPage {
  pageNumber: number;
  text: string;
  lines: string[];
}

export interface PDFAnalysisResult {
  fileName: string;
  pageCount: number;
  totalText: string;
  pages: PDFPage[];
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
  structure: {
    headings: string[];
    paragraphs: string[];
    tables: string[];
  };
}

export class PDFAnalysisManager {
  /**
   * PDF ファイルを読み込む（シミュレーション）
   */
  async parsePDF(filePath: string): Promise<PDFAnalysisResult | null> {
    try {
      // シミュレーション用の実装
      const fileName = filePath.split('/').pop() || 'document.pdf';
      
      const pages: PDFPage[] = [
        {
          pageNumber: 1,
          text: 'ページ1のコンテンツ',
          lines: ['ページ1のコンテンツ'],
        },
      ];

      const structure = this.extractStructure('ページ1のコンテンツ');

      return {
        fileName,
        pageCount: 1,
        totalText: 'ページ1のコンテンツ',
        pages,
        metadata: {
          title: fileName,
        },
        structure,
      };
    } catch (error) {
      console.error('PDF parsing error:', error);
      return null;
    }
  }

  /**
   * ページを取得
   */
  getPage(result: PDFAnalysisResult, pageNumber: number): PDFPage | undefined {
    return result.pages.find(p => p.pageNumber === pageNumber);
  }

  /**
   * テキスト抽出
   */
  extractText(result: PDFAnalysisResult): string {
    return result.totalText;
  }

  /**
   * ページごとのテキスト抽出
   */
  extractPageTexts(result: PDFAnalysisResult): { [key: number]: string } {
    const texts: { [key: number]: string } = {};
    for (const page of result.pages) {
      texts[page.pageNumber] = page.text;
    }
    return texts;
  }

  /**
   * 内容構造化
   */
  private extractStructure(text: string): {
    headings: string[];
    paragraphs: string[];
    tables: string[];
  } {
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    const headings: string[] = [];
    const paragraphs: string[] = [];
    const tables: string[] = [];

    let currentParagraph = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // 見出しの検出（大文字のみ、短い行）
      if (trimmed.length < 50 && trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
        headings.push(trimmed);
        if (currentParagraph.trim()) {
          paragraphs.push(currentParagraph.trim());
          currentParagraph = '';
        }
      }
      // テーブルの検出（複数のタブやスペース区切り）
      else if (trimmed.includes('\t') || (trimmed.split(/\s{2,}/).length > 2)) {
        tables.push(trimmed);
        if (currentParagraph.trim()) {
          paragraphs.push(currentParagraph.trim());
          currentParagraph = '';
        }
      } else {
        currentParagraph += trimmed + ' ';
      }
    }

    if (currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim());
    }

    return { headings, paragraphs, tables };
  }

  /**
   * 要約用データ生成
   */
  generateSummaryData(result: PDFAnalysisResult): {
    title: string;
    pageCount: number;
    keyPoints: string[];
    structure: string;
  } {
    const keyPoints = result.structure.headings.slice(0, 10);
    const structure = `
ページ数: ${result.pageCount}
見出し: ${result.structure.headings.length}
段落: ${result.structure.paragraphs.length}
テーブル: ${result.structure.tables.length}
    `.trim();

    return {
      title: result.metadata.title || 'Untitled Document',
      pageCount: result.pageCount,
      keyPoints,
      structure,
    };
  }

  /**
   * JSON に変換
   */
  toJSON(result: PDFAnalysisResult): string {
    return JSON.stringify(
      {
        fileName: result.fileName,
        pageCount: result.pageCount,
        metadata: result.metadata,
        structure: result.structure,
        pagePreview: result.pages.map(p => ({
          pageNumber: p.pageNumber,
          preview: p.text.substring(0, 200),
        })),
      },
      null,
      2
    );
  }

  /**
   * 結果をオブジェクトに変換
   */
  toObject(result: PDFAnalysisResult): Record<string, any> {
    return {
      fileName: result.fileName,
      pageCount: result.pageCount,
      metadata: result.metadata,
      structure: result.structure,
      pages: result.pages.map(p => ({
        pageNumber: p.pageNumber,
        textLength: p.text.length,
        lineCount: p.lines.length,
      })),
    };
  }
}

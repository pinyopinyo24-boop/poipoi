import { invokeLLM } from './llm';
import ExcelJS from 'exceljs';
import PptxGenJS from 'pptxgenjs';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, BorderStyle, WidthType, AlignmentType } from 'docx';
import { storagePut } from '../storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * AI生成機能を統合したドキュメント生成サービス
 */

// ============================================================================
// Excel生成機能
// ============================================================================

export interface ExcelGenerationRequest {
  title: string;
  description: string;
  dataType: 'sales' | 'analytics' | 'report' | 'inventory' | 'custom';
  rows?: number;
  columns?: number;
  aiPrompt?: string;
}

export async function generateExcelWithAI(request: ExcelGenerationRequest): Promise<{ url: string; key: string }> {
  // AIでコンテンツを生成
  const aiPrompt = request.aiPrompt || `
    Generate realistic ${request.dataType} data for an Excel spreadsheet.
    Title: ${request.title}
    Description: ${request.description}
    Rows: ${request.rows || 10}
    Columns: ${request.columns || 5}
    
    Return the data as a JSON object with:
    - headers: array of column names
    - rows: array of row data
    - metadata: object with title, description, and summary
  `;

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: 'You are a data generation expert. Generate realistic and meaningful data for spreadsheets. Always return valid JSON.',
      },
      {
        role: 'user',
        content: aiPrompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'excel_data',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            headers: { type: 'array', items: { type: 'string' } },
            rows: { type: 'array', items: { type: 'array' } },
            metadata: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                summary: { type: 'string' },
              },
            },
          },
          required: ['headers', 'rows', 'metadata'],
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Failed to generate Excel data');

  const data = JSON.parse(content);

  // Excelワークブックを作成
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  // ヘッダーを追加
  const headerRow = worksheet.addRow(data.headers);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  headerRow.alignment = { horizontal: 'center' as any, vertical: 'middle' };

  // データを追加
  data.rows.forEach((row: any[]) => {
    worksheet.addRow(row);
  });

  // 列幅を自動調整
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellLength = cell.value?.toString().length || 0;
      if (cellLength > maxLength) maxLength = cellLength;
    });
    column.width = Math.min(maxLength + 2, 50);
  });

  // メタデータシートを追加
  const metaSheet = workbook.addWorksheet('Metadata');
  metaSheet.addRow(['Title', data.metadata.title]);
  metaSheet.addRow(['Description', data.metadata.description]);
  metaSheet.addRow(['Summary', data.metadata.summary]);
  metaSheet.addRow(['Generated', new Date().toISOString()]);

  // ファイルをバッファに出力
  const buffer = await workbook.xlsx.writeBuffer();

  // S3にアップロード
  const fileName = `excel_${uuidv4()}_${Date.now()}.xlsx`;
  const { url, key } = await storagePut(fileName, buffer as any, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  return { url, key };
}

// ============================================================================
// PowerPoint生成機能
// ============================================================================

export interface PowerPointGenerationRequest {
  title: string;
  description: string;
  slides?: number;
  theme?: 'professional' | 'creative' | 'minimal' | 'colorful';
  aiPrompt?: string;
}

export async function generatePowerPointWithAI(request: PowerPointGenerationRequest): Promise<{ url: string; key: string }> {
  // AIでスライドコンテンツを生成
  const aiPrompt = request.aiPrompt || `
    Generate a PowerPoint presentation outline.
    Title: ${request.title}
    Description: ${request.description}
    Number of slides: ${request.slides || 5}
    Theme: ${request.theme || 'professional'}
    
    Return as JSON with:
    - title: presentation title
    - slides: array of slides with title, content (bullet points), and speaker notes
  `;

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: 'You are a presentation expert. Create engaging and well-structured PowerPoint presentations. Return valid JSON.',
      },
      {
        role: 'user',
        content: aiPrompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'powerpoint_data',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            slides: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'array', items: { type: 'string' } },
                  notes: { type: 'string' },
                },
              },
            },
          },
          required: ['title', 'slides'],
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Failed to generate PowerPoint data');

  const data = JSON.parse(content);

  // PptxGenJSで作成
  const pres = new PptxGenJS();

  // テーマ設定
  const themeColors: Record<string, { bg: string; text: string; accent: string }> = {
    professional: { bg: '#FFFFFF', text: '#1F4E78', accent: '#4472C4' },
    creative: { bg: '#F5F5F5', text: '#FF6B6B', accent: '#4ECDC4' },
    minimal: { bg: '#FAFAFA', text: '#333333', accent: '#666666' },
    colorful: { bg: '#FFFFFF', text: '#FF1493', accent: '#00CED1' },
  };

  const theme = themeColors[request.theme || 'professional'];

  // タイトルスライド
  const titleSlide = pres.addSlide();
  titleSlide.background = { color: theme.bg };
  titleSlide.addText(data.title, {
    x: 0.5,
    y: 2,
    w: 9,
    h: 1.5,
    fontSize: 54,
    bold: true,
    color: theme.text,
    align: 'center',
  });
  titleSlide.addText(request.description, {
    x: 0.5,
    y: 3.7,
    w: 9,
    h: 1,
    fontSize: 24,
    color: theme.accent,
    align: 'center',
  });

  // コンテンツスライド
  data.slides.forEach((slide: any) => {
    const contentSlide = pres.addSlide();
    contentSlide.background = { color: theme.bg };

    // タイトル
    contentSlide.addText(slide.title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 44,
      bold: true,
      color: theme.text,
    });

    // 区切り線
    contentSlide.addShape(pres.ShapeType.rect, {
      x: 0.5,
      y: 1.4,
      w: 9,
      h: 0.05,
      fill: { color: theme.accent },
      line: { type: 'none' },
    });

    // コンテンツ
    const bulletPoints = slide.content.map((point: string) => ({ text: point, options: { fontSize: 18 } }));
    contentSlide.addText(bulletPoints, {
      x: 1,
      y: 1.8,
      w: 8.5,
      h: 4,
      fontSize: 18,
      color: theme.text,
      bullet: true,
    });

    // スピーカーノート
    if (slide.notes) {
      contentSlide.addNotes(slide.notes);
    }
  });

  // ファイルをバッファに出力
  const buffer = await pres.write({ outputType: 'arraybuffer' });

  // S3にアップロード
  const fileName = `powerpoint_${uuidv4()}_${Date.now()}.pptx`;
  const bufferData = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any);
  const { url, key } = await storagePut(
    fileName,
    bufferData,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  );

  return { url, key };
}

// ============================================================================
// Word生成機能
// ============================================================================

export interface WordGenerationRequest {
  title: string;
  description: string;
  sections?: number;
  includeTableOfContents?: boolean;
  aiPrompt?: string;
}

export async function generateWordWithAI(request: WordGenerationRequest): Promise<{ url: string; key: string }> {
  // AIでドキュメントコンテンツを生成
  const aiPrompt = request.aiPrompt || `
    Generate a professional Word document.
    Title: ${request.title}
    Description: ${request.description}
    Number of sections: ${request.sections || 3}
    
    Return as JSON with:
    - title: document title
    - sections: array of sections with heading and paragraphs
    - summary: executive summary
  `;

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: 'You are a professional document writer. Create well-structured and informative documents. Return valid JSON.',
      },
      {
        role: 'user',
        content: aiPrompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'word_data',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  heading: { type: 'string' },
                  paragraphs: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
          required: ['title', 'summary', 'sections'],
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Failed to generate Word document data');

  const data = JSON.parse(content);

  // ドキュメント要素を構築
  const sections: any[] = [];

  // タイトルページ
  sections.push(
    new Paragraph({
      text: data.title,
      style: 'Heading1',
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: request.description,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: `Generated: ${new Date().toLocaleDateString()}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  // エグゼクティブサマリー
  sections.push(
    new Paragraph({
      text: 'Executive Summary',
      style: 'Heading2',
      spacing: { before: 200, after: 200 },
    }),
    new Paragraph({
      text: data.summary,
      spacing: { after: 400 },
    })
  );

  // セクション
  data.sections.forEach((section: any) => {
    sections.push(
      new Paragraph({
        text: section.heading,
        style: 'Heading2',
        spacing: { before: 200, after: 200 },
      })
    );

    section.paragraphs.forEach((para: string) => {
      sections.push(
        new Paragraph({
          text: para,
          spacing: { after: 200 },
        })
      );
    });
  });

  // ドキュメントを作成
  const doc = new Document({
    sections: [
      {
        children: sections,
      },
    ],
  });

  // ファイルをバッファに出力
  const buffer = await Packer.toBuffer(doc);

  // S3にアップロード
  const fileName = `word_${uuidv4()}_${Date.now()}.docx`;
  const { url, key } = await storagePut(
    fileName,
    buffer,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );

  return { url, key };
}

// ============================================================================
// バッチドキュメント生成
// ============================================================================

export interface BatchDocumentRequest {
  title: string;
  description: string;
  formats: ('excel' | 'powerpoint' | 'word')[];
  aiPrompt?: string;
}

export async function generateBatchDocuments(request: BatchDocumentRequest): Promise<{
  excel?: { url: string; key: string };
  powerpoint?: { url: string; key: string };
  word?: { url: string; key: string };
}> {
  const results: any = {};

  if (request.formats.includes('excel')) {
    results.excel = await generateExcelWithAI({
      title: request.title,
      description: request.description,
      dataType: 'custom',
      aiPrompt: request.aiPrompt,
    });
  }

  if (request.formats.includes('powerpoint')) {
    results.powerpoint = await generatePowerPointWithAI({
      title: request.title,
      description: request.description,
      aiPrompt: request.aiPrompt,
    });
  }

  if (request.formats.includes('word')) {
    results.word = await generateWordWithAI({
      title: request.title,
      description: request.description,
      aiPrompt: request.aiPrompt,
    });
  }

  return results;
}

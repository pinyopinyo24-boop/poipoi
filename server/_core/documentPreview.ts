import { invokeLLM } from './llm';

/**
 * ドキュメントプレビューサービス
 * Excel、PowerPoint、Wordのプレビューと微調整機能
 */

export interface ExcelPreview {
  title: string;
  sheets: ExcelSheet[];
  metadata: {
    author: string;
    createdDate: string;
    description: string;
  };
}

export interface ExcelSheet {
  name: string;
  rows: ExcelRow[];
  columns: number;
}

export interface ExcelRow {
  cells: ExcelCell[];
}

export interface ExcelCell {
  value: string;
  type: 'text' | 'number' | 'formula' | 'date';
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    backgroundColor?: string;
    textColor?: string;
    alignment?: 'left' | 'center' | 'right';
  };
}

export interface PowerPointPreview {
  title: string;
  slides: PowerPointSlide[];
  theme: string;
  metadata: {
    author: string;
    createdDate: string;
    description: string;
  };
}

export interface PowerPointSlide {
  slideNumber: number;
  title: string;
  content: string;
  notes: string;
  layout: 'title' | 'content' | 'two-column' | 'blank';
  elements?: SlideElement[];
}

export interface SlideElement {
  type: 'text' | 'image' | 'shape' | 'chart';
  content: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface WordPreview {
  title: string;
  sections: WordSection[];
  metadata: {
    author: string;
    createdDate: string;
    description: string;
  };
  tableOfContents?: string[];
}

export interface WordSection {
  heading: string;
  level: number;
  content: string;
  paragraphs: WordParagraph[];
}

export interface WordParagraph {
  text: string;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    alignment?: 'left' | 'center' | 'right' | 'justify';
  };
}

export class DocumentPreviewService {
  /**
   * Excelプレビューを生成
   */
  async generateExcelPreview(params: {
    title: string;
    topic: string;
    rows: number;
    columns: number;
  }): Promise<ExcelPreview> {
    // AIでExcelコンテンツを生成
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are an Excel spreadsheet expert. Generate realistic spreadsheet content.',
        },
        {
          role: 'user',
          content: `Generate Excel spreadsheet content:
          - Title: ${params.title}
          - Topic: ${params.topic}
          - Rows: ${params.rows}
          - Columns: ${params.columns}
          
          Return JSON with structure:
          {
            "sheets": [{
              "name": "Sheet1",
              "rows": [
                {
                  "cells": [
                    { "value": "Header 1", "type": "text" },
                    { "value": "100", "type": "number" }
                  ]
                }
              ]
            }],
            "metadata": {
              "author": "PoiPoi",
              "createdDate": "2026-07-04",
              "description": "${params.topic}"
            }
          }`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'excel_preview',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              sheets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    rows: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          cells: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                value: { type: 'string' },
                                type: { type: 'string' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              metadata: {
                type: 'object',
                properties: {
                  author: { type: 'string' },
                  createdDate: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Failed to generate Excel preview');

    const preview = JSON.parse(content);
    return {
      title: params.title,
      sheets: preview.sheets,
      metadata: preview.metadata,
    };
  }

  /**
   * PowerPointプレビューを生成
   */
  async generatePowerPointPreview(params: {
    title: string;
    topic: string;
    slides: number;
    theme: string;
  }): Promise<PowerPointPreview> {
    // AIでPowerPointコンテンツを生成
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a PowerPoint presentation expert. Generate compelling slide content.',
        },
        {
          role: 'user',
          content: `Generate PowerPoint presentation:
          - Title: ${params.title}
          - Topic: ${params.topic}
          - Number of slides: ${params.slides}
          - Theme: ${params.theme}
          
          Return JSON with structure:
          {
            "slides": [
              {
                "slideNumber": 1,
                "title": "Title Slide",
                "content": "Main content",
                "notes": "Speaker notes",
                "layout": "title"
              }
            ],
            "theme": "${params.theme}",
            "metadata": {
              "author": "PoiPoi",
              "createdDate": "2026-07-04",
              "description": "${params.topic}"
            }
          }`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'powerpoint_preview',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              slides: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    slideNumber: { type: 'number' },
                    title: { type: 'string' },
                    content: { type: 'string' },
                    notes: { type: 'string' },
                    layout: { type: 'string' },
                  },
                },
              },
              theme: { type: 'string' },
              metadata: {
                type: 'object',
                properties: {
                  author: { type: 'string' },
                  createdDate: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Failed to generate PowerPoint preview');

    const preview = JSON.parse(content);
    return {
      title: params.title,
      slides: preview.slides,
      theme: params.theme,
      metadata: preview.metadata,
    };
  }

  /**
   * Wordプレビューを生成
   */
  async generateWordPreview(params: {
    title: string;
    topic: string;
    sections: number;
  }): Promise<WordPreview> {
    // AIでWordコンテンツを生成
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a Word document expert. Generate professional document content.',
        },
        {
          role: 'user',
          content: `Generate Word document:
          - Title: ${params.title}
          - Topic: ${params.topic}
          - Number of sections: ${params.sections}
          
          Return JSON with structure:
          {
            "sections": [
              {
                "heading": "Section 1",
                "level": 1,
                "content": "Section content",
                "paragraphs": [
                  { "text": "Paragraph text" }
                ]
              }
            ],
            "tableOfContents": ["Section 1", "Section 2"],
            "metadata": {
              "author": "PoiPoi",
              "createdDate": "2026-07-04",
              "description": "${params.topic}"
            }
          }`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'word_preview',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              sections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    heading: { type: 'string' },
                    level: { type: 'number' },
                    content: { type: 'string' },
                    paragraphs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          text: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
              tableOfContents: {
                type: 'array',
                items: { type: 'string' },
              },
              metadata: {
                type: 'object',
                properties: {
                  author: { type: 'string' },
                  createdDate: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Failed to generate Word preview');

    const preview = JSON.parse(content);
    return {
      title: params.title,
      sections: preview.sections,
      metadata: preview.metadata,
      tableOfContents: preview.tableOfContents,
    };
  }

  /**
   * プレビューコンテンツを更新
   */
  async updatePreviewContent(
    type: 'excel' | 'powerpoint' | 'word',
    preview: any,
    updates: Record<string, any>
  ): Promise<any> {
    // AIでコンテンツ更新を検証・最適化
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a ${type} content expert. Validate and optimize document updates.`,
        },
        {
          role: 'user',
          content: `Update ${type} document:
          - Current content: ${JSON.stringify(preview)}
          - Updates: ${JSON.stringify(updates)}
          
          Return JSON with updated content that maintains consistency and quality.`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Failed to update preview');

    return JSON.parse(content);
  }

  /**
   * プレビューをバリデーション
   */
  async validatePreview(type: 'excel' | 'powerpoint' | 'word', preview: any): Promise<{ isValid: boolean; issues: string[] }> {
    // AIでプレビューをバリデーション
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a ${type} quality expert. Validate document content for quality and consistency.`,
        },
        {
          role: 'user',
          content: `Validate ${type} document:
          ${JSON.stringify(preview)}
          
          Return JSON with { isValid: boolean, issues: string[] }`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'validation_result',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              isValid: { type: 'boolean' },
              issues: { type: 'array', items: { type: 'string' } },
            },
            required: ['isValid', 'issues'],
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Failed to validate preview');

    return JSON.parse(content);
  }
}

export const documentPreviewService = new DocumentPreviewService();

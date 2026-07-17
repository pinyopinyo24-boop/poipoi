import { invokeLLM } from './llm';

export interface TextProcessingResult {
  type: 'summary' | 'refinement' | 'expansion' | 'simplification' | 'tone-adjustment';
  originalText: string;
  processedText: string;
  explanation: string;
  wordCountBefore: number;
  wordCountAfter: number;
  processingTime: number;
}

export interface AIAssistantOptions {
  language?: string;
  style?: 'formal' | 'casual' | 'academic' | 'creative';
  tone?: 'professional' | 'friendly' | 'authoritative' | 'conversational';
  targetAudience?: string;
}

export class PreviewAIAssistant {
  /**
   * テキストを自動要約する
   */
  static async summarizeText(
    text: string,
    options?: { level?: 'short' | 'medium' | 'long' }
  ): Promise<TextProcessingResult> {
    const startTime = Date.now();
    const level = options?.level || 'medium';
    
    const levelInstructions = {
      short: '1-2文で簡潔に要約してください',
      medium: '3-5文で要約してください',
      long: '段落ごとに要約してください'
    };

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'あなたはプロのテキスト編集者です。ユーザーのテキストを効果的に要約します。'
        },
        {
          role: 'user',
          content: `以下のテキストを${levelInstructions[level]}\n\nテキスト:\n${text}`
        }
      ]
    });

    const processedText = typeof response.choices[0].message.content === 'string'
      ? response.choices[0].message.content
      : '';

    return {
      type: 'summary',
      originalText: text,
      processedText,
      explanation: `${level}レベルの要約を生成しました`,
      wordCountBefore: text.split(/\s+/).length,
      wordCountAfter: processedText.split(/\s+/).length,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * テキストをブラッシュアップする
   */
  static async refineText(
    text: string,
    options?: AIAssistantOptions
  ): Promise<TextProcessingResult> {
    const startTime = Date.now();
    const style = options?.style || 'formal';
    const tone = options?.tone || 'professional';

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'あなたはプロのコピーライターです。テキストを改善し、より効果的にします。'
        },
        {
          role: 'user',
          content: `以下のテキストをブラッシュアップしてください。スタイル: ${style}、トーン: ${tone}\n\nテキスト:\n${text}`
        }
      ]
    });

    const processedText = typeof response.choices[0].message.content === 'string'
      ? response.choices[0].message.content
      : '';

    return {
      type: 'refinement',
      originalText: text,
      processedText,
      explanation: `${style}スタイル、${tone}トーンでブラッシュアップしました`,
      wordCountBefore: text.split(/\s+/).length,
      wordCountAfter: processedText.split(/\s+/).length,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * テキストを拡張する
   */
  static async expandText(
    text: string,
    options?: { targetLength?: 'medium' | 'long'; focusArea?: string }
  ): Promise<TextProcessingResult> {
    const startTime = Date.now();
    const targetLength = options?.targetLength || 'medium';
    const focusArea = options?.focusArea || '';

    const lengthInstructions = {
      medium: '元のテキストの1.5倍の長さに拡張',
      long: '元のテキストの2倍の長さに拡張'
    };

    const focusInstruction = focusArea ? `特に${focusArea}に焦点を当てて、` : '';

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'あなたはコンテンツライターです。テキストを詳細に拡張します。'
        },
        {
          role: 'user',
          content: `以下のテキストを${focusInstruction}${lengthInstructions[targetLength]}してください。\n\nテキスト:\n${text}`
        }
      ]
    });

    const processedText = typeof response.choices[0].message.content === 'string'
      ? response.choices[0].message.content
      : '';

    return {
      type: 'expansion',
      originalText: text,
      processedText,
      explanation: `${targetLength}レベルに拡張しました${focusArea ? `（${focusArea}に焦点）` : ''}`,
      wordCountBefore: text.split(/\s+/).length,
      wordCountAfter: processedText.split(/\s+/).length,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * テキストを簡潔にする
   */
  static async simplifyText(
    text: string,
    options?: { targetAudience?: string }
  ): Promise<TextProcessingResult> {
    const startTime = Date.now();
    const targetAudience = options?.targetAudience || '一般的な読者';

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'あなたは複雑なテキストを簡潔にするエキスパートです。'
        },
        {
          role: 'user',
          content: `以下のテキストを${targetAudience}向けに簡潔にしてください。難しい用語は避けてください。\n\nテキスト:\n${text}`
        }
      ]
    });

    const processedText = typeof response.choices[0].message.content === 'string'
      ? response.choices[0].message.content
      : '';

    return {
      type: 'simplification',
      originalText: text,
      processedText,
      explanation: `${targetAudience}向けに簡潔にしました`,
      wordCountBefore: text.split(/\s+/).length,
      wordCountAfter: processedText.split(/\s+/).length,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * テキストのトーンを調整する
   */
  static async adjustTone(
    text: string,
    targetTone: 'professional' | 'friendly' | 'authoritative' | 'conversational' | 'humorous'
  ): Promise<TextProcessingResult> {
    const startTime = Date.now();

    const toneDescriptions = {
      professional: 'プロフェッショナルで正式な',
      friendly: 'フレンドリーで親しみやすい',
      authoritative: '権威的で説得力のある',
      conversational: '会話的でカジュアルな',
      humorous: 'ユーモアのある'
    };

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'あなたはテキストのトーンを巧みに調整するエキスパートです。'
        },
        {
          role: 'user',
          content: `以下のテキストを${toneDescriptions[targetTone]}トーンに調整してください。\n\nテキスト:\n${text}`
        }
      ]
    });

    const processedText = typeof response.choices[0].message.content === 'string'
      ? response.choices[0].message.content
      : '';

    return {
      type: 'tone-adjustment',
      originalText: text,
      processedText,
      explanation: `${toneDescriptions[targetTone]}トーンに調整しました`,
      wordCountBefore: text.split(/\s+/).length,
      wordCountAfter: processedText.split(/\s+/).length,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * 複数のテキスト処理を同時実行
   */
  static async processMultiple(
    text: string,
    operations: Array<'summary' | 'refinement' | 'expansion' | 'simplification'>
  ): Promise<TextProcessingResult[]> {
    const results: TextProcessingResult[] = [];

    for (const operation of operations) {
      try {
        let result: TextProcessingResult;
        
        switch (operation) {
          case 'summary':
            result = await this.summarizeText(text, { level: 'medium' });
            break;
          case 'refinement':
            result = await this.refineText(text);
            break;
          case 'expansion':
            result = await this.expandText(text);
            break;
          case 'simplification':
            result = await this.simplifyText(text);
            break;
          default:
            continue;
        }
        
        results.push(result);
      } catch (error) {
        console.error(`Error processing ${operation}:`, error);
      }
    }

    return results;
  }
}

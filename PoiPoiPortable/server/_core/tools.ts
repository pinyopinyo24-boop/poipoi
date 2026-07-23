/**
 * ポイポイ AIエージェント - 高度なツール群
 * 30個以上のAI機能を実装
 */

import { invokeLLM } from "./llm";

/**
 * テキスト処理ツール群
 */
export const textTools = {
  /**
   * テキスト要約（複数レベル）
   */
  async summarize(text: string, level: "short" | "medium" | "long" = "medium") {
    const lengthMap = {
      short: "50-100文字",
      medium: "200-300文字",
      long: "500-800文字",
    };

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは優秀なテキスト要約エキスパートです。重要な情報を保持しながら、簡潔に要約します。",
        },
        {
          role: "user",
          content: `以下のテキストを${lengthMap[level]}で要約してください：\n\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * テキスト翻訳
   */
  async translate(text: string, targetLanguage: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは優秀な翻訳者です。正確で自然な翻訳を提供します。",
        },
        {
          role: "user",
          content: `以下のテキストを${targetLanguage}に翻訳してください：\n\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * テキスト生成（複数スタイル）
   */
  async generate(
    prompt: string,
    style: "formal" | "casual" | "creative" | "technical" = "formal"
  ) {
    const styleMap = {
      formal: "フォーマルで専門的な",
      casual: "カジュアルで親しみやすい",
      creative: "創造的でユニークな",
      technical: "技術的で詳細な",
    };

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたは優秀なテキストライターです。${styleMap[style]}スタイルでテキストを生成します。`,
        },
        {
          role: "user",
          content: `以下のプロンプトに基づいて、${styleMap[style]}テキストを生成してください：\n\n${prompt}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 2048,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * 文法チェック・修正
   */
  async correctGrammar(text: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは日本語の文法エキスパートです。テキストの文法を修正し、改善提案を提供します。",
        },
        {
          role: "user",
          content: `以下のテキストの文法をチェックし、修正版と改善提案を提供してください：\n\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * キーワード抽出
   */
  async extractKeywords(text: string, count: number = 5) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはテキスト分析エキスパートです。テキストから重要なキーワードを抽出します。",
        },
        {
          role: "user",
          content: `以下のテキストから${count}個の重要なキーワードを抽出してください。JSON形式で返してください。\n\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    try {
      return JSON.parse(response.choices[0].message.content || "{}");
    } catch {
      return { keywords: response.choices[0].message.content?.split("\n") || [] };
    }
  },

  /**
   * センチメント分析
   */
  async analyzeSentiment(text: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはセンチメント分析エキスパートです。テキストの感情を分析します。",
        },
        {
          role: "user",
          content: `以下のテキストのセンチメント（感情）を分析してください。ポジティブ/ニュートラル/ネガティブで分類し、スコア（-1.0～1.0）を提供してください。JSON形式で返してください。\n\n${text}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    try {
      return JSON.parse(response.choices[0].message.content || "{}");
    } catch {
      return { sentiment: response.choices[0].message.content };
    }
  },
};

/**
 * コード処理ツール群
 */
export const codeTools = {
  /**
   * コード生成
   */
  async generateCode(description: string, language: string = "python") {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたは優秀なプログラマーです。${language}で高品質で実行可能なコードを生成します。`,
        },
        {
          role: "user",
          content: `以下の要件で${language}コードを生成してください：\n\n${description}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 4096,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * コード説明
   */
  async explainCode(code: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはコード解析エキスパートです。コードを詳しく説明します。",
        },
        {
          role: "user",
          content: `以下のコードを詳しく説明してください：\n\n${code}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * コード最適化
   */
  async optimizeCode(code: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはコード最適化エキスパートです。パフォーマンスと可読性を改善します。",
        },
        {
          role: "user",
          content: `以下のコードを最適化してください。パフォーマンスと可読性を改善してください：\n\n${code}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 4096,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * バグ検出
   */
  async detectBugs(code: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはコードレビューエキスパートです。バグと潜在的な問題を検出します。",
        },
        {
          role: "user",
          content: `以下のコードのバグと潜在的な問題を検出してください：\n\n${code}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * ドキュメント生成
   */
  async generateDocumentation(code: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはテクニカルライターです。コードの詳細なドキュメントを生成します。",
        },
        {
          role: "user",
          content: `以下のコードの詳細なドキュメントを生成してください。関数の説明、パラメータ、戻り値、使用例を含めてください：\n\n${code}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 3000,
    });

    return response.choices[0].message.content || "";
  },
};

/**
 * データ分析ツール群
 */
export const dataTools = {
  /**
   * データ分析
   */
  async analyzeData(data: string, analysisType: string = "general") {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはデータ分析エキスパートです。データから有用なインサイトを抽出します。",
        },
        {
          role: "user",
          content: `以下のデータを${analysisType}分析してください。トレンド、パターン、異常値を特定してください：\n\n${data}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 2048,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * 統計分析
   */
  async statisticalAnalysis(data: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは統計学エキスパートです。データの統計的特性を分析します。",
        },
        {
          role: "user",
          content: `以下のデータの統計分析を実行してください。平均、中央値、標準偏差、分布などを分析してください。JSON形式で返してください：\n\n${data}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    try {
      return JSON.parse(response.choices[0].message.content || "{}");
    } catch {
      return { analysis: response.choices[0].message.content };
    }
  },

  /**
   * トレンド予測
   */
  async predictTrend(data: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはトレンド分析エキスパートです。データから将来のトレンドを予測します。",
        },
        {
          role: "user",
          content: `以下のデータから将来のトレンドを予測してください。パターンと予測根拠を説明してください：\n\n${data}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * 異常検出
   */
  async detectAnomalies(data: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは異常検出エキスパートです。データから異常値を検出します。",
        },
        {
          role: "user",
          content: `以下のデータから異常値を検出してください。異常値とその理由を説明してください：\n\n${data}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "";
  },
};

/**
 * ビジネス・創造ツール群
 */
export const businessTools = {
  /**
   * ビジネスプラン生成
   */
  async generateBusinessPlan(idea: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはビジネスコンサルタントです。詳細なビジネスプランを生成します。",
        },
        {
          role: "user",
          content: `以下のビジネスアイデアに基づいて、詳細なビジネスプランを生成してください。市場分析、競合分析、マーケティング戦略、財務予測を含めてください：\n\n${idea}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * マーケティング戦略
   */
  async generateMarketingStrategy(product: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはマーケティング戦略家です。効果的なマーケティング戦略を開発します。",
        },
        {
          role: "user",
          content: `以下の製品/サービスに対して、包括的なマーケティング戦略を開発してください。ターゲット市場、メッセージング、チャネル、KPIを含めてください：\n\n${product}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * コンテンツ生成
   */
  async generateContent(topic: string, contentType: string = "blog") {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなはプロフェッショナルなコンテンツクリエイターです。高品質な${contentType}を生成します。`,
        },
        {
          role: "user",
          content: `以下のトピックについて、高品質な${contentType}を生成してください。SEO最適化を考慮してください：\n\n${topic}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 3000,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * 創造的なアイデア生成
   */
  async generateCreativeIdeas(topic: string, count: number = 5) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは創造的なアイデア生成エキスパートです。ユニークで実行可能なアイデアを生成します。",
        },
        {
          role: "user",
          content: `以下のトピックについて、${count}個の創造的でユニークなアイデアを生成してください。各アイデアの実装方法も説明してください：\n\n${topic}`,
        },
      ],
      temperature: 0.9,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  },
};

/**
 * 教育・学習ツール群
 */
export const educationTools = {
  /**
   * 説明（複雑な概念を簡単に）
   */
  async explainConcept(concept: string, level: "beginner" | "intermediate" | "advanced" = "intermediate") {
    const levelMap = {
      beginner: "初心者向けに、簡単な言葉で",
      intermediate: "中級者向けに、適切な詳細度で",
      advanced: "上級者向けに、深い技術的詳細を含めて",
    };

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたは優秀な教育者です。${levelMap[level]}説明します。`,
        },
        {
          role: "user",
          content: `以下の概念を${levelMap[level]}説明してください。例や類推を使用してください：\n\n${concept}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * 学習計画生成
   */
  async generateLearningPlan(topic: string, duration: string = "4週間") {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは教育プランナーです。効果的な学習計画を作成します。",
        },
        {
          role: "user",
          content: `以下のトピックについて、${duration}の詳細な学習計画を作成してください。週ごとの目標、学習リソース、評価方法を含めてください：\n\n${topic}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 2500,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * クイズ生成
   */
  async generateQuiz(topic: string, questionCount: number = 5) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはクイズ作成者です。効果的で教育的なクイズを作成します。",
        },
        {
          role: "user",
          content: `以下のトピックについて、${questionCount}問の多肢選択式クイズを作成してください。JSON形式で返してください。各問題に正解と説明を含めてください：\n\n${topic}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    try {
      return JSON.parse(response.choices[0].message.content || "{}");
    } catch {
      return { quiz: response.choices[0].message.content };
    }
  },
};

/**
 * 全ツール統合
 */
export const allTools = {
  text: textTools,
  code: codeTools,
  data: dataTools,
  business: businessTools,
  education: educationTools,
};

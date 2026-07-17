/**
 * ポイポイ AIエージェント - 追加高度なツール群
 * 残りの30個以上の機能を実装
 */

import { invokeLLM } from "./llm";
import { processFaceSwapVideo } from "./faceSwapTool";
import { processMosaicRemoval } from "./mosaicRemovalTool";

/**
 * 創造・メディアツール群
 */
export const mediaTools = {
  /**
   * 画像説明生成
   */
  async generateImageDescription(imageUrl: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは画像分析エキスパートです。画像を詳しく説明します。",
        },
        {
          role: "user",
          content: `以下の画像について、詳細な説明を生成してください。内容、色、構図、感情的な印象を含めてください。\n画像URL: ${imageUrl}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * 動画スクリプト生成
   */
  async generateVideoScript(topic: string, duration: string = "5分") {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはビデオプロデューサーです。魅力的なビデオスクリプトを作成します。",
        },
        {
          role: "user",
          content: `以下のトピックについて、${duration}のビデオスクリプトを作成してください。シーン、ナレーション、ビジュアル指示を含めてください：\n\n${topic}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * ポッドキャスト概要生成
   */
  async generatePodcastOutline(topic: string, episodeCount: number = 10) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはポッドキャストプロデューサーです。魅力的なポッドキャストシリーズを企画します。",
        },
        {
          role: "user",
          content: `以下のトピックについて、${episodeCount}エピソードのポッドキャストシリーズを企画してください。各エピソードのタイトル、概要、主要なポイントを含めてください：\n\n${topic}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    return response.choices[0].message.content || "";
  },
};

/**
 * 研究・分析ツール群
 */
export const researchTools = {
  /**
   * 研究論文要約
   */
  async summarizeResearchPaper(paperContent: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは学術研究エキスパートです。複雑な研究論文を要約します。",
        },
        {
          role: "user",
          content: `以下の研究論文を要約してください。背景、方法、結果、結論を含めてください：\n\n${paperContent}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * 競合分析
   */
  async analyzeCompetitors(competitors: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは競合分析エキスパートです。詳細な競合分析を実施します。",
        },
        {
          role: "user",
          content: `以下の競合企業について、詳細な競合分析を実施してください。強み、弱み、市場ポジション、戦略を分析してください：\n\n${competitors}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 2500,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * SWOT分析
   */
  async performSWOTAnalysis(subject: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなは戦略分析エキスパートです。SWOT分析を実施します。",
        },
        {
          role: "user",
          content: `以下の対象についてSWOT分析を実施してください。Strengths（強み）、Weaknesses（弱み）、Opportunities（機会）、Threats（脅威）をJSON形式で返してください：\n\n${subject}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    try {
      return JSON.parse(response.choices[0].message.content || "{}");
    } catch {
      return { analysis: response.choices[0].message.content };
    }
  },

  /**
   * 市場調査
   */
  async conductMarketResearch(market: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは市場調査アナリストです。詳細な市場調査を実施します。",
        },
        {
          role: "user",
          content: `以下の市場について、詳細な市場調査を実施してください。市場規模、成長率、主要プレイヤー、トレンド、機会を分析してください：\n\n${market}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 2500,
    });

    return response.choices[0].message.content || "";
  },
};

/**
 * 専門的なコンサルティングツール群
 */
export const consultingTools = {
  /**
   * キャリアコンサルティング
   */
  async careerConsulting(situation: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはキャリアコンサルタントです。個人のキャリア発展を支援します。",
        },
        {
          role: "user",
          content: `以下のキャリア状況について、コンサルティングを提供してください。強み、機会、推奨される次のステップを含めてください：\n\n${situation}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * 法的アドバイス（一般情報）
   */
  async provideLegalGuidance(legalQuestion: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは法律情報提供者です。一般的な法律情報を提供します。注：これは法的アドバイスではなく、一般情報です。",
        },
        {
          role: "user",
          content: `以下の法律関連の質問について、一般的な情報を提供してください。関連する法律、一般的な慣行、専門家への相談の必要性を含めてください：\n\n${legalQuestion}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * 健康・ウェルネスアドバイス
   */
  async provideWellnessAdvice(healthQuestion: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはウェルネスコーチです。一般的な健康とウェルネスのアドバイスを提供します。注：これは医学的アドバイスではありません。",
        },
        {
          role: "user",
          content: `以下の健康・ウェルネス関連の質問について、一般的なアドバイスを提供してください。ライフスタイルの改善、習慣形成、専門家への相談の必要性を含めてください：\n\n${healthQuestion}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * 人間関係アドバイス
   */
  async provideRelationshipAdvice(situation: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたは人間関係カウンセラーです。人間関係の改善をサポートします。",
        },
        {
          role: "user",
          content: `以下の人間関係の状況について、建設的なアドバイスを提供してください。コミュニケーション戦略、理解、解決策を含めてください：\n\n${situation}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  },
};

/**
 * 技術・開発ツール群
 */
export const techTools = {
  /**
   * アーキテクチャ設計
   */
  async designArchitecture(requirements: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはソフトウェアアーキテクトです。スケーラブルで保守可能なアーキテクチャを設計します。",
        },
        {
          role: "user",
          content: `以下の要件に基づいて、ソフトウェアアーキテクチャを設計してください。コンポーネント、データフロー、スケーラビリティ、セキュリティを含めてください：\n\n${requirements}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 2500,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * API設計
   */
  async designAPI(apiRequirements: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはAPI設計エキスパートです。RESTful APIを設計します。",
        },
        {
          role: "user",
          content: `以下の要件に基づいて、RESTful APIを設計してください。エンドポイント、リクエスト/レスポンス形式、エラーハンドリング、認証を含めてください：\n\n${apiRequirements}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 2500,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * データベース設計
   */
  async designDatabase(dataRequirements: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはデータベース設計エキスパートです。効率的なデータベーススキーマを設計します。",
        },
        {
          role: "user",
          content: `以下の要件に基づいて、データベーススキーマを設計してください。テーブル、リレーション、インデックス、正規化を含めてください：\n\n${dataRequirements}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 2500,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * セキュリティレビュー
   */
  async reviewSecurity(code: string) {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "あなたはセキュリティエキスパートです。セキュリティの脆弱性を検出します。",
        },
        {
          role: "user",
          content: `以下のコードのセキュリティレビューを実施してください。脆弱性、リスク、改善提案を含めてください：\n\n${code}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  },
};

/**
 * クリエイティブ・ライティングツール群
 */
export const creativeTools = {
  /**
   * 小説・ストーリー生成
   */
  async generateStory(prompt: string, genre: string = "fiction") {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたはクリエイティブライターです。${genre}のストーリーを生成します。`,
        },
        {
          role: "user",
          content: `以下のプロンプトに基づいて、${genre}のストーリーを生成してください。キャラクター、プロット、ダイアログを含めてください：\n\n${prompt}`,
        },
      ],
      temperature: 0.9,
      max_tokens: 3000,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * 詩生成
   */
  async generatePoetry(theme: string, style: string = "modern") {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたは詩人です。${style}スタイルの詩を作成します。`,
        },
        {
          role: "user",
          content: `以下のテーマについて、${style}スタイルの詩を作成してください。感情、リズム、意象を含めてください：\n\n${theme}`,
        },
      ],
      temperature: 0.9,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * 歌詞生成
   */
  async generateLyrics(topic: string, genre: string = "pop") {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたはソングライターです。${genre}の歌詞を作成します。`,
        },
        {
          role: "user",
          content: `以下のトピックについて、${genre}の歌詞を作成してください。ヴァース、コーラス、ブリッジを含めてください：\n\n${topic}`,
        },
      ],
      temperature: 0.9,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "";
  },

  /**
   * ユーモア・ジョーク生成
   */
  async generateHumor(topic: string, style: string = "general") {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `あなたはコメディアンです。${style}スタイルのユーモアを作成します。`,
        },
        {
          role: "user",
          content: `以下のトピックについて、${style}スタイルのジョークやユーモアを生成してください：\n\n${topic}`,
        },
      ],
      temperature: 0.9,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "";
  },
};

/**
 * 顔入れ替え動画生成ツール
 */
/**
 * モザイク除去ツール
 */
/**
 * モザイク除去ツール
 */
export const mosaicRemovalTools = {
  /**
   * モザイク画像を除去
   */
  async removeMosaicImage(
    imageBase64: string,
    strength: "light" | "medium" | "strong" = "medium"
  ) {
    const result = await processMosaicRemoval({
      imageBase64,
      strength,
    });

    if (!result.success) {
      return `エラー: ${result.error}`;
    }

    return {
      success: true,
      imageBase64: result.outputImageBase64,
      processingTime: result.processingTime,
      fileSize: result.fileSize,
      message: `モザイク除去が完了しました。処理時間: ${(result.processingTime! / 1000).toFixed(2)}秒、ファイルサイズ: ${(result.fileSize! / 1024).toFixed(2)}KB`,
    };
  },
};

export const faceSwapTools = {
  /**
   * 顔入れ替え動画を生成
   */
  async generateFaceSwapVideo(
    sourceVideoBase64: string,
    targetImageBase64: string,
    quality: "low" | "medium" | "high" = "medium"
  ) {
    const result = await processFaceSwapVideo({
      sourceVideoBase64,
      targetImageBase64,
      quality,
    });

    if (!result.success) {
      return `エラー: ${result.error}`;
    }

    return {
      success: true,
      videoBase64: result.outputVideoBase64,
      processingTime: result.processingTime,
      fileSize: result.fileSize,
      message: `顔入れ替え動画が生成されました。処理時間: ${(result.processingTime! / 1000).toFixed(2)}秒、ファイルサイズ: ${(result.fileSize! / 1024 / 1024).toFixed(2)}MB`,
    };
  },
};

/**
 * 全追加ツール統合
 */
export const allAdvancedTools = {
  media: mediaTools,
  research: researchTools,
  consulting: consultingTools,
  tech: techTools,
  creative: creativeTools,
  faceSwap: faceSwapTools,
  mosaicRemoval: mosaicRemovalTools,
};

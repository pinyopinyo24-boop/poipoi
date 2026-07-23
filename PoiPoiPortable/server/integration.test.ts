/**
 * ポイポイ - 全機能統合テストスイート
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { streamingEngine } from "./_core/streaming";
import { multimodalProcessor } from "./_core/multimodal";
import { collaborationEngine } from "./_core/collaboration";
import { customModelTrainingEngine } from "./_core/customModelTraining";
import { externalAPIEngine } from "./_core/externalAPIs";

describe("ポイポイ - 全機能統合テスト", () => {
  /**
   * ストリーミング応答テスト
   */
  describe("ストリーミング応答機能", () => {
    it("ストリーミングエンジンが初期化される", () => {
      expect(streamingEngine).toBeDefined();
      expect(typeof streamingEngine.streamTextGeneration).toBe("function");
      expect(typeof streamingEngine.streamCodeGeneration).toBe("function");
      expect(typeof streamingEngine.streamTranslation).toBe("function");
    });
  });

  /**
   * マルチモーダル入力テスト
   */
  describe("マルチモーダル入力処理", () => {
    it("マルチモーダルプロセッサーが初期化される", () => {
      expect(multimodalProcessor).toBeDefined();
      expect(typeof multimodalProcessor.analyzeImage).toBe("function");
      expect(typeof multimodalProcessor.analyzeAudio).toBe("function");
      expect(typeof multimodalProcessor.extractTextFromImage).toBe("function");
    });
  });

  /**
   * コラボレーション機能テスト
   */
  describe("リアルタイムコラボレーション", () => {
    let sessionId: string;

    beforeAll(() => {
      const session = collaborationEngine.createSession(
        "テストセッション",
        "テスト用のセッション",
        "user1"
      );
      sessionId = session.sessionId;
    });

    it("セッションが作成される", () => {
      const session = collaborationEngine.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.title).toBe("テストセッション");
    });

    it("ユーザーがセッションに参加できる", () => {
      const session = collaborationEngine.joinSession(
        sessionId,
        "user2",
        "User2",
        "editor"
      );
      expect(session?.participants.length).toBe(2);
    });

    it("ドキュメントが作成できる", () => {
      const doc = collaborationEngine.createDocument(
        sessionId,
        "テストドキュメント",
        "初期コンテンツ"
      );
      expect(doc).toBeDefined();
      expect(doc?.title).toBe("テストドキュメント");
    });

    it("ドキュメントが編集できる", () => {
      const session = collaborationEngine.getSession(sessionId);
      if (session && session.documents.length > 0) {
        const doc = session.documents[0];
        const change = collaborationEngine.editDocument(
          doc.documentId,
          "user1",
          "insert",
          0,
          "新しいテキスト"
        );
        expect(change).toBeDefined();
        expect(change?.type).toBe("insert");
      }
    });

    it("ユーザーがセッションから退出できる", () => {
      const result = collaborationEngine.leaveSession(sessionId, "user2");
      expect(result).toBe(true);
      const session = collaborationEngine.getSession(sessionId);
      expect(session?.participants.length).toBe(1);
    });

    afterAll(() => {
      collaborationEngine.closeSession(sessionId);
    });
  });

  /**
   * カスタムモデルトレーニングテスト
   */
  describe("カスタムモデルトレーニング", () => {
    let sessionId: string;

    beforeAll(() => {
      const session = customModelTrainingEngine.createTrainingSession(
        "テストモデル",
        "mistral"
      );
      sessionId = session.sessionId;
    });

    it("トレーニングセッションが作成される", () => {
      const session = customModelTrainingEngine.getTrainingSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.modelName).toBe("テストモデル");
      expect(session?.status).toBe("pending");
    });

    it("トレーニングデータが追加できる", () => {
      const result = customModelTrainingEngine.addTrainingData(
        sessionId,
        "入力テキスト",
        "出力テキスト",
        "category1"
      );
      expect(result).toBe(true);
    });

    it("バッチでトレーニングデータが追加できる", () => {
      const result = customModelTrainingEngine.addTrainingDataBatch(sessionId, [
        { input: "入力1", output: "出力1" },
        { input: "入力2", output: "出力2" },
        { input: "入力3", output: "出力3" },
      ]);
      expect(result).toBe(true);
    });

    it("トレーニングが開始できる", async () => {
      const result = await customModelTrainingEngine.startTraining(sessionId);
      expect(result).toBe(true);
    });

    it("トレーニング進捗が取得できる", () => {
      const progress = customModelTrainingEngine.getTrainingProgress(sessionId);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    it("トレーニング済みモデルが取得できる", () => {
      const model = customModelTrainingEngine.getTrainedModel(sessionId);
      expect(model).toBeDefined();
    });

    afterAll(() => {
      customModelTrainingEngine.deleteTrainingSession(sessionId);
    });
  });

  /**
   * 外部API統合テスト
   */
  describe("外部API統合", () => {
    let integrationId: string;

    beforeAll(() => {
      const integration = externalAPIEngine.registerIntegration(
        "テストAPI",
        "rest",
        "https://api.example.com",
        "bearer",
        "test-token"
      );
      integrationId = integration.integrationId;
    });

    it("API統合が登録される", () => {
      const integration = externalAPIEngine.getIntegration(integrationId);
      expect(integration).toBeDefined();
      expect(integration?.name).toBe("テストAPI");
      expect(integration?.isActive).toBe(true);
    });

    it("エンドポイントが追加できる", () => {
      const endpoint = externalAPIEngine.addEndpoint(
        integrationId,
        "getUserData",
        "GET",
        "/users/{id}",
        "ユーザーデータを取得"
      );
      expect(endpoint).toBeDefined();
      expect(endpoint?.name).toBe("getUserData");
    });

    it("統合が無効化できる", () => {
      const result = externalAPIEngine.setIntegrationActive(
        integrationId,
        false
      );
      expect(result).toBe(true);
      const integration = externalAPIEngine.getIntegration(integrationId);
      expect(integration?.isActive).toBe(false);
    });

    it("統計情報が取得できる", () => {
      const stats = externalAPIEngine.getStatistics(integrationId);
      expect(stats).toBeDefined();
      expect(stats.totalCalls).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
    });

    afterAll(() => {
      externalAPIEngine.deleteIntegration(integrationId);
    });
  });

  /**
   * エージェント統合テスト
   */
  describe("AIエージェント統合", () => {
    it("全機能がエージェントで利用可能", async () => {
      // ストリーミング機能
      expect(streamingEngine).toBeDefined();

      // マルチモーダル機能
      expect(multimodalProcessor).toBeDefined();

      // コラボレーション機能
      expect(collaborationEngine).toBeDefined();

      // トレーニング機能
      expect(customModelTrainingEngine).toBeDefined();

      // API統合機能
      expect(externalAPIEngine).toBeDefined();
    });
  });

  /**
   * パフォーマンステスト
   */
  describe("パフォーマンス", () => {

    it("コラボレーション操作が高速", () => {
      const startTime = Date.now();
      const session = collaborationEngine.createSession("パフォーマンステスト");
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // 500ms以内
    });

    it("API統合が高速", () => {
      const startTime = Date.now();
      const integration = externalAPIEngine.registerIntegration(
        "パフォーマンステスト",
        "rest",
        "https://api.example.com"
      );
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // 500ms以内
    });
  });

  /**
   * エラーハンドリングテスト
   */
  describe("エラーハンドリング", () => {
    it("存在しないセッションに参加できない", () => {
      const result = collaborationEngine.joinSession(
        "invalid_session_id",
        "user1",
        "User1"
      );
      expect(result).toBeNull();
    });

    it("存在しないドキュメントを編集できない", () => {
      const result = collaborationEngine.editDocument(
        "invalid_doc_id",
        "user1",
        "insert",
        0,
        "text"
      );
      expect(result).toBeNull();
    });

    it("存在しないトレーニングセッションを開始できない", async () => {
      const result = await customModelTrainingEngine.startTraining(
        "invalid_session_id"
      );
      expect(result).toBe(false);
    });

    it("存在しないAPI統合を呼び出せない", async () => {
      const result = await externalAPIEngine.callAPI(
        "invalid_integration_id",
        "endpoint"
      );
      expect(result.success).toBe(false);
    });
  });
});

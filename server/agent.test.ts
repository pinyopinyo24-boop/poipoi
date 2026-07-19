import { describe, it, expect, beforeEach, vi } from "vitest";
import { PoiPoiAgent, getAgent } from "./_core/agent";
import { textTools, codeTools, dataTools, businessTools, educationTools } from "./_core/tools";
import { mediaTools, researchTools, consultingTools, techTools, creativeTools } from "./_core/advancedTools";

describe("PoiPoiAgent", () => {
  let agent: PoiPoiAgent;

  beforeEach(() => {
    agent = new PoiPoiAgent();
    agent.clearHistory();
  });

  describe("Agent Initialization", () => {
    it("should create agent instance", () => {
      expect(agent).toBeDefined();
    });

    it("should get singleton agent", () => {
      const agent1 = getAgent();
      const agent2 = getAgent();
      expect(agent1).toBe(agent2);
    });

    it("should have empty history on init", () => {
      expect(agent.getHistory()).toHaveLength(0);
    });
  });

  describe("Task Analysis", () => {
    it("should analyze text generation task", async () => {
      const analysis = await agent.analyzeTask("テキストを生成してください");
      expect(analysis).toBeDefined();
      expect(analysis.taskType).toBeDefined();
      expect(analysis.steps).toBeDefined();
      expect(Array.isArray(analysis.steps)).toBe(true);
    });

    it("should analyze code generation task", async () => {
      const analysis = await agent.analyzeTask("Pythonコードを書いてください");
      expect(analysis).toBeDefined();
      expect(analysis.taskType).toBeDefined();
    });

    it("should analyze data analysis task", async () => {
      const analysis = await agent.analyzeTask("データを分析してください");
      expect(analysis).toBeDefined();
      expect(analysis.taskType).toBeDefined();
    });
  });

  describe("Text Tools", () => {
    it("should summarize text", async () => {
      const text = "これはテストテキストです。複数の文を含んでいます。要約する必要があります。";
      const summary = await textTools.summarize(text, "short");
      expect(summary).toBeDefined();
      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);
    });

    it("should generate text", async () => {
      const prompt = "春についての短い詩を生成してください";
      const generated = await textTools.generate(prompt, "creative");
      expect(generated).toBeDefined();
      expect(typeof generated).toBe("string");
      expect(generated.length).toBeGreaterThan(0);
    });

    it("should extract keywords", async () => {
      const text = "AIとは人工知能です。機械学習と深層学習が含まれます。";
      const keywords = await textTools.extractKeywords(text, 3);
      expect(keywords).toBeDefined();
    });

    it("should analyze sentiment", async () => {
      const text = "これは素晴らしい製品です。とても満足しています。";
      const sentiment = await textTools.analyzeSentiment(text);
      expect(sentiment).toBeDefined();
    });
  });

  describe("Code Tools", () => {
    it("should generate code", async () => {
      const description = "フィボナッチ数列を計算する関数";
      const code = await codeTools.generateCode(description, "python");
      expect(code).toBeDefined();
      expect(typeof code).toBe("string");
      expect(code.length).toBeGreaterThan(0);
    });

    it("should explain code", async () => {
      const code = `def fibonacci(n):
  if n <= 1:
    return n
  return fibonacci(n-1) + fibonacci(n-2)`;
      const explanation = await codeTools.explainCode(code);
      expect(explanation).toBeDefined();
      expect(typeof explanation).toBe("string");
    });

    it("should detect bugs", async () => {
      const code = `def divide(a, b):
  return a / b  # ゼロ除算チェックなし`;
      const bugs = await codeTools.detectBugs(code);
      expect(bugs).toBeDefined();
      expect(typeof bugs).toBe("string");
    });
  });

  describe("Data Tools", () => {
    it("should analyze data", async () => {
      const data = "売上: 100, 150, 200, 180, 220, 250";
      const analysis = await dataTools.analyzeData(data, "trend");
      expect(analysis).toBeDefined();
      expect(typeof analysis).toBe("string");
    });

    it("should perform statistical analysis", async () => {
      const data = "10, 20, 30, 40, 50";
      const stats = await dataTools.statisticalAnalysis(data);
      expect(stats).toBeDefined();
    });

    it("should predict trend", async () => {
      const data = "2023年Q1: 100, Q2: 120, Q3: 150, Q4: 180";
      const prediction = await dataTools.predictTrend(data);
      expect(prediction).toBeDefined();
      expect(typeof prediction).toBe("string");
    });

    it("should detect anomalies", async () => {
      const data = "10, 12, 11, 13, 100, 12, 11";
      const anomalies = await dataTools.detectAnomalies(data);
      expect(anomalies).toBeDefined();
      expect(typeof anomalies).toBe("string");
    });
  });

  describe("Business Tools", () => {
    it("should generate business plan", async () => {
      const idea = "オンラインマーケットプレイス";
      const plan = await businessTools.generateBusinessPlan(idea);
      expect(plan).toBeDefined();
      expect(typeof plan).toBe("string");
      expect(plan.length).toBeGreaterThan(100);
    });

    it("should generate marketing strategy", async () => {
      const product = "新しいモバイルアプリ";
      const strategy = await businessTools.generateMarketingStrategy(product);
      expect(strategy).toBeDefined();
      expect(typeof strategy).toBe("string");
    });

    it("should generate content", async () => {
      const topic = "AI技術の未来";
      const content = await businessTools.generateContent(topic, "blog");
      expect(content).toBeDefined();
      expect(typeof content).toBe("string");
      expect(content.length).toBeGreaterThan(100);
    });

    it("should generate creative ideas", async () => {
      const topic = "新しいビジネスモデル";
      const ideas = await businessTools.generateCreativeIdeas(topic, 3);
      expect(ideas).toBeDefined();
      expect(typeof ideas).toBe("string");
    });
  });

  describe("Education Tools", () => {
    it("should explain concept", async () => {
      const concept = "機械学習";
      const explanation = await educationTools.explainConcept(concept, "beginner");
      expect(explanation).toBeDefined();
      expect(typeof explanation).toBe("string");
      expect(explanation.length).toBeGreaterThan(0);
    });

    it("should generate learning plan", async () => {
      const topic = "Python プログラミング";
      const plan = await educationTools.generateLearningPlan(topic, "4週間");
      expect(plan).toBeDefined();
      expect(typeof plan).toBe("string");
    });

    it("should generate quiz", async () => {
      const topic = "日本の首都";
      const quiz = await educationTools.generateQuiz(topic, 3);
      expect(quiz).toBeDefined();
    });
  });

  describe("Media Tools", () => {
    it("should generate video script", async () => {
      const topic = "AIの基礎";
      const script = await mediaTools.generateVideoScript(topic, "5分");
      expect(script).toBeDefined();
      expect(typeof script).toBe("string");
    });

    it("should generate podcast outline", async () => {
      const topic = "テクノロジートレンド";
      const outline = await mediaTools.generatePodcastOutline(topic, 5);
      expect(outline).toBeDefined();
      expect(typeof outline).toBe("string");
    });
  });

  describe("Research Tools", () => {
    it("should perform SWOT analysis", async () => {
      const subject = "スタートアップ企業";
      const swot = await researchTools.performSWOTAnalysis(subject);
      expect(swot).toBeDefined();
    });

    it("should conduct market research", async () => {
      const market = "クラウドコンピューティング";
      const research = await researchTools.conductMarketResearch(market);
      expect(research).toBeDefined();
      expect(typeof research).toBe("string");
    });
  });

  describe("Tech Tools", () => {
    it("should design architecture", async () => {
      const requirements = "スケーラブルなWebアプリケーション";
      const architecture = await techTools.designArchitecture(requirements);
      expect(architecture).toBeDefined();
      expect(typeof architecture).toBe("string");
    });

    it("should design API", async () => {
      const requirements = "ユーザー管理API";
      const api = await techTools.designAPI(requirements);
      expect(api).toBeDefined();
      expect(typeof api).toBe("string");
    });

    it("should design database", async () => {
      const requirements = "ユーザーと投稿のデータ";
      const db = await techTools.designDatabase(requirements);
      expect(db).toBeDefined();
      expect(typeof db).toBe("string");
    });
  });

  describe("Creative Tools", () => {
    it("should generate story", async () => {
      const prompt = "未来の世界";
      const story = await creativeTools.generateStory(prompt, "fiction");
      expect(story).toBeDefined();
      expect(typeof story).toBe("string");
      expect(story.length).toBeGreaterThan(100);
    });

    it("should generate poetry", async () => {
      const theme = "春";
      const poetry = await creativeTools.generatePoetry(theme, "modern");
      expect(poetry).toBeDefined();
      expect(typeof poetry).toBe("string");
    });

    it("should generate lyrics", async () => {
      const topic = "愛";
      const lyrics = await creativeTools.generateLyrics(topic, "pop");
      expect(lyrics).toBeDefined();
      expect(typeof lyrics).toBe("string");
    });

    it("should generate humor", async () => {
      const topic = "プログラミング";
      const humor = await creativeTools.generateHumor(topic, "general");
      expect(humor).toBeDefined();
      expect(typeof humor).toBe("string");
    });
  });

  describe("Conversation History", () => {
    it("should maintain conversation history", async () => {
      agent.getHistory(); // Initialize
      expect(agent.getHistory()).toHaveLength(0);

      // Simulate adding messages
      const history = agent.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it("should clear history", () => {
      agent.clearHistory();
      expect(agent.getHistory()).toHaveLength(0);
    });
  });

  describe("Agent Execution", () => {
    it("should execute simple task", async () => {
      const result = await agent.execute("こんにちは");
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.output).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      expect(Array.isArray(result.steps)).toBe(true);
    });

    it("should handle text generation request", async () => {
      const result = await agent.execute("短い詩を生成してください");
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it("should track execution time", async () => {
      const result = await agent.execute("テキストを生成してください");
      expect(result.executionTime).toBeGreaterThan(0);
      expect(typeof result.executionTime).toBe("number");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid input gracefully", async () => {
      const result = await agent.execute("");
      expect(result).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it("should return error information", async () => {
      // Test with a request that might fail
      const result = await agent.execute("test");
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });
  });
});

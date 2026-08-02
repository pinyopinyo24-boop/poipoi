import { describe, it, expect, beforeEach, vi } from "vitest";
import { ApplicationEngine } from "./ApplicationEngine";
import { SecurityEngine } from "../security/SecurityEngine";
import { MemoryEngine } from "../memory/MemoryEngine";
import { KnowledgeEngine } from "../knowledge/KnowledgeEngine";
import { SelfDiagnoseEngine, HealthStatus } from "../diagnose/SelfDiagnoseEngine";
import { SelfLearningEngine } from "../learning/SelfLearningEngine";

// Mock dependencies

vi.mock("../memory/MemoryEngine", () => {
  const mockMemoryEngineInstance = {
    clearUserMemory: vi.fn(),
    getMemoryUsage: vi.fn(() => 5),
  };
  return {
    MemoryEngine: {
      getInstance: vi.fn(() => mockMemoryEngineInstance),
    },
  };
});
vi.mock("../knowledge/KnowledgeEngine", () => {
  const mockKnowledgeEngineInstance = {
    initialize: vi.fn(),
    getAllKnowledge: vi.fn(),
  };
  return {
    KnowledgeEngine: {
      getInstance: vi.fn(() => mockKnowledgeEngineInstance),
    },
  };
});
vi.mock("../diagnose/SelfDiagnoseEngine", async (importOriginal) => {
  const actual = await importOriginal() as typeof import("../diagnose/SelfDiagnoseEngine");
  const mockSelfDiagnoseEngineInstance = {
    runFullDiagnosis: vi.fn(),
  };
  return {
    ...actual,
    SelfDiagnoseEngine: {
      getInstance: vi.fn(() => mockSelfDiagnoseEngineInstance),
    },
  };
});
vi.mock("../learning/SelfLearningEngine", () => {
  const mockSelfLearningEngineInstance = {
    getAllLearningCycles: vi.fn(),
  };
  return {
    SelfLearningEngine: {
      getInstance: vi.fn(() => mockSelfLearningEngineInstance),
    },
  };
});

// SecurityEngineのモックをファイルのトップレベルに移動
const mockSecurityEngineInstance = {
  initialize: vi.fn(),
  createContext: vi.fn(),
  checkAuthorization: vi.fn(),
  logSecurityEvent: vi.fn(),
  isReady: vi.fn(),
};

vi.mock("../security/SecurityEngine", () => ({
  SecurityEngine: vi.fn(() => mockSecurityEngineInstance),
}));

describe("ApplicationEngine", () => {
  let applicationEngine: ApplicationEngine;
  let securityEngineMock: any;
  let memoryEngineMock: any;
  let knowledgeEngineMock: any;
  let selfDiagnoseEngineMock: any;
  let selfLearningEngineMock: any;

  const mockUserId = "testUser123";

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Setup mock instances
    // SecurityEngineのモックをリセット
    mockSecurityEngineInstance.initialize.mockResolvedValue(undefined);
    mockSecurityEngineInstance.createContext.mockResolvedValue({ userId: mockUserId, role: "user", permissions: new Set() });
    mockSecurityEngineInstance.checkAuthorization.mockResolvedValue(true);
    mockSecurityEngineInstance.logSecurityEvent.mockResolvedValue(undefined);
    mockSecurityEngineInstance.isReady.mockReturnValue(true);

    securityEngineMock = mockSecurityEngineInstance;
    memoryEngineMock = MemoryEngine.getInstance();
    knowledgeEngineMock = KnowledgeEngine.getInstance();
    selfDiagnoseEngineMock = SelfDiagnoseEngine.getInstance();
    selfLearningEngineMock = SelfLearningEngine.getInstance();

    // Mock getInstance to return our specific mock objects

    
    
    



    // Mock MemoryEngine methods
    

    // Mock KnowledgeEngine methods
    knowledgeEngineMock.getAllKnowledge.mockResolvedValue([
      { id: "k1", title: "Knowledge 1", content: "Content 1", category: "Cat1", tags: [], source: "test", confidence: 1, version: 1, createdAt: 0, updatedAt: 0, createdBy: mockUserId, relatedKnowledgeIds: [], metadata: {}, isActive: true },
      { id: "k2", title: "Knowledge 2", content: "Content 2", category: "Cat2", tags: [], source: "test", confidence: 1, version: 1, createdAt: 0, updatedAt: 0, createdBy: mockUserId, relatedKnowledgeIds: [], metadata: {}, isActive: true },
    ]);

    // Mock SelfDiagnoseEngine methods
    selfDiagnoseEngineMock.runFullDiagnosis.mockResolvedValue({
      id: "diag1",
      timestamp: Date.now(),
      status: HealthStatus.HEALTHY,
      components: [],
      issues: [],
      recommendations: [],
      overallScore: 100,
    });

    // Mock SelfLearningEngine methods
    selfLearningEngineMock.getAllLearningCycles.mockResolvedValue([
      { id: "cycle1", userId: mockUserId, startTime: Date.now(), status: "COMPLETED", dataPoints: [], patterns: [], improvements: [] },
    ]);

    // Re-instantiate ApplicationEngine to use fresh mocks
    applicationEngine = ApplicationEngine.getInstance();
  });

  it("should be a singleton", () => {
    const instance1 = ApplicationEngine.getInstance();
    const instance2 = ApplicationEngine.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("should initialize application for a user", async () => {
    await applicationEngine.initializeApplication(mockUserId);

    expect(securityEngineMock.createContext).toHaveBeenCalledWith(mockUserId, "user");
    expect(memoryEngineMock.clearUserMemory).toHaveBeenCalledWith(mockUserId);
    expect(securityEngineMock.logSecurityEvent).toHaveBeenCalledWith("CONTEXT_CREATED", mockUserId, expect.any(Object));
    // Ensure SecurityEngine is initialized
    expect(securityEngineMock.initialize).toHaveBeenCalled();
  });

  it("should get application status for a user", async () => {
    const status = await applicationEngine.getApplicationStatus(mockUserId);

    expect(securityEngineMock.checkAuthorization).toHaveBeenCalledWith(mockUserId, "app:read");
    expect(memoryEngineMock.getMemoryUsage).toHaveBeenCalledWith(mockUserId);
    expect(knowledgeEngineMock.getAllKnowledge).toHaveBeenCalledWith(mockUserId);
    expect(selfDiagnoseEngineMock.runFullDiagnosis).toHaveBeenCalledWith(mockUserId);
    expect(selfLearningEngineMock.getAllLearningCycles).toHaveBeenCalledWith(mockUserId);

    expect(status).toHaveProperty("userId", mockUserId);
    expect(status).toHaveProperty("securityStatus", true);
    expect(status).toHaveProperty("memoryUsage", 5);
    expect(status).toHaveProperty("knowledgeCount", 2);
    expect(status).toHaveProperty("diagnoseStatus", HealthStatus.HEALTHY);
    expect(status).toHaveProperty("learningStatus", "COMPLETED");
    expect(status).toHaveProperty("timestamp");
  });

  it("should shutdown application for a user", async () => {
    await applicationEngine.shutdownApplication(mockUserId);

    expect(securityEngineMock.logSecurityEvent).toHaveBeenCalledWith("APPLICATION_SHUTDOWN", mockUserId, { message: "User session cleared implicitly" });
    expect(memoryEngineMock.clearUserMemory).toHaveBeenCalledWith(mockUserId);
  });

  it("should throw error if user has no permission to initialize application", async () => {
    securityEngineMock.createContext.mockRejectedValue(new Error("Permission denied"));
    securityEngineMock.initialize.mockResolvedValue(undefined);
    await expect(applicationEngine.initializeApplication(mockUserId)).rejects.toThrow("Permission denied");
  });

  it("should throw error if user has no permission to get application status", async () => {
    securityEngineMock.checkAuthorization.mockResolvedValue(false);
    await expect(applicationEngine.getApplicationStatus(mockUserId)).rejects.toThrow("User does not have permission to read application status");
  });

  it("should handle no learning cycles gracefully", async () => {
    selfLearningEngineMock.getAllLearningCycles.mockResolvedValue([]);
    const status = await applicationEngine.getApplicationStatus(mockUserId);
    expect(status).toHaveProperty("learningStatus", "no_cycles");
  });

  it("should handle different diagnose statuses", async () => {
    selfDiagnoseEngineMock.runFullDiagnosis.mockResolvedValue({
      id: "diag2",
      timestamp: Date.now(),
      status: HealthStatus.CRITICAL,
      components: [],
      issues: [],
      recommendations: [],
      overallScore: 0,
    });
    const status = await applicationEngine.getApplicationStatus(mockUserId);
    expect(status).toHaveProperty("diagnoseStatus", HealthStatus.CRITICAL);
  });
});

import { router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure } from "./_core/trpc";
import { localAuthRouter } from "./_core/localAuthRouter";
import { getAgent } from "./_core/agent";
import { advancedRouter } from "./routers.advanced";
import { advancedFeaturesRouter } from './routers.advanced-features';
import { previewRouter } from './routers.preview';
import { documentRouter } from "./routers.documents";
import { aiAssistantRouter } from "./routers.aiassistant";
import { performanceRouter } from "./routers.performance";
import { streamingRouter } from "./routers.streaming";
import { apiDocsRouter } from "./routers.apidocs";
import { feedbackRouter } from "./routers.feedback";
import { exportRouter } from "./routers.export";
import { faceSwapRouter } from "./routers.faceswap";
import { faceSwapAutoSaveRouter } from "./routers.faceswap-autosave";
import { videoFaceProcessingRouter } from "./routers.video-face-processing";
import { fileUploadRouter } from "./routers.file-upload";
import { faceSwapHQRouter } from "./routers.faceswap-hq";
import { facefusionV3Router } from "./routers.facefusion-v3";
import { facefusionHybridRouter } from "./routers.facefusion-hybrid";
import { colabIntegrationRouter } from "./routers.colab-integration";
import { selfEvolutionRouter } from "./routers/self-evolution";
import { autoProgramGenerationRouter } from "./routers/auto-program-generation";
import { chatRouter } from "./routers.chat";
import { aiAgentsRouter } from "./routers/aiAgents";
import { executionLogsRouter } from "./routers/executionLogs";
import { agentMemoryRouter } from "./routers/agentMemory";
import { commanderRouter } from "./routers/commander";
import { improvementRouter } from "./routers/improvement";
import { productionRouter } from "./routers/production";
import { hybridRouter } from "./routers/hybrid";
import { syncRouter } from "./routers/sync";
import { z } from "zod";

export const appRouter = router({
  executionLogs: executionLogsRouter,
  system: systemRouter,
  auth: router(localAuthRouter),
  advanced: advancedRouter,
  advancedFeatures: advancedFeaturesRouter,
  preview: previewRouter,
  documents: documentRouter,
  aiAssistant: aiAssistantRouter,
  performance: performanceRouter,
  streaming: streamingRouter,
  apiDocs: apiDocsRouter,
  feedback: feedbackRouter,
  export: exportRouter,
  faceswapGallery: router(faceSwapRouter),
  faceswapAutoSave: faceSwapAutoSaveRouter,
  videoFaceProcessing: videoFaceProcessingRouter,
  fileUpload: fileUploadRouter,
  faceswapHQ: faceSwapHQRouter,
  facefusionV3: facefusionV3Router,
  facefusionHybrid: facefusionHybridRouter,
  colabIntegration: colabIntegrationRouter,
  evolution: selfEvolutionRouter,
  autoProgramGeneration: autoProgramGenerationRouter,
  chat: chatRouter,
  aiAgents: aiAgentsRouter,
  agentMemory: agentMemoryRouter,
  commander: commanderRouter,
  improvement: improvementRouter,
  production: productionRouter,
  hybrid: hybridRouter,
  sync: syncRouter,
  
  clearHistory: protectedProcedure
    .mutation(async () => {
      const agent = getAgent();
      agent.clearHistory();
      return { success: true };
    }),
});

export type AppRouter = typeof appRouter;

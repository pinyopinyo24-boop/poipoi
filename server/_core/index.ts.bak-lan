import 'dotenv/config';
import express from "express";
import { createServer } from "http";
import net from "net";
import { timingSafeEqual } from "crypto";
import { createReadStream, existsSync } from "fs";
import path from "path";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { HeartbeatConnector } from "../core/HeartbeatConnector";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { StartupOptimizationService } from "../managers/StartupOptimizationService";

const startupOptimizationService = new StartupOptimizationService();
const runtimeRequestMetrics = { total: 0, failed: 0, durationMsTotal: 0 };

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  // Support PORT environment variable for external hosting (Render, Railway)
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
  if (envPort && !isNaN(envPort)) {
    return envPort;
  }
  
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const startupStartedAt = Date.now();
  const app = express();
  const server = createServer(app);
  
  // Set socket timeout to 10 minutes for long-running requests
  server.setTimeout(600000); // 10 minutes
  
  // CORS configuration for mobile and cross-origin requests
  app.use(cors({
    origin: '*', // Allow all origins for mobile app
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  }));
  
  // Face-swap JSON requests allow at most a 128MB video plus a 20MB image (base64 encoded).
  app.use(express.json({ limit: "220mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.use((req, res, next) => {
    const requestStartedAt = Date.now();
    res.once('finish', () => {
      runtimeRequestMetrics.total += 1;
      runtimeRequestMetrics.durationMsTotal += Date.now() - requestStartedAt;
      if (res.statusCode >= 500) runtimeRequestMetrics.failed += 1;
    });
    next();
  });
  
  // Serve upload directory for testing
  app.use('/upload', express.static(path.resolve(process.cwd(), 'uploads')));
  
  // Local process health; deliberately does not claim DB or external-service availability.
  const reportHealth = (_req: any, res: any) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      startupDurationMs: serverReadyAt === null ? null : serverReadyAt - startupStartedAt,
      startupMetrics: startupOptimizationService.getAllStartupMetrics(),
      runtime: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryBytes: process.memoryUsage(),
        requests: { ...runtimeRequestMetrics, averageDurationMs: runtimeRequestMetrics.total ? Math.round(runtimeRequestMetrics.durationMsTotal / runtimeRequestMetrics.total) : 0 },
      },
    });
  };
  app.get('/health', reportHealth);
  app.get('/api/health', reportHealth);
  
  // Test video endpoint for development
  app.get('/api/test-video', (req: any, res: any) => {
    const videoPath = '/tmp/test_video_large.mp4';
    
    if (!existsSync(videoPath)) {
      res.status(404).json({ error: 'Video file not found' });
      return;
    }
    
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'inline; filename="test_video.mp4"');
    
    const stream = createReadStream(videoPath);
    stream.pipe(res);
  });
  
  // Heartbeat self-evolution callback
  app.post("/api/scheduled/self-evolution", async (req, res) => {
    const expectedSecret = process.env.HEARTBEAT_CALLBACK_SECRET;
    const providedSecret = req.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!expectedSecret || Buffer.byteLength(expectedSecret) < 32) {
      res.status(503).json({ error: "Heartbeat callback is not configured" });
      return;
    }
    const expected = Buffer.from(expectedSecret);
    const provided = Buffer.from(providedSecret);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const result = await HeartbeatConnector.getInstance().onHeartbeatCallback("system");
      res.json(result);
    } catch (error) {
      console.error("[Heartbeat] self-evolution callback error:", error);
      res.status(500).json({ error: "Self-evolution callback failed" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        console.error(`[tRPC Error] ${path}:`, error);
      },
    })
  );
  startupOptimizationService.recordStartupMetric('initialization', Date.now() - startupStartedAt);

  // development mode uses Vite, production mode uses static files
  const resourceLoadingStartedAt = Date.now();
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  startupOptimizationService.recordStartupMetric('resource_loading', Date.now() - resourceLoadingStartedAt);
  const port = await findAvailablePort();
  const listenStartedAt = Date.now();
  server.listen(port, () => {
    serverReadyAt = Date.now();
    startupOptimizationService.recordStartupMetric('api_connection', serverReadyAt - listenStartedAt);
    console.log(`Server running on http://localhost:${port}/`);
  });
}

let serverReadyAt: number | null = null;

startServer().catch(console.error);

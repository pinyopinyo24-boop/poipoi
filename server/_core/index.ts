<<<<<<< HEAD
import "dotenv/config";
=======
import 'dotenv/config';
>>>>>>> phase13-18
import express from "express";
import { createServer } from "http";
import net from "net";
import { createReadStream, existsSync } from "fs";
<<<<<<< HEAD
=======
import cors from "cors";
>>>>>>> phase13-18
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

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
<<<<<<< HEAD
=======
  // Support PORT environment variable for external hosting (Render, Railway)
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
  if (envPort && !isNaN(envPort)) {
    return envPort;
  }
  
>>>>>>> phase13-18
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Set socket timeout to 10 minutes for long-running requests
  server.setTimeout(600000); // 10 minutes
  
<<<<<<< HEAD
=======
  // CORS configuration for mobile and cross-origin requests
  app.use(cors({
    origin: '*', // Allow all origins for mobile app
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  }));
  
>>>>>>> phase13-18
  // Configure body parser with larger size limit for file uploads (500MB for video processing)
  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ limit: "500mb", extended: true }));
  
  // Debug middleware to log request body
  app.use((req, res, next) => {
    if (req.path === '/api/trpc/fileUpload.swap') {
      console.log('[DEBUG] Request body type:', typeof req.body);
      console.log('[DEBUG] Request body keys:', Object.keys(req.body || {}));
      console.log('[DEBUG] Request body:', JSON.stringify(req.body).substring(0, 200));
    }
    next();
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
<<<<<<< HEAD
    // Health check API
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "Poipoi",
      timestamp: new Date().toISOString(),
    });
  });
  // Serve upload directory for testing
  app.use('/upload', express.static('/home/ubuntu/upload'));
  
=======
  
  // Serve upload directory for testing
  app.use('/upload', express.static('/home/ubuntu/upload'));
  
  // Health check endpoint
  app.get('/health', (req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
>>>>>>> phase13-18
  // Serve test HTML files
  app.use(express.static('/home/ubuntu/poipoi/client/public'));
  
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
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = await findAvailablePort();
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);


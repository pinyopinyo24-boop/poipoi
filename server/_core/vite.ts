<<<<<<< HEAD
import path from "path";
import fs from "fs";
import express from "express";
import type { Express } from "express";

export function serveStatic(app: Express) {
  const distPath = path.resolve(
    process.cwd(),
    "dist",
    "public"
  );

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}`
=======
import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
>>>>>>> phase13-18
    );
  }

  app.use(express.static(distPath));

<<<<<<< HEAD
=======
  // fall through to index.html if the file doesn't exist
>>>>>>> phase13-18
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
<<<<<<< HEAD

export async function setupVite(app: Express, server: any) {
  try {
    const vite = await import("vite");
    const createViteServer = vite.createServer;
    
    const viteServer = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(viteServer.middlewares);

    app.use("*", (req: any, res: any) => {
      const url = req.originalUrl;
      
      const html = `
        <!DOCTYPE html>
        <html lang="ja">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>PoiPoi</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/client/src/main.tsx"></script>
          </body>
        </html>
      `;

      viteServer
        .transformIndexHtml(url, html)
        .then((transformedHtml: string) => {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(transformedHtml);
        })
        .catch((err: any) => {
          console.error("[Vite] Transform error:", err);
          res.status(500).end("Internal Server Error");
        });
    });

    console.log("[Vite] Development server middleware initialized");
  } catch (error) {
    console.error("[Vite] Setup failed, falling back to static serving:", error);
    serveStatic(app);
  }
}
=======
>>>>>>> phase13-18

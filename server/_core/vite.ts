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
    );
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

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

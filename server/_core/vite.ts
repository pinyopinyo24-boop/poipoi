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


export async function setupVite(app:any, server:any) {
  console.log("Vite setup skipped");
}
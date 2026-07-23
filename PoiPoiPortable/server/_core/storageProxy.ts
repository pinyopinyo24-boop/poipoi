import type { Express } from "express";

/**
 * Storage proxy - Manus Forge API dependency removed
 * For local development, this is a stub implementation
 * For production, implement your own storage backend proxy
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // Local stub implementation
    console.warn("[StorageProxy] Storage proxy not configured for local auth. Key:", key);
    res.status(501).send("Storage proxy not implemented in local mode");
  });

  // Also register /storage/* for local storage
  app.get("/storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    console.warn("[StorageProxy] Local storage not implemented. Key:", key);
    res.status(501).send("Local storage not implemented");
  });
}

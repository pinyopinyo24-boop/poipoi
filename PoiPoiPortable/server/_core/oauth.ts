import type { Express } from "express";

/**
 * OAuth routes have been removed - using local authentication only
 * This function is kept for compatibility but does nothing
 */
export function registerOAuthRoutes(app: Express) {
  // OAuth routes removed - local authentication handles all auth flows
}

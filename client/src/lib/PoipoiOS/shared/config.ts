/**
 * PoipoiOS Shared Config
 * 共通設定
 */

export const config = {
  // System
  system: {
    name: "PoiPoi OS",
    version: "1.0.0",
    platform: "web",
    debug: false,
  },

  // Performance
  performance: {
    maxLogs: 1000,
    maxMemory: 1000000000,
    requestTimeout: 30000,
    cacheExpiry: 3600000,
  },

  // Features
  features: {
    enableLogging: true,
    enableMonitoring: true,
    enableAutoBackup: true,
    enableAutoUpdate: true,
  },

  // API
  api: {
    baseUrl: process.env.VITE_API_URL || "http://localhost:3000",
    timeout: 30000,
    retries: 3,
  },

  // UI
  ui: {
    theme: "dark",
    language: "ja",
    animationsEnabled: true,
  },
};

export default config;

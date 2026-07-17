/**
 * PoipoiOS Shared Constants
 * 共通定数
 */

export const POIPOI_VERSION = "1.0.0";
export const POIPOI_NAME = "PoiPoi OS";
export const POIPOI_PLATFORM = "web";

export const AGENT_TYPES = {
  MANAGER: "manager",
  CODING: "coding",
  PRODUCTION: "production",
  ANALYSIS: "analysis",
  VISION: "vision",
  VOICE: "voice",
};

export const ENGINE_STATUS = {
  IDLE: "idle",
  RUNNING: "running",
  ERROR: "error",
};

export const TASK_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
};

export const LOG_LEVELS = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
};

export const MAX_LOGS = 1000;
export const MAX_MEMORY = 1000000000; // 1GB
export const REQUEST_TIMEOUT = 30000; // 30s

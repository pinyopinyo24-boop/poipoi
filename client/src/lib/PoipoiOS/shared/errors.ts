/**
 * PoipoiOS Shared Errors
 * 共通エラー定義
 */

export class PoipoiError extends Error {
  constructor(message: string, public code: string = "UNKNOWN_ERROR") {
    super(message);
    this.name = "PoipoiError";
  }
}

export class KernelError extends PoipoiError {
  constructor(message: string) {
    super(message, "KERNEL_ERROR");
    this.name = "KernelError";
  }
}

export class EngineError extends PoipoiError {
  constructor(message: string) {
    super(message, "ENGINE_ERROR");
    this.name = "EngineError";
  }
}

export class AgentError extends PoipoiError {
  constructor(message: string) {
    super(message, "AGENT_ERROR");
    this.name = "AgentError";
  }
}

export class ValidationError extends PoipoiError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class TimeoutError extends PoipoiError {
  constructor(message: string) {
    super(message, "TIMEOUT_ERROR");
    this.name = "TimeoutError";
  }
}

export class ResourceError extends PoipoiError {
  constructor(message: string) {
    super(message, "RESOURCE_ERROR");
    this.name = "ResourceError";
  }
}

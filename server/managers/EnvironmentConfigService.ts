/**
 * EnvironmentConfigService - 環境設定管理
 * 
 * 機能:
 * - 環境設定管理 (Development / Staging / Production)
 * - 設定値管理
 * - 環境別設定
 */

export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  environment: Environment;
  apiUrl: string;
  databaseUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxConnections: number;
  timeout: number;
  retryAttempts: number;
  enableCache: boolean;
  cacheTTL: number;
  enableMetrics: boolean;
  enableAudit: boolean;
  securityLevel: 'low' | 'medium' | 'high';
  customSettings: Record<string, string | number | boolean>;
}

export class EnvironmentConfigService {
  private static instance: EnvironmentConfigService;
  private configs: Map<Environment, EnvironmentConfig> = new Map();

  private constructor() {
    this.initializeDefaultConfigs();
  }

  static getInstance(): EnvironmentConfigService {
    if (!EnvironmentConfigService.instance) {
      EnvironmentConfigService.instance = new EnvironmentConfigService();
    }
    return EnvironmentConfigService.instance;
  }

  /**
   * デフォルト設定初期化
   */
  private initializeDefaultConfigs(): void {
    // Development環境
    this.configs.set('development', {
      environment: 'development',
      apiUrl: 'http://localhost:3000',
      databaseUrl: 'mysql://localhost:3306/poipoi_dev',
      logLevel: 'debug',
      maxConnections: 10,
      timeout: 30000,
      retryAttempts: 3,
      enableCache: false,
      cacheTTL: 300,
      enableMetrics: true,
      enableAudit: false,
      securityLevel: 'low',
      customSettings: {},
    });

    // Staging環境
    this.configs.set('staging', {
      environment: 'staging',
      apiUrl: 'https://staging.poipoi.com',
      databaseUrl: 'mysql://staging-db:3306/poipoi_staging',
      logLevel: 'info',
      maxConnections: 50,
      timeout: 60000,
      retryAttempts: 5,
      enableCache: true,
      cacheTTL: 600,
      enableMetrics: true,
      enableAudit: true,
      securityLevel: 'medium',
      customSettings: {},
    });

    // Production環境
    this.configs.set('production', {
      environment: 'production',
      apiUrl: 'https://api.poipoi.com',
      databaseUrl: 'mysql://prod-db:3306/poipoi_prod',
      logLevel: 'warn',
      maxConnections: 200,
      timeout: 120000,
      retryAttempts: 10,
      enableCache: true,
      cacheTTL: 3600,
      enableMetrics: true,
      enableAudit: true,
      securityLevel: 'high',
      customSettings: {},
    });
  }

  /**
   * 環境設定取得
   */
  getConfig(environment: Environment): EnvironmentConfig | null {
    return this.configs.get(environment) || null;
  }

  /**
   * すべての環境設定取得
   */
  getAllConfigs(): EnvironmentConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * 環境設定更新
   */
  updateConfig(environment: Environment, config: Partial<EnvironmentConfig>): EnvironmentConfig | null {
    const existing = this.configs.get(environment);
    if (!existing) return null;

    const updated: EnvironmentConfig = {
      ...existing,
      ...config,
      environment, // 環境は変更不可
    };

    this.configs.set(environment, updated);
    return updated;
  }

  /**
   * カスタム設定値設定
   */
  setCustomSetting(environment: Environment, key: string, value: string | number | boolean): void {
    const config = this.configs.get(environment);
    if (config) {
      config.customSettings[key] = value;
    }
  }

  /**
   * カスタム設定値取得
   */
  getCustomSetting(environment: Environment, key: string): string | number | boolean | undefined {
    const config = this.configs.get(environment);
    return config?.customSettings[key];
  }

  /**
   * 環境検証
   */
  validateConfig(environment: Environment): { valid: boolean; errors: string[] } {
    const config = this.configs.get(environment);
    const errors: string[] = [];

    if (!config) {
      errors.push(`Environment ${environment} not found`);
      return { valid: false, errors };
    }

    if (!config.apiUrl) errors.push('API URL is required');
    if (!config.databaseUrl) errors.push('Database URL is required');
    if (config.maxConnections < 1) errors.push('Max connections must be at least 1');
    if (config.timeout < 1000) errors.push('Timeout must be at least 1000ms');
    if (config.retryAttempts < 0) errors.push('Retry attempts must be non-negative');
    if (config.cacheTTL < 0) errors.push('Cache TTL must be non-negative');

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 設定リセット
   */
  resetToDefaults(environment: Environment): void {
    this.configs.delete(environment);
    this.initializeDefaultConfigs();
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.configs.clear();
  }
}

export const environmentConfigService = EnvironmentConfigService.getInstance();
export default environmentConfigService;

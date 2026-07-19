/**
 * Deployment Configuration
 * クラウド稼働用デプロイメント設定
 */

export interface DeploymentEnvironment {
  env: 'development' | 'staging' | 'production';
  port: number;
  host: string;
  apiUrl: string;
  databaseUrl: string;
  jwtSecret: string;
  corsOrigins: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxConnections: number;
  requestTimeout: number;
  enableMetrics: boolean;
  enableHealthCheck: boolean;
}

export interface DatabaseConfig {
  type: 'mysql' | 'sqlite' | 'postgresql';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  maxConnections: number;
  connectionTimeout: number;
  acquireTimeout: number;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  passwordHashRounds: number;
  enableSSL: boolean;
  enableCORS: boolean;
  corsOrigins: string[];
  enableRateLimit: boolean;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export interface MonitoringConfig {
  enableMetrics: boolean;
  enableTracing: boolean;
  enableLogging: boolean;
  metricsPort: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFormat: 'json' | 'text';
  logPath: string;
  retentionDays: number;
}

export interface CacheConfig {
  enabled: boolean;
  type: 'memory' | 'redis';
  ttl: number;
  maxSize: number;
}

/**
 * Deployment Configuration Manager
 */
export class DeploymentConfigManager {
  private environment: DeploymentEnvironment;
  private databaseConfig: DatabaseConfig;
  private securityConfig: SecurityConfig;
  private monitoringConfig: MonitoringConfig;
  private cacheConfig: CacheConfig;

  constructor(env: string = process.env.NODE_ENV || 'development') {
    this.environment = this.loadEnvironmentConfig(env);
    this.databaseConfig = this.loadDatabaseConfig();
    this.securityConfig = this.loadSecurityConfig();
    this.monitoringConfig = this.loadMonitoringConfig();
    this.cacheConfig = this.loadCacheConfig();
  }

  /**
   * 環境設定を読み込む
   */
  private loadEnvironmentConfig(env: string): DeploymentEnvironment {
    const envType = env as 'development' | 'staging' | 'production';
    
    const configs: Record<string, DeploymentEnvironment> = {
      development: {
        env: 'development',
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || 'localhost',
        apiUrl: process.env.API_URL || 'http://localhost:3000',
        databaseUrl: process.env.DATABASE_URL || 'sqlite:./poipoi.db',
        jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
        corsOrigins: ['http://localhost:3000', 'http://localhost:5173'],
        logLevel: 'debug',
        maxConnections: 10,
        requestTimeout: 30000,
        enableMetrics: true,
        enableHealthCheck: true,
      },
      staging: {
        env: 'staging',
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || '0.0.0.0',
        apiUrl: process.env.API_URL || 'https://staging.poipoi.com',
        databaseUrl: process.env.DATABASE_URL || '',
        jwtSecret: process.env.JWT_SECRET || '',
        corsOrigins: ['https://staging.poipoi.com'],
        logLevel: 'info',
        maxConnections: 50,
        requestTimeout: 30000,
        enableMetrics: true,
        enableHealthCheck: true,
      },
      production: {
        env: 'production',
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || '0.0.0.0',
        apiUrl: process.env.API_URL || 'https://poipoi.com',
        databaseUrl: process.env.DATABASE_URL || '',
        jwtSecret: process.env.JWT_SECRET || '',
        corsOrigins: ['https://poipoi.com'],
        logLevel: 'warn',
        maxConnections: 100,
        requestTimeout: 30000,
        enableMetrics: true,
        enableHealthCheck: true,
      },
    };

    return configs[envType] || configs.development;
  }

  /**
   * データベース設定を読み込む
   */
  private loadDatabaseConfig(): DatabaseConfig {
    return {
      type: (process.env.DB_TYPE as 'mysql' | 'sqlite' | 'postgresql') || 'sqlite',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'poipoi',
      synchronize: this.environment.env === 'development',
      logging: this.environment.env === 'development',
      maxConnections: this.environment.maxConnections,
      connectionTimeout: 5000,
      acquireTimeout: 5000,
    };
  }

  /**
   * セキュリティ設定を読み込む
   */
  private loadSecurityConfig(): SecurityConfig {
    return {
      jwtSecret: this.environment.jwtSecret,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      passwordHashRounds: parseInt(process.env.PASSWORD_HASH_ROUNDS || '10'),
      enableSSL: this.environment.env === 'production',
      enableCORS: true,
      corsOrigins: this.environment.corsOrigins,
      enableRateLimit: this.environment.env === 'production',
      rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
      rateLimitMaxRequests: 100,
    };
  }

  /**
   * モニタリング設定を読み込む
   */
  private loadMonitoringConfig(): MonitoringConfig {
    return {
      enableMetrics: this.environment.enableMetrics,
      enableTracing: this.environment.env !== 'development',
      enableLogging: true,
      metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
      logLevel: this.environment.logLevel,
      logFormat: this.environment.env === 'production' ? 'json' : 'text',
      logPath: process.env.LOG_PATH || './logs',
      retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '30'),
    };
  }

  /**
   * キャッシュ設定を読み込む
   */
  private loadCacheConfig(): CacheConfig {
    return {
      enabled: process.env.CACHE_ENABLED !== 'false',
      type: (process.env.CACHE_TYPE as 'memory' | 'redis') || 'memory',
      ttl: parseInt(process.env.CACHE_TTL || '3600'),
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
    };
  }

  /**
   * 環境設定を取得
   */
  getEnvironment(): DeploymentEnvironment {
    return this.environment;
  }

  /**
   * データベース設定を取得
   */
  getDatabaseConfig(): DatabaseConfig {
    return this.databaseConfig;
  }

  /**
   * セキュリティ設定を取得
   */
  getSecurityConfig(): SecurityConfig {
    return this.securityConfig;
  }

  /**
   * モニタリング設定を取得
   */
  getMonitoringConfig(): MonitoringConfig {
    return this.monitoringConfig;
  }

  /**
   * キャッシュ設定を取得
   */
  getCacheConfig(): CacheConfig {
    return this.cacheConfig;
  }

  /**
   * 設定を検証
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // JWT Secret validation
    if (!this.securityConfig.jwtSecret || this.securityConfig.jwtSecret === 'dev-secret-key') {
      if (this.environment.env === 'production') {
        errors.push('JWT_SECRET must be set in production');
      }
    }

    // Database URL validation
    if (!this.databaseConfig.host && this.databaseConfig.type !== 'sqlite') {
      errors.push('Database host must be configured');
    }

    // CORS origins validation
    if (this.environment.corsOrigins.length === 0) {
      errors.push('At least one CORS origin must be configured');
    }

    // Port validation
    if (this.environment.port < 1 || this.environment.port > 65535) {
      errors.push('Port must be between 1 and 65535');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 設定をログ出力
   */
  logConfig(): void {
    console.log('=== Deployment Configuration ===');
    console.log(`Environment: ${this.environment.env}`);
    console.log(`Port: ${this.environment.port}`);
    console.log(`Host: ${this.environment.host}`);
    console.log(`API URL: ${this.environment.apiUrl}`);
    console.log(`Database Type: ${this.databaseConfig.type}`);
    console.log(`Log Level: ${this.environment.logLevel}`);
    console.log(`Max Connections: ${this.environment.maxConnections}`);
    console.log(`Metrics Enabled: ${this.monitoringConfig.enableMetrics}`);
    console.log(`Health Check Enabled: ${this.environment.enableHealthCheck}`);
    console.log('================================');
  }
}

/**
 * グローバルデプロイメント設定インスタンス
 */
export const deploymentConfig = new DeploymentConfigManager();

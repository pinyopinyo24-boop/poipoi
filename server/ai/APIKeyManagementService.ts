/**
 * API Key Management Service
 * APIキー管理サービス
 */

export interface APIKeyRecord {
  id: string;
  provider: string;
  keyName: string;
  encryptedKey: string;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  isActive: boolean;
  lastUsed?: number;
  usageCount: number;
  rotationRequired: boolean;
}

export interface KeyRotationPolicy {
  provider: string;
  rotationIntervalDays: number;
  warningDaysBefore: number;
  autoRotate: boolean;
}

export interface KeyUsageMetrics {
  keyId: string;
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastUsed: number;
  averageResponseTime: number;
}

/**
 * Simple encryption/decryption (in production, use proper encryption library)
 */
class SimpleEncryption {
  private secret: string;

  constructor(secret: string = process.env.ENCRYPTION_SECRET || 'default-secret') {
    this.secret = secret;
  }

  encrypt(text: string): string {
    // Simple base64 encoding (NOT for production)
    return Buffer.from(text + ':' + this.secret).toString('base64');
  }

  decrypt(encrypted: string): string {
    try {
      const decrypted = Buffer.from(encrypted, 'base64').toString('utf-8');
      const [text] = decrypted.split(':');
      return text;
    } catch {
      throw new Error('Decryption failed');
    }
  }
}

/**
 * API Key Management Service
 */
export class APIKeyManagementService {
  private keys: Map<string, APIKeyRecord> = new Map();
  private rotationPolicies: Map<string, KeyRotationPolicy> = new Map();
  private usageMetrics: Map<string, KeyUsageMetrics> = new Map();
  private encryption: SimpleEncryption;
  private keyHistory: APIKeyRecord[] = [];

  constructor() {
    this.encryption = new SimpleEncryption();
    this.initializeDefaultPolicies();
  }

  /**
   * デフォルトローテーションポリシーを初期化
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: KeyRotationPolicy[] = [
      {
        provider: 'openai',
        rotationIntervalDays: 90,
        warningDaysBefore: 14,
        autoRotate: true,
      },
      {
        provider: 'claude',
        rotationIntervalDays: 90,
        warningDaysBefore: 14,
        autoRotate: true,
      },
      {
        provider: 'gemini',
        rotationIntervalDays: 90,
        warningDaysBefore: 14,
        autoRotate: true,
      },
      {
        provider: 'local',
        rotationIntervalDays: 180,
        warningDaysBefore: 30,
        autoRotate: false,
      },
    ];

    for (const policy of defaultPolicies) {
      this.rotationPolicies.set(policy.provider, policy);
    }
  }

  /**
   * APIキーを登録
   */
  registerKey(provider: string, keyName: string, apiKey: string, expiresAt?: number): APIKeyRecord {
    const record: APIKeyRecord = {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider,
      keyName,
      encryptedKey: this.encryption.encrypt(apiKey),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt,
      isActive: true,
      usageCount: 0,
      rotationRequired: false,
    };

    this.keys.set(record.id, record);
    this.keyHistory.push(record);

    // Initialize usage metrics
    this.usageMetrics.set(record.id, {
      keyId: record.id,
      provider,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastUsed: Date.now(),
      averageResponseTime: 0,
    });

    return record;
  }

  /**
   * APIキーを取得
   */
  getKey(keyId: string): string | null {
    const record = this.keys.get(keyId);
    if (!record || !record.isActive) {
      return null;
    }

    // Check expiration
    if (record.expiresAt && record.expiresAt < Date.now()) {
      record.isActive = false;
      return null;
    }

    return this.encryption.decrypt(record.encryptedKey);
  }

  /**
   * プロバイダーの有効なキーを取得
   */
  getActiveKeyForProvider(provider: string): APIKeyRecord | null {
    const keys = Array.from(this.keys.values()).filter(
      k => k.provider === provider && k.isActive && (!k.expiresAt || k.expiresAt > Date.now())
    );

    return keys.length > 0 ? keys[0] : null;
  }

  /**
   * キーを使用
   */
  recordKeyUsage(keyId: string, success: boolean, responseTime: number): void {
    const record = this.keys.get(keyId);
    if (record) {
      record.usageCount++;
      record.lastUsed = Date.now();
      record.updatedAt = Date.now();
    }

    const metrics = this.usageMetrics.get(keyId);
    if (metrics) {
      metrics.totalRequests++;
      if (success) {
        metrics.successfulRequests++;
      } else {
        metrics.failedRequests++;
      }
      metrics.lastUsed = Date.now();
      metrics.averageResponseTime =
        (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) /
        metrics.totalRequests;
    }
  }

  /**
   * キーを無効化
   */
  revokeKey(keyId: string): boolean {
    const record = this.keys.get(keyId);
    if (record) {
      record.isActive = false;
      record.updatedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * キーをローテーション
   */
  rotateKey(keyId: string, newApiKey: string): APIKeyRecord | null {
    const oldRecord = this.keys.get(keyId);
    if (!oldRecord) {
      return null;
    }

    // Revoke old key
    oldRecord.isActive = false;

    // Create new key
    const newRecord: APIKeyRecord = {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: oldRecord.provider,
      keyName: oldRecord.keyName,
      encryptedKey: this.encryption.encrypt(newApiKey),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: oldRecord.expiresAt,
      isActive: true,
      usageCount: 0,
      rotationRequired: false,
    };

    this.keys.set(newRecord.id, newRecord);
    this.keyHistory.push(newRecord);

    return newRecord;
  }

  /**
   * ローテーションポリシーを設定
   */
  setRotationPolicy(provider: string, policy: KeyRotationPolicy): void {
    this.rotationPolicies.set(provider, policy);
  }

  /**
   * ローテーションが必要なキーを取得
   */
  getKeysRequiringRotation(): APIKeyRecord[] {
    const keysToRotate: APIKeyRecord[] = [];

    const records = Array.from(this.keys.values());
    for (const record of records) {
      if (!record.isActive) continue;

      const policy = this.rotationPolicies.get(record.provider);
      if (!policy) continue;

      const ageInDays = (Date.now() - record.createdAt) / (1000 * 60 * 60 * 24);
      const rotationDue = ageInDays >= policy.rotationIntervalDays - policy.warningDaysBefore;

      if (rotationDue) {
        record.rotationRequired = true;
        keysToRotate.push(record);
      }
    }

    return keysToRotate;
  }

  /**
   * キーの使用メトリクスを取得
   */
  getKeyMetrics(keyId: string): KeyUsageMetrics | null {
    return this.usageMetrics.get(keyId) || null;
  }

  /**
   * プロバイダーの使用メトリクスを取得
   */
  getProviderMetrics(provider: string): KeyUsageMetrics[] {
    return Array.from(this.usageMetrics.values()).filter(m => m.provider === provider);
  }

  /**
   * すべてのメトリクスを取得
   */
  getAllMetrics(): KeyUsageMetrics[] {
    return Array.from(this.usageMetrics.values());
  }

  /**
   * キー履歴を取得
   */
  getKeyHistory(provider?: string): APIKeyRecord[] {
    return provider
      ? this.keyHistory.filter(k => k.provider === provider)
      : this.keyHistory;
  }

  /**
   * キーの統計情報を取得
   */
  getStatistics(): {
    totalKeys: number;
    activeKeys: number;
    revokedKeys: number;
    keysRequiringRotation: number;
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
  } {
    const allKeys = Array.from(this.keys.values());
    const activeKeys = allKeys.filter(k => k.isActive).length;
    const revokedKeys = allKeys.length - activeKeys;
    const rotationRequired = allKeys.filter(k => k.rotationRequired).length;

    const metrics = Array.from(this.usageMetrics.values());
    const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const successfulRequests = metrics.reduce((sum, m) => sum + m.successfulRequests, 0);
    const averageResponseTime =
      metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length
        : 0;

    return {
      totalKeys: allKeys.length,
      activeKeys,
      revokedKeys,
      keysRequiringRotation: rotationRequired,
      totalRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      averageResponseTime,
    };
  }

  /**
   * 期限切れキーをクリーンアップ
   */
  cleanupExpiredKeys(): number {
    let cleanedCount = 0;
    const now = Date.now();

    const entries = Array.from(this.keys.entries());
    for (const [keyId, record] of entries) {
      if (record.expiresAt && record.expiresAt < now) {
        this.keys.delete(keyId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * キーの検証
   */
  validateKey(keyId: string): { valid: boolean; reason?: string } {
    const record = this.keys.get(keyId);

    if (!record) {
      return { valid: false, reason: 'Key not found' };
    }

    if (!record.isActive) {
      return { valid: false, reason: 'Key is revoked' };
    }

    if (record.expiresAt && record.expiresAt < Date.now()) {
      return { valid: false, reason: 'Key has expired' };
    }

    return { valid: true };
  }

  /**
   * すべてのキーを取得
   */
  getAllKeys(): APIKeyRecord[] {
    return Array.from(this.keys.values());
  }

  /**
   * キーをプロバイダーで取得
   */
  getKeysByProvider(provider: string): APIKeyRecord[] {
    return Array.from(this.keys.values()).filter(k => k.provider === provider);
  }
}

/**
 * グローバルAPIキー管理サービスインスタンス
 */
export const apiKeyManagementService = new APIKeyManagementService();

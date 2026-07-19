/**
 * API Key Manager with AES Encryption and Permission Checks
 * AES暗号化と権限チェック付きAPIキー管理
 */

import crypto from 'crypto';

export type UserRole = 'admin' | 'manager' | 'user';

export interface APIKey {
  id: string;
  name: string;
  provider: string;
  encryptedValue: string;
  iv: string;
  salt: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  isActive: boolean;
  lastUsedAt?: number;
  usageCount: number;
  permissions: string[];
}

export interface KeyUsageLog {
  id: string;
  keyId: string;
  provider: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'use' | 'rotate';
  userId: string;
  timestamp: number;
  success: boolean;
  details?: string;
}

export interface KeyPermission {
  keyId: string;
  userId: string;
  role: UserRole;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canRotate: boolean;
  grantedAt: number;
}

/**
 * AES Encryption Helper
 */
class AESEncryption {
  private masterKey: Buffer;
  private algorithm = 'aes-256-cbc';

  constructor(masterKey?: string) {
    const key = masterKey || process.env.MASTER_ENCRYPTION_KEY || 'default-master-key-32-chars-long!';
    this.masterKey = crypto.scryptSync(key, 'salt', 32);
  }

  encrypt(plaintext: string): { encrypted: string; iv: string; salt: string } {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
    };
  }

  decrypt(encrypted: string, iv: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.masterKey,
      Buffer.from(iv, 'hex')
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

/**
 * API Key Manager
 */
export class APIKeyManager {
  private keys: Map<string, APIKey> = new Map();
  private usageLogs: KeyUsageLog[] = [];
  private permissions: Map<string, KeyPermission[]> = new Map();
  private encryption: AESEncryption;

  constructor(masterKey?: string) {
    this.encryption = new AESEncryption(masterKey);
  }

  /**
   * APIキーを作成
   */
  createKey(
    name: string,
    provider: string,
    value: string,
    userId: string,
    expiresAt?: number,
    permissions: string[] = []
  ): APIKey {
    // Check user permission
    if (!this.checkPermission(userId, 'create')) {
      throw new Error('Permission denied: Cannot create API key');
    }

    const { encrypted, iv, salt } = this.encryption.encrypt(value);

    const key: APIKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      provider,
      encryptedValue: encrypted,
      iv,
      salt,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt,
      isActive: true,
      usageCount: 0,
      permissions,
    };

    this.keys.set(key.id, key);
    this.logUsage(key.id, provider, 'create', userId, true, `Key created: ${name}`);

    return key;
  }

  /**
   * APIキーを取得
   */
  getKey(keyId: string, userId: string): string | null {
    const key = this.keys.get(keyId);

    if (!key) {
      this.logUsage(keyId, '', 'read', userId, false, 'Key not found');
      return null;
    }

    // Check permission
    if (!this.checkKeyPermission(keyId, userId, 'canRead')) {
      this.logUsage(keyId, key.provider, 'read', userId, false, 'Permission denied');
      return null;
    }

    // Check expiration
    if (key.expiresAt && key.expiresAt < Date.now()) {
      this.logUsage(keyId, key.provider, 'read', userId, false, 'Key expired');
      return null;
    }

    if (!key.isActive) {
      this.logUsage(keyId, key.provider, 'read', userId, false, 'Key inactive');
      return null;
    }

    try {
      const decrypted = this.encryption.decrypt(key.encryptedValue, key.iv);
      this.logUsage(keyId, key.provider, 'read', userId, true);
      return decrypted;
    } catch (error) {
      this.logUsage(keyId, key.provider, 'read', userId, false, 'Decryption failed');
      return null;
    }
  }

  /**
   * APIキーを更新
   */
  updateKey(keyId: string, updates: Partial<APIKey>, userId: string): APIKey | null {
    const key = this.keys.get(keyId);

    if (!key) {
      this.logUsage(keyId, '', 'update', userId, false, 'Key not found');
      return null;
    }

    // Check permission
    if (!this.checkKeyPermission(keyId, userId, 'canUpdate')) {
      this.logUsage(keyId, key.provider, 'update', userId, false, 'Permission denied');
      return null;
    }

    // Update allowed fields
    if (updates.name) key.name = updates.name;
    if (updates.expiresAt !== undefined) key.expiresAt = updates.expiresAt;
    if (updates.isActive !== undefined) key.isActive = updates.isActive;
    if (updates.permissions) key.permissions = updates.permissions;

    key.updatedAt = Date.now();
    this.logUsage(keyId, key.provider, 'update', userId, true);

    return key;
  }

  /**
   * APIキーを削除
   */
  deleteKey(keyId: string, userId: string): boolean {
    const key = this.keys.get(keyId);

    if (!key) {
      this.logUsage(keyId, '', 'delete', userId, false, 'Key not found');
      return false;
    }

    // Check permission
    if (!this.checkKeyPermission(keyId, userId, 'canDelete')) {
      this.logUsage(keyId, key.provider, 'delete', userId, false, 'Permission denied');
      return false;
    }

    this.keys.delete(keyId);
    this.logUsage(keyId, key.provider, 'delete', userId, true);

    return true;
  }

  /**
   * APIキーをローテーション
   */
  rotateKey(keyId: string, newValue: string, userId: string): APIKey | null {
    const key = this.keys.get(keyId);

    if (!key) {
      this.logUsage(keyId, '', 'rotate', userId, false, 'Key not found');
      return null;
    }

    // Check permission
    if (!this.checkKeyPermission(keyId, userId, 'canRotate')) {
      this.logUsage(keyId, key.provider, 'rotate', userId, false, 'Permission denied');
      return null;
    }

    const { encrypted, iv, salt } = this.encryption.encrypt(newValue);

    key.encryptedValue = encrypted;
    key.iv = iv;
    key.salt = salt;
    key.updatedAt = Date.now();
    key.usageCount = 0;

    this.logUsage(keyId, key.provider, 'rotate', userId, true);

    return key;
  }

  /**
   * プロバイダーのキーを取得
   */
  getKeysByProvider(provider: string, userId: string): APIKey[] {
    return Array.from(this.keys.values()).filter(
      key =>
        key.provider === provider &&
        key.isActive &&
        (!key.expiresAt || key.expiresAt > Date.now()) &&
        this.checkKeyPermission(key.id, userId, 'canRead')
    );
  }

  /**
   * キーを使用
   */
  recordKeyUsage(keyId: string, userId: string): void {
    const key = this.keys.get(keyId);
    if (key) {
      key.usageCount++;
      key.lastUsedAt = Date.now();
      this.logUsage(keyId, key.provider, 'use', userId, true);
    }
  }

  /**
   * 使用ログを記録
   */
  private logUsage(
    keyId: string,
    provider: string,
    action: KeyUsageLog['action'],
    userId: string,
    success: boolean,
    details?: string
  ): void {
    const log: KeyUsageLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      keyId,
      provider,
      action,
      userId,
      timestamp: Date.now(),
      success,
      details,
    };

    this.usageLogs.push(log);

    // Keep only last 10000 logs
    if (this.usageLogs.length > 10000) {
      this.usageLogs = this.usageLogs.slice(-10000);
    }
  }

  /**
   * 使用ログを取得
   */
  getUsageLogs(keyId?: string, limit: number = 100): KeyUsageLog[] {
    const logs = keyId
      ? this.usageLogs.filter(log => log.keyId === keyId)
      : this.usageLogs;

    return logs.slice(-limit);
  }

  /**
   * 権限を付与
   */
  grantPermission(
    keyId: string,
    userId: string,
    role: UserRole,
    canRead: boolean = true,
    canUpdate: boolean = false,
    canDelete: boolean = false,
    canRotate: boolean = false,
    grantedBy: string
  ): KeyPermission | null {
    const key = this.keys.get(keyId);
    if (!key) return null;

    // Check if granter has permission
    if (!this.checkKeyPermission(keyId, grantedBy, 'canUpdate')) {
      return null;
    }

    const permission: KeyPermission = {
      keyId,
      userId,
      role,
      canRead,
      canUpdate,
      canDelete,
      canRotate,
      grantedAt: Date.now(),
    };

    if (!this.permissions.has(keyId)) {
      this.permissions.set(keyId, []);
    }

    this.permissions.get(keyId)!.push(permission);
    this.logUsage(keyId, key.provider, 'update', grantedBy, true, `Permission granted to ${userId}`);

    return permission;
  }

  /**
   * 権限を取り消し
   */
  revokePermission(keyId: string, userId: string, revokedBy: string): boolean {
    const key = this.keys.get(keyId);
    if (!key) return false;

    // Check if revoker has permission
    if (!this.checkKeyPermission(keyId, revokedBy, 'canUpdate')) {
      return false;
    }

    const permissions = this.permissions.get(keyId);
    if (!permissions) return false;

    const index = permissions.findIndex(p => p.userId === userId);
    if (index === -1) return false;

    permissions.splice(index, 1);
    this.logUsage(keyId, key.provider, 'update', revokedBy, true, `Permission revoked from ${userId}`);

    return true;
  }

  /**
   * キーの権限を取得
   */
  getKeyPermissions(keyId: string): KeyPermission[] {
    return this.permissions.get(keyId) || [];
  }

  /**
   * ユーザーの権限をチェック
   */
  private checkPermission(userId: string, action: string): boolean {
    // Admin users have all permissions
    if (userId.startsWith('admin_')) {
      return true;
    }

    // Default: allow for now (implement role-based access control)
    return true;
  }

  /**
   * キーの権限をチェック
   */
  private checkKeyPermission(keyId: string, userId: string, permission: keyof KeyPermission): boolean {
    // Admin users have all permissions
    if (userId.startsWith('admin_')) {
      return true;
    }

    // Creator has all permissions
    const key = this.keys.get(keyId);
    if (key && key.createdBy === userId) {
      return true;
    }

    // Check explicit permissions
    const permissions = this.permissions.get(keyId);
    if (permissions) {
      const userPermission = permissions.find(p => p.userId === userId);
      if (userPermission && userPermission[permission]) {
        return true;
      }
    }

    return false;
  }

  /**
   * 期限切れキーをクリーンアップ
   */
  cleanupExpiredKeys(): number {
    let count = 0;
    const now = Date.now();

    const keysToDelete: string[] = [];
    for (const [keyId, key] of Array.from(this.keys.entries())) {
      if (key.expiresAt && key.expiresAt < now) {
        keysToDelete.push(keyId);
        count++;
      }
    }

    for (const keyId of keysToDelete) {
      this.keys.delete(keyId);
    }

    return count;
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    totalUsageLogs: number;
    totalPermissions: number;
    mostUsedKey?: string;
    averageUsagePerKey: number;
  } {
    const allKeys = Array.from(this.keys.values());
    const now = Date.now();

    const activeKeys = allKeys.filter(k => k.isActive && (!k.expiresAt || k.expiresAt > now)).length;
    const expiredKeys = allKeys.filter(k => k.expiresAt && k.expiresAt < now).length;

    const totalUsage = allKeys.reduce((sum, k) => sum + k.usageCount, 0);
    const mostUsedKey = allKeys.length > 0
      ? allKeys.reduce((max, k) => (k.usageCount > max.usageCount ? k : max)).id
      : undefined;

    const totalPermissions = Array.from(this.permissions.values()).reduce((sum, perms) => sum + perms.length, 0);

    return {
      totalKeys: allKeys.length,
      activeKeys,
      expiredKeys,
      totalUsageLogs: this.usageLogs.length,
      totalPermissions,
      mostUsedKey,
      averageUsagePerKey: allKeys.length > 0 ? totalUsage / allKeys.length : 0,
    };
  }

  /**
   * すべてのキーを取得
   */
  getAllKeys(): APIKey[] {
    return Array.from(this.keys.values());
  }

  /**
   * キーを検証
   */
  validateKey(keyId: string): { valid: boolean; reason?: string } {
    const key = this.keys.get(keyId);

    if (!key) {
      return { valid: false, reason: 'Key not found' };
    }

    if (!key.isActive) {
      return { valid: false, reason: 'Key is inactive' };
    }

    if (key.expiresAt && key.expiresAt < Date.now()) {
      return { valid: false, reason: 'Key has expired' };
    }

    return { valid: true };
  }
}

/**
 * グローバルAPIキーマネージャーインスタンス
 */
export const apiKeyManager = new APIKeyManager();

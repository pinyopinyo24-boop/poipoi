/**
 * SecureCredentialManager - 認証情報セキュア管理
 * APIキー・認証情報をアプリ内へ直接保存禁止
 */

import crypto from 'crypto';

export type CredentialType = 'api_key' | 'oauth_token' | 'password' | 'certificate' | 'session_token';

export interface SecureCredential {
  id: string;
  type: CredentialType;
  encryptedValue: string;
  iv: string;
  salt: string;
  expiresAt?: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  metadata?: Record<string, any>;
}

export interface CredentialAccessLog {
  credentialId: string;
  userId: string;
  action: 'read' | 'write' | 'delete' | 'rotate';
  timestamp: number;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export class SecureCredentialManager {
  private static instance: SecureCredentialManager;
  private credentials: Map<string, SecureCredential> = new Map();
  private accessLogs: CredentialAccessLog[] = [];
  private encryptionKey: string = process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-key-change-in-production';
  private credentialCounter: number = 0;

  private constructor() {}

  static getInstance(): SecureCredentialManager {
    if (!SecureCredentialManager.instance) {
      SecureCredentialManager.instance = new SecureCredentialManager();
    }
    return SecureCredentialManager.instance;
  }

  /**
   * 暗号化
   */
  private encrypt(value: string): { encrypted: string; iv: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const key = crypto.pbkdf2Sync(this.encryptionKey + salt, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      salt,
    };
  }

  /**
   * 復号化
   */
  private decrypt(encrypted: string, iv: string, salt: string): string {
    const key = crypto.pbkdf2Sync(this.encryptionKey + salt, salt, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 認証情報保存
   */
  storeCredential(type: CredentialType, value: string, expiresAt?: number, metadata?: Record<string, any>): SecureCredential {
    const { encrypted, iv, salt } = this.encrypt(value);
    const id = `cred_${++this.credentialCounter}_${Date.now()}`;

    const credential: SecureCredential = {
      id,
      type,
      encryptedValue: encrypted,
      iv,
      salt,
      expiresAt,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      metadata,
    };

    this.credentials.set(id, credential);
    return credential;
  }

  /**
   * 認証情報取得
   */
  getCredential(credentialId: string, userId: string, ipAddress?: string, userAgent?: string): string | null {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      this.logAccess(credentialId, userId, 'read', false, ipAddress, userAgent);
      return null;
    }

    // 有効期限チェック
    if (credential.expiresAt && credential.expiresAt < Date.now()) {
      this.logAccess(credentialId, userId, 'read', false, ipAddress, userAgent);
      return null;
    }

    try {
      const decrypted = this.decrypt(credential.encryptedValue, credential.iv, credential.salt);
      credential.lastAccessedAt = Date.now();
      credential.accessCount++;
      this.logAccess(credentialId, userId, 'read', true, ipAddress, userAgent);
      return decrypted;
    } catch (error) {
      this.logAccess(credentialId, userId, 'read', false, ipAddress, userAgent);
      return null;
    }
  }

  /**
   * 認証情報ローテーション
   */
  rotateCredential(credentialId: string, newValue: string, userId: string): SecureCredential | null {
    const oldCredential = this.credentials.get(credentialId);
    if (!oldCredential) return null;

    const { encrypted, iv, salt } = this.encrypt(newValue);
    const newCredential: SecureCredential = {
      ...oldCredential,
      encryptedValue: encrypted,
      iv,
      salt,
      lastAccessedAt: Date.now(),
    };

    this.credentials.set(credentialId, newCredential);
    this.logAccess(credentialId, userId, 'rotate', true);
    return newCredential;
  }

  /**
   * 認証情報削除
   */
  deleteCredential(credentialId: string, userId: string): boolean {
    const exists = this.credentials.has(credentialId);
    if (exists) {
      this.credentials.delete(credentialId);
      this.logAccess(credentialId, userId, 'delete', true);
    }
    return exists;
  }

  /**
   * アクセスログ記録
   */
  private logAccess(
    credentialId: string,
    userId: string,
    action: 'read' | 'write' | 'delete' | 'rotate',
    success: boolean,
    ipAddress?: string,
    userAgent?: string
  ): void {
    this.accessLogs.push({
      credentialId,
      userId,
      action,
      timestamp: Date.now(),
      success,
      ipAddress,
      userAgent,
    });

    // ログサイズ制限 (最新1000件)
    if (this.accessLogs.length > 1000) {
      this.accessLogs = this.accessLogs.slice(-1000);
    }
  }

  /**
   * アクセスログ取得
   */
  getAccessLogs(credentialId?: string, limit: number = 100): CredentialAccessLog[] {
    let logs = this.accessLogs;

    if (credentialId) {
      logs = logs.filter((l) => l.credentialId === credentialId);
    }

    return logs.slice(-limit);
  }

  /**
   * 有効期限チェック
   */
  isCredentialExpired(credentialId: string): boolean {
    const credential = this.credentials.get(credentialId);
    if (!credential) return true;

    if (credential.expiresAt && credential.expiresAt < Date.now()) {
      return true;
    }

    return false;
  }

  /**
   * 認証情報メタデータ取得
   */
  getCredentialMetadata(credentialId: string): Record<string, any> | null {
    const credential = this.credentials.get(credentialId);
    return credential?.metadata || null;
  }

  /**
   * 認証情報統計
   */
  getStatistics(): {
    totalCredentials: number;
    expiredCredentials: number;
    accessLogCount: number;
  } {
    let expiredCount = 0;

    this.credentials.forEach((credential) => {
      if (credential.expiresAt && credential.expiresAt < Date.now()) {
        expiredCount++;
      }
    });

    return {
      totalCredentials: this.credentials.size,
      expiredCredentials: expiredCount,
      accessLogCount: this.accessLogs.length,
    };
  }

  /**
   * クリーンアップ (期限切れ認証情報削除)
   */
  cleanupExpiredCredentials(): number {
    let removed = 0;
    const idsToDelete: string[] = [];

    this.credentials.forEach((credential, id) => {
      if (credential.expiresAt && credential.expiresAt < Date.now()) {
        idsToDelete.push(id);
      }
    });

    idsToDelete.forEach((id) => {
      this.credentials.delete(id);
      removed++;
    })

    return removed;
  }

  /**
   * 全クリーンアップ
   */
  cleanup(): void {
    this.credentials.clear();
    this.accessLogs = [];
  }
}

export const secureCredentialManager = SecureCredentialManager.getInstance();
export default secureCredentialManager;

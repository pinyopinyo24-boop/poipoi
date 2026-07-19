/**
 * BetaDistributionManager - β版限定配布モード管理
 */

export type BetaAccessLevel = 'internal' | 'closed_beta' | 'open_beta' | 'production';
export type DeviceStatus = 'approved' | 'pending' | 'rejected' | 'revoked';

export interface BetaUser {
  userId: string;
  email: string;
  accessLevel: BetaAccessLevel;
  approvedAt?: number;
  revokedAt?: number;
  invitationCode: string;
  deviceCount: number;
  maxDevices: number;
  feedbackCount: number;
  crashReportCount: number;
  lastActiveAt: number;
}

export interface BetaDevice {
  deviceId: string;
  userId: string;
  deviceName: string;
  osVersion: string;
  appVersion: string;
  status: DeviceStatus;
  registeredAt: number;
  lastActiveAt: number;
}

export class BetaDistributionManager {
  private static instance: BetaDistributionManager;
  private betaUsers: Map<string, BetaUser> = new Map();
  private betaDevices: Map<string, BetaDevice> = new Map();
  private invitationCodes: Map<string, string> = new Map(); // code -> userId
  private currentMode: BetaAccessLevel = 'closed_beta';
  private maxBetaUsers: number = 1000;
  private maxDevicesPerUser: number = 3;

  private constructor() {}

  static getInstance(): BetaDistributionManager {
    if (!BetaDistributionManager.instance) {
      BetaDistributionManager.instance = new BetaDistributionManager();
    }
    return BetaDistributionManager.instance;
  }

  /**
   * β版モード設定
   */
  setDistributionMode(mode: BetaAccessLevel): void {
    this.currentMode = mode;
  }

  /**
   * 現在のモード取得
   */
  getCurrentMode(): BetaAccessLevel {
    return this.currentMode;
  }

  /**
   * β版ユーザー登録
   */
  registerBetaUser(userId: string, email: string, invitationCode: string): BetaUser | null {
    // 招待コード検証
    if (!this.invitationCodes.has(invitationCode)) {
      return null;
    }

    // ユーザー数チェック
    if (this.betaUsers.size >= this.maxBetaUsers) {
      return null;
    }

    const user: BetaUser = {
      userId,
      email,
      accessLevel: this.currentMode,
      approvedAt: Date.now(),
      invitationCode,
      deviceCount: 0,
      maxDevices: this.maxDevicesPerUser,
      feedbackCount: 0,
      crashReportCount: 0,
      lastActiveAt: Date.now(),
    };

    this.betaUsers.set(userId, user);
    return user;
  }

  /**
   * デバイス登録
   */
  registerDevice(userId: string, deviceId: string, deviceName: string, osVersion: string, appVersion: string): BetaDevice | null {
    const user = this.betaUsers.get(userId);
    if (!user) return null;

    if (user.deviceCount >= user.maxDevices) {
      return null;
    }

    const device: BetaDevice = {
      deviceId,
      userId,
      deviceName,
      osVersion,
      appVersion,
      status: 'pending',
      registeredAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    this.betaDevices.set(deviceId, device);
    user.deviceCount++;
    return device;
  }

  /**
   * デバイス承認
   */
  approveDevice(deviceId: string): BetaDevice | null {
    const device = this.betaDevices.get(deviceId);
    if (!device) return null;

    device.status = 'approved';
    return device;
  }

  /**
   * デバイス拒否
   */
  rejectDevice(deviceId: string): BetaDevice | null {
    const device = this.betaDevices.get(deviceId);
    if (!device) return null;

    device.status = 'rejected';
    const user = this.betaUsers.get(device.userId);
    if (user) {
      user.deviceCount--;
    }
    return device;
  }

  /**
   * アクセス権限確認
   */
  hasAccess(userId: string, deviceId: string): boolean {
    const user = this.betaUsers.get(userId);
    if (!user) return false;

    const device = this.betaDevices.get(deviceId);
    if (!device) return false;

    return device.status === 'approved' && device.userId === userId;
  }

  /**
   * 招待コード生成
   */
  generateInvitationCode(userId?: string): string {
    const code = `BETA_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    if (userId) {
      this.invitationCodes.set(code, userId);
    }
    return code;
  }

  /**
   * フィードバック記録
   */
  recordFeedback(userId: string): void {
    const user = this.betaUsers.get(userId);
    if (user) {
      user.feedbackCount++;
      user.lastActiveAt = Date.now();
    }
  }

  /**
   * クラッシュレポート記録
   */
  recordCrashReport(userId: string): void {
    const user = this.betaUsers.get(userId);
    if (user) {
      user.crashReportCount++;
      user.lastActiveAt = Date.now();
    }
  }

  /**
   * ユーザー取得
   */
  getUser(userId: string): BetaUser | null {
    return this.betaUsers.get(userId) || null;
  }

  /**
   * デバイス取得
   */
  getDevice(deviceId: string): BetaDevice | null {
    return this.betaDevices.get(deviceId) || null;
  }

  /**
   * ユーザーのデバイス取得
   */
  getUserDevices(userId: string): BetaDevice[] {
    return Array.from(this.betaDevices.values()).filter((d: BetaDevice) => d.userId === userId);
  }

  /**
   * β版ユーザー数
   */
  getBetaUserCount(): number {
    return this.betaUsers.size;
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.betaUsers.clear();
    this.betaDevices.clear();
    this.invitationCodes.clear();
  }
}

export const betaDistributionManager = BetaDistributionManager.getInstance();
export default betaDistributionManager;

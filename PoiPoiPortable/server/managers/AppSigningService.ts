/**
 * AppSigningService - アプリ署名サービス
 */

export type SigningStatus = 'pending' | 'signing' | 'verified' | 'failed';

export interface AppSigning {
  signingId: string;
  apkPath: string;
  keystorePath: string;
  keystoreAlias: string;
  status: SigningStatus;
  startedAt?: number;
  completedAt?: number;
  signedApkPath?: string;
  certificateFingerprint?: string;
  errorMessage?: string;
}

export class AppSigningService {
  private static instance: AppSigningService;
  private signings: Map<string, AppSigning> = new Map();
  private signingCounter: number = 0;

  private constructor() {}

  static getInstance(): AppSigningService {
    if (!AppSigningService.instance) {
      AppSigningService.instance = new AppSigningService();
    }
    return AppSigningService.instance;
  }

  /**
   * 署名開始
   */
  startSigning(apkPath: string, keystorePath: string, keystoreAlias: string): AppSigning {
    const signingId = `app_signing_${++this.signingCounter}_${Date.now()}`;

    const signing: AppSigning = {
      signingId,
      apkPath,
      keystorePath,
      keystoreAlias,
      status: 'signing',
      startedAt: Date.now(),
    };

    this.signings.set(signingId, signing);
    return signing;
  }

  /**
   * 署名検証
   */
  verifySigning(signingId: string, signedApkPath: string, certificateFingerprint: string): AppSigning | null {
    const signing = this.signings.get(signingId);
    if (!signing) return null;

    signing.status = 'verified';
    signing.signedApkPath = signedApkPath;
    signing.certificateFingerprint = certificateFingerprint;
    signing.completedAt = Date.now();

    return signing;
  }

  /**
   * 署名失敗
   */
  failSigning(signingId: string, errorMessage: string): AppSigning | null {
    const signing = this.signings.get(signingId);
    if (!signing) return null;

    signing.status = 'failed';
    signing.errorMessage = errorMessage;
    signing.completedAt = Date.now();

    return signing;
  }

  /**
   * 署名取得
   */
  getSigning(signingId: string): AppSigning | null {
    return this.signings.get(signingId) || null;
  }

  /**
   * 検証済み署名取得
   */
  getVerifiedSignings(): AppSigning[] {
    return Array.from(this.signings.values()).filter((s) => s.status === 'verified');
  }

  /**
   * 失敗した署名取得
   */
  getFailedSignings(): AppSigning[] {
    return Array.from(this.signings.values()).filter((s) => s.status === 'failed');
  }

  /**
   * 署名統計
   */
  getSigningStatistics(): {
    totalSignings: number;
    verifiedSignings: number;
    failedSignings: number;
    signingSignings: number;
    successRate: number;
  } {
    const signingArray = Array.from(this.signings.values());
    const verifiedSignings = signingArray.filter((s) => s.status === 'verified').length;
    const failedSignings = signingArray.filter((s) => s.status === 'failed').length;
    const signingSignings = signingArray.filter((s) => s.status === 'signing').length;
    const totalSignings = signingArray.length;

    const successRate = totalSignings > 0 ? (verifiedSignings / totalSignings) * 100 : 0;

    return {
      totalSignings,
      verifiedSignings,
      failedSignings,
      signingSignings,
      successRate,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.signings.clear();
  }
}

export const appSigningService = AppSigningService.getInstance();
export default appSigningService;

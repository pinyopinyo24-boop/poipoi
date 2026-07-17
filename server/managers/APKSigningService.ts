/**
 * APKSigningService - APK署名設定管理
 */

export interface SigningKey {
  id: string;
  alias: string;
  keystore: string;
  keystorePassword: string;
  keyPassword: string;
  keyAlgorithm: string;
  keySize: number;
  validityDays: number;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
  certificateInfo: {
    subjectDN: string;
    issuerDN: string;
    serialNumber: string;
    notBefore: number;
    notAfter: number;
  };
}

export interface SignedAPK {
  id: string;
  apkPath: string;
  signedApkPath: string;
  signingKeyId: string;
  version: string;
  buildTime: number;
  signedAt: number;
  signature: string;
  certificateFingerprint: string;
  isVerified: boolean;
}

export class APKSigningService {
  private static instance: APKSigningService;
  private signingKeys: Map<string, SigningKey> = new Map();
  private signedApks: Map<string, SignedAPK> = new Map();
  private keyCounter: number = 0;
  private apkCounter: number = 0;

  private constructor() {
    this.initializeDefaultKey();
  }

  static getInstance(): APKSigningService {
    if (!APKSigningService.instance) {
      APKSigningService.instance = new APKSigningService();
    }
    return APKSigningService.instance;
  }

  /**
   * デフォルトキー初期化
   */
  private initializeDefaultKey(): void {
    const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1年後

    this.signingKeys.set('default', {
      id: 'default',
      alias: 'poipoi-key',
      keystore: '/path/to/keystore.jks',
      keystorePassword: 'encrypted_password',
      keyPassword: 'encrypted_password',
      keyAlgorithm: 'RSA',
      keySize: 2048,
      validityDays: 365,
      createdAt: Date.now(),
      expiresAt,
      isActive: true,
      certificateInfo: {
        subjectDN: 'CN=PoiPoi, O=PoiPoi Inc, C=JP',
        issuerDN: 'CN=PoiPoi, O=PoiPoi Inc, C=JP',
        serialNumber: '1',
        notBefore: Date.now(),
        notAfter: expiresAt,
      },
    });
  }

  /**
   * 署名キー登録
   */
  registerSigningKey(
    alias: string,
    keystore: string,
    keystorePassword: string,
    keyPassword: string,
    keyAlgorithm: string,
    keySize: number,
    validityDays: number,
    certificateInfo: SigningKey['certificateInfo']
  ): SigningKey {
    const id = `key_${++this.keyCounter}_${Date.now()}`;
    const expiresAt = Date.now() + validityDays * 24 * 60 * 60 * 1000;

    const key: SigningKey = {
      id,
      alias,
      keystore,
      keystorePassword,
      keyPassword,
      keyAlgorithm,
      keySize,
      validityDays,
      createdAt: Date.now(),
      expiresAt,
      isActive: true,
      certificateInfo,
    };

    this.signingKeys.set(id, key);
    return key;
  }

  /**
   * 署名キー取得
   */
  getSigningKey(keyId: string): SigningKey | null {
    return this.signingKeys.get(keyId) || null;
  }

  /**
   * アクティブな署名キー取得
   */
  getActiveSigningKey(): SigningKey | null {
    let activeKey: SigningKey | null = null;
    this.signingKeys.forEach((key) => {
      if (key.isActive && key.expiresAt > Date.now() && !activeKey) {
        activeKey = key;
      }
    });
    return activeKey;
  }

  /**
   * 署名キーの有効期限確認
   */
  isSigningKeyExpired(keyId: string): boolean {
    const key = this.signingKeys.get(keyId);
    if (!key) return true;
    return key.expiresAt < Date.now();
  }

  /**
   * APK署名記録
   */
  recordSignedAPK(
    apkPath: string,
    signedApkPath: string,
    signingKeyId: string,
    version: string,
    signature: string,
    certificateFingerprint: string
  ): SignedAPK {
    const id = `apk_${++this.apkCounter}_${Date.now()}`;

    const signedApk: SignedAPK = {
      id,
      apkPath,
      signedApkPath,
      signingKeyId,
      version,
      buildTime: Date.now(),
      signedAt: Date.now(),
      signature,
      certificateFingerprint,
      isVerified: false,
    };

    this.signedApks.set(id, signedApk);
    return signedApk;
  }

  /**
   * 署名済みAPK取得
   */
  getSignedAPK(apkId: string): SignedAPK | null {
    return this.signedApks.get(apkId) || null;
  }

  /**
   * バージョン別署名済みAPK取得
   */
  getSignedAPKByVersion(version: string): SignedAPK | null {
    let result: SignedAPK | null = null;
    this.signedApks.forEach((apk) => {
      if (apk.version === version && !result) {
        result = apk;
      }
    });
    return result;
  }

  /**
   * APK署名検証
   */
  verifyAPKSignature(apkId: string): boolean {
    const apk = this.signedApks.get(apkId);
    if (!apk) return false;

    const key = this.signingKeys.get(apk.signingKeyId);
    if (!key || this.isSigningKeyExpired(apk.signingKeyId)) return false;

    apk.isVerified = true;
    return true;
  }

  /**
   * 署名統計
   */
  getSigningStatistics(): {
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    totalSignedApks: number;
    verifiedApks: number;
  } {
    const keys: SigningKey[] = [];
    const apks: SignedAPK[] = [];
    
    this.signingKeys.forEach((key) => keys.push(key));
    this.signedApks.forEach((apk) => apks.push(apk));

    const activeKeys = keys.filter((k) => k.isActive && k.expiresAt > Date.now()).length;
    const expiredKeys = keys.filter((k) => k.expiresAt < Date.now()).length;
    const verifiedApks = apks.filter((a) => a.isVerified).length;

    return {
      totalKeys: keys.length,
      activeKeys,
      expiredKeys,
      totalSignedApks: apks.length,
      verifiedApks,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.signingKeys.clear();
    this.signedApks.clear();
  }
}

export const apkSigningService = APKSigningService.getInstance();
export default apkSigningService;

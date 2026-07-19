/**
 * DesktopPackagingService
 * Windows/macOS/Linux デスクトップ版パッケージング
 */

export interface DesktopPackage {
  packageId: string;
  timestamp: number;
  version: string;
  buildNumber: string;
  platform: 'windows' | 'macos' | 'linux';
  architecture: 'x64' | 'arm64' | 'ia32';
  status: 'building' | 'testing' | 'packaging' | 'completed' | 'failed';
  filePath: string;
  fileSize: number;
  checksum: string;
  installType: 'installer' | 'portable' | 'zip';
  systemRequirements: {
    minOs: string;
    minRam: number;
    minDisk: number;
  };
  dependencies: string[];
  buildTime: number;
  errors: string[];
}

export interface DesktopSignature {
  signatureId: string;
  timestamp: number;
  packageId: string;
  certificatePath: string;
  certificateThumbprint: string;
  validFrom: number;
  validTo: number;
  signatureStatus: 'valid' | 'expired' | 'invalid';
}

export interface BrowserCompatibility {
  compatibilityId: string;
  timestamp: number;
  packageId: string;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  version: string;
  status: 'compatible' | 'partial' | 'incompatible';
  features: Record<string, boolean>;
  issues: string[];
}

export class DesktopPackagingService {
  private desktopPackages: Map<string, DesktopPackage> = new Map();
  private desktopSignatures: Map<string, DesktopSignature> = new Map();
  private browserCompatibilities: Map<string, BrowserCompatibility> = new Map();
  private packagesByVersion: Map<string, string[]> = new Map();
  private signaturesByPackage: Map<string, string[]> = new Map();
  private compatibilitiesByPackage: Map<string, string[]> = new Map();

  /**
   * デスクトップパッケージを作成
   */
  createDesktopPackage(
    version: string,
    buildNumber: string,
    platform: 'windows' | 'macos' | 'linux',
    architecture: 'x64' | 'arm64' | 'ia32',
    filePath: string,
    fileSize: number,
    installType: 'installer' | 'portable' | 'zip',
    systemRequirements: { minOs: string; minRam: number; minDisk: number },
    dependencies: string[]
  ): DesktopPackage {
    const packageId = `DSK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const pkg: DesktopPackage = {
      packageId,
      timestamp: Date.now(),
      version,
      buildNumber,
      platform,
      architecture,
      status: 'building',
      filePath,
      fileSize,
      checksum: this.generateChecksum(filePath),
      installType,
      systemRequirements,
      dependencies,
      buildTime: 0,
      errors: [],
    };

    this.desktopPackages.set(packageId, pkg);

    if (!this.packagesByVersion.has(version)) {
      this.packagesByVersion.set(version, []);
    }
    this.packagesByVersion.get(version)!.push(packageId);

    return pkg;
  }

  /**
   * デスクトップパッケージを取得
   */
  getDesktopPackage(packageId: string): DesktopPackage | undefined {
    return this.desktopPackages.get(packageId);
  }

  /**
   * バージョン別デスクトップパッケージを取得
   */
  getDesktopPackagesByVersion(version: string): DesktopPackage[] {
    const ids = this.packagesByVersion.get(version) || [];
    return ids
      .map(id => this.desktopPackages.get(id))
      .filter((pkg): pkg is DesktopPackage => pkg !== undefined);
  }

  /**
   * プラットフォーム別パッケージを取得
   */
  getDesktopPackagesByPlatform(platform: 'windows' | 'macos' | 'linux'): DesktopPackage[] {
    return Array.from(this.desktopPackages.values()).filter(pkg => pkg.platform === platform);
  }

  /**
   * 全デスクトップパッケージを取得
   */
  getAllDesktopPackages(): DesktopPackage[] {
    return Array.from(this.desktopPackages.values());
  }

  /**
   * 最新デスクトップパッケージを取得
   */
  getLatestDesktopPackage(): DesktopPackage | undefined {
    const all = Array.from(this.desktopPackages.values());
    if (all.length === 0) return undefined;
    return all.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  /**
   * パッケージステータスを更新
   */
  updatePackageStatus(packageId: string, newStatus: string): boolean {
    const pkg = this.desktopPackages.get(packageId);
    if (!pkg) return false;

    pkg.status = newStatus as any;
    return true;
  }

  /**
   * デスクトップ署名を作成
   */
  createDesktopSignature(
    packageId: string,
    certificatePath: string,
    certificateThumbprint: string,
    validFrom: number,
    validTo: number
  ): DesktopSignature {
    const signatureId = `DSIG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const signature: DesktopSignature = {
      signatureId,
      timestamp: Date.now(),
      packageId,
      certificatePath,
      certificateThumbprint,
      validFrom,
      validTo,
      signatureStatus: 'valid',
    };

    this.desktopSignatures.set(signatureId, signature);

    if (!this.signaturesByPackage.has(packageId)) {
      this.signaturesByPackage.set(packageId, []);
    }
    this.signaturesByPackage.get(packageId)!.push(signatureId);

    return signature;
  }

  /**
   * デスクトップ署名を取得
   */
  getDesktopSignature(signatureId: string): DesktopSignature | undefined {
    return this.desktopSignatures.get(signatureId);
  }

  /**
   * パッケージ別署名を取得
   */
  getSignaturesByPackage(packageId: string): DesktopSignature[] {
    const ids = this.signaturesByPackage.get(packageId) || [];
    return ids
      .map(id => this.desktopSignatures.get(id))
      .filter((sig): sig is DesktopSignature => sig !== undefined);
  }

  /**
   * 全デスクトップ署名を取得
   */
  getAllDesktopSignatures(): DesktopSignature[] {
    return Array.from(this.desktopSignatures.values());
  }

  /**
   * ブラウザ互換性を作成
   */
  createBrowserCompatibility(
    packageId: string,
    browser: 'chrome' | 'firefox' | 'safari' | 'edge',
    version: string,
    status: 'compatible' | 'partial' | 'incompatible',
    features: Record<string, boolean>,
    issues: string[]
  ): BrowserCompatibility {
    const compatibilityId = `COMPAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const compatibility: BrowserCompatibility = {
      compatibilityId,
      timestamp: Date.now(),
      packageId,
      browser,
      version,
      status,
      features,
      issues,
    };

    this.browserCompatibilities.set(compatibilityId, compatibility);

    if (!this.compatibilitiesByPackage.has(packageId)) {
      this.compatibilitiesByPackage.set(packageId, []);
    }
    this.compatibilitiesByPackage.get(packageId)!.push(compatibilityId);

    return compatibility;
  }

  /**
   * ブラウザ互換性を取得
   */
  getBrowserCompatibility(compatibilityId: string): BrowserCompatibility | undefined {
    return this.browserCompatibilities.get(compatibilityId);
  }

  /**
   * パッケージ別ブラウザ互換性を取得
   */
  getCompatibilitiesByPackage(packageId: string): BrowserCompatibility[] {
    const ids = this.compatibilitiesByPackage.get(packageId) || [];
    return ids
      .map(id => this.browserCompatibilities.get(id))
      .filter((c): c is BrowserCompatibility => c !== undefined);
  }

  /**
   * 全ブラウザ互換性を取得
   */
  getAllBrowserCompatibilities(): BrowserCompatibility[] {
    return Array.from(this.browserCompatibilities.values());
  }

  /**
   * デスクトップ統計を計算
   */
  getDesktopStats(): {
    totalPackages: number;
    windowsPackages: number;
    macosPackages: number;
    linuxPackages: number;
    completedPackages: number;
    failedPackages: number;
    totalSignatures: number;
    totalCompatibilities: number;
    averageFileSize: number;
    compatibleBrowsers: number;
  } {
    const allPackages = Array.from(this.desktopPackages.values());
    const allSignatures = Array.from(this.desktopSignatures.values());
    const allCompatibilities = Array.from(this.browserCompatibilities.values());

    let totalSize = 0;
    for (const pkg of allPackages) {
      totalSize += pkg.fileSize;
    }
    const averageFileSize = allPackages.length > 0 ? totalSize / allPackages.length : 0;

    const compatibleCount = allCompatibilities.filter(c => c.status === 'compatible').length;

    return {
      totalPackages: allPackages.length,
      windowsPackages: allPackages.filter(p => p.platform === 'windows').length,
      macosPackages: allPackages.filter(p => p.platform === 'macos').length,
      linuxPackages: allPackages.filter(p => p.platform === 'linux').length,
      completedPackages: allPackages.filter(p => p.status === 'completed').length,
      failedPackages: allPackages.filter(p => p.status === 'failed').length,
      totalSignatures: allSignatures.length,
      totalCompatibilities: allCompatibilities.length,
      averageFileSize,
      compatibleBrowsers: compatibleCount,
    };
  }

  /**
   * チェックサムを生成
   */
  private generateChecksum(filePath: string): string {
    return `checksum-${filePath.length}-${Date.now()}`;
  }

  /**
   * デスクトップパッケージを削除
   */
  deleteDesktopPackage(packageId: string): boolean {
    const pkg = this.desktopPackages.get(packageId);
    if (!pkg) return false;

    const versionIds = this.packagesByVersion.get(pkg.version) || [];
    const index = versionIds.indexOf(packageId);
    if (index > -1) {
      versionIds.splice(index, 1);
    }

    this.desktopPackages.delete(packageId);
    return true;
  }
}

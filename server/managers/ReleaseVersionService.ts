/**
 * ReleaseVersionService - リリースバージョン管理\n * \n * 機能:\n * - バージョン管理\n * - リリース履歴\n * - バージョン比較\n */

export interface VersionInfo {
  version: string;
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  metadata?: string;
}

export interface ReleaseHistory {
  version: string;
  releaseDate: number;
  features: string[];
  bugFixes: string[];
  breakingChanges: string[];
  deprecated: string[];
  notes: string;
}

export class ReleaseVersionService {
  private static instance: ReleaseVersionService;
  private currentVersion: VersionInfo;
  private releaseHistory: Map<string, ReleaseHistory> = new Map();
  private versionHistory: VersionInfo[] = [];

  private constructor() {
    this.currentVersion = this.parseVersion('1.0.0');
  }

  static getInstance(): ReleaseVersionService {
    if (!ReleaseVersionService.instance) {
      ReleaseVersionService.instance = new ReleaseVersionService();
    }
    return ReleaseVersionService.instance;
  }

  /**
   * バージョン文字列をパース
   */
  private parseVersion(version: string): VersionInfo {
    const regex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
    const match = version.match(regex);

    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      version,
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
      metadata: match[5],
    };
  }

  /**
   * 現在のバージョン取得
   */
  getCurrentVersion(): VersionInfo {
    return { ...this.currentVersion };
  }

  /**
   * バージョン設定
   */
  setVersion(version: string): VersionInfo {
    const parsed = this.parseVersion(version);
    this.versionHistory.push(this.currentVersion);
    this.currentVersion = parsed;
    return { ...this.currentVersion };
  }

  /**
   * メジャーバージョンアップ
   */
  incrementMajor(): VersionInfo {
    const newVersion = `${this.currentVersion.major + 1}.0.0`;
    return this.setVersion(newVersion);
  }

  /**
   * マイナーバージョンアップ
   */
  incrementMinor(): VersionInfo {
    const newVersion = `${this.currentVersion.major}.${this.currentVersion.minor + 1}.0`;
    return this.setVersion(newVersion);
  }

  /**
   * パッチバージョンアップ
   */
  incrementPatch(): VersionInfo {
    const newVersion = `${this.currentVersion.major}.${this.currentVersion.minor}.${this.currentVersion.patch + 1}`;
    return this.setVersion(newVersion);
  }

  /**
   * リリース履歴追加
   */
  addReleaseHistory(
    version: string,
    features: string[],
    bugFixes: string[],
    breakingChanges: string[],
    deprecated: string[],
    notes: string
  ): ReleaseHistory {
    const history: ReleaseHistory = {
      version,
      releaseDate: Date.now(),
      features,
      bugFixes,
      breakingChanges,
      deprecated,
      notes,
    };

    this.releaseHistory.set(version, history);
    return history;
  }

  /**
   * リリース履歴取得
   */
  getReleaseHistory(version: string): ReleaseHistory | null {
    return this.releaseHistory.get(version) || null;
  }

  /**
   * すべてのリリース履歴取得
   */
  getAllReleaseHistory(): ReleaseHistory[] {
    return Array.from(this.releaseHistory.values()).sort(
      (a: ReleaseHistory, b: ReleaseHistory) => b.releaseDate - a.releaseDate
    );
  }

  /**
   * バージョン比較
   */
  compareVersions(version1: string, version2: string): number {
    const v1 = this.parseVersion(version1);
    const v2 = this.parseVersion(version2);

    if (v1.major !== v2.major) return v1.major - v2.major;
    if (v1.minor !== v2.minor) return v1.minor - v2.minor;
    if (v1.patch !== v2.patch) return v1.patch - v2.patch;

    return 0;
  }

  /**
   * バージョン履歴取得
   */
  getVersionHistory(): VersionInfo[] {
    return [...this.versionHistory];
  }

  /**
   * 前のバージョンに戻す
   */
  revertToPreviousVersion(): VersionInfo | null {
    if (this.versionHistory.length === 0) return null;

    const previous = this.versionHistory.pop();
    if (previous) {
      this.currentVersion = previous;
      return { ...this.currentVersion };
    }

    return null;
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.releaseHistory.clear();
    this.versionHistory = [];
    this.currentVersion = this.parseVersion('1.0.0');
  }
}

export const releaseVersionService = ReleaseVersionService.getInstance();
export default releaseVersionService;

/**
 * ReleaseArtifactManager - リリース成果物管理
 */

export type ArtifactType = 'apk' | 'bundle' | 'mapping' | 'symbols' | 'changelog';

export interface ReleaseArtifact {
  artifactId: string;
  releaseVersion: string;
  artifactType: ArtifactType;
  filePath: string;
  fileSize: number;
  checksum: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export class ReleaseArtifactManager {
  private static instance: ReleaseArtifactManager;
  private artifacts: Map<string, ReleaseArtifact> = new Map();
  private artifactCounter: number = 0;

  private constructor() {}

  static getInstance(): ReleaseArtifactManager {
    if (!ReleaseArtifactManager.instance) {
      ReleaseArtifactManager.instance = new ReleaseArtifactManager();
    }
    return ReleaseArtifactManager.instance;
  }

  /**
   * 成果物登録
   */
  registerArtifact(
    releaseVersion: string,
    artifactType: ArtifactType,
    filePath: string,
    fileSize: number,
    checksum: string,
    metadata?: Record<string, unknown>
  ): ReleaseArtifact {
    const artifactId = `artifact_${++this.artifactCounter}_${Date.now()}`;

    const artifact: ReleaseArtifact = {
      artifactId,
      releaseVersion,
      artifactType,
      filePath,
      fileSize,
      checksum,
      createdAt: Date.now(),
      metadata,
    };

    this.artifacts.set(artifactId, artifact);
    return artifact;
  }

  /**
   * 成果物取得
   */
  getArtifact(artifactId: string): ReleaseArtifact | null {
    return this.artifacts.get(artifactId) || null;
  }

  /**
   * リリースバージョン別成果物取得
   */
  getArtifactsByVersion(releaseVersion: string): ReleaseArtifact[] {
    return Array.from(this.artifacts.values()).filter((a) => a.releaseVersion === releaseVersion);
  }

  /**
   * 成果物タイプ別取得
   */
  getArtifactsByType(artifactType: ArtifactType): ReleaseArtifact[] {
    return Array.from(this.artifacts.values()).filter((a) => a.artifactType === artifactType);
  }

  /**
   * すべての成果物取得
   */
  getAllArtifacts(): ReleaseArtifact[] {
    return Array.from(this.artifacts.values());
  }

  /**
   * 成果物削除
   */
  deleteArtifact(artifactId: string): boolean {
    return this.artifacts.delete(artifactId);
  }

  /**
   * 成果物統計
   */
  getArtifactStatistics(): {
    totalArtifacts: number;
    apkArtifacts: number;
    bundleArtifacts: number;
    mappingArtifacts: number;
    symbolsArtifacts: number;
    changelogArtifacts: number;
    totalSize: number;
    averageSize: number;
  } {
    const artifactArray = Array.from(this.artifacts.values());
    const apkArtifacts = artifactArray.filter((a) => a.artifactType === 'apk').length;
    const bundleArtifacts = artifactArray.filter((a) => a.artifactType === 'bundle').length;
    const mappingArtifacts = artifactArray.filter((a) => a.artifactType === 'mapping').length;
    const symbolsArtifacts = artifactArray.filter((a) => a.artifactType === 'symbols').length;
    const changelogArtifacts = artifactArray.filter((a) => a.artifactType === 'changelog').length;

    let totalSize = 0;
    artifactArray.forEach((artifact) => {
      totalSize += artifact.fileSize;
    });

    const averageSize = artifactArray.length > 0 ? totalSize / artifactArray.length : 0;

    return {
      totalArtifacts: artifactArray.length,
      apkArtifacts,
      bundleArtifacts,
      mappingArtifacts,
      symbolsArtifacts,
      changelogArtifacts,
      totalSize,
      averageSize,
    };
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.artifacts.clear();
  }
}

export const releaseArtifactManager = ReleaseArtifactManager.getInstance();
export default releaseArtifactManager;

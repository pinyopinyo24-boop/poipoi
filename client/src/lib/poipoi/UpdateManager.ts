/**
 * Update Manager - PoiPoi AI Core
 * 更新管理
 */

export interface Update {
  id: string;
  version: string;
  title: string;
  description: string;
  releaseDate: string;
  features: string[];
  bugFixes: string[];
  installed: boolean;
}

class UpdateManager {
  private updates: Update[] = [];
  private currentVersion: string = "1.0.0";
  private installHistory: { version: string; timestamp: string }[] = [];

  addUpdate(version: string, title: string, description: string, features: string[], bugFixes: string[]): Update {
    const update: Update = {
      id: `update_${Date.now()}`,
      version,
      title,
      description,
      releaseDate: new Date().toISOString(),
      features,
      bugFixes,
      installed: false,
    };

    this.updates.push(update);
    console.log(`📦 更新追加: v${version}`);

    return update;
  }

  getAvailableUpdates(): Update[] {
    return this.updates.filter((u) => !u.installed);
  }

  installUpdate(version: string): boolean {
    const update = this.updates.find((u) => u.version === version);
    if (!update) return false;

    update.installed = true;
    this.currentVersion = version;
    this.installHistory.push({
      version,
      timestamp: new Date().toISOString(),
    });

    console.log(`✅ 更新インストール: v${version}`);
    return true;
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  getUpdateHistory() {
    return [...this.installHistory];
  }

  getStats() {
    return {
      currentVersion: this.currentVersion,
      totalUpdates: this.updates.length,
      installedUpdates: this.updates.filter((u) => u.installed).length,
      availableUpdates: this.getAvailableUpdates().length,
      installHistory: this.installHistory.length,
    };
  }
}

export default UpdateManager;

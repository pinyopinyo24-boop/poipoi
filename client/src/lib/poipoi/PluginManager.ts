/**
 * Plugin Manager - PoiPoi AI Core
 * プラグイン管理
 */

import type { Plugin } from "./types";

class PluginManager {
  private plugins: Map<string, Plugin & { enabled: boolean; installedAt: string }> = new Map();

  register(plugin: Plugin): boolean {
    if (!plugin.id || !plugin.name) {
      throw new Error("プラグイン情報が不足しています");
    }

    this.plugins.set(plugin.id, {
      ...plugin,
      enabled: true,
      installedAt: new Date().toISOString(),
    });

    console.log(`✅ プラグイン登録: ${plugin.name}`);
    return true;
  }

  get(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  enable(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;

    plugin.enabled = true;
    return true;
  }

  disable(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;

    plugin.enabled = false;
    return true;
  }

  uninstall(id: string): boolean {
    return this.plugins.delete(id);
  }

  run(id: string, ...args: any[]): any {
    const plugin = this.plugins.get(id);

    if (!plugin) {
      throw new Error(`プラグインが見つかりません: ${id}`);
    }

    if (!plugin.enabled) {
      throw new Error(`プラグインが無効化されています: ${plugin.name}`);
    }

    if (!plugin.execute) {
      throw new Error(`プラグインに実行メソッドがありません: ${plugin.name}`);
    }

    console.log(`🚀 プラグイン実行: ${plugin.name}`);
    return plugin.execute(...args);
  }

  getStats() {
    const all = this.getAll();
    const enabled = all.filter((p) => p.enabled);

    return {
      total: all.length,
      enabled: enabled.length,
      disabled: all.length - enabled.length,
    };
  }
}

export default PluginManager;

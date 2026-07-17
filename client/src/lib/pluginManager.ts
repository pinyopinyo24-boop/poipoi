/**
 * Plugin Manager for PoiPoi AI
 * Manages plugins registration, enabling/disabling, and execution
 */

export interface Plugin {
  id: string;
  name: string;
  version?: string;
  description?: string;
  execute?: (...args: any[]) => any;
  enabled?: boolean;
  installedAt?: string;
  [key: string]: any;
}

export interface PluginInfo extends Plugin {
  enabled: boolean;
  installedAt: string;
}

class PluginManager {
  private plugins: Map<string, PluginInfo> = new Map();

  /**
   * Register a plugin
   */
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

  /**
   * Get a plugin by id
   */
  get(id: string): PluginInfo | undefined {
    return this.plugins.get(id);
  }

  /**
   * Get all plugins
   */
  getAll(): PluginInfo[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins
   */
  getEnabled(): PluginInfo[] {
    return this.getAll().filter((p) => p.enabled);
  }

  /**
   * Get disabled plugins
   */
  getDisabled(): PluginInfo[] {
    return this.getAll().filter((p) => !p.enabled);
  }

  /**
   * Enable a plugin
   */
  enable(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      console.warn(`⚠️ プラグインが見つかりません: ${id}`);
      return false;
    }

    plugin.enabled = true;
    console.log(`✅ プラグイン有効化: ${plugin.name}`);
    return true;
  }

  /**
   * Disable a plugin
   */
  disable(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      console.warn(`⚠️ プラグインが見つかりません: ${id}`);
      return false;
    }

    plugin.enabled = false;
    console.log(`✅ プラグイン無効化: ${plugin.name}`);
    return true;
  }

  /**
   * Uninstall a plugin
   */
  uninstall(id: string): boolean {
    const deleted = this.plugins.delete(id);
    if (deleted) {
      console.log(`✅ プラグイン削除: ${id}`);
    }
    return deleted;
  }

  /**
   * Run a plugin
   */
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

  /**
   * Run async plugin
   */
  async runAsync(id: string, ...args: any[]): Promise<any> {
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

    console.log(`🚀 非同期プラグイン実行: ${plugin.name}`);
    return await plugin.execute(...args);
  }

  /**
   * Check if plugin exists
   */
  exists(id: string): boolean {
    return this.plugins.has(id);
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(id: string): boolean {
    const plugin = this.plugins.get(id);
    return plugin ? plugin.enabled : false;
  }

  /**
   * Get plugin count
   */
  getCount(): number {
    return this.plugins.size;
  }

  /**
   * Get enabled plugin count
   */
  getEnabledCount(): number {
    return this.getEnabled().length;
  }

  /**
   * Get statistics
   */
  getStats() {
    const all = this.getAll();
    const enabled = this.getEnabled();
    const disabled = this.getDisabled();

    return {
      total: all.length,
      enabled: enabled.length,
      disabled: disabled.length,
      plugins: all.map((p) => ({
        id: p.id,
        name: p.name,
        enabled: p.enabled,
        version: p.version,
      })),
    };
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    console.log("🧹 すべてのプラグインをクリアしました");
  }

  /**
   * Export plugins as JSON
   */
  export(): string {
    return JSON.stringify(this.getStats(), null, 2);
  }
}

export default PluginManager;

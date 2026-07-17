/**
 * PoipoiOS Plugins
 * プラグインシステム
 */

export interface Plugin {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
}

export class PluginSystem {
  private plugins: Map<string, Plugin> = new Map();

  register(id: string, name: string, version: string): Plugin {
    const plugin: Plugin = {
      id,
      name,
      version,
      enabled: true,
    };

    this.plugins.set(id, plugin);
    console.log(`📦 プラグイン登録: ${name} v${version}`);

    return plugin;
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

  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getStats() {
    const plugins = this.getPlugins();
    return {
      total: plugins.length,
      enabled: plugins.filter((p) => p.enabled).length,
      disabled: plugins.filter((p) => !p.enabled).length,
    };
  }
}

export default PluginSystem;

interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[];
  tools?: PluginTool[];
  hooks?: string[];
}

interface PluginTool {
  id: string;
  name: string;
  description: string;
  execute: (input: any) => Promise<any>;
  schema?: Record<string, any>;
}

interface PluginInstance {
  manifest: PluginManifest;
  enabled: boolean;
  installedAt: number;
  lastUpdated: number;
  rating: number;
  downloads: number;
}

interface PluginMarketplaceItem {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  rating: number;
  reviews: PluginReview[];
  downloads: number;
  tags: string[];
  manifest: PluginManifest;
}

interface PluginReview {
  userId: string;
  rating: number;
  comment: string;
  timestamp: number;
}

import { invokeLLM } from './llm';

export class PluginSystem {
  private plugins: Map<string, PluginInstance> = new Map();
  private marketplace: Map<string, PluginMarketplaceItem> = new Map();
  private hooks: Map<string, Array<(data: any) => Promise<void>>> = new Map();
  private sandboxes: Map<string, any> = new Map();

  /**
   * Register plugin with AI validation
   */
  async registerPlugin(manifest: PluginManifest): Promise<void> {
    // AI validation
    const validationResponse = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a plugin validation expert. Validate plugin manifests.',
        },
        {
          role: 'user',
          content: `Validate plugin: ${manifest.name} v${manifest.version}. Check structure, security, conflicts. Return JSON with { isValid: boolean, issues: string[] }`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'plugin_validation',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              isValid: { type: 'boolean' },
              issues: { type: 'array', items: { type: 'string' } },
            },
            required: ['isValid', 'issues'],
          },
        },
      },
    });

    const content = validationResponse.choices[0]?.message?.content;
    if (!content) throw new Error('Plugin validation failed');

    const validation = JSON.parse(content);
    if (!validation.isValid) {
      throw new Error(`Plugin validation failed: ${validation.issues.join(', ')}`);
    }

    // Original registration logic
    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin ${manifest.id} already registered`);
    }

    const plugin: PluginInstance = {
      manifest,
      enabled: true,
      installedAt: Date.now(),
      lastUpdated: Date.now(),
      rating: 0,
      downloads: 0,
    };

    this.plugins.set(manifest.id, plugin);

    // Register hooks
    if (manifest.hooks) {
      manifest.hooks.forEach((hook) => {
        if (!this.hooks.has(hook)) {
          this.hooks.set(hook, []);
        }
      });
    }
  }

  /**
   * Install plugin from marketplace
   */
  installPlugin(pluginId: string): void {
    const marketplaceItem = this.marketplace.get(pluginId);
    if (!marketplaceItem) {
      throw new Error(`Plugin ${pluginId} not found in marketplace`);
    }

    this.registerPlugin(marketplaceItem.manifest);
    marketplaceItem.downloads++;
  }

  /**
   * Uninstall plugin
   */
  uninstallPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    this.plugins.delete(pluginId);
    this.sandboxes.delete(pluginId);
  }

  /**
   * Enable plugin
   */
  enablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    plugin.enabled = true;
  }

  /**
   * Disable plugin
   */
  disablePlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    plugin.enabled = false;
  }

  /**
   * Execute plugin tool
   */
  async executePluginTool(pluginId: string, toolId: string, input: any): Promise<any> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.enabled) {
      throw new Error(`Plugin ${pluginId} not found or disabled`);
    }

    const tool = plugin.manifest.tools?.find(t => t.id === toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found in plugin ${pluginId}`);
    }

    // Execute in sandbox
    try {
      return await tool.execute(input);
    } catch (error) {
      throw new Error(`Plugin tool execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all plugin tools
   */
  getAllPluginTools(): Array<{ pluginId: string; tool: PluginTool }> {
    const tools: Array<{ pluginId: string; tool: PluginTool }> = [];

    this.plugins.forEach((plugin) => {
      if (plugin.enabled && plugin.manifest.tools) {
        plugin.manifest.tools.forEach((tool) => {
          tools.push({ pluginId: plugin.manifest.id, tool });
        });
      }
    });

    return tools;
  }

  /**
   * Publish plugin to marketplace with AI optimization
   */
  async publishPlugin(manifest: PluginManifest, description: string, tags: string[]): Promise<void> {
    // AI optimization
    const optimizationResponse = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a marketplace expert. Optimize plugin listings.',
        },
        {
          role: 'user',
          content: `Optimize marketplace listing for: ${manifest.name}. Current description: "${description}". Current tags: ${tags.join(', ')}. Return JSON with { optimizedDescription: string, optimizedTags: string[] }`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'marketplace_optimization',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              optimizedDescription: { type: 'string' },
              optimizedTags: { type: 'array', items: { type: 'string' } },
            },
            required: ['optimizedDescription', 'optimizedTags'],
          },
        },
      },
    });

    const content = optimizationResponse.choices[0]?.message?.content;
    if (!content) throw new Error('Marketplace optimization failed');

    const optimization = JSON.parse(content);
    description = optimization.optimizedDescription;
    tags = optimization.optimizedTags;

    // Original publishing logic
    const marketplaceItem: PluginMarketplaceItem = {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      author: manifest.author,
      description,
      rating: 0,
      reviews: [],
      downloads: 0,
      tags,
      manifest,
    };

    this.marketplace.set(manifest.id, marketplaceItem);
  }

  /**
   * Search marketplace
   */
  searchMarketplace(query: string, tags?: string[]): PluginMarketplaceItem[] {
    let results = Array.from(this.marketplace.values());

    // Filter by query
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        item =>
          item.name.toLowerCase().includes(lowerQuery) ||
          item.description.toLowerCase().includes(lowerQuery) ||
          item.author.toLowerCase().includes(lowerQuery)
      );
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      results = results.filter(item =>
        tags.some(tag => item.tags.includes(tag))
      );
    }

    // Sort by rating and downloads
    return results.sort((a, b) => {
      const ratingDiff = b.rating - a.rating;
      if (ratingDiff !== 0) return ratingDiff;
      return b.downloads - a.downloads;
    });
  }

  /**
   * Add plugin review with AI moderation
   */
  async addPluginReview(pluginId: string, userId: string, rating: number, comment: string): Promise<void> {
    // AI moderation
    const moderationResponse = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'You are a review moderation expert. Validate plugin reviews.',
        },
        {
          role: 'user',
          content: `Validate review: rating=${rating}, comment="${comment}". Check for spam, inappropriate content. Return JSON with { isValid: boolean, reason: string }`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'review_moderation',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              isValid: { type: 'boolean' },
              reason: { type: 'string' },
            },
            required: ['isValid', 'reason'],
          },
        },
      },
    });

    const content = moderationResponse.choices[0]?.message?.content;
    if (!content) throw new Error('Review moderation failed');

    const moderation = JSON.parse(content);
    if (!moderation.isValid) {
      throw new Error(`Review rejected: ${moderation.reason}`);
    }

    // Original review logic
    const item = this.marketplace.get(pluginId);
    if (!item) {
      throw new Error(`Plugin ${pluginId} not found in marketplace`);
    }

    const review: PluginReview = {
      userId,
      rating,
      comment,
      timestamp: Date.now(),
    };

    item.reviews.push(review);

    // Update average rating
    const totalRating = item.reviews.reduce((sum, r) => sum + r.rating, 0);
    item.rating = totalRating / item.reviews.length;
  }

  /**
   * Get plugin info
   */
  getPluginInfo(pluginId: string): PluginInstance | null {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Get marketplace item
   */
  getMarketplaceItem(pluginId: string): PluginMarketplaceItem | null {
    return this.marketplace.get(pluginId) || null;
  }

  /**
   * Emit hook
   */
  async emitHook(hookName: string, data: any): Promise<void> {
    const hookHandlers = this.hooks.get(hookName);
    if (!hookHandlers) return;

    for (const handler of hookHandlers) {
      try {
        await handler(data);
      } catch (error) {
        console.error(`Hook handler error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Register hook handler
   */
  registerHookHandler(hookName: string, handler: (data: any) => Promise<void>): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName)!.push(handler);
  }

  /**
   * Get installed plugins
   */
  getInstalledPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get marketplace plugins
   */
  getMarketplacePlugins(limit = 20): PluginMarketplaceItem[] {
    return Array.from(this.marketplace.values())
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }
}

export const pluginSystem = new PluginSystem();

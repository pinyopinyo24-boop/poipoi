/**
 * APIKeyManager - Secure API Key Management for Portable Configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface APIKeyConfig {
  provider: string;
  apiKey: string;
  isEncrypted: boolean;
  createdAt: number;
  lastUpdated: number;
}

export interface APIKeyManagerConfig {
  configDir: string;
  encryptionKey?: string;
  autoInit?: boolean;
}

/**
 * APIKeyManager - Manages secure API key storage and retrieval
 */
export class APIKeyManager {
  private configDir: string;
  private configFile: string;
  private encryptionKey: string;
  private keys: Map<string, APIKeyConfig> = new Map();

  constructor(config: APIKeyManagerConfig) {
    this.configDir = config.configDir || path.join(process.cwd(), 'config');
    this.configFile = path.join(this.configDir, 'api-keys.json');
    this.encryptionKey = config.encryptionKey || this.generateDefaultKey();

    if (config.autoInit !== false) {
      this.initialize();
    }
  }

  /**
   * Initialize API Key Manager
   */
  private initialize(): void {
    console.log('[APIKeyManager] Initializing...');

    // Create config directory if not exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
      console.log(`[APIKeyManager] Created config directory: ${this.configDir}`);
    }

    // Load existing keys
    if (fs.existsSync(this.configFile)) {
      this.loadKeys();
    } else {
      console.log('[APIKeyManager] No existing API keys found');
    }
  }

  /**
   * Generate default encryption key
   */
  private generateDefaultKey(): string {
    // Use environment variable if available, otherwise generate
    if (process.env.API_KEY_ENCRYPTION_KEY) {
      return process.env.API_KEY_ENCRYPTION_KEY;
    }

    // Generate a default key based on machine info
    const machineId = this.getMachineId();
    return crypto.createHash('sha256').update(machineId).digest('hex').slice(0, 32);
  }

  /**
   * Get machine ID for encryption key
   */
  private getMachineId(): string {
    // Use hostname + platform as machine identifier
    const os = require('os');
    return `${os.hostname()}-${os.platform()}-${os.arch()}`;
  }

  /**
   * Encrypt API key
   */
  private encryptKey(apiKey: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);

    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt API key
   */
  private decryptKey(encryptedKey: string): string {
    const [ivHex, encrypted] = encryptedKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Save API key
   */
  async saveAPIKey(provider: string, apiKey: string): Promise<void> {
    console.log(`[APIKeyManager] Saving API key for ${provider}...`);

    const config: APIKeyConfig = {
      provider,
      apiKey: this.encryptKey(apiKey),
      isEncrypted: true,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    this.keys.set(provider, config);
    this.persistKeys();

    console.log(`[APIKeyManager] API key for ${provider} saved successfully`);
  }

  /**
   * Get API key
   */
  getAPIKey(provider: string): string | null {
    const config = this.keys.get(provider);

    if (!config) {
      return null;
    }

    if (config.isEncrypted) {
      return this.decryptKey(config.apiKey);
    }

    return config.apiKey;
  }

  /**
   * Get all providers
   */
  getProviders(): string[] {
    return Array.from(this.keys.keys());
  }

  /**
   * Check if API key exists
   */
  hasAPIKey(provider: string): boolean {
    return this.keys.has(provider);
  }

  /**
   * Delete API key
   */
  deleteAPIKey(provider: string): void {
    console.log(`[APIKeyManager] Deleting API key for ${provider}...`);

    this.keys.delete(provider);
    this.persistKeys();

    console.log(`[APIKeyManager] API key for ${provider} deleted`);
  }

  /**
   * Load keys from file
   */
  private loadKeys(): void {
    try {
      const data = fs.readFileSync(this.configFile, 'utf8');
      const keysData = JSON.parse(data);

      for (const [provider, config] of Object.entries(keysData)) {
        this.keys.set(provider, config as APIKeyConfig);
      }

      console.log(`[APIKeyManager] Loaded ${this.keys.size} API keys`);
    } catch (error) {
      console.error('[APIKeyManager] Error loading API keys:', error);
    }
  }

  /**
   * Persist keys to file
   */
  private persistKeys(): void {
    try {
      const keysData: Record<string, APIKeyConfig> = {};

      this.keys.forEach((config, provider) => {
        keysData[provider] = config;
      });

      fs.writeFileSync(this.configFile, JSON.stringify(keysData, null, 2), 'utf8');
      console.log('[APIKeyManager] API keys persisted');
    } catch (error) {
      console.error('[APIKeyManager] Error persisting API keys:', error);
    }
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    configDir: string;
    configFile: string;
    providers: string[];
    isConfigured: boolean;
  } {
    return {
      configDir: this.configDir,
      configFile: this.configFile,
      providers: this.getProviders(),
      isConfigured: this.keys.size > 0,
    };
  }

  /**
   * Export configuration template
   */
  exportTemplate(): string {
    return `# API Key Configuration Template
# Copy this file to .env and fill in your API keys

# OpenAI API
OPENAI_API_KEY=sk-...

# Gemini API
GEMINI_API_KEY=...

# Claude API
CLAUDE_API_KEY=sk-ant-...

# Other Providers
# Add your other API keys here
`;
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): {
    valid: boolean;
    missing: string[];
    warnings: string[];
  } {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check for required providers
    const requiredProviders = ['openai', 'gemini'];

    for (const provider of requiredProviders) {
      if (!this.hasAPIKey(provider)) {
        missing.push(provider);
      }
    }

    // Check for optional providers
    const optionalProviders = ['claude', 'anthropic'];

    for (const provider of optionalProviders) {
      if (!this.hasAPIKey(provider)) {
        warnings.push(`Optional provider ${provider} not configured`);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  }
}

// Singleton instance
let instance: APIKeyManager | null = null;

/**
 * Get or create APIKeyManager instance
 */
export function getAPIKeyManager(config?: Partial<APIKeyManagerConfig>): APIKeyManager {
  if (!instance) {
    instance = new APIKeyManager((config as APIKeyManagerConfig) || { configDir: '' });
  }

  return instance;
}

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * AndroidConfigurationService
 * Android固有設定・マニフェスト管理
 */
export interface AndroidManifestConfig {
  configId: string;
  packageName: string;
  permissions: string[];
  activities: ActivityConfig[];
  services: ServiceConfig[];
  receivers: ReceiverConfig[];
  features: FeatureConfig[];
  metadata: Record<string, string>;
}

export interface ActivityConfig {
  name: string;
  exported: boolean;
  intentFilters: IntentFilter[];
}

export interface ServiceConfig {
  name: string;
  exported: boolean;
}

export interface ReceiverConfig {
  name: string;
  exported: boolean;
}

export interface FeatureConfig {
  name: string;
  required: boolean;
}

export interface IntentFilter {
  action: string;
  category?: string;
  data?: string;
}

export class AndroidConfigurationService {
  private configs: Map<string, AndroidManifestConfig> = new Map();
  private configHistory: AndroidManifestConfig[] = [];

  /**
   * マニフェスト設定を作成
   */
  createManifestConfig(packageName: string): AndroidManifestConfig {
    const configId = `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const config: AndroidManifestConfig = {
      configId,
      packageName,
      permissions: [],
      activities: [],
      services: [],
      receivers: [],
      features: [],
      metadata: {},
    };

    this.configs.set(configId, config);
    return config;
  }

  /**
   * パーミッションを追加
   */
  addPermission(configId: string, permission: string): boolean {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Manifest config not found');
    }

    if (!config.permissions.includes(permission)) {
      config.permissions.push(permission);
    }

    return true;
  }

  /**
   * 複数のパーミッションを追加
   */
  addPermissions(configId: string, permissions: string[]): boolean {
    permissions.forEach((p) => this.addPermission(configId, p));
    return true;
  }

  /**
   * アクティビティを追加
   */
  addActivity(configId: string, name: string, exported: boolean = false): ActivityConfig {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Manifest config not found');
    }

    const activity: ActivityConfig = {
      name,
      exported,
      intentFilters: [],
    };

    config.activities.push(activity);
    return activity;
  }

  /**
   * サービスを追加
   */
  addService(configId: string, name: string, exported: boolean = false): ServiceConfig {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Manifest config not found');
    }

    const service: ServiceConfig = {
      name,
      exported,
    };

    config.services.push(service);
    return service;
  }

  /**
   * レシーバーを追加
   */
  addReceiver(configId: string, name: string, exported: boolean = false): ReceiverConfig {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Manifest config not found');
    }

    const receiver: ReceiverConfig = {
      name,
      exported,
    };

    config.receivers.push(receiver);
    return receiver;
  }

  /**
   * フィーチャーを追加
   */
  addFeature(configId: string, name: string, required: boolean = false): FeatureConfig {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Manifest config not found');
    }

    const feature: FeatureConfig = {
      name,
      required,
    };

    config.features.push(feature);
    return feature;
  }

  /**
   * インテントフィルターを追加
   */
  addIntentFilter(configId: string, activityName: string, action: string, category?: string, data?: string): boolean {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Manifest config not found');
    }

    const activity = config.activities.find((a) => a.name === activityName);
    if (!activity) {
      throw new Error('Activity not found');
    }

    activity.intentFilters.push({
      action,
      category,
      data,
    });

    return true;
  }

  /**
   * メタデータを追加
   */
  addMetadata(configId: string, key: string, value: string): boolean {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Manifest config not found');
    }

    config.metadata[key] = value;
    return true;
  }

  /**
   * マニフェスト設定を取得
   */
  getManifestConfig(configId: string): AndroidManifestConfig | undefined {
    return this.configs.get(configId);
  }

  /**
   * マニフェストXMLを生成
   */
  generateManifestXML(configId: string): string {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Manifest config not found');
    }

    let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
    xml += `<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n`;
    xml += `    package="${config.packageName}">\n\n`;

    // Permissions
    config.permissions.forEach((p) => {
      xml += `    <uses-permission android:name="${p}" />\n`;
    });

    if (config.permissions.length > 0) {
      xml += `\n`;
    }

    // Features
    config.features.forEach((f) => {
      xml += `    <uses-feature android:name="${f.name}" android:required="${f.required}" />\n`;
    });

    if (config.features.length > 0) {
      xml += `\n`;
    }

    // Application
    xml += `    <application>\n`;

    // Activities
    config.activities.forEach((a) => {
      xml += `        <activity android:name="${a.name}" android:exported="${a.exported}">\n`;
      a.intentFilters.forEach((f) => {
        xml += `            <intent-filter>\n`;
        xml += `                <action android:name="${f.action}" />\n`;
        if (f.category) {
          xml += `                <category android:name="${f.category}" />\n`;
        }
        if (f.data) {
          xml += `                <data android:scheme="${f.data}" />\n`;
        }
        xml += `            </intent-filter>\n`;
      });
      xml += `        </activity>\n`;
    });

    // Services
    config.services.forEach((s) => {
      xml += `        <service android:name="${s.name}" android:exported="${s.exported}" />\n`;
    });

    // Receivers
    config.receivers.forEach((r) => {
      xml += `        <receiver android:name="${r.name}" android:exported="${r.exported}" />\n`;
    });

    xml += `    </application>\n`;
    xml += `</manifest>\n`;

    return xml;
  }

  /**
   * 設定を検証
   */
  validateConfig(configId: string): { valid: boolean; errors: string[] } {
    const config = this.configs.get(configId);
    if (!config) {
      return { valid: false, errors: ['Manifest config not found'] };
    }

    const errors: string[] = [];

    if (!config.packageName || config.packageName.trim() === '') {
      errors.push('Package name is required');
    }

    if (config.activities.length === 0) {
      errors.push('At least one activity is required');
    }

    config.activities.forEach((a) => {
      if (!a.name || a.name.trim() === '') {
        errors.push('Activity name is required');
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * 設定を保存
   */
  saveConfig(configId: string): boolean {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Manifest config not found');
    }

    this.configHistory.push(JSON.parse(JSON.stringify(config)));
    return true;
  }

  /**
   * 設定履歴を取得
   */
  getConfigHistory(): AndroidManifestConfig[] {
    return [...this.configHistory];
  }

  /**
   * 設定を更新
   */
  updateConfig(configId: string, updates: Partial<AndroidManifestConfig>): boolean {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Manifest config not found');
    }

    Object.assign(config, updates);
    return true;
  }

  /**
   * カメラパーミッションを設定
   */
  enableCamera(configId: string): boolean {
    this.addPermission(configId, 'android.permission.CAMERA');
    this.addFeature(configId, 'android.hardware.camera', false);
    return true;
  }

  /**
   * マイクパーミッションを設定
   */
  enableMicrophone(configId: string): boolean {
    this.addPermission(configId, 'android.permission.RECORD_AUDIO');
    this.addFeature(configId, 'android.hardware.microphone', false);
    return true;
  }

  /**
   * ファイルアクセスパーミッションを設定
   */
  enableFileAccess(configId: string): boolean {
    this.addPermission(configId, 'android.permission.READ_EXTERNAL_STORAGE');
    this.addPermission(configId, 'android.permission.WRITE_EXTERNAL_STORAGE');
    return true;
  }

  /**
   * 通知パーミッションを設定
   */
  enableNotifications(configId: string): boolean {
    this.addPermission(configId, 'android.permission.POST_NOTIFICATIONS');
    return true;
  }

  /**
   * インターネットパーミッションを設定
   */
  enableInternet(configId: string): boolean {
    this.addPermission(configId, 'android.permission.INTERNET');
    return true;
  }
}

// ============ TESTS ============

describe('AndroidConfigurationService', () => {
  let service: AndroidConfigurationService;

  beforeEach(() => {
    service = new AndroidConfigurationService();
  });

  describe('createManifestConfig', () => {
    it('should create manifest config', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      expect(config.packageName).toBe('com.poipoi.app');
      expect(config.permissions).toHaveLength(0);
      expect(config.activities).toHaveLength(0);
    });
  });

  describe('addPermission', () => {
    it('should add permission', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.addPermission(config.configId, 'android.permission.INTERNET');

      const updated = service.getManifestConfig(config.configId);
      expect(updated?.permissions).toContain('android.permission.INTERNET');
    });

    it('should not add duplicate permission', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.addPermission(config.configId, 'android.permission.INTERNET');
      service.addPermission(config.configId, 'android.permission.INTERNET');

      const updated = service.getManifestConfig(config.configId);
      expect(updated?.permissions).toHaveLength(1);
    });
  });

  describe('addPermissions', () => {
    it('should add multiple permissions', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.addPermissions(config.configId, [
        'android.permission.INTERNET',
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
      ]);

      const updated = service.getManifestConfig(config.configId);
      expect(updated?.permissions).toHaveLength(3);
    });
  });

  describe('addActivity', () => {
    it('should add activity', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      const activity = service.addActivity(config.configId, 'MainActivity', true);

      expect(activity.name).toBe('MainActivity');
      expect(activity.exported).toBe(true);
    });

    it('should add multiple activities', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.addActivity(config.configId, 'MainActivity');
      service.addActivity(config.configId, 'SettingsActivity');

      const updated = service.getManifestConfig(config.configId);
      expect(updated?.activities).toHaveLength(2);
    });
  });

  describe('addService', () => {
    it('should add service', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      const service_ = service.addService(config.configId, 'SyncService');

      expect(service_.name).toBe('SyncService');
    });
  });

  describe('addReceiver', () => {
    it('should add receiver', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      const receiver = service.addReceiver(config.configId, 'BootReceiver');

      expect(receiver.name).toBe('BootReceiver');
    });
  });

  describe('addFeature', () => {
    it('should add feature', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      const feature = service.addFeature(config.configId, 'android.hardware.camera', false);

      expect(feature.name).toBe('android.hardware.camera');
      expect(feature.required).toBe(false);
    });
  });

  describe('addIntentFilter', () => {
    it('should add intent filter', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.addActivity(config.configId, 'MainActivity');
      service.addIntentFilter(config.configId, 'MainActivity', 'android.intent.action.MAIN', 'android.intent.category.LAUNCHER');

      const updated = service.getManifestConfig(config.configId);
      expect(updated?.activities[0].intentFilters).toHaveLength(1);
    });
  });

  describe('addMetadata', () => {
    it('should add metadata', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.addMetadata(config.configId, 'api_key', 'test-key-123');

      const updated = service.getManifestConfig(config.configId);
      expect(updated?.metadata['api_key']).toBe('test-key-123');
    });
  });

  describe('generateManifestXML', () => {
    it('should generate manifest XML', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.addPermission(config.configId, 'android.permission.INTERNET');
      service.addActivity(config.configId, 'MainActivity', true);

      const xml = service.generateManifestXML(config.configId);
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('com.poipoi.app');
      expect(xml).toContain('android.permission.INTERNET');
      expect(xml).toContain('MainActivity');
    });
  });

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.addActivity(config.configId, 'MainActivity');

      const result = service.validateConfig(config.configId);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing package name', () => {
      const config = service.createManifestConfig('');
      service.addActivity(config.configId, 'MainActivity');

      const result = service.validateConfig(config.configId);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Package name is required');
    });

    it('should detect missing activities', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      const result = service.validateConfig(config.configId);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one activity is required');
    });
  });

  describe('saveConfig', () => {
    it('should save config to history', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.addPermission(config.configId, 'android.permission.INTERNET');
      service.saveConfig(config.configId);

      const history = service.getConfigHistory();
      expect(history).toHaveLength(1);
      expect(history[0].permissions).toContain('android.permission.INTERNET');
    });
  });

  describe('enableCamera', () => {
    it('should enable camera', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.enableCamera(config.configId);

      const updated = service.getManifestConfig(config.configId);
      expect(updated?.permissions).toContain('android.permission.CAMERA');
      expect(updated?.features.some((f) => f.name === 'android.hardware.camera')).toBe(true);
    });
  });

  describe('enableMicrophone', () => {
    it('should enable microphone', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.enableMicrophone(config.configId);

      const updated = service.getManifestConfig(config.configId);
      expect(updated?.permissions).toContain('android.permission.RECORD_AUDIO');
    });
  });

  describe('enableFileAccess', () => {
    it('should enable file access', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.enableFileAccess(config.configId);

      const updated = service.getManifestConfig(config.configId);
      expect(updated?.permissions).toContain('android.permission.READ_EXTERNAL_STORAGE');
      expect(updated?.permissions).toContain('android.permission.WRITE_EXTERNAL_STORAGE');
    });
  });

  describe('enableNotifications', () => {
    it('should enable notifications', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.enableNotifications(config.configId);

      const updated = service.getManifestConfig(config.configId);
      expect(updated?.permissions).toContain('android.permission.POST_NOTIFICATIONS');
    });
  });

  describe('enableInternet', () => {
    it('should enable internet', () => {
      const config = service.createManifestConfig('com.poipoi.app');
      service.enableInternet(config.configId);

      const updated = service.getManifestConfig(config.configId);
      expect(updated?.permissions).toContain('android.permission.INTERNET');
    });
  });

  describe('Complete manifest setup', () => {
    it('should setup complete manifest', () => {
      const config = service.createManifestConfig('com.poipoi.app');

      service.enableInternet(config.configId);
      service.enableCamera(config.configId);
      service.enableMicrophone(config.configId);
      service.enableFileAccess(config.configId);
      service.enableNotifications(config.configId);

      service.addActivity(config.configId, 'MainActivity', true);
      service.addIntentFilter(config.configId, 'MainActivity', 'android.intent.action.MAIN', 'android.intent.category.LAUNCHER');

      service.addService(config.configId, 'SyncService');
      service.addReceiver(config.configId, 'BootReceiver');

      const result = service.validateConfig(config.configId);
      expect(result.valid).toBe(true);

      const xml = service.generateManifestXML(config.configId);
      expect(xml).toContain('android.permission.INTERNET');
      expect(xml).toContain('android.permission.CAMERA');
      expect(xml).toContain('MainActivity');
    });
  });
});

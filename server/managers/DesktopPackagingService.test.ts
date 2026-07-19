import { describe, it, expect, beforeEach } from 'vitest';
import { DesktopPackagingService } from './DesktopPackagingService';

describe('DesktopPackagingService', () => {
  let service: DesktopPackagingService;

  beforeEach(() => {
    service = new DesktopPackagingService();
  });

  describe('createDesktopPackage', () => {
    it('should create desktop package', () => {
      const pkg = service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        ['dotnet', 'vcredist']
      );

      expect(pkg).toBeDefined();
      expect(pkg.packageId).toMatch(/^DSK-/);
      expect(pkg.status).toBe('building');
    });
  });

  describe('getDesktopPackage', () => {
    it('should retrieve desktop package', () => {
      const created = service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );
      const retrieved = service.getDesktopPackage(created.packageId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('v1.0.0');
    });
  });

  describe('getDesktopPackagesByVersion', () => {
    it('should retrieve packages by version', () => {
      service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app1.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );
      service.createDesktopPackage(
        'v1.0.0',
        'build-002',
        'macos',
        'arm64',
        '/path/to/app.dmg',
        104857600,
        'installer',
        { minOs: 'macOS 11', minRam: 4096, minDisk: 1024 },
        []
      );

      const v1Pkgs = service.getDesktopPackagesByVersion('v1.0.0');
      expect(v1Pkgs.length).toBe(2);
    });
  });

  describe('getDesktopPackagesByPlatform', () => {
    it('should retrieve packages by platform', () => {
      service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app1.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );
      service.createDesktopPackage(
        'v1.0.0',
        'build-002',
        'windows',
        'arm64',
        '/path/to/app2.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );
      service.createDesktopPackage(
        'v1.0.0',
        'build-003',
        'macos',
        'arm64',
        '/path/to/app.dmg',
        104857600,
        'installer',
        { minOs: 'macOS 11', minRam: 4096, minDisk: 1024 },
        []
      );

      const winPkgs = service.getDesktopPackagesByPlatform('windows');
      expect(winPkgs.length).toBe(2);
    });
  });

  describe('getAllDesktopPackages', () => {
    it('should retrieve all packages', () => {
      service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app1.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );
      service.createDesktopPackage(
        'v1.0.0',
        'build-002',
        'macos',
        'arm64',
        '/path/to/app.dmg',
        104857600,
        'installer',
        { minOs: 'macOS 11', minRam: 4096, minDisk: 1024 },
        []
      );

      const all = service.getAllDesktopPackages();
      expect(all.length).toBe(2);
    });
  });

  describe('getLatestDesktopPackage', () => {
    it('should retrieve latest package', async () => {
      service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app1.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );
      await new Promise(resolve => setTimeout(resolve, 10));
      const pkg2 = service.createDesktopPackage(
        'v1.0.0',
        'build-002',
        'macos',
        'arm64',
        '/path/to/app.dmg',
        104857600,
        'installer',
        { minOs: 'macOS 11', minRam: 4096, minDisk: 1024 },
        []
      );

      const latest = service.getLatestDesktopPackage();
      expect(latest?.packageId).toBe(pkg2.packageId);
    });
  });

  describe('updatePackageStatus', () => {
    it('should update package status', () => {
      const pkg = service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );

      const result = service.updatePackageStatus(pkg.packageId, 'testing');

      expect(result).toBe(true);

      const updated = service.getDesktopPackage(pkg.packageId);
      expect(updated?.status).toBe('testing');
    });
  });

  describe('createDesktopSignature', () => {
    it('should create desktop signature', () => {
      const pkg = service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );
      const sig = service.createDesktopSignature(
        pkg.packageId,
        '/path/to/cert.pfx',
        'AA:BB:CC:DD',
        1609459200000,
        1672531200000
      );

      expect(sig).toBeDefined();
      expect(sig.signatureId).toMatch(/^DSIG-/);
      expect(sig.signatureStatus).toBe('valid');
    });
  });

  describe('getDesktopSignature', () => {
    it('should retrieve desktop signature', () => {
      const pkg = service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );
      const created = service.createDesktopSignature(
        pkg.packageId,
        '/path/to/cert.pfx',
        'AA:BB:CC:DD',
        1609459200000,
        1672531200000
      );
      const retrieved = service.getDesktopSignature(created.signatureId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.certificateThumbprint).toBe('AA:BB:CC:DD');
    });
  });

  describe('getSignaturesByPackage', () => {
    it('should retrieve signatures by package', () => {
      const pkg = service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );

      service.createDesktopSignature(
        pkg.packageId,
        '/path/to/cert.pfx',
        'AA:BB:CC:DD',
        1609459200000,
        1672531200000
      );

      const sigs = service.getSignaturesByPackage(pkg.packageId);
      expect(sigs.length).toBe(1);
    });
  });

  describe('createBrowserCompatibility', () => {
    it('should create browser compatibility', () => {
      const pkg = service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );
      const compat = service.createBrowserCompatibility(
        pkg.packageId,
        'chrome',
        '120.0',
        'compatible',
        { chat: true, memory: true },
        []
      );

      expect(compat).toBeDefined();
      expect(compat.compatibilityId).toMatch(/^COMPAT-/);
      expect(compat.status).toBe('compatible');
    });
  });

  describe('getBrowserCompatibility', () => {
    it('should retrieve browser compatibility', () => {
      const pkg = service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );
      const created = service.createBrowserCompatibility(
        pkg.packageId,
        'firefox',
        '121.0',
        'compatible',
        { chat: true },
        []
      );
      const retrieved = service.getBrowserCompatibility(created.compatibilityId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.browser).toBe('firefox');
    });
  });

  describe('getCompatibilitiesByPackage', () => {
    it('should retrieve compatibilities by package', () => {
      const pkg = service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );

      service.createBrowserCompatibility(
        pkg.packageId,
        'chrome',
        '120.0',
        'compatible',
        {},
        []
      );
      service.createBrowserCompatibility(
        pkg.packageId,
        'firefox',
        '121.0',
        'compatible',
        {},
        []
      );

      const compats = service.getCompatibilitiesByPackage(pkg.packageId);
      expect(compats.length).toBe(2);
    });
  });

  describe('getDesktopStats', () => {
    it('should calculate desktop statistics', () => {
      const pkg = service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );

      service.createDesktopSignature(
        pkg.packageId,
        '/path/to/cert.pfx',
        'AA:BB:CC:DD',
        1609459200000,
        1672531200000
      );
      service.createBrowserCompatibility(
        pkg.packageId,
        'chrome',
        '120.0',
        'compatible',
        {},
        []
      );

      const stats = service.getDesktopStats();

      expect(stats.totalPackages).toBe(1);
      expect(stats.windowsPackages).toBe(1);
      expect(stats.totalSignatures).toBe(1);
      expect(stats.totalCompatibilities).toBe(1);
    });
  });

  describe('deleteDesktopPackage', () => {
    it('should delete desktop package', () => {
      const pkg = service.createDesktopPackage(
        'v1.0.0',
        'build-001',
        'windows',
        'x64',
        '/path/to/app.exe',
        104857600,
        'installer',
        { minOs: 'Windows 10', minRam: 4096, minDisk: 1024 },
        []
      );

      const result = service.deleteDesktopPackage(pkg.packageId);

      expect(result).toBe(true);
      expect(service.getDesktopPackage(pkg.packageId)).toBeUndefined();
    });
  });
});

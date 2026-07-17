import { describe, it, expect, beforeEach } from 'vitest';
import { APKPackagingService } from './APKPackagingService';

describe('APKPackagingService', () => {
  let service: APKPackagingService;

  beforeEach(() => {
    service = new APKPackagingService();
  });

  describe('createAPKPackage', () => {
    it('should create APK package', () => {
      const pkg = service.createAPKPackage(
        'v1.0.0',
        'build-001',
        '/path/to/app.apk',
        5242880,
        21,
        33,
        ['INTERNET', 'CAMERA'],
        ['Chat', 'Memory']
      );

      expect(pkg).toBeDefined();
      expect(pkg.packageId).toMatch(/^APK-/);
      expect(pkg.status).toBe('building');
    });
  });

  describe('getAPKPackage', () => {
    it('should retrieve APK package', () => {
      const created = service.createAPKPackage(
        'v1.0.0',
        'build-001',
        '/path/to/app.apk',
        5242880,
        21,
        33,
        [],
        []
      );
      const retrieved = service.getAPKPackage(created.packageId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('v1.0.0');
    });
  });

  describe('getAPKPackagesByVersion', () => {
    it('should retrieve APKs by version', () => {
      service.createAPKPackage('v1.0.0', 'build-001', '/path/to/app1.apk', 5242880, 21, 33, [], []);
      service.createAPKPackage('v1.0.0', 'build-002', '/path/to/app2.apk', 5242880, 21, 33, [], []);
      service.createAPKPackage('v1.1.0', 'build-003', '/path/to/app3.apk', 5242880, 21, 33, [], []);

      const v1Pkgs = service.getAPKPackagesByVersion('v1.0.0');
      expect(v1Pkgs.length).toBe(2);
    });
  });

  describe('getAllAPKPackages', () => {
    it('should retrieve all APK packages', () => {
      service.createAPKPackage('v1.0.0', 'build-001', '/path/to/app1.apk', 5242880, 21, 33, [], []);
      service.createAPKPackage('v1.1.0', 'build-002', '/path/to/app2.apk', 5242880, 21, 33, [], []);

      const all = service.getAllAPKPackages();
      expect(all.length).toBe(2);
    });
  });

  describe('getLatestAPKPackage', () => {
    it('should retrieve latest APK package', async () => {
      service.createAPKPackage('v1.0.0', 'build-001', '/path/to/app1.apk', 5242880, 21, 33, [], []);
      await new Promise(resolve => setTimeout(resolve, 10));
      const pkg2 = service.createAPKPackage(
        'v1.0.0',
        'build-002',
        '/path/to/app2.apk',
        5242880,
        21,
        33,
        [],
        []
      );

      const latest = service.getLatestAPKPackage();
      expect(latest?.packageId).toBe(pkg2.packageId);
    });
  });

  describe('updateAPKStatus', () => {
    it('should update APK status', () => {
      const pkg = service.createAPKPackage(
        'v1.0.0',
        'build-001',
        '/path/to/app.apk',
        5242880,
        21,
        33,
        [],
        []
      );

      const result = service.updateAPKStatus(pkg.packageId, 'signing');

      expect(result).toBe(true);

      const updated = service.getAPKPackage(pkg.packageId);
      expect(updated?.status).toBe('signing');
    });
  });

  describe('createAPKSignature', () => {
    it('should create APK signature', () => {
      const pkg = service.createAPKPackage(
        'v1.0.0',
        'build-001',
        '/path/to/app.apk',
        5242880,
        21,
        33,
        [],
        []
      );
      const sig = service.createAPKSignature(
        pkg.packageId,
        '/path/to/keystore.jks',
        'release',
        1609459200000,
        1672531200000,
        'AA:BB:CC:DD',
        'SHA256'
      );

      expect(sig).toBeDefined();
      expect(sig.signatureId).toMatch(/^SIG-/);
      expect(sig.signatureStatus).toBe('valid');
    });
  });

  describe('getAPKSignature', () => {
    it('should retrieve APK signature', () => {
      const pkg = service.createAPKPackage(
        'v1.0.0',
        'build-001',
        '/path/to/app.apk',
        5242880,
        21,
        33,
        [],
        []
      );
      const created = service.createAPKSignature(
        pkg.packageId,
        '/path/to/keystore.jks',
        'release',
        1609459200000,
        1672531200000,
        'AA:BB:CC:DD',
        'SHA256'
      );
      const retrieved = service.getAPKSignature(created.signatureId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.keyAlias).toBe('release');
    });
  });

  describe('getSignaturesByPackage', () => {
    it('should retrieve signatures by package', () => {
      const pkg = service.createAPKPackage(
        'v1.0.0',
        'build-001',
        '/path/to/app.apk',
        5242880,
        21,
        33,
        [],
        []
      );

      service.createAPKSignature(
        pkg.packageId,
        '/path/to/keystore.jks',
        'release',
        1609459200000,
        1672531200000,
        'AA:BB:CC:DD',
        'SHA256'
      );

      const sigs = service.getSignaturesByPackage(pkg.packageId);
      expect(sigs.length).toBe(1);
    });
  });

  describe('getAllAPKSignatures', () => {
    it('should retrieve all APK signatures', () => {
      const pkg1 = service.createAPKPackage(
        'v1.0.0',
        'build-001',
        '/path/to/app1.apk',
        5242880,
        21,
        33,
        [],
        []
      );
      const pkg2 = service.createAPKPackage(
        'v1.0.0',
        'build-002',
        '/path/to/app2.apk',
        5242880,
        21,
        33,
        [],
        []
      );

      service.createAPKSignature(
        pkg1.packageId,
        '/path/to/keystore.jks',
        'release',
        1609459200000,
        1672531200000,
        'AA:BB:CC:DD',
        'SHA256'
      );
      service.createAPKSignature(
        pkg2.packageId,
        '/path/to/keystore.jks',
        'release',
        1609459200000,
        1672531200000,
        'AA:BB:CC:DD',
        'SHA256'
      );

      const all = service.getAllAPKSignatures();
      expect(all.length).toBe(2);
    });
  });

  describe('createAPKOptimization', () => {
    it('should create APK optimization', () => {
      const pkg = service.createAPKPackage(
        'v1.0.0',
        'build-001',
        '/path/to/app.apk',
        5242880,
        21,
        33,
        [],
        []
      );
      const opt = service.createAPKOptimization(
        pkg.packageId,
        5242880,
        4194304,
        'all',
        { resources: 0.2, code: 0.1 }
      );

      expect(opt).toBeDefined();
      expect(opt.optimizationId).toMatch(/^OPT-/);
      expect(opt.compressionRatio).toBeGreaterThan(0);
    });
  });

  describe('getAPKOptimization', () => {
    it('should retrieve APK optimization', () => {
      const pkg = service.createAPKPackage(
        'v1.0.0',
        'build-001',
        '/path/to/app.apk',
        5242880,
        21,
        33,
        [],
        []
      );
      const created = service.createAPKOptimization(
        pkg.packageId,
        5242880,
        4194304,
        'all',
        {}
      );
      const retrieved = service.getAPKOptimization(created.optimizationId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.optimizationType).toBe('all');
    });
  });

  describe('getOptimizationsByPackage', () => {
    it('should retrieve optimizations by package', () => {
      const pkg = service.createAPKPackage(
        'v1.0.0',
        'build-001',
        '/path/to/app.apk',
        5242880,
        21,
        33,
        [],
        []
      );

      service.createAPKOptimization(pkg.packageId, 5242880, 4194304, 'resource', {});
      service.createAPKOptimization(pkg.packageId, 4194304, 3145728, 'code', {});

      const opts = service.getOptimizationsByPackage(pkg.packageId);
      expect(opts.length).toBe(2);
    });
  });

  describe('getAllAPKOptimizations', () => {
    it('should retrieve all APK optimizations', () => {
      const pkg = service.createAPKPackage(
        'v1.0.0',
        'build-001',
        '/path/to/app.apk',
        5242880,
        21,
        33,
        [],
        []
      );

      service.createAPKOptimization(pkg.packageId, 5242880, 4194304, 'all', {});

      const all = service.getAllAPKOptimizations();
      expect(all.length).toBe(1);
    });
  });

  describe('getAPKStats', () => {
    it('should calculate APK statistics', () => {
      const pkg = service.createAPKPackage(
        'v1.0.0',
        'build-001',
        '/path/to/app.apk',
        5242880,
        21,
        33,
        [],
        []
      );

      service.createAPKSignature(
        pkg.packageId,
        '/path/to/keystore.jks',
        'release',
        1609459200000,
        1672531200000,
        'AA:BB:CC:DD',
        'SHA256'
      );
      service.createAPKOptimization(pkg.packageId, 5242880, 4194304, 'all', {});

      const stats = service.getAPKStats();

      expect(stats.totalPackages).toBe(1);
      expect(stats.buildingPackages).toBe(1);
      expect(stats.totalSignatures).toBe(1);
      expect(stats.totalOptimizations).toBe(1);
    });
  });

  describe('deleteAPKPackage', () => {
    it('should delete APK package', () => {
      const pkg = service.createAPKPackage(
        'v1.0.0',
        'build-001',
        '/path/to/app.apk',
        5242880,
        21,
        33,
        [],
        []
      );

      const result = service.deleteAPKPackage(pkg.packageId);

      expect(result).toBe(true);
      expect(service.getAPKPackage(pkg.packageId)).toBeUndefined();
    });
  });
});

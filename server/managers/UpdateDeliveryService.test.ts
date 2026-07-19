import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateDeliveryService } from './UpdateDeliveryService';

describe('UpdateDeliveryService', () => {
  let service: UpdateDeliveryService;

  beforeEach(() => {
    service = new UpdateDeliveryService();
  });

  describe('createAppUpdate', () => {
    it('should create an app update', () => {
      const update = service.createAppUpdate(
        '1.1.0',
        'Bug fixes',
        'patch',
        ['Fix 1', 'Fix 2'],
        'https://example.com/update.apk',
        50000000,
        'abc123'
      );

      expect(update).toBeDefined();
      expect(update.status).toBe('draft');
      expect(update.updateId).toMatch(/^UPD-/);
    });
  });

  describe('getAppUpdate', () => {
    it('should retrieve an app update', () => {
      const created = service.createAppUpdate(
        '1.1.0',
        'Bug fixes',
        'patch',
        [],
        'https://example.com/update.apk',
        50000000,
        'abc123'
      );
      const retrieved = service.getAppUpdate(created.updateId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.version).toBe('1.1.0');
    });
  });

  describe('getAppUpdatesByStatus', () => {
    it('should retrieve updates by status', () => {
      service.createAppUpdate('1.1.0', 'Desc', 'patch', [], 'url', 1000, 'hash');
      service.createAppUpdate('1.2.0', 'Desc', 'minor', [], 'url', 1000, 'hash');

      const draft = service.getAppUpdatesByStatus('draft');
      expect(draft.length).toBe(2);
    });
  });

  describe('stageAppUpdate', () => {
    it('should stage an app update', () => {
      const update = service.createAppUpdate('1.1.0', 'Desc', 'patch', [], 'url', 1000, 'hash');
      const result = service.stageAppUpdate(update.updateId);

      expect(result).toBe(true);

      const staged = service.getAppUpdate(update.updateId);
      expect(staged?.status).toBe('staged');
    });
  });

  describe('releaseAppUpdate', () => {
    it('should release an app update', () => {
      const update = service.createAppUpdate('1.1.0', 'Desc', 'patch', [], 'url', 1000, 'hash');
      service.stageAppUpdate(update.updateId);

      const result = service.releaseAppUpdate(update.updateId);

      expect(result).toBe(true);

      const released = service.getAppUpdate(update.updateId);
      expect(released?.status).toBe('released');
    });
  });

  describe('createModelUpdate', () => {
    it('should create a model update', () => {
      const update = service.createModelUpdate(
        'GPT-4',
        '1.0.0',
        ['Improvement 1'],
        'https://example.com/model.bin',
        100000000
      );

      expect(update).toBeDefined();
      expect(update.status).toBe('draft');
      expect(update.modelUpdateId).toMatch(/^MDL-/);
    });
  });

  describe('getModelUpdate', () => {
    it('should retrieve a model update', () => {
      const created = service.createModelUpdate('GPT-4', '1.0.0', [], 'url', 1000);
      const retrieved = service.getModelUpdate(created.modelUpdateId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.modelName).toBe('GPT-4');
    });
  });

  describe('createDeployment', () => {
    it('should create a deployment record', () => {
      const deployment = service.createDeployment('upd-123', '1.1.0', 10000);

      expect(deployment).toBeDefined();
      expect(deployment.status).toBe('pending');
      expect(deployment.deploymentId).toMatch(/^DEP-/);
    });
  });

  describe('getDeployment', () => {
    it('should retrieve a deployment', () => {
      const created = service.createDeployment('upd-123', '1.1.0', 10000);
      const retrieved = service.getDeployment(created.deploymentId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.targetVersion).toBe('1.1.0');
    });
  });

  describe('getDeploymentsByStatus', () => {
    it('should retrieve deployments by status', () => {
      service.createDeployment('upd-1', '1.1.0', 1000);
      service.createDeployment('upd-2', '1.2.0', 2000);

      const pending = service.getDeploymentsByStatus('pending');
      expect(pending.length).toBe(2);
    });
  });

  describe('startDeployment', () => {
    it('should start a deployment', () => {
      const deployment = service.createDeployment('upd-123', '1.1.0', 10000);
      const result = service.startDeployment(deployment.deploymentId);

      expect(result).toBe(true);

      const updated = service.getDeployment(deployment.deploymentId);
      expect(updated?.status).toBe('in_progress');
    });
  });

  describe('completeDeployment', () => {
    it('should complete a deployment', () => {
      const deployment = service.createDeployment('upd-123', '1.1.0', 10000);
      service.startDeployment(deployment.deploymentId);

      const result = service.completeDeployment(deployment.deploymentId, 9800, 200);

      expect(result).toBe(true);

      const completed = service.getDeployment(deployment.deploymentId);
      expect(completed?.status).toBe('completed');
      expect(completed?.successCount).toBe(9800);
    });
  });

  describe('rollbackDeployment', () => {
    it('should rollback a deployment', () => {
      const deployment = service.createDeployment('upd-123', '1.1.0', 10000);
      service.startDeployment(deployment.deploymentId);

      const result = service.rollbackDeployment(deployment.deploymentId);

      expect(result).toBe(true);

      const rolledback = service.getDeployment(deployment.deploymentId);
      expect(rolledback?.status).toBe('rolled_back');
      expect(rolledback?.rollbackedAt).toBeDefined();
    });
  });

  describe('getAllAppUpdates', () => {
    it('should retrieve all app updates', () => {
      service.createAppUpdate('1.1.0', 'Desc', 'patch', [], 'url', 1000, 'hash');
      service.createAppUpdate('1.2.0', 'Desc', 'minor', [], 'url', 1000, 'hash');

      const all = service.getAllAppUpdates();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllModelUpdates', () => {
    it('should retrieve all model updates', () => {
      service.createModelUpdate('GPT-4', '1.0.0', [], 'url', 1000);
      service.createModelUpdate('Claude', '2.0.0', [], 'url', 2000);

      const all = service.getAllModelUpdates();
      expect(all.length).toBe(2);
    });
  });

  describe('getAllDeployments', () => {
    it('should retrieve all deployments', () => {
      service.createDeployment('upd-1', '1.1.0', 1000);
      service.createDeployment('upd-2', '1.2.0', 2000);

      const all = service.getAllDeployments();
      expect(all.length).toBe(2);
    });
  });

  describe('getLatestReleasedUpdate', () => {
    it('should retrieve latest released update', () => {
      const update1 = service.createAppUpdate('1.1.0', 'Desc', 'patch', [], 'url', 1000, 'hash');
      service.stageAppUpdate(update1.updateId);
      service.releaseAppUpdate(update1.updateId);

      const update2 = service.createAppUpdate('1.2.0', 'Desc', 'minor', [], 'url', 1000, 'hash');
      service.stageAppUpdate(update2.updateId);
      service.releaseAppUpdate(update2.updateId);

      const latest = service.getLatestReleasedUpdate();
      expect(latest).toBeDefined();
      expect(latest?.releaseDate).toBeGreaterThanOrEqual(update1.releaseDate);
    });
  });

  describe('getUpdateStats', () => {
    it('should calculate update statistics', () => {
      service.createAppUpdate('1.1.0', 'Desc', 'patch', [], 'url', 1000, 'hash');
      service.createModelUpdate('GPT-4', '1.0.0', [], 'url', 1000);
      service.createDeployment('upd-1', '1.1.0', 1000);

      const stats = service.getUpdateStats();

      expect(stats.totalAppUpdates).toBe(1);
      expect(stats.totalModelUpdates).toBe(1);
      expect(stats.totalDeployments).toBe(1);
    });
  });

  describe('deleteAppUpdate', () => {
    it('should delete an app update', () => {
      const update = service.createAppUpdate('1.1.0', 'Desc', 'patch', [], 'url', 1000, 'hash');
      const result = service.deleteAppUpdate(update.updateId);

      expect(result).toBe(true);
      expect(service.getAppUpdate(update.updateId)).toBeUndefined();
    });
  });

  describe('deleteModelUpdate', () => {
    it('should delete a model update', () => {
      const update = service.createModelUpdate('GPT-4', '1.0.0', [], 'url', 1000);
      const result = service.deleteModelUpdate(update.modelUpdateId);

      expect(result).toBe(true);
      expect(service.getModelUpdate(update.modelUpdateId)).toBeUndefined();
    });
  });

  describe('deleteDeployment', () => {
    it('should delete a deployment', () => {
      const deployment = service.createDeployment('upd-1', '1.1.0', 1000);
      const result = service.deleteDeployment(deployment.deploymentId);

      expect(result).toBe(true);
      expect(service.getDeployment(deployment.deploymentId)).toBeUndefined();
    });
  });
});

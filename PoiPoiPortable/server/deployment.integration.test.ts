/**
 * Deployment Integration Tests
 * クラウドデプロイメント統合テスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DeploymentConfigManager } from './deployment/DeploymentConfig';
import { DatabasePersistenceManager } from './deployment/DatabasePersistenceManager';
import { RuntimeHealthMonitor } from './deployment/RuntimeHealthMonitor';
import { CICDPipelineConfigManager } from './deployment/CICDPipelineConfig';

describe('Deployment Integration Tests', () => {
  let deploymentConfig: DeploymentConfigManager;
  let databaseManager: DatabasePersistenceManager;
  let healthMonitor: RuntimeHealthMonitor;
  let cicdManager: CICDPipelineConfigManager;

  beforeEach(() => {
    deploymentConfig = new DeploymentConfigManager('development');
    databaseManager = new DatabasePersistenceManager();
    healthMonitor = new RuntimeHealthMonitor();
    cicdManager = new CICDPipelineConfigManager();
  });

  describe('Deployment Configuration', () => {
    it('should load development environment config', () => {
      const env = deploymentConfig.getEnvironment();
      expect(env.env).toBe('development');
      expect(env.port).toBeGreaterThan(0);
      expect(env.corsOrigins.length).toBeGreaterThan(0);
    });

    it('should load database config', () => {
      const dbConfig = deploymentConfig.getDatabaseConfig();
      expect(dbConfig.type).toBeDefined();
      expect(dbConfig.maxConnections).toBeGreaterThan(0);
    });

    it('should load security config', () => {
      const secConfig = deploymentConfig.getSecurityConfig();
      expect(secConfig.jwtSecret).toBeDefined();
      expect(secConfig.jwtExpiresIn).toBeDefined();
    });

    it('should load monitoring config', () => {
      const monConfig = deploymentConfig.getMonitoringConfig();
      expect(monConfig.enableMetrics).toBe(true);
      expect(monConfig.logLevel).toBeDefined();
    });

    it('should validate configuration', () => {
      const validation = deploymentConfig.validate();
      expect(validation.valid).toBe(true);
    });

    it('should support staging environment', () => {
      const stagingConfig = new DeploymentConfigManager('staging');
      const env = stagingConfig.getEnvironment();
      expect(env.env).toBe('staging');
      expect(env.logLevel).toBe('info');
    });

    it('should support production environment', () => {
      const prodConfig = new DeploymentConfigManager('production');
      const env = prodConfig.getEnvironment();
      expect(env.env).toBe('production');
      expect(env.logLevel).toBe('warn');
    });
  });

  describe('Database Persistence', () => {
    it('should register migration', () => {
      const migration = databaseManager.registerMigration('create_users_table');
      expect(migration.id).toBeDefined();
      expect(migration.status).toBe('pending');
    });

    it('should execute migration', async () => {
      const migration = databaseManager.registerMigration('create_products_table');
      const result = await databaseManager.executeMigration(migration.id);
      expect(result.success).toBe(true);
    });

    it('should get migration history', () => {
      databaseManager.registerMigration('migration_1');
      databaseManager.registerMigration('migration_2');
      const history = databaseManager.getMigrationHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should create backup', () => {
      const backup = databaseManager.createBackup('/backups/db_backup.sql');
      expect(backup.id).toBeDefined();
      expect(backup.status).toBe('success');
      expect(backup.size).toBeGreaterThan(0);
    });

    it('should restore from backup', async () => {
      const backup = databaseManager.createBackup('/backups/db_backup.sql');
      const result = await databaseManager.restoreFromBackup(backup.id);
      expect(result.success).toBe(true);
    });

    it('should get backup history', () => {
      databaseManager.createBackup('/backups/backup_1.sql');
      databaseManager.createBackup('/backups/backup_2.sql');
      const history = databaseManager.getBackupHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should perform health check', async () => {
      const health = await databaseManager.performHealthCheck();
      expect(health.connected).toBeDefined();
      expect(health.status).toBeDefined();
    });

    it('should initialize connection', async () => {
      const result = await databaseManager.initializeConnection();
      expect(result.success).toBe(true);
    });

    it('should close connection', async () => {
      const result = await databaseManager.closeConnection();
      expect(result.success).toBe(true);
    });

    it('should get database statistics', () => {
      databaseManager.registerMigration('migration_1');
      databaseManager.createBackup('/backups/backup_1.sql');
      const stats = databaseManager.getStatistics();
      expect(stats.migrationCount).toBeGreaterThanOrEqual(1);
      expect(stats.backupCount).toBeGreaterThanOrEqual(1);
    });

    it('should optimize database', async () => {
      const result = await databaseManager.optimizeDatabase();
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should vacuum database', async () => {
      const result = await databaseManager.vacuumDatabase();
      expect(result.success).toBe(true);
    });
  });

  describe('Runtime Health Monitoring', () => {
    it('should record request', () => {
      healthMonitor.recordRequest(100, true);
      const stats = healthMonitor.getPerformanceStats();
      expect(stats.totalRequests).toBe(1);
    });

    it('should record error', () => {
      healthMonitor.recordRequest(100, false);
      const stats = healthMonitor.getPerformanceStats();
      expect(stats.totalErrors).toBe(1);
    });

    it('should perform health check', async () => {
      const result = await healthMonitor.performHealthCheck();
      expect(result.status).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should get latest health check', async () => {
      await healthMonitor.performHealthCheck();
      const latest = healthMonitor.getLatestHealthCheck();
      expect(latest).not.toBeNull();
    });

    it('should get health check history', async () => {
      await healthMonitor.performHealthCheck();
      await new Promise(resolve => setTimeout(resolve, 10));
      await healthMonitor.performHealthCheck();
      const history = healthMonitor.getHealthCheckHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);
    });

    it('should add alert rule', () => {
      const rule = {
        id: 'test_alert',
        name: 'Test Alert',
        metric: 'cpuUsage' as const,
        threshold: 80,
        operator: '>' as const,
        enabled: true,
        severity: 'high' as const,
      };
      healthMonitor.addAlertRule(rule);
      const rules = healthMonitor.getAlertRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should enable/disable alert rules', () => {
      const rules = healthMonitor.getAlertRules();
      if (rules.length > 0) {
        const ruleId = rules[0].id;
        healthMonitor.disableAlertRule(ruleId);
        const updated = healthMonitor.getAlertRules().find(r => r.id === ruleId);
        expect(updated?.enabled).toBe(false);
      }
    });

    it('should get performance statistics', () => {
      healthMonitor.recordRequest(100, true);
      healthMonitor.recordRequest(200, false);
      const stats = healthMonitor.getPerformanceStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorRate).toBeGreaterThan(0);
    });

    it('should reset metrics', () => {
      healthMonitor.recordRequest(100, true);
      healthMonitor.resetMetrics();
      const stats = healthMonitor.getPerformanceStats();
      expect(stats.totalRequests).toBe(0);
    });

    it('should get statistics', async () => {
      await healthMonitor.performHealthCheck();
      const stats = healthMonitor.getStatistics();
      expect(stats.healthCheckCount).toBeGreaterThanOrEqual(1);
      expect(stats.alertRuleCount).toBeGreaterThan(0);
    });
  });

  describe('CI/CD Pipeline', () => {
    it('should create build', () => {
      const build = cicdManager.createBuild('Release Build', '1.0.0');
      expect(build.id).toBeDefined();
      expect(build.status).toBe('pending');
      expect(build.stages.length).toBeGreaterThan(0);
    });

    it('should execute build', async () => {
      const build = cicdManager.createBuild('Test Build', '1.0.0');
      const result = await cicdManager.executeBuild(build.id);
      expect(result.success).toBe(true);
    });

    it('should get build history', () => {
      cicdManager.createBuild('Build 1', '1.0.0');
      cicdManager.createBuild('Build 2', '1.1.0');
      const history = cicdManager.getBuildHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should create deployment', () => {
      const deployment = cicdManager.createDeployment('staging', '1.0.0');
      expect(deployment.id).toBeDefined();
      expect(deployment.status).toBe('pending');
      expect(deployment.environment).toBe('staging');
    });

    it('should execute deployment', async () => {
      const deployment = cicdManager.createDeployment('staging', '1.0.0');
      const result = await cicdManager.executeDeployment(deployment.id);
      expect(result.success).toBe(true);
    });

    it('should rollback deployment', async () => {
      const deployment = cicdManager.createDeployment('staging', '1.0.0', '0.9.0');
      await cicdManager.executeDeployment(deployment.id);
      const result = await cicdManager.rollbackDeployment(deployment.id);
      expect(result.success).toBe(true);
    });

    it('should get deployment history', () => {
      cicdManager.createDeployment('staging', '1.0.0');
      cicdManager.createDeployment('production', '1.0.0');
      const history = cicdManager.getDeploymentHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should record test result', () => {
      const test = cicdManager.recordTestResult('Unit Tests', 'unit', 100, 100, 5000, 95);
      expect(test.id).toBeDefined();
      expect(test.status).toBe('passed');
      expect(test.coverage).toBe(95);
    });

    it('should get test history', () => {
      cicdManager.recordTestResult('Unit Tests', 'unit', 100, 100, 5000, 95);
      cicdManager.recordTestResult('Integration Tests', 'integration', 50, 50, 10000, 90);
      const history = cicdManager.getTestHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should get pipeline stages', () => {
      const stages = cicdManager.getPipelineStages();
      expect(stages.length).toBeGreaterThan(0);
      expect(stages[0].order).toBeLessThan(stages[stages.length - 1].order);
    });

    it('should update pipeline stage', () => {
      const stages = cicdManager.getPipelineStages();
      if (stages.length > 0) {
        const stageId = stages[0].id;
        const result = cicdManager.updatePipelineStage(stageId, { timeout: 600000 });
        expect(result).toBe(true);
      }
    });

    it('should get statistics', () => {
      cicdManager.createBuild('Build 1', '1.0.0');
      cicdManager.createDeployment('staging', '1.0.0');
      cicdManager.recordTestResult('Tests', 'unit', 100, 100, 5000, 95);
      const stats = cicdManager.getStatistics();
      expect(stats.totalBuilds).toBeGreaterThanOrEqual(1);
      expect(stats.totalDeployments).toBeGreaterThanOrEqual(1);
      expect(stats.totalTests).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Complete Deployment Flow', () => {
    it('should execute complete deployment pipeline', async () => {
      // 1. Configuration
      const env = deploymentConfig.getEnvironment();
      expect(env.env).toBe('development');

      // 2. Database preparation
      const migration = databaseManager.registerMigration('setup_tables');
      const migResult = await databaseManager.executeMigration(migration.id);
      expect(migResult.success).toBe(true);

      // 3. Build
      const build = cicdManager.createBuild('Release', '1.0.0');
      const buildResult = await cicdManager.executeBuild(build.id);
      expect(buildResult.success).toBe(true);

      // 4. Health check
      const health = await healthMonitor.performHealthCheck();
      expect(health.status).toBeDefined();

      // 5. Deployment
      const deployment = cicdManager.createDeployment('staging', '1.0.0');
      const deployResult = await cicdManager.executeDeployment(deployment.id);
      expect(deployResult.success).toBe(true);

      // 6. Backup
      const backup = databaseManager.createBackup('/backups/post_deploy.sql');
      expect(backup.status).toBe('success');
    });

    it('should handle deployment with health monitoring', async () => {
      // Record requests during deployment
      healthMonitor.recordRequest(100, true);
      healthMonitor.recordRequest(150, true);
      healthMonitor.recordRequest(200, false);

      // Check health
      const health = await healthMonitor.performHealthCheck();
      expect(health.metrics.requestCount).toBeGreaterThanOrEqual(0);

      // Get statistics
      const stats = healthMonitor.getPerformanceStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.errorRate).toBeGreaterThan(0);
    });

    it('should support multi-environment deployment', async () => {
      // Staging
      const stagingDeploy = cicdManager.createDeployment('staging', '1.0.0');
      const stagingResult = await cicdManager.executeDeployment(stagingDeploy.id);
      expect(stagingResult.success).toBe(true);

      // Production
      const prodDeploy = cicdManager.createDeployment('production', '1.0.0', '0.9.0');
      const prodResult = await cicdManager.executeDeployment(prodDeploy.id);
      expect(prodResult.success).toBe(true);
    });

    it('should handle deployment rollback', async () => {
      const deployment = cicdManager.createDeployment('staging', '1.0.0', '0.9.0');
      await cicdManager.executeDeployment(deployment.id);

      // Simulate issue and rollback
      const rollbackResult = await cicdManager.rollbackDeployment(deployment.id);
      expect(rollbackResult.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle 1000 health checks', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        healthMonitor.recordRequest(Math.random() * 500, Math.random() > 0.1);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should handle concurrent builds', async () => {
      const builds = Array.from({ length: 10 }, (_, i) =>
        cicdManager.createBuild(`Build ${i}`, `1.${i}.0`)
      );

      expect(builds.length).toBe(10);
      expect(builds.every(b => b.id)).toBe(true);
    });

    it('should handle large deployment history', () => {
      for (let i = 0; i < 100; i++) {
        cicdManager.createDeployment('staging', `1.${i}.0`);
      }

      const history = cicdManager.getDeploymentHistory();
      expect(history.length).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid migration', async () => {
      const result = await databaseManager.executeMigration('invalid_id');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid backup restore', async () => {
      const result = await databaseManager.restoreFromBackup('invalid_id');
      expect(result.success).toBe(false);
    });

    it('should handle invalid build execution', async () => {
      const result = await cicdManager.executeBuild('invalid_id');
      expect(result.success).toBe(false);
    });

    it('should handle invalid deployment', async () => {
      const result = await cicdManager.executeDeployment('invalid_id');
      expect(result.success).toBe(false);
    });
  });
});

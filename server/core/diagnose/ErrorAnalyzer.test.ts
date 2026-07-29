import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ErrorAnalyzer } from './ErrorAnalyzer';
import { SecurityEngine } from '../security/SecurityEngine';

describe('ErrorAnalyzer', () => {
  let errorAnalyzer: ErrorAnalyzer;
  let securityEngine: SecurityEngine;
  let userId: string;

  beforeEach(async () => {
    errorAnalyzer = ErrorAnalyzer.getInstance();
    errorAnalyzer.clearAllData();
    securityEngine = (errorAnalyzer as any).securityEngine;
    if (!securityEngine.isReady()) {
      await securityEngine.initialize();
    }
    userId = 'test-user-' + Date.now();
    await securityEngine.createContext(userId, 'user');
    await securityEngine.grantPermission(userId, 'error:read');
    await securityEngine.grantPermission(userId, 'error:write');
  });

  afterEach(async () => {
    errorAnalyzer.clearAllData();
    if (securityEngine.isReady()) {
      await securityEngine.shutdown();
    }
  });

  describe('Error Logging', () => {
    it('should log error', async () => {
      const error = await errorAnalyzer.logError(
        userId,
        'Database connection failed',
        'DatabaseService'
      );

      expect(error.id).toBeDefined();
      expect(error.message).toBe('Database connection failed');
      expect(error.component).toBe('DatabaseService');
      expect(error.resolved).toBe(false);
    });

    it('should classify error severity', async () => {
      const critical = await errorAnalyzer.logError(
        userId,
        'Critical system failure',
        'System'
      );
      const high = await errorAnalyzer.logError(userId, 'Error occurred', 'API');
      const medium = await errorAnalyzer.logError(userId, 'Warning detected', 'Service');

      expect(critical.severity).toBe('critical');
      expect(high.severity).toBe('high');
      expect(medium.severity).toBe('medium');
    });

    it('should classify error category', async () => {
      const dbError = await errorAnalyzer.logError(
        userId,
        'Database connection timeout',
        'DB'
      );
      const authError = await errorAnalyzer.logError(userId, 'Authentication failed', 'Auth');
      const networkError = await errorAnalyzer.logError(
        userId,
        'Network connection error',
        'Network'
      );

      expect(dbError.category).toBe('database');
      expect(authError.category).toBe('authentication');
      expect(networkError.category).toBe('network');
    });
  });

  describe('Error Analysis', () => {
    it('should analyze errors', async () => {
      await errorAnalyzer.logError(userId, 'Error 1', 'Service1');
      await errorAnalyzer.logError(userId, 'Error 2', 'Service1');
      await errorAnalyzer.logError(userId, 'Error 3', 'Service2');

      const analysis = await errorAnalyzer.analyzeErrors(userId);

      expect(analysis.totalErrors).toBe(3);
      expect(analysis.errorsByComponent['Service1']).toBe(2);
      expect(analysis.errorsByComponent['Service2']).toBe(1);
    });

    it('should find most common errors', async () => {
      await errorAnalyzer.logError(userId, 'Same error', 'Service');
      await errorAnalyzer.logError(userId, 'Same error', 'Service');
      await errorAnalyzer.logError(userId, 'Different error', 'Service');

      const analysis = await errorAnalyzer.analyzeErrors(userId);

      expect(analysis.mostCommonErrors.length).toBeGreaterThan(0);
      expect(analysis.mostCommonErrors[0].count).toBeGreaterThanOrEqual(2);
    });

    it('should include recent errors', async () => {
      for (let i = 0; i < 15; i++) {
        await errorAnalyzer.logError(userId, `Error ${i}`, 'Service');
      }

      const analysis = await errorAnalyzer.analyzeErrors(userId);

      expect(analysis.recentErrors.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Error Filtering', () => {
    it('should get errors by component', async () => {
      await errorAnalyzer.logError(userId, 'Error 1', 'Service1');
      await errorAnalyzer.logError(userId, 'Error 2', 'Service1');
      await errorAnalyzer.logError(userId, 'Error 3', 'Service2');

      const errors = await errorAnalyzer.getErrorsByComponent(userId, 'Service1');

      expect(errors.length).toBe(2);
      expect(errors.every((e) => e.component === 'Service1')).toBe(true);
    });

    it('should get errors by severity', async () => {
      await errorAnalyzer.logError(userId, 'Critical error', 'Service');
      await errorAnalyzer.logError(userId, 'Warning message', 'Service');

      const criticalErrors = await errorAnalyzer.getErrorsBySeverity(userId, 'critical');
      const mediumErrors = await errorAnalyzer.getErrorsBySeverity(userId, 'medium');

      expect(criticalErrors.length).toBeGreaterThanOrEqual(1);
      expect(mediumErrors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Resolution', () => {
    it('should resolve error', async () => {
      const error = await errorAnalyzer.logError(userId, 'Error to resolve', 'Service');

      await errorAnalyzer.resolveError(userId, error.id);

      expect(error.resolved).toBe(true);
    });

    it('should throw error if not found', async () => {
      await expect(
        errorAnalyzer.resolveError(userId, 'non-existent-error')
      ).rejects.toThrow('Error not found');
    });
  });

  describe('Permission Checks', () => {
    it('should throw error if user lacks read permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        errorAnalyzer.analyzeErrors(unauthorizedUser)
      ).rejects.toThrow('User does not have permission to read error analysis');
    });

    it('should throw error if user lacks write permission', async () => {
      const unauthorizedUser = 'unauthorized-user';
      await securityEngine.createContext(unauthorizedUser, 'user');

      await expect(
        errorAnalyzer.logError(unauthorizedUser, 'Error', 'Service')
      ).rejects.toThrow('User does not have permission to log errors');
    });
  });

  describe('Data Clearing', () => {
    it('should clear all data', async () => {
      await errorAnalyzer.logError(userId, 'Error 1', 'Service');
      await errorAnalyzer.logError(userId, 'Error 2', 'Service');

      errorAnalyzer.clearAllData();

      const analysis = await errorAnalyzer.analyzeErrors(userId);

      expect(analysis.totalErrors).toBe(0);
    });
  });

  describe('Category Classification', () => {
    it('should classify database errors', async () => {
      const error = await errorAnalyzer.logError(userId, 'Database error', 'DB');
      expect(error.category).toBe('database');
    });

    it('should classify network errors', async () => {
      const error = await errorAnalyzer.logError(userId, 'Connection failed', 'Network');
      expect(error.category).toBe('network');
    });

    it('should classify memory errors', async () => {
      const error = await errorAnalyzer.logError(userId, 'Heap out of memory', 'Runtime');
      expect(error.category).toBe('memory');
    });

    it('should classify timeout errors', async () => {
      const error = await errorAnalyzer.logError(userId, 'Request timeout', 'API');
      expect(error.category).toBe('timeout');
    });

    it('should classify validation errors', async () => {
      const error = await errorAnalyzer.logError(userId, 'Invalid input', 'Validator');
      expect(error.category).toBe('validation');
    });
  });

  describe('Multiple Users', () => {
    it('should isolate errors by user', async () => {
      const user2 = 'test-user-2-' + Date.now();
      await securityEngine.createContext(user2, 'user');
      await securityEngine.grantPermission(user2, 'error:read');
      await securityEngine.grantPermission(user2, 'error:write');

      await errorAnalyzer.logError(userId, 'Error 1', 'Service');
      await errorAnalyzer.logError(user2, 'Error 2', 'Service');

      const analysis1 = await errorAnalyzer.analyzeErrors(userId);
      const analysis2 = await errorAnalyzer.analyzeErrors(user2);

      expect(analysis1.totalErrors).toBeGreaterThanOrEqual(1);
      expect(analysis2.totalErrors).toBeGreaterThanOrEqual(1);
    });
  });
});

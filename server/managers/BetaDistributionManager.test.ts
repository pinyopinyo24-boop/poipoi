/**
 * BetaDistributionManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { betaDistributionManager, BetaDistributionManager } from './BetaDistributionManager';

describe('BetaDistributionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    betaDistributionManager.cleanup();
  });

  afterEach(() => {
    betaDistributionManager.cleanup();
  });

  describe('Distribution Mode', () => {
    it('should set distribution mode', () => {
      betaDistributionManager.setDistributionMode('open_beta');
      expect(betaDistributionManager.getCurrentMode()).toBe('open_beta');
    });

    it('should get current mode', () => {
      const mode = betaDistributionManager.getCurrentMode();
      expect(mode).toBeDefined();
    });
  });

  describe('Beta User Registration', () => {
    it('should register beta user', () => {
      const code = betaDistributionManager.generateInvitationCode();
      const user = betaDistributionManager.registerBetaUser('user1', 'user1@test.com', code);
      expect(user).not.toBeNull();
    });

    it('should get beta user', () => {
      const code = betaDistributionManager.generateInvitationCode();
      betaDistributionManager.registerBetaUser('user1', 'user1@test.com', code);
      const user = betaDistributionManager.getUser('user1');
      expect(user).not.toBeNull();
    });

    it('should reject invalid invitation code', () => {
      const user = betaDistributionManager.registerBetaUser('user1', 'user1@test.com', 'invalid_code');
      expect(user).toBeNull();
    });
  });

  describe('Device Management', () => {
    it('should register device', () => {
      const code = betaDistributionManager.generateInvitationCode();
      betaDistributionManager.registerBetaUser('user1', 'user1@test.com', code);
      const device = betaDistributionManager.registerDevice('user1', 'device1', 'My Phone', 'Android 14', '1.0.0');
      expect(device).not.toBeNull();
    });

    it('should approve device', () => {
      const code = betaDistributionManager.generateInvitationCode();
      betaDistributionManager.registerBetaUser('user1', 'user1@test.com', code);
      const device = betaDistributionManager.registerDevice('user1', 'device1', 'My Phone', 'Android 14', '1.0.0');
      if (device) {
        const approved = betaDistributionManager.approveDevice(device.deviceId);
        expect(approved?.status).toBe('approved');
      }
    });

    it('should reject device', () => {
      const code = betaDistributionManager.generateInvitationCode();
      betaDistributionManager.registerBetaUser('user1', 'user1@test.com', code);
      const device = betaDistributionManager.registerDevice('user1', 'device1', 'My Phone', 'Android 14', '1.0.0');
      if (device) {
        const rejected = betaDistributionManager.rejectDevice(device.deviceId);
        expect(rejected?.status).toBe('rejected');
      }
    });

    it('should get user devices', () => {
      const code = betaDistributionManager.generateInvitationCode();
      betaDistributionManager.registerBetaUser('user1', 'user1@test.com', code);
      betaDistributionManager.registerDevice('user1', 'device1', 'Phone 1', 'Android 14', '1.0.0');
      betaDistributionManager.registerDevice('user1', 'device2', 'Phone 2', 'Android 13', '1.0.0');
      const devices = betaDistributionManager.getUserDevices('user1');
      expect(devices.length).toBe(2);
    });
  });

  describe('Access Control', () => {
    it('should check access', () => {
      const code = betaDistributionManager.generateInvitationCode();
      betaDistributionManager.registerBetaUser('user1', 'user1@test.com', code);
      const device = betaDistributionManager.registerDevice('user1', 'device1', 'My Phone', 'Android 14', '1.0.0');
      if (device) {
        betaDistributionManager.approveDevice(device.deviceId);
        const hasAccess = betaDistributionManager.hasAccess('user1', device.deviceId);
        expect(hasAccess).toBe(true);
      }
    });

    it('should deny access for unapproved device', () => {
      const code = betaDistributionManager.generateInvitationCode();
      betaDistributionManager.registerBetaUser('user1', 'user1@test.com', code);
      const device = betaDistributionManager.registerDevice('user1', 'device1', 'My Phone', 'Android 14', '1.0.0');
      if (device) {
        const hasAccess = betaDistributionManager.hasAccess('user1', device.deviceId);
        expect(hasAccess).toBe(false);
      }
    });
  });

  describe('Feedback & Crash Reports', () => {
    it('should record feedback', () => {
      const code = betaDistributionManager.generateInvitationCode();
      betaDistributionManager.registerBetaUser('user1', 'user1@test.com', code);
      betaDistributionManager.recordFeedback('user1');
      const user = betaDistributionManager.getUser('user1');
      expect(user?.feedbackCount).toBe(1);
    });

    it('should record crash report', () => {
      const code = betaDistributionManager.generateInvitationCode();
      betaDistributionManager.registerBetaUser('user1', 'user1@test.com', code);
      betaDistributionManager.recordCrashReport('user1');
      const user = betaDistributionManager.getUser('user1');
      expect(user?.crashReportCount).toBe(1);
    });
  });

  describe('Invitation Codes', () => {
    it('should generate invitation code', () => {
      const code = betaDistributionManager.generateInvitationCode();
      expect(code).toMatch(/^BETA_/);
    });
  });

  describe('Statistics', () => {
    it('should get beta user count', () => {
      const code = betaDistributionManager.generateInvitationCode();
      betaDistributionManager.registerBetaUser('user1', 'user1@test.com', code);
      const count = betaDistributionManager.getBetaUserCount();
      expect(count).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      const code = betaDistributionManager.generateInvitationCode();
      betaDistributionManager.registerBetaUser('user1', 'user1@test.com', code);
      betaDistributionManager.cleanup();
      const count = betaDistributionManager.getBetaUserCount();
      expect(count).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = BetaDistributionManager.getInstance();
      const instance2 = BetaDistributionManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});

/**
 * UpdateNotificationService Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { updateNotificationService, UpdateNotificationService } from './UpdateNotificationService';

describe('UpdateNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateNotificationService.cleanup();
  });

  afterEach(() => {
    updateNotificationService.cleanup();
  });

  describe('Version Registration', () => {
    it('should register version', () => {
      const version = updateNotificationService.registerVersion({
        version: '2.0.0',
        versionCode: 2,
        releaseDate: Date.now(),
        updateType: 'feature',
        priority: 'high',
        changelog: 'Major update',
        minOSVersion: '14.0',
        downloadUrl: 'https://example.com/app-2.0.0.apk',
        fileSize: 60000000,
        checksum: 'def456',
        isForced: false,
      });
      expect(version.version).toBe('2.0.0');
    });

    it('should get version', () => {
      updateNotificationService.registerVersion({
        version: '2.0.0',
        versionCode: 2,
        releaseDate: Date.now(),
        updateType: 'feature',
        priority: 'high',
        changelog: 'Major update',
        minOSVersion: '14.0',
        downloadUrl: 'https://example.com/app-2.0.0.apk',
        fileSize: 60000000,
        checksum: 'def456',
        isForced: false,
      });
      const version = updateNotificationService.getVersion('2.0.0');
      expect(version).not.toBeNull();
      expect(version?.versionCode).toBe(2);
    });

    it('should get latest version', () => {
      updateNotificationService.registerVersion({
        version: '2.0.0',
        versionCode: 2,
        releaseDate: Date.now(),
        updateType: 'feature',
        priority: 'high',
        changelog: 'Major update',
        minOSVersion: '14.0',
        downloadUrl: 'https://example.com/app-2.0.0.apk',
        fileSize: 60000000,
        checksum: 'def456',
        isForced: false,
      });
      const latest = updateNotificationService.getLatestVersion();
      expect(latest?.version).toBe('2.0.0');
    });
  });

  describe('Available Update Check', () => {
    it('should get available update', () => {
      updateNotificationService.registerVersion({
        version: '2.0.0',
        versionCode: 2,
        releaseDate: Date.now(),
        updateType: 'feature',
        priority: 'high',
        changelog: 'Major update',
        minOSVersion: '14.0',
        downloadUrl: 'https://example.com/app-2.0.0.apk',
        fileSize: 60000000,
        checksum: 'def456',
        isForced: false,
      });
      const update = updateNotificationService.getAvailableUpdate('1.0.0');
      expect(update).not.toBeNull();
      expect(update?.version).toBe('2.0.0');
    });

    it('should return null if no update available', () => {
      const update = updateNotificationService.getAvailableUpdate('2.0.0');
      expect(update).toBeNull();
    });
  });

  describe('Notification Sending', () => {
    it('should send notification', () => {
      const notification = updateNotificationService.sendNotification('user1', 'device1', '2.0.0');
      expect(notification.id).toBeDefined();
      expect(notification.status).toBe('pending');
    });

    it('should get user notifications', () => {
      updateNotificationService.sendNotification('user1', 'device1', '2.0.0');
      updateNotificationService.sendNotification('user1', 'device2', '2.0.0');
      const notifications = updateNotificationService.getUserNotifications('user1');
      expect(notifications.length).toBe(2);
    });

    it('should get device notifications', () => {
      updateNotificationService.sendNotification('user1', 'device1', '2.0.0');
      const notifications = updateNotificationService.getDeviceNotifications('device1');
      expect(notifications.length).toBe(1);
    });
  });

  describe('Notification Management', () => {
    it('should dismiss notification', () => {
      const sent = updateNotificationService.sendNotification('user1', 'device1', '2.0.0');
      const dismissed = updateNotificationService.dismissNotification(sent.id);
      expect(dismissed?.status).toBe('dismissed');
    });

    it('should remind later', () => {
      const sent = updateNotificationService.sendNotification('user1', 'device1', '2.0.0');
      const reminded = updateNotificationService.remindLater(sent.id, 3600000);
      expect(reminded?.remindLaterAt).toBeDefined();
    });

    it('should mark as installed', () => {
      const sent = updateNotificationService.sendNotification('user1', 'device1', '2.0.0');
      const installed = updateNotificationService.markAsInstalled(sent.id);
      expect(installed?.status).toBe('installed');
    });
  });

  describe('Forced Update Check', () => {
    it('should check if forced update', () => {
      updateNotificationService.registerVersion({
        version: '3.0.0',
        versionCode: 3,
        releaseDate: Date.now(),
        updateType: 'security',
        priority: 'critical',
        changelog: 'Security fix',
        minOSVersion: '14.0',
        downloadUrl: 'https://example.com/app-3.0.0.apk',
        fileSize: 60000000,
        checksum: 'ghi789',
        isForced: true,
      });
      const isForced = updateNotificationService.isForcedUpdate('3.0.0');
      expect(isForced).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should get update statistics', () => {
      updateNotificationService.registerVersion({
        version: '2.0.0',
        versionCode: 2,
        releaseDate: Date.now(),
        updateType: 'feature',
        priority: 'high',
        changelog: 'Major update',
        minOSVersion: '14.0',
        downloadUrl: 'https://example.com/app-2.0.0.apk',
        fileSize: 60000000,
        checksum: 'def456',
        isForced: false,
      });
      updateNotificationService.sendNotification('user1', 'device1', '2.0.0');
      const stats = updateNotificationService.getUpdateStatistics();
      expect(stats.totalVersions).toBeGreaterThan(0);
      expect(stats.totalNotifications).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      updateNotificationService.registerVersion({
        version: '2.0.0',
        versionCode: 2,
        releaseDate: Date.now(),
        updateType: 'feature',
        priority: 'high',
        changelog: 'Major update',
        minOSVersion: '14.0',
        downloadUrl: 'https://example.com/app-2.0.0.apk',
        fileSize: 60000000,
        checksum: 'def456',
        isForced: false,
      });
      updateNotificationService.cleanup();
      const stats = updateNotificationService.getUpdateStatistics();
      expect(stats.totalVersions).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = UpdateNotificationService.getInstance();
      const instance2 = UpdateNotificationService.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});

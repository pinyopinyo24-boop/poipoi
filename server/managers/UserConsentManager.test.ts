/**
 * UserConsentManager Tests - 15個のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { userConsentManager, UserConsentManager } from './UserConsentManager';

describe('UserConsentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userConsentManager.cleanup();
  });

  afterEach(() => {
    userConsentManager.cleanup();
  });

  describe('Consent Recording', () => {
    it('should record user consent', () => {
      const consent = userConsentManager.recordConsent('user1', 'privacy_policy', 'accepted', 'v1');
      expect(consent.id).toBeDefined();
      expect(consent.userId).toBe('user1');
      expect(consent.status).toBe('accepted');
    });

    it('should record consent with metadata', () => {
      const metadata = { source: 'mobile_app', language: 'ja' };
      const consent = userConsentManager.recordConsent('user1', 'privacy_policy', 'accepted', 'v1', undefined, undefined, metadata);
      expect(consent.metadata).toEqual(metadata);
    });

    it('should record rejected consent', () => {
      const consent = userConsentManager.recordConsent('user1', 'marketing', 'rejected', 'v1');
      expect(consent.status).toBe('rejected');
      expect(consent.rejectedAt).toBeDefined();
    });
  });

  describe('Consent Retrieval', () => {
    it('should get user consents', () => {
      userConsentManager.recordConsent('user1', 'privacy_policy', 'accepted', 'v1');
      userConsentManager.recordConsent('user1', 'terms_of_service', 'accepted', 'v1');
      const consents = userConsentManager.getUserConsents('user1');
      expect(consents.length).toBe(2);
    });

    it('should get specific user consent', () => {
      userConsentManager.recordConsent('user1', 'privacy_policy', 'accepted', 'v1');
      const consent = userConsentManager.getUserConsent('user1', 'privacy_policy');
      expect(consent).not.toBeNull();
      expect(consent?.consentType).toBe('privacy_policy');
    });

    it('should return null for non-existent consent', () => {
      const consent = userConsentManager.getUserConsent('user1', 'privacy_policy');
      expect(consent).toBeNull();
    });
  });

  describe('Consent Status Check', () => {
    it('should check if user has consented', () => {
      userConsentManager.recordConsent('user1', 'privacy_policy', 'accepted', 'v1');
      const hasConsented = userConsentManager.hasConsented('user1', 'privacy_policy');
      expect(hasConsented).toBe(true);
    });

    it('should return false if user has not consented', () => {
      const hasConsented = userConsentManager.hasConsented('user1', 'privacy_policy');
      expect(hasConsented).toBe(false);
    });

    it('should return false if user rejected consent', () => {
      userConsentManager.recordConsent('user1', 'privacy_policy', 'rejected', 'v1');
      const hasConsented = userConsentManager.hasConsented('user1', 'privacy_policy');
      expect(hasConsented).toBe(false);
    });
  });

  describe('Consent Withdrawal', () => {
    it('should withdraw consent', () => {
      userConsentManager.recordConsent('user1', 'privacy_policy', 'accepted', 'v1');
      const withdrawn = userConsentManager.withdrawConsent('user1', 'privacy_policy');
      expect(withdrawn?.status).toBe('withdrawn');
      expect(withdrawn?.withdrawnAt).toBeDefined();
    });

    it('should return null when withdrawing non-existent consent', () => {
      const withdrawn = userConsentManager.withdrawConsent('user1', 'privacy_policy');
      expect(withdrawn).toBeNull();
    });
  });

  describe('Consent Document Management', () => {
    it('should register consent document', () => {
      const doc = userConsentManager.registerConsentDocument('privacy_policy', 'v2', 'Updated privacy policy content', Date.now());
      expect(doc.version).toBe('v2');
      expect(doc.isActive).toBe(true);
    });

    it('should get consent document', () => {
      userConsentManager.registerConsentDocument('privacy_policy', 'v2', 'Updated content', Date.now());
      const doc = userConsentManager.getConsentDocument('privacy_policy', 'v2');
      expect(doc).not.toBeNull();
      expect(doc?.version).toBe('v2');
    });

    it('should get latest active document', () => {
      userConsentManager.registerConsentDocument('privacy_policy', 'v2', 'v2 content', Date.now());
      const doc = userConsentManager.getConsentDocument('privacy_policy');
      expect(doc?.version).toBe('v2');
    });
  });

  describe('Consent Statistics', () => {
    it('should get consent statistics', () => {
      userConsentManager.recordConsent('user1', 'privacy_policy', 'accepted', 'v1');
      userConsentManager.recordConsent('user2', 'privacy_policy', 'accepted', 'v1');
      userConsentManager.recordConsent('user3', 'privacy_policy', 'rejected', 'v1');

      const stats = userConsentManager.getConsentStatistics();
      const privacyStats = stats.find((s) => s.consentType === 'privacy_policy');
      expect(privacyStats?.acceptedCount).toBe(2);
      expect(privacyStats?.rejectedCount).toBe(1);
    });

    it('should calculate acceptance rate', () => {
      userConsentManager.recordConsent('user1', 'privacy_policy', 'accepted', 'v1');
      userConsentManager.recordConsent('user2', 'privacy_policy', 'rejected', 'v1');

      const stats = userConsentManager.getConsentStatistics();
      const privacyStats = stats.find((s) => s.consentType === 'privacy_policy');
      expect(privacyStats?.acceptanceRate).toBe(50);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup', () => {
      userConsentManager.recordConsent('user1', 'privacy_policy', 'accepted', 'v1');
      userConsentManager.cleanup();
      const consents = userConsentManager.getUserConsents('user1');
      expect(consents.length).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = UserConsentManager.getInstance();
      const instance2 = UserConsentManager.getInstance();
      expect(instance1 === instance2).toBe(true);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * PoiPoi Free Edition - FreePlanManager Test Suite
 * 無料プラン管理システムの包括的なテスト
 */

interface FreePlan {
  id: string;
  name: string;
  maxChatsPerDay: number;
  maxFileSizePerUpload: number;
  maxStorageGB: number;
  maxConcurrentSessions: number;
  features: string[];
  createdAt: Date;
}

interface FreeUser {
  id: string;
  email: string;
  planId: string;
  subscriptionStartDate: Date;
  subscriptionEndDate?: Date;
  isActive: boolean;
  metadata: Record<string, any>;
}

class FreePlanManager {
  private plans: Map<string, FreePlan> = new Map();
  private users: Map<string, FreeUser> = new Map();

  // Free Plan管理
  createFreePlan(plan: Omit<FreePlan, 'id' | 'createdAt'>): FreePlan {
    const id = `plan_${Date.now()}`;
    const newPlan: FreePlan = {
      ...plan,
      id,
      createdAt: new Date(),
    };
    this.plans.set(id, newPlan);
    return newPlan;
  }

  getFreePlan(planId: string): FreePlan | undefined {
    return this.plans.get(planId);
  }

  updateFreePlan(planId: string, updates: Partial<FreePlan>): FreePlan | null {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    const updated = { ...plan, ...updates, id: plan.id, createdAt: plan.createdAt };
    this.plans.set(planId, updated);
    return updated;
  }

  deleteFreePlan(planId: string): boolean {
    return this.plans.delete(planId);
  }

  getAllFreePlans(): FreePlan[] {
    return Array.from(this.plans.values());
  }

  // Free User管理
  registerFreeUser(email: string, planId: string): FreeUser {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error('Plan not found');

    const id = `user_${Date.now()}`;
    const newUser: FreeUser = {
      id,
      email,
      planId,
      subscriptionStartDate: new Date(),
      isActive: true,
      metadata: {},
    };
    this.users.set(id, newUser);
    return newUser;
  }

  getFreeUser(userId: string): FreeUser | undefined {
    return this.users.get(userId);
  }

  updateFreeUser(userId: string, updates: Partial<FreeUser>): FreeUser | null {
    const user = this.users.get(userId);
    if (!user) return null;

    const updated = { ...user, ...updates, id: user.id };
    this.users.set(userId, updated);
    return updated;
  }

  deactivateFreeUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    user.isActive = false;
    user.subscriptionEndDate = new Date();
    return true;
  }

  getAllFreeUsers(): FreeUser[] {
    return Array.from(this.users.values());
  }

  getActiveFreeUsers(): FreeUser[] {
    return Array.from(this.users.values()).filter(u => u.isActive);
  }

  // プラン統計
  getPlanStatistics(planId: string) {
    const plan = this.plans.get(planId);
    if (!plan) return null;

    const users = Array.from(this.users.values()).filter(u => u.planId === planId);
    const activeUsers = users.filter(u => u.isActive);

    return {
      planId,
      planName: plan.name,
      totalUsers: users.length,
      activeUsers: activeUsers.length,
      inactiveUsers: users.length - activeUsers.length,
      maxChatsPerDay: plan.maxChatsPerDay,
      maxStorageGB: plan.maxStorageGB,
      features: plan.features.length,
    };
  }

  // ユーザー統計
  getUserStatistics(userId: string) {
    const user = this.users.get(userId);
    if (!user) return null;

    const plan = this.plans.get(user.planId);
    if (!plan) return null;

    const daysActive = Math.floor(
      (new Date().getTime() - user.subscriptionStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      userId,
      email: user.email,
      planName: plan.name,
      isActive: user.isActive,
      daysActive,
      maxChatsPerDay: plan.maxChatsPerDay,
      maxStorageGB: plan.maxStorageGB,
      subscriptionStartDate: user.subscriptionStartDate,
      subscriptionEndDate: user.subscriptionEndDate,
    };
  }

  // プラン比較
  comparePlans(planId1: string, planId2: string) {
    const plan1 = this.plans.get(planId1);
    const plan2 = this.plans.get(planId2);

    if (!plan1 || !plan2) return null;

    const chatsDifference = plan2.maxChatsPerDay - plan1.maxChatsPerDay;
    const storageDifference = plan2.maxStorageGB - plan1.maxStorageGB;
    const featuresDifference = plan2.features.length - plan1.features.length;

    return {
      plan1: {
        name: plan1.name,
        maxChatsPerDay: plan1.maxChatsPerDay,
        maxStorageGB: plan1.maxStorageGB,
        features: plan1.features.length,
      },
      plan2: {
        name: plan2.name,
        maxChatsPerDay: plan2.maxChatsPerDay,
        maxStorageGB: plan2.maxStorageGB,
        features: plan2.features.length,
      },
      differences: {
        chatsDifference,
        storageDifference,
        featuresDifference,
      },
    };
  }
}

describe('FreePlanManager', () => {
  let manager: FreePlanManager;

  beforeEach(() => {
    manager = new FreePlanManager();
  });

  afterEach(() => {
    manager = new FreePlanManager();
  });

  describe('Free Plan Management', () => {
    it('should create a free plan', () => {
      const plan = manager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat', 'basic-analysis'],
      });

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.name).toBe('Basic Free');
      expect(plan.maxChatsPerDay).toBe(10);
    });

    it('should retrieve a free plan by ID', () => {
      const created = manager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat'],
      });

      const retrieved = manager.getFreePlan(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should update a free plan', () => {
      const created = manager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat'],
      });

      const updated = manager.updateFreePlan(created.id, {
        maxChatsPerDay: 20,
      });

      expect(updated).not.toBeNull();
      expect(updated?.maxChatsPerDay).toBe(20);
    });

    it('should delete a free plan', () => {
      const created = manager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat'],
      });

      const deleted = manager.deleteFreePlan(created.id);
      expect(deleted).toBe(true);

      const retrieved = manager.getFreePlan(created.id);
      expect(retrieved).toBeUndefined();
    });

    it('should get all free plans', () => {
      manager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat'],
      });

      manager.createFreePlan({
        name: 'Pro Free',
        maxChatsPerDay: 50,
        maxFileSizePerUpload: 10,
        maxStorageGB: 5,
        maxConcurrentSessions: 3,
        features: ['chat', 'analysis', 'export'],
      });

      const plans = manager.getAllFreePlans();
      expect(plans.length).toBe(2);
    });
  });

  describe('Free User Management', () => {
    let planId: string;

    beforeEach(() => {
      // Clear previous state
      manager = new FreePlanManager();
      const plan = manager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat'],
      });
      planId = plan.id;
    });

    it('should register a free user', () => {
      const user = manager.registerFreeUser('user@example.com', planId);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('user@example.com');
      expect(user.planId).toBe(planId);
      expect(user.isActive).toBe(true);
    });

    it('should retrieve a free user by ID', () => {
      const created = manager.registerFreeUser('user@example.com', planId);
      const retrieved = manager.getFreeUser(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should update a free user', () => {
      const created = manager.registerFreeUser('user@example.com', planId);
      const updated = manager.updateFreeUser(created.id, {
        metadata: { theme: 'dark' },
      });

      expect(updated).not.toBeNull();
      expect(updated?.metadata.theme).toBe('dark');
    });

    it('should deactivate a free user', () => {
      const created = manager.registerFreeUser('user@example.com', planId);
      const deactivated = manager.deactivateFreeUser(created.id);

      expect(deactivated).toBe(true);

      const retrieved = manager.getFreeUser(created.id);
      expect(retrieved?.isActive).toBe(false);
      expect(retrieved?.subscriptionEndDate).toBeDefined();
    });

    it('should get all free users', () => {
      const testManager = new FreePlanManager();
      const testPlan = testManager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat'],
      });
      
      testManager.registerFreeUser('user1@example.com', testPlan.id);
      testManager.registerFreeUser('user2@example.com', testPlan.id);

      const users = testManager.getAllFreeUsers();
      expect(users.length).toBe(2);
    });

    it('should get active free users', () => {
      const testManager = new FreePlanManager();
      const testPlan = testManager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat'],
      });
      
      const user1 = testManager.registerFreeUser('user1@example.com', testPlan.id);
      const user2 = testManager.registerFreeUser('user2@example.com', testPlan.id);

      testManager.deactivateFreeUser(user1.id);

      const activeUsers = testManager.getActiveFreeUsers();
      expect(activeUsers.length).toBe(1);
      expect(activeUsers[0].id).toBe(user2.id);
    });
  });

  describe('Plan Statistics', () => {
    let planId: string;

    beforeEach(() => {
      // Clear previous state
      manager = new FreePlanManager();
      const plan = manager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat', 'analysis'],
      });
      planId = plan.id;
    });

    it('should get plan statistics', () => {
      const testManager = new FreePlanManager();
      const testPlan = testManager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat', 'analysis'],
      });
      
      testManager.registerFreeUser('user1@example.com', testPlan.id);
      testManager.registerFreeUser('user2@example.com', testPlan.id);

      const stats = testManager.getPlanStatistics(testPlan.id);

      expect(stats).not.toBeNull();
      expect(stats?.totalUsers).toBeGreaterThanOrEqual(2);
      expect(stats?.activeUsers).toBeGreaterThanOrEqual(2);
      expect(stats?.planName).toBe('Basic Free');
      expect(stats?.features).toBe(2);
    });

    it('should get user statistics', () => {
      const testManager = new FreePlanManager();
      const testPlan = testManager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat', 'analysis'],
      });
      
      const user = testManager.registerFreeUser('user@example.com', testPlan.id);
      const stats = testManager.getUserStatistics(user.id);

      expect(stats).not.toBeNull();
      expect(stats?.email).toBe('user@example.com');
      expect(stats?.planName).toBe('Basic Free');
      expect(stats?.isActive).toBe(true);
      expect(stats?.daysActive).toBeGreaterThanOrEqual(0);
      expect(stats?.maxChatsPerDay).toBe(10);
    });

    it('should compare plans', () => {
      // Create fresh manager for this test
      const testManager = new FreePlanManager();
      
      const plan1 = testManager.createFreePlan({
        name: 'Basic',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat'],
      });

      const plan2 = testManager.createFreePlan({
        name: 'Pro',
        maxChatsPerDay: 50,
        maxFileSizePerUpload: 20,
        maxStorageGB: 10,
        maxConcurrentSessions: 5,
        features: ['chat', 'analysis', 'export'],
      });

      const comparison = testManager.comparePlans(plan1.id, plan2.id);

      expect(comparison).not.toBeNull();
      expect(comparison?.plan1.maxChatsPerDay).toBe(10);
      expect(comparison?.plan2.maxChatsPerDay).toBe(50);
      expect(comparison?.differences.chatsDifference).toBe(40);
      expect(comparison?.differences.storageDifference).toBe(9);
      expect(comparison?.differences.featuresDifference).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent plan ID', () => {
      const testManager = new FreePlanManager();
      const plan = testManager.getFreePlan('non-existent');
      expect(plan).toBeUndefined();
    });

    it('should handle non-existent user ID', () => {
      const testManager = new FreePlanManager();
      const user = testManager.getFreeUser('non-existent');
      expect(user).toBeUndefined();
    });

    it('should handle registration with non-existent plan', () => {
      const testManager = new FreePlanManager();
      expect(() => {
        testManager.registerFreeUser('user@example.com', 'non-existent');
      }).toThrow('Plan not found');
    });

    it('should handle update of non-existent plan', () => {
      const testManager = new FreePlanManager();
      const result = testManager.updateFreePlan('non-existent', {
        maxChatsPerDay: 20,
      });
      expect(result).toBeNull();
    });

    it('should handle update of non-existent user', () => {
      const testManager = new FreePlanManager();
      const result = testManager.updateFreeUser('non-existent', {
        metadata: {},
      });
      expect(result).toBeNull();
    });
  });

  describe('Plan Limits Validation', () => {
    it('should validate plan limits', () => {
      const testManager = new FreePlanManager();
      const plan = testManager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat'],
      });

      expect(plan.maxChatsPerDay).toBeGreaterThan(0);
      expect(plan.maxStorageGB).toBeGreaterThan(0);
      expect(plan.maxConcurrentSessions).toBeGreaterThan(0);
    });

    it('should support multiple features', () => {
      const testManager = new FreePlanManager();
      const plan = testManager.createFreePlan({
        name: 'Pro Free',
        maxChatsPerDay: 50,
        maxFileSizePerUpload: 10,
        maxStorageGB: 5,
        maxConcurrentSessions: 3,
        features: ['chat', 'analysis', 'export', 'collaboration'],
      });

      expect(plan.features.length).toBe(4);
      expect(plan.features).toContain('chat');
      expect(plan.features).toContain('analysis');
    });
  });

  describe('User Subscription Lifecycle', () => {
    let planId: string;

    beforeEach(() => {
      // Clear previous state
      manager = new FreePlanManager();
      const plan = manager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat'],
      });
      planId = plan.id;
    });

    it('should track subscription start date', () => {
      const testManager = new FreePlanManager();
      const testPlan = testManager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat'],
      });
      
      const before = new Date(Date.now() - 1000);
      const user = testManager.registerFreeUser('user@example.com', testPlan.id);
      const after = new Date(Date.now() + 1000);

      expect(user.subscriptionStartDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(user.subscriptionStartDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should track subscription end date on deactivation', () => {
      const testManager = new FreePlanManager();
      const testPlan = testManager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat'],
      });
      
      const user = testManager.registerFreeUser('user@example.com', testPlan.id);
      expect(user.subscriptionEndDate).toBeUndefined();

      const deactivated = testManager.deactivateFreeUser(user.id);
      expect(deactivated).toBe(true);

      const updated = testManager.getFreeUser(user.id);
      expect(updated?.subscriptionEndDate).toBeDefined();
    });

    it('should maintain active status throughout lifecycle', () => {
      const testManager = new FreePlanManager();
      const testPlan = testManager.createFreePlan({
        name: 'Basic Free',
        maxChatsPerDay: 10,
        maxFileSizePerUpload: 5,
        maxStorageGB: 1,
        maxConcurrentSessions: 1,
        features: ['chat'],
      });
      
      const user = testManager.registerFreeUser('user@example.com', testPlan.id);
      expect(user.isActive).toBe(true);

      const retrieved = testManager.getFreeUser(user.id);
      expect(retrieved?.isActive).toBe(true);
      expect(retrieved?.planId).toBe(testPlan.id);
    });
  });
});

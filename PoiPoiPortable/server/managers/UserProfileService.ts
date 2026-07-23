/**
 * UserProfileService - ユーザープロフィール管理
 * 
 * 機能:
 * - プロフィール作成・更新
 * - プロフィール画像管理
 * - ユーザー設定管理
 * - プロフィール検証
 */

import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export interface UserProfile {
  userId: number;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  location?: string;
  website?: string;
  birthDate?: Date;
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profilePublic: boolean;
    showEmail: boolean;
    showActivity: boolean;
  };
  preferences: Record<string, any>;
  updatedAt: Date;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  location?: string;
  website?: string;
  birthDate?: Date;
  language?: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'auto';
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  privacy?: {
    profilePublic?: boolean;
    showEmail?: boolean;
    showActivity?: boolean;
  };
  preferences?: Record<string, any>;
}

export class UserProfileService {
  private static instance: UserProfileService;
  private profileCache: Map<number, UserProfile> = new Map();

  private constructor() {}

  static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService();
    }
    return UserProfileService.instance;
  }

  /**
   * プロフィール取得
   */
  async getProfile(userId: number): Promise<UserProfile | null> {
    try {
      // キャッシュから取得
      if (this.profileCache.has(userId)) {
        return this.profileCache.get(userId) || null;
      }

      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (result.length === 0) return null;

      const user = result[0];
      const metadata = (user.metadata as any) || {};

      const profile: UserProfile = {
        userId: user.id,
        displayName: user.name || '',
        bio: metadata.bio || '',
        avatarUrl: metadata.avatarUrl,
        coverImageUrl: metadata.coverImageUrl,
        location: metadata.location,
        website: metadata.website,
        birthDate: metadata.birthDate,
        language: metadata.language || 'ja',
        timezone: metadata.timezone || 'Asia/Tokyo',
        theme: metadata.theme || 'auto',
        notifications: metadata.notifications || {
          email: true,
          push: true,
          sms: false,
        },
        privacy: metadata.privacy || {
          profilePublic: true,
          showEmail: false,
          showActivity: true,
        },
        preferences: metadata.preferences || {},
        updatedAt: user.updatedAt,
      };

      // キャッシュに保存
      this.profileCache.set(userId, profile);

      return profile;
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  }

  /**
   * プロフィール更新
   */
  async updateProfile(userId: number, request: UpdateProfileRequest): Promise<UserProfile | null> {
    try {
      const db = await getDb();
      if (!db) return null;

      const currentProfile = await this.getProfile(userId);
      if (!currentProfile) return null;

      const updatedProfile: UserProfile = {
        ...currentProfile,
        displayName: request.displayName ?? currentProfile.displayName,
        bio: request.bio ?? currentProfile.bio,
        avatarUrl: request.avatarUrl ?? currentProfile.avatarUrl,
        coverImageUrl: request.coverImageUrl ?? currentProfile.coverImageUrl,
        location: request.location ?? currentProfile.location,
        website: request.website ?? currentProfile.website,
        birthDate: request.birthDate ?? currentProfile.birthDate,
        language: request.language ?? currentProfile.language,
        timezone: request.timezone ?? currentProfile.timezone,
        theme: request.theme ?? currentProfile.theme,
        notifications: { ...currentProfile.notifications, ...request.notifications },
        privacy: { ...currentProfile.privacy, ...request.privacy },
        preferences: { ...currentProfile.preferences, ...request.preferences },
        updatedAt: new Date(),
      };

      const metadata = {
        bio: updatedProfile.bio,
        avatarUrl: updatedProfile.avatarUrl,
        coverImageUrl: updatedProfile.coverImageUrl,
        location: updatedProfile.location,
        website: updatedProfile.website,
        birthDate: updatedProfile.birthDate,
        language: updatedProfile.language,
        timezone: updatedProfile.timezone,
        theme: updatedProfile.theme,
        notifications: updatedProfile.notifications,
        privacy: updatedProfile.privacy,
        preferences: updatedProfile.preferences,
      };

      await db
        .update(users)
        .set({
          name: updatedProfile.displayName,
          metadata,
        })
        .where(eq(users.id, userId));

      // キャッシュを更新
      this.profileCache.set(userId, updatedProfile);

      return updatedProfile;
    } catch (error) {
      console.error('Failed to update profile:', error);
      return null;
    }
  }

  /**
   * プロフィール画像更新
   */
  async updateAvatar(userId: number, avatarUrl: string): Promise<boolean> {
    try {
      const profile = await this.updateProfile(userId, { avatarUrl });
      return profile !== null;
    } catch (error) {
      console.error('Failed to update avatar:', error);
      return false;
    }
  }

  /**
   * カバー画像更新
   */
  async updateCoverImage(userId: number, coverImageUrl: string): Promise<boolean> {
    try {
      const profile = await this.updateProfile(userId, { coverImageUrl });
      return profile !== null;
    } catch (error) {
      console.error('Failed to update cover image:', error);
      return false;
    }
  }

  /**
   * ユーザー設定更新
   */
  async updatePreferences(userId: number, preferences: Record<string, any>): Promise<boolean> {
    try {
      const profile = await this.updateProfile(userId, { preferences });
      return profile !== null;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return false;
    }
  }

  /**
   * 通知設定更新
   */
  async updateNotificationSettings(
    userId: number,
    settings: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    }
  ): Promise<boolean> {
    try {
      const profile = await this.updateProfile(userId, { notifications: settings });
      return profile !== null;
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      return false;
    }
  }

  /**
   * プライバシー設定更新
   */
  async updatePrivacySettings(
    userId: number,
    settings: {
      profilePublic?: boolean;
      showEmail?: boolean;
      showActivity?: boolean;
    }
  ): Promise<boolean> {
    try {
      const profile = await this.updateProfile(userId, { privacy: settings });
      return profile !== null;
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      return false;
    }
  }

  /**
   * テーマ設定更新
   */
  async updateTheme(userId: number, theme: 'light' | 'dark' | 'auto'): Promise<boolean> {
    try {
      const profile = await this.updateProfile(userId, { theme });
      return profile !== null;
    } catch (error) {
      console.error('Failed to update theme:', error);
      return false;
    }
  }

  /**
   * 言語設定更新
   */
  async updateLanguage(userId: number, language: string): Promise<boolean> {
    try {
      const profile = await this.updateProfile(userId, { language });
      return profile !== null;
    } catch (error) {
      console.error('Failed to update language:', error);
      return false;
    }
  }

  /**
   * タイムゾーン設定更新
   */
  async updateTimezone(userId: number, timezone: string): Promise<boolean> {
    try {
      const profile = await this.updateProfile(userId, { timezone });
      return profile !== null;
    } catch (error) {
      console.error('Failed to update timezone:', error);
      return false;
    }
  }

  /**
   * プロフィール検証
   */
  async validateProfile(userId: number): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      const profile = await this.getProfile(userId);

      if (!profile) {
        return { isValid: false, errors: ['Profile not found'] };
      }

      const errors: string[] = [];

      if (!profile.displayName || profile.displayName.trim().length === 0) {
        errors.push('Display name is required');
      }

      if (profile.displayName && profile.displayName.length > 100) {
        errors.push('Display name must be less than 100 characters');
      }

      if (profile.bio && profile.bio.length > 500) {
        errors.push('Bio must be less than 500 characters');
      }

      if (profile.website && !this.isValidUrl(profile.website)) {
        errors.push('Website URL is invalid');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.error('Failed to validate profile:', error);
      return { isValid: false, errors: ['Validation error'] };
    }
  }

  /**
   * キャッシュクリア
   */
  clearCache(userId?: number): void {
    if (userId) {
      this.profileCache.delete(userId);
    } else {
      this.profileCache.clear();
    }
  }

  /**
   * URL検証
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * プロフィール統計取得
   */
  async getProfileStats(userId: number): Promise<{
    completeness: number;
    lastUpdated: Date;
  } | null> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) return null;

      let completedFields = 0;
      const totalFields = 10;

      if (profile.displayName) completedFields++;
      if (profile.bio) completedFields++;
      if (profile.avatarUrl) completedFields++;
      if (profile.coverImageUrl) completedFields++;
      if (profile.location) completedFields++;
      if (profile.website) completedFields++;
      if (profile.birthDate) completedFields++;
      if (profile.language !== 'ja') completedFields++;
      if (profile.timezone !== 'Asia/Tokyo') completedFields++;
      if (Object.keys(profile.preferences).length > 0) completedFields++;

      return {
        completeness: Math.round((completedFields / totalFields) * 100),
        lastUpdated: profile.updatedAt,
      };
    } catch (error) {
      console.error('Failed to get profile stats:', error);
      return null;
    }
  }
}

export const userProfileService = UserProfileService.getInstance();
export default userProfileService;

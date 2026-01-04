/**
 * Privacy Service
 * Phase 6: Privacy controls and user settings management
 */

import { api } from './api';
import { cacheService, CacheTTL } from './cacheService';

// Privacy levels
export const PrivacyLevel = {
  PUBLIC: 'public',
  FRIENDS_ONLY: 'friends_only',
  PRIVATE: 'private',
};

// Default privacy settings
export const DEFAULT_PRIVACY_SETTINGS = {
  // Profile visibility
  profileVisibility: PrivacyLevel.PUBLIC,
  showOnlineStatus: true,
  showLastSeen: true,
  showGameHistory: true,
  showStats: true,
  showAchievements: true,

  // Location privacy
  shareLocationWithFriends: true,
  showOnLeaderboards: true,
  showInPublicGames: true,
  allowLocationHistory: false,

  // Social settings
  allowFriendRequests: true,
  allowPartyInvites: true,
  allowClanInvites: true,
  allowDirectMessages: true,
  showClanMembership: true,

  // Game settings
  allowSpectators: true,
  allowReplaysToBeShared: true,
  showInMatchmaking: true,

  // Communication
  blockStrangerMessages: false,
  muteGameChat: false,
  muteVoiceChat: false,

  // Data
  allowAnalytics: true,
  allowPersonalizedContent: true,
  marketingEmails: false,
};

// Blocked user reasons
export const BlockReason = {
  HARASSMENT: 'harassment',
  CHEATING: 'cheating',
  SPAM: 'spam',
  OTHER: 'other',
};

class PrivacyService {
  constructor() {
    this.cache = cacheService;
    this.settings = { ...DEFAULT_PRIVACY_SETTINGS };
    this.blockedUsers = new Map(); // Map of userId -> reason
    this.mutedUsers = new Set();
  }

  /**
   * Load privacy settings from server
   */
  async loadSettings() {
    const cacheKey = 'privacy_settings';
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.settings = { ...DEFAULT_PRIVACY_SETTINGS, ...cached };
      return this.settings;
    }

    try {
      const data = await api.request('/settings/privacy');
      this.settings = { ...DEFAULT_PRIVACY_SETTINGS, ...data };
      await this.cache.set(cacheKey, this.settings, CacheTTL.LONG);
      return this.settings;
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      return this.settings;
    }
  }

  /**
   * Update privacy settings
   */
  async updateSettings(updates) {
    try {
      const data = await api.request('/settings/privacy', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      this.settings = { ...this.settings, ...updates };
      await this.cache.set('privacy_settings', this.settings, CacheTTL.LONG);

      return data;
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      throw error;
    }
  }

  /**
   * Get a specific setting
   */
  getSetting(key) {
    return this.settings[key];
  }

  /**
   * Get all settings
   */
  getAllSettings() {
    return { ...this.settings };
  }

  /**
   * Reset to default settings
   */
  async resetToDefaults() {
    try {
      await this.updateSettings(DEFAULT_PRIVACY_SETTINGS);
      return DEFAULT_PRIVACY_SETTINGS;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  }

  /**
   * Load blocked users list
   */
  async loadBlockedUsers() {
    try {
      const data = await api.request('/users/blocked');
      this.blockedUsers = new Map(
        data.blocked?.map(u => [u.userId, u.reason]) || []
      );
      return Array.from(this.blockedUsers.entries()).map(([userId, reason]) => ({
        userId,
        reason,
      }));
    } catch (error) {
      console.error('Failed to load blocked users:', error);
      return [];
    }
  }

  /**
   * Block a user
   */
  async blockUser(userId, reason = BlockReason.OTHER) {
    try {
      await api.request(`/users/${userId}/block`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });

      this.blockedUsers.set(userId, reason);
      return true;
    } catch (error) {
      console.error('Failed to block user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId) {
    try {
      await api.request(`/users/${userId}/block`, {
        method: 'DELETE',
      });

      this.blockedUsers.delete(userId);
      return true;
    } catch (error) {
      console.error('Failed to unblock user:', error);
      throw error;
    }
  }

  /**
   * Check if a user is blocked
   */
  isBlocked(userId) {
    return this.blockedUsers.has(userId);
  }

  /**
   * Get blocked users
   */
  getBlockedUsers() {
    return Array.from(this.blockedUsers.entries()).map(([userId, reason]) => ({
      userId,
      reason,
    }));
  }

  /**
   * Mute a user (in-session only, not persisted)
   */
  muteUser(userId) {
    this.mutedUsers.add(userId);
  }

  /**
   * Unmute a user
   */
  unmuteUser(userId) {
    this.mutedUsers.delete(userId);
  }

  /**
   * Check if a user is muted
   */
  isMuted(userId) {
    return this.mutedUsers.has(userId);
  }

  /**
   * Check if can receive messages from user
   */
  canReceiveMessagesFrom(userId, isFriend = false) {
    if (this.isBlocked(userId)) return false;
    if (this.isMuted(userId)) return false;
    if (!this.settings.allowDirectMessages) return false;
    if (this.settings.blockStrangerMessages && !isFriend) return false;
    return true;
  }

  /**
   * Check if profile is visible to a user
   */
  isProfileVisibleTo(viewerId, isFriend = false) {
    if (this.isBlocked(viewerId)) return false;

    switch (this.settings.profileVisibility) {
      case PrivacyLevel.PUBLIC:
        return true;
      case PrivacyLevel.FRIENDS_ONLY:
        return isFriend;
      case PrivacyLevel.PRIVATE:
        return false;
      default:
        return true;
    }
  }

  /**
   * Get data that's visible based on privacy settings
   */
  getVisibleProfileData(fullData, viewerId, isFriend = false) {
    if (!this.isProfileVisibleTo(viewerId, isFriend)) {
      return { name: fullData.name, avatar: fullData.avatar, id: fullData.id };
    }

    const visible = {
      id: fullData.id,
      name: fullData.name,
      avatar: fullData.avatar,
    };

    if (this.settings.showOnlineStatus || isFriend) {
      visible.isOnline = fullData.isOnline;
    }

    if (this.settings.showLastSeen || isFriend) {
      visible.lastSeen = fullData.lastSeen;
    }

    if (this.settings.showStats) {
      visible.stats = fullData.stats;
    }

    if (this.settings.showAchievements) {
      visible.achievements = fullData.achievements;
    }

    if (this.settings.showGameHistory) {
      visible.recentGames = fullData.recentGames;
    }

    if (this.settings.showClanMembership) {
      visible.clan = fullData.clan;
    }

    return visible;
  }

  /**
   * Check if should show on leaderboards
   */
  shouldShowOnLeaderboards() {
    return this.settings.showOnLeaderboards;
  }

  /**
   * Check if matchmaking is allowed
   */
  isMatchmakingAllowed() {
    return this.settings.showInMatchmaking;
  }

  /**
   * Report a user
   */
  async reportUser(userId, reason, details = '') {
    try {
      const data = await api.request(`/users/${userId}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason, details }),
      });
      return data;
    } catch (error) {
      console.error('Failed to report user:', error);
      throw error;
    }
  }

  /**
   * Request data export (GDPR)
   */
  async requestDataExport() {
    try {
      const data = await api.request('/settings/data-export', {
        method: 'POST',
      });
      return data;
    } catch (error) {
      console.error('Failed to request data export:', error);
      throw error;
    }
  }

  /**
   * Request account deletion (GDPR)
   */
  async requestAccountDeletion() {
    try {
      const data = await api.request('/settings/delete-account', {
        method: 'POST',
      });
      return data;
    } catch (error) {
      console.error('Failed to request account deletion:', error);
      throw error;
    }
  }

  /**
   * Clear location history
   */
  async clearLocationHistory() {
    try {
      await api.request('/settings/location-history', {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Failed to clear location history:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  async clearCache() {
    await this.cache.remove('privacy_settings');
  }
}

// Singleton instance
export const privacyService = new PrivacyService();
export default privacyService;

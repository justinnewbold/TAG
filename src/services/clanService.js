/**
 * Clan/Team System Service
 * Create/join clans, clan wars, leaderboards, and shared cosmetics
 */

import { api } from './api';
import { cacheService, CacheTTL } from './cacheService';

// Clan roles
export const CLAN_ROLES = {
  LEADER: { id: 'leader', name: 'Leader', permissions: ['all'], icon: '👑' },
  CO_LEADER: { id: 'co_leader', name: 'Co-Leader', permissions: ['invite', 'kick', 'promote', 'war', 'settings'], icon: '⭐' },
  ELDER: { id: 'elder', name: 'Elder', permissions: ['invite', 'kick'], icon: '🔰' },
  MEMBER: { id: 'member', name: 'Member', permissions: [], icon: '👤' },
};

// Clan settings
export const CLAN_SETTINGS = {
  JOIN_TYPE: {
    OPEN: 'open', // Anyone can join
    INVITE_ONLY: 'invite_only', // Requires invite
    CLOSED: 'closed', // No new members
  },
  MIN_LEVEL: {
    NONE: 0,
    BEGINNER: 5,
    INTERMEDIATE: 10,
    ADVANCED: 20,
    EXPERT: 50,
  },
};

// Clan war status
export const WAR_STATUS = {
  SEARCHING: 'searching',
  PREPARATION: 'preparation',
  BATTLE: 'battle',
  ENDED: 'ended',
};

class ClanService {
  constructor() {
    this.cache = cacheService;
    this.currentClan = null;
    this.clanMembers = [];
  }

  /**
   * Create a new clan
   */
  async createClan(clanData) {
    try {
      const data = await api.request('/clans', {
        method: 'POST',
        body: JSON.stringify({
          name: clanData.name,
          tag: clanData.tag.toUpperCase(),
          description: clanData.description || '',
          logo: clanData.logo || '⚔️',
          color: clanData.color || '#00FFFF',
          joinType: clanData.joinType || CLAN_SETTINGS.JOIN_TYPE.INVITE_ONLY,
          minLevel: clanData.minLevel || CLAN_SETTINGS.MIN_LEVEL.NONE,
        }),
      });

      this.currentClan = data.clan;
      return data;
    } catch (error) {
      console.error('Failed to create clan:', error);
      throw error;
    }
  }

  /**
   * Get clan by ID
   */
  async getClan(clanId) {
    const cacheKey = `clan_${clanId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const data = await api.request(`/clans/${clanId}`);
      await this.cache.set(cacheKey, data, CacheTTL.MEDIUM);
      return data;
    } catch (error) {
      console.error('Failed to get clan:', error);
      throw error;
    }
  }

  /**
   * Get user's current clan
   */
  async getMyClan() {
    try {
      const data = await api.request('/clans/my');
      this.currentClan = data.clan;
      this.clanMembers = data.members || [];
      return data;
    } catch (error) {
      if (error.status === 404) {
        return null; // Not in a clan
      }
      console.error('Failed to get my clan:', error);
      throw error;
    }
  }

  /**
   * Search for clans
   */
  async searchClans(query, filters = {}) {
    try {
      const params = new URLSearchParams({
        q: query,
        ...filters,
      });
      const data = await api.request(`/clans/search?${params}`);
      return data.clans || [];
    } catch (error) {
      console.error('Failed to search clans:', error);
      return [];
    }
  }

  /**
   * Join a clan
   */
  async joinClan(clanId, message = '') {
    try {
      const data = await api.request(`/clans/${clanId}/join`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });

      if (data.joined) {
        this.currentClan = data.clan;
      }

      return data;
    } catch (error) {
      console.error('Failed to join clan:', error);
      throw error;
    }
  }

  /**
   * Leave current clan
   */
  async leaveClan() {
    try {
      await api.request('/clans/leave', { method: 'POST' });
      this.currentClan = null;
      this.clanMembers = [];
      return true;
    } catch (error) {
      console.error('Failed to leave clan:', error);
      throw error;
    }
  }

  /**
   * Invite player to clan
   */
  async invitePlayer(playerId) {
    try {
      const data = await api.request('/clans/invite', {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      });
      return data;
    } catch (error) {
      console.error('Failed to invite player:', error);
      throw error;
    }
  }

  /**
   * Kick member from clan
   */
  async kickMember(memberId) {
    try {
      await api.request(`/clans/members/${memberId}/kick`, { method: 'POST' });
      this.clanMembers = this.clanMembers.filter(m => m.id !== memberId);
      return true;
    } catch (error) {
      console.error('Failed to kick member:', error);
      throw error;
    }
  }

  /**
   * Promote/demote member
   */
  async changeMemberRole(memberId, newRole) {
    try {
      const data = await api.request(`/clans/members/${memberId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });

      // Update local cache
      const memberIndex = this.clanMembers.findIndex(m => m.id === memberId);
      if (memberIndex >= 0) {
        this.clanMembers[memberIndex].role = newRole;
      }

      return data;
    } catch (error) {
      console.error('Failed to change member role:', error);
      throw error;
    }
  }

  /**
   * Update clan settings
   */
  async updateClanSettings(settings) {
    try {
      const data = await api.request('/clans/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });

      if (data.clan) {
        this.currentClan = data.clan;
      }

      return data;
    } catch (error) {
      console.error('Failed to update clan settings:', error);
      throw error;
    }
  }

  // ============ CLAN WARS ============

  /**
   * Start searching for clan war opponent
   */
  async startWarSearch() {
    try {
      const data = await api.request('/clans/war/search', { method: 'POST' });
      return data;
    } catch (error) {
      console.error('Failed to start war search:', error);
      throw error;
    }
  }

  /**
   * Cancel war search
   */
  async cancelWarSearch() {
    try {
      await api.request('/clans/war/search', { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Failed to cancel war search:', error);
      throw error;
    }
  }

  /**
   * Get current war status
   */
  async getCurrentWar() {
    try {
      const data = await api.request('/clans/war/current');
      return data.war;
    } catch (error) {
      if (error.status === 404) {
        return null; // No active war
      }
      console.error('Failed to get current war:', error);
      throw error;
    }
  }

  /**
   * Get war history
   */
  async getWarHistory(limit = 10) {
    try {
      const data = await api.request(`/clans/war/history?limit=${limit}`);
      return data.wars || [];
    } catch (error) {
      console.error('Failed to get war history:', error);
      return [];
    }
  }

  /**
   * Submit war attack result
   */
  async submitWarAttack(warId, targetId, result) {
    try {
      const data = await api.request(`/clans/war/${warId}/attack`, {
        method: 'POST',
        body: JSON.stringify({ targetId, result }),
      });
      return data;
    } catch (error) {
      console.error('Failed to submit war attack:', error);
      throw error;
    }
  }

  // ============ CLAN LEADERBOARDS ============

  /**
   * Get clan leaderboard
   */
  async getClanLeaderboard(type = 'trophies', limit = 50) {
    const cacheKey = `clan_leaderboard_${type}_${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const data = await api.request(`/clans/leaderboard?type=${type}&limit=${limit}`);
      await this.cache.set(cacheKey, data, CacheTTL.SHORT);
      return data;
    } catch (error) {
      console.error('Failed to get clan leaderboard:', error);
      return { clans: [] };
    }
  }

  // ============ CLAN COSMETICS ============

  /**
   * Get clan cosmetics
   */
  async getClanCosmetics() {
    if (!this.currentClan) return [];

    try {
      const data = await api.request('/clans/cosmetics');
      return data.cosmetics || [];
    } catch (error) {
      console.error('Failed to get clan cosmetics:', error);
      return [];
    }
  }

  /**
   * Unlock clan cosmetic (using clan points)
   */
  async unlockClanCosmetic(cosmeticId) {
    try {
      const data = await api.request(`/clans/cosmetics/${cosmeticId}/unlock`, {
        method: 'POST',
      });
      return data;
    } catch (error) {
      console.error('Failed to unlock clan cosmetic:', error);
      throw error;
    }
  }

  // ============ CLAN CHAT ============

  /**
   * Send clan chat message
   */
  async sendChatMessage(message) {
    try {
      const data = await api.request('/clans/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      return data;
    } catch (error) {
      console.error('Failed to send clan chat:', error);
      throw error;
    }
  }

  /**
   * Get clan chat history
   */
  async getChatHistory(limit = 50, before = null) {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (before) params.append('before', before);

      const data = await api.request(`/clans/chat?${params}`);
      return data.messages || [];
    } catch (error) {
      console.error('Failed to get clan chat:', error);
      return [];
    }
  }

  // ============ HELPERS ============

  /**
   * Check if user has permission
   */
  hasPermission(permission, memberRole) {
    const role = CLAN_ROLES[memberRole?.toUpperCase()];
    if (!role) return false;

    if (role.permissions.includes('all')) return true;
    return role.permissions.includes(permission);
  }

  /**
   * Get role info
   */
  getRoleInfo(roleId) {
    return CLAN_ROLES[roleId?.toUpperCase()] || CLAN_ROLES.MEMBER;
  }

  /**
   * Format clan tag
   */
  formatClanTag(tag) {
    return `[${tag}]`;
  }

  /**
   * Clear cache
   */
  async clearCache() {
    const keys = await this.cache.keys();
    for (const key of keys) {
      if (key.startsWith('clan_')) {
        await this.cache.remove(key);
      }
    }
  }
}

// Singleton
export const clanService = new ClanService();
export default clanService;

/**
 * Leaderboard Service
 * Phase 3: Global, friends, regional, and weekly leaderboards
 */

import { api } from './api';
import { cacheService, CacheKeys, CacheTTL } from './cacheService';

// Leaderboard types
export const LeaderboardType = {
  TOTAL_TAGS: 'total_tags',
  GAMES_WON: 'games_won',
  WIN_STREAK: 'win_streak',
  LONGEST_SURVIVAL: 'longest_survival',
  GAMES_PLAYED: 'games_played',
  FASTEST_TAG: 'fastest_tag',
};

// Leaderboard periods
export const LeaderboardPeriod = {
  ALL_TIME: 'all_time',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  DAILY: 'daily',
};

// Leaderboard scope
export const LeaderboardScope = {
  GLOBAL: 'global',
  FRIENDS: 'friends',
  REGIONAL: 'regional',
};

class LeaderboardService {
  constructor() {
    this.cache = cacheService;
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(options = {}) {
    const {
      type = LeaderboardType.TOTAL_TAGS,
      period = LeaderboardPeriod.ALL_TIME,
      scope = LeaderboardScope.GLOBAL,
      limit = 100,
      offset = 0,
      region = null,
    } = options;

    const cacheKey = CacheKeys.LEADERBOARD(type, `${period}_${scope}_${offset}`);

    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams({
        type,
        period,
        scope,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (region) {
        params.append('region', region);
      }

      const data = await api.request(`/leaderboards?${params}`);

      // Cache for 5 minutes
      await this.cache.set(cacheKey, data, CacheTTL.MEDIUM);

      return data;
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get user's rank on a leaderboard
   */
  async getUserRank(userId, type = LeaderboardType.TOTAL_TAGS, period = LeaderboardPeriod.ALL_TIME) {
    try {
      const data = await api.request(`/leaderboards/rank/${userId}?type=${type}&period=${period}`);
      return data;
    } catch (error) {
      console.error('Failed to fetch user rank:', error);
      throw error;
    }
  }

  /**
   * Get friends leaderboard
   */
  async getFriendsLeaderboard(type = LeaderboardType.TOTAL_TAGS) {
    return this.getLeaderboard({
      type,
      scope: LeaderboardScope.FRIENDS,
      period: LeaderboardPeriod.ALL_TIME,
    });
  }

  /**
   * Get weekly leaderboard
   */
  async getWeeklyLeaderboard(type = LeaderboardType.TOTAL_TAGS) {
    return this.getLeaderboard({
      type,
      scope: LeaderboardScope.GLOBAL,
      period: LeaderboardPeriod.WEEKLY,
    });
  }

  /**
   * Get regional leaderboard
   */
  async getRegionalLeaderboard(type = LeaderboardType.TOTAL_TAGS, region) {
    return this.getLeaderboard({
      type,
      scope: LeaderboardScope.REGIONAL,
      region,
    });
  }

  /**
   * Get position change from previous period
   */
  async getPositionChange(userId, type = LeaderboardType.TOTAL_TAGS) {
    try {
      const data = await api.request(`/leaderboards/position-change/${userId}?type=${type}`);
      return data;
    } catch (error) {
      console.error('Failed to fetch position change:', error);
      return { change: 0, previousRank: null };
    }
  }

  /**
   * Get mode-specific leaderboard
   */
  async getModeLeaderboard(gameMode, type = LeaderboardType.GAMES_WON) {
    try {
      const data = await api.request(`/leaderboards/mode/${gameMode}?type=${type}`);
      return data;
    } catch (error) {
      console.error('Failed to fetch mode leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard with filters
   */
  async searchLeaderboard(query, type = LeaderboardType.TOTAL_TAGS) {
    try {
      const data = await api.request(`/leaderboards/search?q=${encodeURIComponent(query)}&type=${type}`);
      return data;
    } catch (error) {
      console.error('Failed to search leaderboard:', error);
      throw error;
    }
  }

  /**
   * Format rank with suffix
   */
  formatRank(rank) {
    if (!rank || rank < 1) return '-';

    const j = rank % 10;
    const k = rank % 100;

    if (j === 1 && k !== 11) return `${rank}st`;
    if (j === 2 && k !== 12) return `${rank}nd`;
    if (j === 3 && k !== 13) return `${rank}rd`;
    return `${rank}th`;
  }

  /**
   * Get rank badge/medal
   */
  getRankBadge(rank) {
    if (rank === 1) return { emoji: '🥇', label: 'Gold', color: 'text-yellow-400' };
    if (rank === 2) return { emoji: '🥈', label: 'Silver', color: 'text-gray-300' };
    if (rank === 3) return { emoji: '🥉', label: 'Bronze', color: 'text-amber-600' };
    if (rank <= 10) return { emoji: '🏅', label: 'Top 10', color: 'text-blue-400' };
    if (rank <= 50) return { emoji: '⭐', label: 'Top 50', color: 'text-purple-400' };
    if (rank <= 100) return { emoji: '✨', label: 'Top 100', color: 'text-green-400' };
    return null;
  }

  /**
   * Format stat value for display
   */
  formatStatValue(value, type) {
    if (value === null || value === undefined) return '-';

    switch (type) {
      case LeaderboardType.LONGEST_SURVIVAL:
      case LeaderboardType.FASTEST_TAG:
        // Convert milliseconds to readable time
        const totalSeconds = Math.floor(value / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if (minutes > 0) {
          return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;

      case LeaderboardType.WIN_STREAK:
        return `${value} streak`;

      default:
        // Format large numbers
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`;
        }
        if (value >= 1000) {
          return `${(value / 1000).toFixed(1)}K`;
        }
        return value.toString();
    }
  }

  /**
   * Get leaderboard type label
   */
  getTypeLabel(type) {
    const labels = {
      [LeaderboardType.TOTAL_TAGS]: 'Total Tags',
      [LeaderboardType.GAMES_WON]: 'Games Won',
      [LeaderboardType.WIN_STREAK]: 'Win Streak',
      [LeaderboardType.LONGEST_SURVIVAL]: 'Longest Survival',
      [LeaderboardType.GAMES_PLAYED]: 'Games Played',
      [LeaderboardType.FASTEST_TAG]: 'Fastest Tag',
    };
    return labels[type] || type;
  }

  /**
   * Invalidate leaderboard cache
   */
  async invalidateCache() {
    await this.cache.invalidatePattern(/leaderboard/);
  }
}

// Singleton instance
export const leaderboardService = new LeaderboardService();
export default leaderboardService;

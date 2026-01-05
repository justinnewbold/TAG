/**
 * Ranked/Competitive Mode Service
 * ELO/MMR rating system with skill divisions and seasonal rankings
 */

import { api } from './api';
import { cacheService, CacheTTL } from './cacheService';

// Skill Divisions/Tiers
export const SKILL_DIVISIONS = {
  BRONZE: { id: 'bronze', name: 'Bronze', icon: '🥉', minRating: 0, maxRating: 999, color: '#CD7F32' },
  SILVER: { id: 'silver', name: 'Silver', icon: '🥈', minRating: 1000, maxRating: 1499, color: '#C0C0C0' },
  GOLD: { id: 'gold', name: 'Gold', icon: '🥇', minRating: 1500, maxRating: 1999, color: '#FFD700' },
  PLATINUM: { id: 'platinum', name: 'Platinum', icon: '💎', minRating: 2000, maxRating: 2499, color: '#E5E4E2' },
  DIAMOND: { id: 'diamond', name: 'Diamond', icon: '💠', minRating: 2500, maxRating: 2999, color: '#B9F2FF' },
  MASTER: { id: 'master', name: 'Master', icon: '👑', minRating: 3000, maxRating: 3499, color: '#9966CC' },
  GRANDMASTER: { id: 'grandmaster', name: 'Grandmaster', icon: '🏆', minRating: 3500, maxRating: 3999, color: '#FF4500' },
  LEGEND: { id: 'legend', name: 'Legend', icon: '⭐', minRating: 4000, maxRating: Infinity, color: '#FFD700' },
};

// Sub-divisions within each tier (I, II, III, IV)
export const SUB_DIVISIONS = ['IV', 'III', 'II', 'I'];

// Queue types
export const QUEUE_TYPES = {
  CASUAL: 'casual',
  RANKED_SOLO: 'ranked_solo',
  RANKED_DUO: 'ranked_duo',
  RANKED_SQUAD: 'ranked_squad',
};

// Default starting rating
const DEFAULT_RATING = 1200;
const K_FACTOR_NEW = 40; // Higher K for new players
const K_FACTOR_NORMAL = 20;
const K_FACTOR_HIGH_RATING = 10; // Lower K for high-rated players
const PLACEMENT_GAMES = 10;

class RankedService {
  constructor() {
    this.cache = cacheService;
    this.currentSeason = null;
    this.playerRating = null;
    this.placementProgress = null;
  }

  /**
   * Initialize and load current season
   */
  async initialize() {
    try {
      const [season, rating] = await Promise.all([
        this.getCurrentSeason(),
        this.getPlayerRating(),
      ]);
      this.currentSeason = season;
      this.playerRating = rating;
      return { season, rating };
    } catch (error) {
      console.error('Failed to initialize ranked service:', error);
      throw error;
    }
  }

  /**
   * Get current season info
   */
  async getCurrentSeason() {
    const cacheKey = 'current_season';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const data = await api.request('/ranked/season');
      await this.cache.set(cacheKey, data, CacheTTL.MEDIUM);
      return data;
    } catch (error) {
      // Default season if API fails
      return {
        id: 'season_1',
        name: 'Season 1',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        rewards: this.getSeasonRewards(1),
      };
    }
  }

  /**
   * Get player's current rating
   */
  async getPlayerRating() {
    try {
      const data = await api.request('/ranked/rating');
      this.playerRating = data;
      return data;
    } catch (error) {
      // Default for new players
      return {
        rating: DEFAULT_RATING,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        placementGamesLeft: PLACEMENT_GAMES,
        isPlacement: true,
        division: this.getDivisionForRating(DEFAULT_RATING),
        peakRating: DEFAULT_RATING,
        seasonRating: DEFAULT_RATING,
      };
    }
  }

  /**
   * Calculate ELO change after a game
   */
  calculateEloChange(playerRating, opponentRating, won, gameStats = {}) {
    // Expected score based on rating difference
    const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));

    // Actual score (1 for win, 0 for loss, 0.5 for draw)
    const actualScore = won ? 1 : 0;

    // Determine K factor based on games played and rating
    let kFactor = K_FACTOR_NORMAL;
    if (this.playerRating?.gamesPlayed < PLACEMENT_GAMES) {
      kFactor = K_FACTOR_NEW;
    } else if (playerRating > 2500) {
      kFactor = K_FACTOR_HIGH_RATING;
    }

    // Performance bonus for exceptional games
    let performanceBonus = 0;
    if (gameStats.tags && gameStats.tags > 5) {
      performanceBonus += Math.min(gameStats.tags - 5, 5); // Up to +5 for many tags
    }
    if (gameStats.survivalTime && gameStats.survivalTime > 300000) {
      performanceBonus += 2; // +2 for surviving 5+ minutes
    }

    // Calculate base ELO change
    let eloChange = Math.round(kFactor * (actualScore - expectedScore));

    // Add performance bonus only for wins
    if (won) {
      eloChange += performanceBonus;
    }

    // Minimum change of ±5 to ensure progress
    if (eloChange > 0 && eloChange < 5) eloChange = 5;
    if (eloChange < 0 && eloChange > -5) eloChange = -5;

    return eloChange;
  }

  /**
   * Get division for a rating
   */
  getDivisionForRating(rating) {
    for (const [key, division] of Object.entries(SKILL_DIVISIONS)) {
      if (rating >= division.minRating && rating <= division.maxRating) {
        // Calculate sub-division
        const range = division.maxRating - division.minRating;
        const progress = rating - division.minRating;
        const subDivIndex = Math.min(3, Math.floor((progress / range) * 4));

        return {
          ...division,
          key,
          subDivision: SUB_DIVISIONS[3 - subDivIndex],
          fullName: `${division.name} ${SUB_DIVISIONS[3 - subDivIndex]}`,
          progress: (progress % (range / 4)) / (range / 4) * 100,
        };
      }
    }
    return { ...SKILL_DIVISIONS.BRONZE, subDivision: 'IV', fullName: 'Bronze IV' };
  }

  /**
   * Submit game result for ranked
   */
  async submitGameResult(gameId, result) {
    try {
      const data = await api.request('/ranked/submit', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          result,
        }),
      });

      // Update local rating
      if (data.newRating) {
        this.playerRating = data.newRating;
      }

      return data;
    } catch (error) {
      console.error('Failed to submit ranked result:', error);
      throw error;
    }
  }

  /**
   * Get ranked leaderboard
   */
  async getLeaderboard(type = 'global', limit = 100) {
    const cacheKey = `ranked_leaderboard_${type}_${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const data = await api.request(`/ranked/leaderboard?type=${type}&limit=${limit}`);
      await this.cache.set(cacheKey, data, CacheTTL.SHORT);
      return data;
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return { players: [], myRank: null };
    }
  }

  /**
   * Get season rewards
   */
  getSeasonRewards(seasonNumber) {
    return {
      bronze: { coins: 100, cosmetic: null },
      silver: { coins: 250, cosmetic: 'frame_silver' },
      gold: { coins: 500, cosmetic: 'frame_gold' },
      platinum: { coins: 1000, cosmetic: 'trail_platinum' },
      diamond: { coins: 2000, cosmetic: 'effect_diamond' },
      master: { coins: 3500, cosmetic: 'badge_master' },
      grandmaster: { coins: 5000, cosmetic: 'badge_grandmaster' },
      legend: { coins: 10000, cosmetic: 'badge_legend', exclusive: true },
    };
  }

  /**
   * Get player's rank progress
   */
  getRankProgress() {
    if (!this.playerRating) return null;

    const division = this.getDivisionForRating(this.playerRating.rating);
    const nextDivision = this.getNextDivision(division.key);

    return {
      current: division,
      next: nextDivision,
      pointsToNext: nextDivision ? nextDivision.minRating - this.playerRating.rating : 0,
      isPlacement: this.playerRating.placementGamesLeft > 0,
      placementGamesLeft: this.playerRating.placementGamesLeft,
    };
  }

  /**
   * Get next division
   */
  getNextDivision(currentKey) {
    const keys = Object.keys(SKILL_DIVISIONS);
    const currentIndex = keys.indexOf(currentKey);
    if (currentIndex < keys.length - 1) {
      return SKILL_DIVISIONS[keys[currentIndex + 1]];
    }
    return null;
  }

  /**
   * Check if player can queue for ranked
   */
  canQueueRanked() {
    // Requirements: minimum level, verified account, etc.
    return {
      canQueue: true,
      requirements: [
        { name: 'Account Level 5', met: true },
        { name: '10 Casual Games Played', met: true },
        { name: 'Verified Email', met: true },
      ],
    };
  }

  /**
   * Join ranked queue
   */
  async joinRankedQueue(queueType = QUEUE_TYPES.RANKED_SOLO) {
    try {
      const data = await api.request('/ranked/queue/join', {
        method: 'POST',
        body: JSON.stringify({ queueType }),
      });
      return data;
    } catch (error) {
      console.error('Failed to join ranked queue:', error);
      throw error;
    }
  }

  /**
   * Leave ranked queue
   */
  async leaveRankedQueue() {
    try {
      await api.request('/ranked/queue/leave', { method: 'POST' });
      return true;
    } catch (error) {
      console.error('Failed to leave ranked queue:', error);
      throw error;
    }
  }

  /**
   * Get match history
   */
  async getMatchHistory(limit = 20) {
    try {
      const data = await api.request(`/ranked/history?limit=${limit}`);
      return data.matches || [];
    } catch (error) {
      console.error('Failed to get match history:', error);
      return [];
    }
  }

  /**
   * Format rating change for display
   */
  formatRatingChange(change) {
    if (change > 0) return `+${change}`;
    return change.toString();
  }

  /**
   * Get color for rating change
   */
  getRatingChangeColor(change) {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  }
}

// Singleton
export const rankedService = new RankedService();
export default rankedService;

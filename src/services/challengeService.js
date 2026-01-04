/**
 * Challenge Service
 * Phase 5: Daily/Weekly challenges implementation
 */

import { api } from './api';
import { cacheService, CacheTTL } from './cacheService';

// Challenge types
export const ChallengeType = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  SPECIAL: 'special',
};

// Challenge categories
export const ChallengeCategory = {
  TAGGING: 'tagging',
  SURVIVAL: 'survival',
  SOCIAL: 'social',
  EXPLORATION: 'exploration',
  MASTERY: 'mastery',
};

// Challenge requirement types
export const ChallengeRequirement = {
  TAG_COUNT: 'tag_count',
  SURVIVE_TIME: 'survive_time',
  WIN_GAMES: 'win_games',
  PLAY_GAMES: 'play_games',
  PLAY_WITH_FRIENDS: 'play_with_friends',
  PLAY_MODE: 'play_mode',
  FASTEST_TAG: 'fastest_tag',
  NO_TAGS_RECEIVED: 'no_tags_received',
  USE_POWERUPS: 'use_powerups',
  STREAK: 'streak',
};

// Challenge templates
export const CHALLENGE_TEMPLATES = [
  // Daily - Easy
  { id: 'daily_tag_3', name: 'Tag Trio', description: 'Tag 3 players', requirement: { type: 'tag_count', value: 3 }, reward: { xp: 50, coins: 10 }, difficulty: 'easy' },
  { id: 'daily_play_1', name: 'Daily Player', description: 'Play 1 game', requirement: { type: 'play_games', value: 1 }, reward: { xp: 30, coins: 5 }, difficulty: 'easy' },
  { id: 'daily_survive_2m', name: 'Survivor', description: 'Survive for 2 minutes', requirement: { type: 'survive_time', value: 120000 }, reward: { xp: 40, coins: 8 }, difficulty: 'easy' },

  // Daily - Medium
  { id: 'daily_tag_10', name: 'Tag Master', description: 'Tag 10 players', requirement: { type: 'tag_count', value: 10 }, reward: { xp: 100, coins: 20 }, difficulty: 'medium' },
  { id: 'daily_win_1', name: 'Victory', description: 'Win a game', requirement: { type: 'win_games', value: 1 }, reward: { xp: 80, coins: 15 }, difficulty: 'medium' },
  { id: 'daily_survive_5m', name: 'Elusive', description: 'Survive for 5 minutes', requirement: { type: 'survive_time', value: 300000 }, reward: { xp: 70, coins: 12 }, difficulty: 'medium' },

  // Daily - Hard
  { id: 'daily_tag_25', name: 'Tag Legend', description: 'Tag 25 players', requirement: { type: 'tag_count', value: 25 }, reward: { xp: 200, coins: 40 }, difficulty: 'hard' },
  { id: 'daily_win_3', name: 'Hat Trick', description: 'Win 3 games', requirement: { type: 'win_games', value: 3 }, reward: { xp: 150, coins: 30 }, difficulty: 'hard' },
  { id: 'daily_fast_tag', name: 'Speed Demon', description: 'Tag someone within 30 seconds of becoming IT', requirement: { type: 'fastest_tag', value: 30000 }, reward: { xp: 120, coins: 25 }, difficulty: 'hard' },

  // Weekly
  { id: 'weekly_tag_100', name: 'Century', description: 'Tag 100 players this week', requirement: { type: 'tag_count', value: 100 }, reward: { xp: 500, coins: 100 }, difficulty: 'hard' },
  { id: 'weekly_win_10', name: 'Dominant', description: 'Win 10 games this week', requirement: { type: 'win_games', value: 10 }, reward: { xp: 400, coins: 80 }, difficulty: 'hard' },
  { id: 'weekly_play_20', name: 'Dedicated', description: 'Play 20 games this week', requirement: { type: 'play_games', value: 20 }, reward: { xp: 300, coins: 60 }, difficulty: 'medium' },
  { id: 'weekly_streak_5', name: 'On Fire', description: 'Achieve a 5-game win streak', requirement: { type: 'streak', value: 5 }, reward: { xp: 600, coins: 120 }, difficulty: 'epic' },
];

class ChallengeService {
  constructor() {
    this.cache = cacheService;
    this.dailyChallenges = [];
    this.weeklyChallenges = [];
    this.userProgress = new Map();
    this.streakCount = 0;
  }

  /**
   * Get current challenges
   */
  async getChallenges() {
    const cacheKey = 'daily_challenges';
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const data = await api.request('/challenges');
      await this.cache.set(cacheKey, data, CacheTTL.MEDIUM);

      this.dailyChallenges = data.daily || [];
      this.weeklyChallenges = data.weekly || [];

      return data;
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
      throw error;
    }
  }

  /**
   * Get user's challenge progress
   */
  async getProgress() {
    try {
      const data = await api.request('/challenges/progress');
      data.challenges?.forEach(c => {
        this.userProgress.set(c.challengeId, c);
      });
      this.streakCount = data.streak || 0;
      return data;
    } catch (error) {
      console.error('Failed to fetch challenge progress:', error);
      throw error;
    }
  }

  /**
   * Claim a completed challenge reward
   */
  async claimReward(challengeId) {
    try {
      const data = await api.request(`/challenges/${challengeId}/claim`, {
        method: 'POST',
      });
      return data;
    } catch (error) {
      console.error('Failed to claim reward:', error);
      throw error;
    }
  }

  /**
   * Update progress for a challenge (called after game events)
   */
  async updateProgress(eventType, value) {
    try {
      const data = await api.request('/challenges/progress', {
        method: 'PUT',
        body: JSON.stringify({ eventType, value }),
      });

      // Update local progress
      if (data.updated) {
        data.updated.forEach(c => {
          this.userProgress.set(c.challengeId, c);
        });
      }

      return data;
    } catch (error) {
      console.error('Failed to update challenge progress:', error);
    }
  }

  /**
   * Get progress for a specific challenge
   */
  getProgressForChallenge(challengeId) {
    return this.userProgress.get(challengeId) || { progress: 0, completed: false };
  }

  /**
   * Calculate progress percentage
   */
  getProgressPercentage(challengeId, requirement) {
    const progress = this.getProgressForChallenge(challengeId);
    const percent = (progress.progress / requirement) * 100;
    return Math.min(100, Math.round(percent));
  }

  /**
   * Get streak info
   */
  getStreak() {
    return {
      count: this.streakCount,
      bonus: this.calculateStreakBonus(this.streakCount),
    };
  }

  /**
   * Calculate streak bonus multiplier
   */
  calculateStreakBonus(streak) {
    if (streak >= 30) return 2.0; // 100% bonus
    if (streak >= 14) return 1.5; // 50% bonus
    if (streak >= 7) return 1.25; // 25% bonus
    if (streak >= 3) return 1.1; // 10% bonus
    return 1.0;
  }

  /**
   * Get difficulty color
   */
  getDifficultyColor(difficulty) {
    const colors = {
      easy: 'text-green-400',
      medium: 'text-yellow-400',
      hard: 'text-red-400',
      epic: 'text-purple-400',
    };
    return colors[difficulty] || 'text-white';
  }

  /**
   * Get time until daily reset
   */
  getTimeUntilDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCHours(24, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }

  /**
   * Get time until weekly reset (Sunday midnight UTC)
   */
  getTimeUntilWeeklyReset() {
    const now = new Date();
    const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
    const nextSunday = new Date(now);
    nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
    nextSunday.setUTCHours(0, 0, 0, 0);
    return nextSunday.getTime() - now.getTime();
  }

  /**
   * Format time remaining
   */
  formatTimeRemaining(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Clear cache
   */
  async clearCache() {
    await this.cache.remove('daily_challenges');
  }
}

// Singleton instance
export const challengeService = new ChallengeService();
export default challengeService;

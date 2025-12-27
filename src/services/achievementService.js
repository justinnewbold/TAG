// Achievement & Badge System Service
// Comprehensive achievement tracking with badges, progress, and rewards

// Achievement Categories
export const ACHIEVEMENT_CATEGORIES = {
  TAGGING: 'tagging',
  SURVIVAL: 'survival',
  SOCIAL: 'social',
  EXPLORATION: 'exploration',
  MASTERY: 'mastery',
  SEASONAL: 'seasonal',
  SECRET: 'secret'
};

// Badge Rarities
export const BADGE_RARITY = {
  COMMON: { name: 'Common', color: '#9CA3AF', xpMultiplier: 1 },
  UNCOMMON: { name: 'Uncommon', color: '#22C55E', xpMultiplier: 1.5 },
  RARE: { name: 'Rare', color: '#3B82F6', xpMultiplier: 2 },
  EPIC: { name: 'Epic', color: '#A855F7', xpMultiplier: 3 },
  LEGENDARY: { name: 'Legendary', color: '#F59E0B', xpMultiplier: 5 },
  MYTHIC: { name: 'Mythic', color: '#EF4444', xpMultiplier: 10 }
};

// Achievement Definitions
export const ACHIEVEMENTS = {
  // Tagging Achievements
  first_tag: {
    id: 'first_tag',
    name: 'First Blood',
    description: 'Tag your first player',
    category: ACHIEVEMENT_CATEGORIES.TAGGING,
    rarity: BADGE_RARITY.COMMON,
    icon: '🏷️',
    requirement: { type: 'tags', count: 1 },
    xpReward: 50
  },
  tag_master_10: {
    id: 'tag_master_10',
    name: 'Tag Apprentice',
    description: 'Tag 10 players total',
    category: ACHIEVEMENT_CATEGORIES.TAGGING,
    rarity: BADGE_RARITY.COMMON,
    icon: '👆',
    requirement: { type: 'tags', count: 10 },
    xpReward: 100
  },
  tag_master_50: {
    id: 'tag_master_50',
    name: 'Tag Hunter',
    description: 'Tag 50 players total',
    category: ACHIEVEMENT_CATEGORIES.TAGGING,
    rarity: BADGE_RARITY.UNCOMMON,
    icon: '🎯',
    requirement: { type: 'tags', count: 50 },
    xpReward: 250
  },
  tag_master_100: {
    id: 'tag_master_100',
    name: 'Tag Master',
    description: 'Tag 100 players total',
    category: ACHIEVEMENT_CATEGORIES.TAGGING,
    rarity: BADGE_RARITY.RARE,
    icon: '🏆',
    requirement: { type: 'tags', count: 100 },
    xpReward: 500
  },
  speed_demon: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Tag 3 players within 30 seconds',
    category: ACHIEVEMENT_CATEGORIES.TAGGING,
    rarity: BADGE_RARITY.RARE,
    icon: '⚡',
    requirement: { type: 'rapid_tags', count: 3, timeWindow: 30 },
    xpReward: 300
  },
  
  // Survival Achievements
  survivor_5: {
    id: 'survivor_5',
    name: 'Survivor',
    description: 'Survive for 5 minutes without being tagged',
    category: ACHIEVEMENT_CATEGORIES.SURVIVAL,
    rarity: BADGE_RARITY.COMMON,
    icon: '🏃',
    requirement: { type: 'survival_time', minutes: 5 },
    xpReward: 100
  },
  survivor_30: {
    id: 'survivor_30',
    name: 'Ghost',
    description: 'Survive for 30 minutes without being tagged',
    category: ACHIEVEMENT_CATEGORIES.SURVIVAL,
    rarity: BADGE_RARITY.RARE,
    icon: '👻',
    requirement: { type: 'survival_time', minutes: 30 },
    xpReward: 500
  },
  untouchable: {
    id: 'untouchable',
    name: 'Untouchable',
    description: 'Win a game without being tagged once',
    category: ACHIEVEMENT_CATEGORIES.SURVIVAL,
    rarity: BADGE_RARITY.EPIC,
    icon: '🛡️',
    requirement: { type: 'flawless_win' },
    xpReward: 750
  },
  
  // Social Achievements
  first_friend: {
    id: 'first_friend',
    name: 'Friendly',
    description: 'Add your first friend',
    category: ACHIEVEMENT_CATEGORIES.SOCIAL,
    rarity: BADGE_RARITY.COMMON,
    icon: '🤝',
    requirement: { type: 'friends', count: 1 },
    xpReward: 50
  },
  social_butterfly: {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Have 10 friends',
    category: ACHIEVEMENT_CATEGORIES.SOCIAL,
    rarity: BADGE_RARITY.UNCOMMON,
    icon: '🦋',
    requirement: { type: 'friends', count: 10 },
    xpReward: 200
  },
  party_starter: {
    id: 'party_starter',
    name: 'Party Starter',
    description: 'Host a game with 5+ players',
    category: ACHIEVEMENT_CATEGORIES.SOCIAL,
    rarity: BADGE_RARITY.UNCOMMON,
    icon: '🎉',
    requirement: { type: 'host_large_game', players: 5 },
    xpReward: 200
  },
  
  // Exploration Achievements
  distance_10km: {
    id: 'distance_10km',
    name: 'Runner',
    description: 'Travel 10km during games',
    category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
    rarity: BADGE_RARITY.UNCOMMON,
    icon: '🏃‍♂️',
    requirement: { type: 'distance', km: 10 },
    xpReward: 200
  },
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Play 10 games after 10 PM',
    category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
    rarity: BADGE_RARITY.UNCOMMON,
    icon: '🦉',
    requirement: { type: 'night_games', count: 10 },
    xpReward: 200
  },
  
  // Mastery Achievements
  first_win: {
    id: 'first_win',
    name: 'First Victory',
    description: 'Win your first game',
    category: ACHIEVEMENT_CATEGORIES.MASTERY,
    rarity: BADGE_RARITY.COMMON,
    icon: '🥇',
    requirement: { type: 'wins', count: 1 },
    xpReward: 100
  },
  win_streak_5: {
    id: 'win_streak_5',
    name: 'Unstoppable',
    description: 'Win 5 games in a row',
    category: ACHIEVEMENT_CATEGORIES.MASTERY,
    rarity: BADGE_RARITY.RARE,
    icon: '💪',
    requirement: { type: 'win_streak', count: 5 },
    xpReward: 500
  },
  all_modes: {
    id: 'all_modes',
    name: 'Versatile',
    description: 'Win a game in every game mode',
    category: ACHIEVEMENT_CATEGORIES.MASTERY,
    rarity: BADGE_RARITY.EPIC,
    icon: '🎮',
    requirement: { type: 'mode_wins', modes: ['classic', 'freeze', 'infection', 'team', 'manhunt', 'hotpotato', 'hideseek'] },
    xpReward: 1000
  },
  
  // Secret Achievements
  comeback_king: {
    id: 'comeback_king',
    name: 'Comeback King',
    description: 'Win after being tagged 5+ times',
    category: ACHIEVEMENT_CATEGORIES.SECRET,
    rarity: BADGE_RARITY.RARE,
    icon: '👊',
    requirement: { type: 'comeback_win', tagsReceived: 5 },
    xpReward: 500,
    hidden: true
  },
  pacifist: {
    id: 'pacifist',
    name: 'Pacifist',
    description: 'Win a game without tagging anyone',
    category: ACHIEVEMENT_CATEGORIES.SECRET,
    rarity: BADGE_RARITY.EPIC,
    icon: '☮️',
    requirement: { type: 'pacifist_win' },
    xpReward: 750,
    hidden: true
  }
};

class AchievementService {
  constructor() {
    this.unlockedAchievements = new Map();
    this.progress = new Map();
    this.listeners = new Set();
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem('tag_achievements');
      if (saved) {
        const data = JSON.parse(saved);
        this.unlockedAchievements = new Map(Object.entries(data.unlocked || {}));
        this.progress = new Map(Object.entries(data.progress || {}));
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  }

  saveToStorage() {
    try {
      const data = {
        unlocked: Object.fromEntries(this.unlockedAchievements),
        progress: Object.fromEntries(this.progress)
      };
      localStorage.setItem('tag_achievements', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save achievements:', error);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(achievement) {
    this.listeners.forEach(callback => {
      try {
        callback({ type: 'unlock', achievement });
      } catch (error) {
        console.error('Achievement listener error:', error);
      }
    });
  }

  isUnlocked(achievementId) {
    return this.unlockedAchievements.has(achievementId);
  }

  getProgress(achievementId) {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return 0;
    const current = this.progress.get(achievementId) || 0;
    const requirement = achievement.requirement;
    if (requirement.count) {
      return Math.min(100, (current / requirement.count) * 100);
    }
    return this.isUnlocked(achievementId) ? 100 : 0;
  }

  getAllAchievements() {
    return Object.values(ACHIEVEMENTS).map(achievement => ({
      ...achievement,
      unlocked: this.isUnlocked(achievement.id),
      unlockedAt: this.unlockedAchievements.get(achievement.id),
      progress: this.getProgress(achievement.id),
      currentCount: this.progress.get(achievement.id) || 0
    }));
  }

  getByCategory(category) {
    return this.getAllAchievements().filter(a => a.category === category);
  }

  getUnlocked() {
    return this.getAllAchievements().filter(a => a.unlocked);
  }

  unlock(achievementId) {
    if (this.isUnlocked(achievementId)) return null;
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return null;
    const unlockedAt = new Date().toISOString();
    this.unlockedAchievements.set(achievementId, unlockedAt);
    this.saveToStorage();
    const unlockedAchievement = { ...achievement, unlocked: true, unlockedAt };
    this.notify(unlockedAchievement);
    return unlockedAchievement;
  }

  updateProgress(achievementId, value) {
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement || this.isUnlocked(achievementId)) return;
    const current = this.progress.get(achievementId) || 0;
    const newValue = current + value;
    this.progress.set(achievementId, newValue);
    this.saveToStorage();
    if (achievement.requirement.count && newValue >= achievement.requirement.count) {
      return this.unlock(achievementId);
    }
    return null;
  }

  trackTag(context = {}) {
    const results = [];
    results.push(this.updateProgress('first_tag', 1));
    results.push(this.updateProgress('tag_master_10', 1));
    results.push(this.updateProgress('tag_master_50', 1));
    results.push(this.updateProgress('tag_master_100', 1));
    if (context.rapidTags >= 3) results.push(this.unlock('speed_demon'));
    return results.filter(Boolean);
  }

  trackWin(context = {}) {
    const results = [];
    results.push(this.updateProgress('first_win', 1));
    if (context.winStreak >= 5) results.push(this.unlock('win_streak_5'));
    if (context.noTagsReceived) results.push(this.unlock('untouchable'));
    if (context.noTagsMade) results.push(this.unlock('pacifist'));
    if (context.tagsReceived >= 5) results.push(this.unlock('comeback_king'));
    return results.filter(Boolean);
  }

  trackSurvival(minutes) {
    const results = [];
    if (minutes >= 5) results.push(this.unlock('survivor_5'));
    if (minutes >= 30) results.push(this.unlock('survivor_30'));
    return results.filter(Boolean);
  }

  trackFriend() {
    const results = [];
    results.push(this.updateProgress('first_friend', 1));
    results.push(this.updateProgress('social_butterfly', 1));
    return results.filter(Boolean);
  }

  trackDistance(km) {
    return this.updateProgress('distance_10km', km);
  }

  getStats() {
    const all = this.getAllAchievements();
    const unlocked = all.filter(a => a.unlocked);
    const totalXP = unlocked.reduce((sum, a) => sum + a.xpReward, 0);
    return {
      total: all.length,
      unlocked: unlocked.length,
      percentage: Math.round((unlocked.length / all.length) * 100),
      totalXP
    };
  }
}

export const achievementService = new AchievementService();
export default achievementService;

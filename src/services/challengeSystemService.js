/**
 * Daily/Weekly Challenge System Service
 * Manages player challenges, progress tracking, and rewards
 */

// Challenge Types
export const CHALLENGE_TYPES = {
  // Tag-related
  TAG_COUNT: 'tag_count',
  TAG_STREAK: 'tag_streak',
  TAG_SPEED: 'tag_speed',
  TAG_DISTANCE: 'tag_distance',

  // Survival-related
  SURVIVE_TIME: 'survive_time',
  SURVIVE_GAMES: 'survive_games',
  LAST_STANDING: 'last_standing',
  EVADE_COUNT: 'evade_count',

  // Game-related
  WIN_GAMES: 'win_games',
  PLAY_GAMES: 'play_games',
  WIN_STREAK: 'win_streak',
  PLAY_MODE: 'play_mode',

  // Social-related
  PLAY_WITH_FRIENDS: 'play_with_friends',
  CLAN_GAMES: 'clan_games',
  HELP_TEAMMATES: 'help_teammates',

  // Special
  USE_POWERUP: 'use_powerup',
  CAPTURE_POINTS: 'capture_points',
  TRAVEL_DISTANCE: 'travel_distance',
  PLAY_AT_TIME: 'play_at_time',
};

// Challenge Difficulty
export const CHALLENGE_DIFFICULTY = {
  EASY: { multiplier: 1, color: '#4CAF50' },
  MEDIUM: { multiplier: 1.5, color: '#FF9800' },
  HARD: { multiplier: 2.5, color: '#F44336' },
  LEGENDARY: { multiplier: 5, color: '#9C27B0' },
};

// Challenge Templates
const CHALLENGE_TEMPLATES = {
  // Daily Challenges (easier, refresh daily)
  daily: [
    {
      id: 'daily_tag_5',
      type: CHALLENGE_TYPES.TAG_COUNT,
      name: 'Quick Tagger',
      description: 'Tag 5 players in any game mode',
      target: 5,
      difficulty: 'EASY',
      xpReward: 50,
      coinReward: 25,
    },
    {
      id: 'daily_survive_5min',
      type: CHALLENGE_TYPES.SURVIVE_TIME,
      name: 'Survivor',
      description: 'Survive for 5 minutes total as a runner',
      target: 300, // seconds
      difficulty: 'EASY',
      xpReward: 50,
      coinReward: 25,
    },
    {
      id: 'daily_play_3',
      type: CHALLENGE_TYPES.PLAY_GAMES,
      name: 'Active Player',
      description: 'Play 3 complete games',
      target: 3,
      difficulty: 'EASY',
      xpReward: 75,
      coinReward: 30,
    },
    {
      id: 'daily_win_1',
      type: CHALLENGE_TYPES.WIN_GAMES,
      name: 'Victory',
      description: 'Win a game',
      target: 1,
      difficulty: 'MEDIUM',
      xpReward: 100,
      coinReward: 50,
    },
    {
      id: 'daily_tag_streak_3',
      type: CHALLENGE_TYPES.TAG_STREAK,
      name: 'Tag Combo',
      description: 'Tag 3 players within 60 seconds',
      target: 3,
      timeWindow: 60,
      difficulty: 'MEDIUM',
      xpReward: 100,
      coinReward: 50,
    },
    {
      id: 'daily_use_powerup',
      type: CHALLENGE_TYPES.USE_POWERUP,
      name: 'Power User',
      description: 'Use 3 power-ups in games',
      target: 3,
      difficulty: 'EASY',
      xpReward: 50,
      coinReward: 25,
    },
    {
      id: 'daily_last_standing',
      type: CHALLENGE_TYPES.LAST_STANDING,
      name: 'Last One Standing',
      description: 'Be the last runner standing',
      target: 1,
      difficulty: 'HARD',
      xpReward: 150,
      coinReward: 75,
    },
    {
      id: 'daily_travel_1km',
      type: CHALLENGE_TYPES.TRAVEL_DISTANCE,
      name: 'Marathon',
      description: 'Travel 1km during games',
      target: 1000, // meters
      difficulty: 'MEDIUM',
      xpReward: 75,
      coinReward: 40,
    },
    {
      id: 'daily_evade_5',
      type: CHALLENGE_TYPES.EVADE_COUNT,
      name: 'Slippery',
      description: 'Evade being tagged 5 times (hunter within 20m)',
      target: 5,
      difficulty: 'MEDIUM',
      xpReward: 100,
      coinReward: 50,
    },
    {
      id: 'daily_infection',
      type: CHALLENGE_TYPES.PLAY_MODE,
      name: 'Infection Survivor',
      description: 'Play a game of Infection mode',
      target: 1,
      gameMode: 'infection',
      difficulty: 'EASY',
      xpReward: 50,
      coinReward: 25,
    },
  ],

  // Weekly Challenges (harder, more rewards)
  weekly: [
    {
      id: 'weekly_tag_50',
      type: CHALLENGE_TYPES.TAG_COUNT,
      name: 'Tag Master',
      description: 'Tag 50 players this week',
      target: 50,
      difficulty: 'MEDIUM',
      xpReward: 300,
      coinReward: 150,
    },
    {
      id: 'weekly_win_10',
      type: CHALLENGE_TYPES.WIN_GAMES,
      name: 'Champion',
      description: 'Win 10 games this week',
      target: 10,
      difficulty: 'HARD',
      xpReward: 500,
      coinReward: 250,
    },
    {
      id: 'weekly_win_streak_5',
      type: CHALLENGE_TYPES.WIN_STREAK,
      name: 'Unstoppable',
      description: 'Win 5 games in a row',
      target: 5,
      difficulty: 'LEGENDARY',
      xpReward: 1000,
      coinReward: 500,
      specialReward: 'trail_fire',
    },
    {
      id: 'weekly_survive_1hour',
      type: CHALLENGE_TYPES.SURVIVE_TIME,
      name: 'Endurance',
      description: 'Survive for 1 hour total as a runner',
      target: 3600,
      difficulty: 'HARD',
      xpReward: 400,
      coinReward: 200,
    },
    {
      id: 'weekly_play_friends',
      type: CHALLENGE_TYPES.PLAY_WITH_FRIENDS,
      name: 'Social Butterfly',
      description: 'Play 10 games with friends',
      target: 10,
      difficulty: 'MEDIUM',
      xpReward: 250,
      coinReward: 125,
    },
    {
      id: 'weekly_all_modes',
      type: CHALLENGE_TYPES.PLAY_MODE,
      name: 'Variety',
      description: 'Play each game mode at least once',
      target: 7, // Number of game modes
      gameMode: 'all',
      difficulty: 'HARD',
      xpReward: 400,
      coinReward: 200,
    },
    {
      id: 'weekly_capture_20',
      type: CHALLENGE_TYPES.CAPTURE_POINTS,
      name: 'Conqueror',
      description: 'Capture 20 control points in King of the Hill',
      target: 20,
      difficulty: 'HARD',
      xpReward: 350,
      coinReward: 175,
    },
    {
      id: 'weekly_travel_10km',
      type: CHALLENGE_TYPES.TRAVEL_DISTANCE,
      name: 'Explorer',
      description: 'Travel 10km during games',
      target: 10000,
      difficulty: 'HARD',
      xpReward: 400,
      coinReward: 200,
    },
    {
      id: 'weekly_clan_wins',
      type: CHALLENGE_TYPES.CLAN_GAMES,
      name: 'Clan Glory',
      description: 'Win 5 games with your clan',
      target: 5,
      difficulty: 'MEDIUM',
      xpReward: 300,
      coinReward: 150,
    },
    {
      id: 'weekly_legendary',
      type: CHALLENGE_TYPES.TAG_SPEED,
      name: 'Lightning Reflexes',
      description: 'Tag someone within 5 seconds of becoming IT',
      target: 1,
      timeLimit: 5,
      difficulty: 'LEGENDARY',
      xpReward: 750,
      coinReward: 400,
      specialReward: 'avatar_frame_gold',
    },
  ],

  // Special/Event Challenges
  special: [
    {
      id: 'special_night_owl',
      type: CHALLENGE_TYPES.PLAY_AT_TIME,
      name: 'Night Owl',
      description: 'Play 3 games between 10 PM and 6 AM',
      target: 3,
      timeStart: 22,
      timeEnd: 6,
      difficulty: 'MEDIUM',
      xpReward: 200,
      coinReward: 100,
    },
    {
      id: 'special_early_bird',
      type: CHALLENGE_TYPES.PLAY_AT_TIME,
      name: 'Early Bird',
      description: 'Play a game before 8 AM',
      target: 1,
      timeStart: 5,
      timeEnd: 8,
      difficulty: 'MEDIUM',
      xpReward: 150,
      coinReward: 75,
    },
    {
      id: 'special_help_teammates',
      type: CHALLENGE_TYPES.HELP_TEAMMATES,
      name: 'Team Player',
      description: 'Unfreeze 10 teammates in Freeze Tag',
      target: 10,
      difficulty: 'HARD',
      xpReward: 300,
      coinReward: 150,
    },
  ],
};

class ChallengeSystemService {
  constructor() {
    this.playerChallenges = new Map(); // playerId -> challenges
    this.listeners = new Map();
  }

  /**
   * Get challenges for a player
   */
  async getPlayerChallenges(playerId) {
    let challenges = this.playerChallenges.get(playerId);

    if (!challenges || this.shouldRefreshChallenges(challenges)) {
      challenges = await this.generateChallenges(playerId);
      this.playerChallenges.set(playerId, challenges);
    }

    return challenges;
  }

  /**
   * Check if challenges need refresh
   */
  shouldRefreshChallenges(challenges) {
    const now = Date.now();

    // Check daily reset
    if (challenges.dailyResetTime && now > challenges.dailyResetTime) {
      return true;
    }

    // Check weekly reset
    if (challenges.weeklyResetTime && now > challenges.weeklyResetTime) {
      return true;
    }

    return false;
  }

  /**
   * Generate new challenges for player
   */
  async generateChallenges(playerId) {
    const now = new Date();

    // Calculate reset times
    const dailyReset = new Date(now);
    dailyReset.setHours(24, 0, 0, 0); // Midnight

    const weeklyReset = new Date(now);
    weeklyReset.setDate(weeklyReset.getDate() + (7 - weeklyReset.getDay())); // Next Sunday
    weeklyReset.setHours(0, 0, 0, 0);

    // Select random challenges
    const dailyChallenges = this.selectRandomChallenges(
      CHALLENGE_TEMPLATES.daily,
      3 // 3 daily challenges
    );

    const weeklyChallenges = this.selectRandomChallenges(
      CHALLENGE_TEMPLATES.weekly,
      3 // 3 weekly challenges
    );

    // Add special challenge based on day/season
    const specialChallenge = this.getSpecialChallenge(now);

    return {
      playerId,
      daily: dailyChallenges.map(c => ({
        ...c,
        progress: 0,
        completed: false,
        claimedReward: false,
        startTime: now.getTime(),
      })),
      weekly: weeklyChallenges.map(c => ({
        ...c,
        progress: 0,
        completed: false,
        claimedReward: false,
        startTime: now.getTime(),
      })),
      special: specialChallenge ? [{
        ...specialChallenge,
        progress: 0,
        completed: false,
        claimedReward: false,
        startTime: now.getTime(),
      }] : [],
      dailyResetTime: dailyReset.getTime(),
      weeklyResetTime: weeklyReset.getTime(),
      streakDays: 0,
      lastClaimDate: null,
    };
  }

  /**
   * Select random challenges from pool
   */
  selectRandomChallenges(pool, count) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Get special challenge based on current conditions
   */
  getSpecialChallenge(date) {
    const hour = date.getHours();

    // Night time special
    if (hour >= 22 || hour < 6) {
      return CHALLENGE_TEMPLATES.special.find(c => c.id === 'special_night_owl');
    }

    // Morning special
    if (hour >= 5 && hour < 8) {
      return CHALLENGE_TEMPLATES.special.find(c => c.id === 'special_early_bird');
    }

    // Weekend special
    if (date.getDay() === 0 || date.getDay() === 6) {
      return {
        id: 'special_weekend_warrior',
        type: CHALLENGE_TYPES.WIN_GAMES,
        name: 'Weekend Warrior',
        description: 'Win 5 games this weekend',
        target: 5,
        difficulty: 'MEDIUM',
        xpReward: 250,
        coinReward: 125,
      };
    }

    return CHALLENGE_TEMPLATES.special[Math.floor(Math.random() * CHALLENGE_TEMPLATES.special.length)];
  }

  /**
   * Update challenge progress
   */
  async updateProgress(playerId, eventType, eventData) {
    const challenges = await this.getPlayerChallenges(playerId);
    const updatedChallenges = [];

    // Check all active challenges
    const allChallenges = [
      ...challenges.daily,
      ...challenges.weekly,
      ...challenges.special,
    ];

    for (const challenge of allChallenges) {
      if (challenge.completed) continue;

      const progressUpdate = this.calculateProgress(challenge, eventType, eventData);

      if (progressUpdate > 0) {
        challenge.progress = Math.min(challenge.progress + progressUpdate, challenge.target);

        if (challenge.progress >= challenge.target) {
          challenge.completed = true;
          challenge.completedAt = Date.now();
        }

        updatedChallenges.push(challenge);
      }
    }

    // Notify listeners
    if (updatedChallenges.length > 0) {
      this.emit('progress', { playerId, challenges: updatedChallenges });
    }

    // Check for completions
    const newlyCompleted = updatedChallenges.filter(c => c.completed && !c.claimedReward);
    if (newlyCompleted.length > 0) {
      this.emit('completed', { playerId, challenges: newlyCompleted });
    }

    return updatedChallenges;
  }

  /**
   * Calculate progress for a challenge based on event
   */
  calculateProgress(challenge, eventType, data) {
    switch (challenge.type) {
      case CHALLENGE_TYPES.TAG_COUNT:
        if (eventType === 'tag') return 1;
        break;

      case CHALLENGE_TYPES.TAG_STREAK:
        if (eventType === 'tag' && data.timeSinceLastTag < (challenge.timeWindow * 1000)) {
          return 1;
        }
        break;

      case CHALLENGE_TYPES.TAG_SPEED:
        if (eventType === 'tag' && data.timeSinceBecameIt < (challenge.timeLimit * 1000)) {
          return 1;
        }
        break;

      case CHALLENGE_TYPES.SURVIVE_TIME:
        if (eventType === 'survive') return data.duration;
        break;

      case CHALLENGE_TYPES.SURVIVE_GAMES:
        if (eventType === 'game_end' && data.survived) return 1;
        break;

      case CHALLENGE_TYPES.LAST_STANDING:
        if (eventType === 'game_end' && data.lastStanding) return 1;
        break;

      case CHALLENGE_TYPES.EVADE_COUNT:
        if (eventType === 'evade') return 1;
        break;

      case CHALLENGE_TYPES.WIN_GAMES:
        if (eventType === 'game_end' && data.won) return 1;
        break;

      case CHALLENGE_TYPES.PLAY_GAMES:
        if (eventType === 'game_end') return 1;
        break;

      case CHALLENGE_TYPES.WIN_STREAK:
        if (eventType === 'game_end') {
          if (data.won) {
            return 1;
          } else {
            // Reset progress on loss
            challenge.progress = 0;
            return 0;
          }
        }
        break;

      case CHALLENGE_TYPES.PLAY_MODE:
        if (eventType === 'game_end') {
          if (challenge.gameMode === 'all') {
            // Track unique modes played
            if (!challenge.modesPlayed) challenge.modesPlayed = new Set();
            challenge.modesPlayed.add(data.gameMode);
            return challenge.modesPlayed.size > challenge.progress ? 1 : 0;
          } else if (data.gameMode === challenge.gameMode) {
            return 1;
          }
        }
        break;

      case CHALLENGE_TYPES.PLAY_WITH_FRIENDS:
        if (eventType === 'game_end' && data.friendsInGame > 0) return 1;
        break;

      case CHALLENGE_TYPES.CLAN_GAMES:
        if (eventType === 'game_end' && data.clanGame && data.won) return 1;
        break;

      case CHALLENGE_TYPES.HELP_TEAMMATES:
        if (eventType === 'unfreeze') return 1;
        break;

      case CHALLENGE_TYPES.USE_POWERUP:
        if (eventType === 'powerup_used') return 1;
        break;

      case CHALLENGE_TYPES.CAPTURE_POINTS:
        if (eventType === 'point_captured') return 1;
        break;

      case CHALLENGE_TYPES.TRAVEL_DISTANCE:
        if (eventType === 'distance') return data.meters;
        break;

      case CHALLENGE_TYPES.PLAY_AT_TIME:
        if (eventType === 'game_end') {
          const hour = new Date().getHours();
          const start = challenge.timeStart;
          const end = challenge.timeEnd;

          // Handle overnight ranges
          if (start > end) {
            if (hour >= start || hour < end) return 1;
          } else {
            if (hour >= start && hour < end) return 1;
          }
        }
        break;
    }

    return 0;
  }

  /**
   * Claim reward for completed challenge
   */
  async claimReward(playerId, challengeId) {
    const challenges = await this.getPlayerChallenges(playerId);

    const allChallenges = [
      ...challenges.daily,
      ...challenges.weekly,
      ...challenges.special,
    ];

    const challenge = allChallenges.find(c => c.id === challengeId);

    if (!challenge) {
      return { success: false, error: 'Challenge not found' };
    }

    if (!challenge.completed) {
      return { success: false, error: 'Challenge not completed' };
    }

    if (challenge.claimedReward) {
      return { success: false, error: 'Reward already claimed' };
    }

    challenge.claimedReward = true;
    challenge.claimedAt = Date.now();

    // Calculate rewards with difficulty multiplier
    const multiplier = CHALLENGE_DIFFICULTY[challenge.difficulty]?.multiplier || 1;

    const rewards = {
      xp: Math.round(challenge.xpReward * multiplier),
      coins: Math.round(challenge.coinReward * multiplier),
      special: challenge.specialReward || null,
    };

    // Update streak
    const today = new Date().toDateString();
    if (challenges.lastClaimDate !== today) {
      challenges.streakDays++;
      challenges.lastClaimDate = today;

      // Streak bonus
      if (challenges.streakDays >= 7) {
        rewards.streakBonus = {
          xp: 100 * Math.floor(challenges.streakDays / 7),
          coins: 50 * Math.floor(challenges.streakDays / 7),
        };
      }
    }

    this.emit('reward_claimed', { playerId, challenge, rewards });

    return { success: true, rewards };
  }

  /**
   * Get challenge statistics
   */
  async getStats(playerId) {
    const challenges = await this.getPlayerChallenges(playerId);

    const allChallenges = [
      ...challenges.daily,
      ...challenges.weekly,
      ...challenges.special,
    ];

    const completed = allChallenges.filter(c => c.completed);
    const claimed = allChallenges.filter(c => c.claimedReward);

    return {
      daily: {
        total: challenges.daily.length,
        completed: challenges.daily.filter(c => c.completed).length,
        claimed: challenges.daily.filter(c => c.claimedReward).length,
        resetTime: challenges.dailyResetTime,
      },
      weekly: {
        total: challenges.weekly.length,
        completed: challenges.weekly.filter(c => c.completed).length,
        claimed: challenges.weekly.filter(c => c.claimedReward).length,
        resetTime: challenges.weeklyResetTime,
      },
      special: {
        total: challenges.special.length,
        completed: challenges.special.filter(c => c.completed).length,
      },
      streak: challenges.streakDays,
      totalCompleted: completed.length,
      totalClaimed: claimed.length,
    };
  }

  /**
   * Get formatted time until reset
   */
  getTimeUntilReset(type = 'daily') {
    const now = Date.now();
    const resetTime = type === 'daily'
      ? new Date().setHours(24, 0, 0, 0)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + (7 - d.getDay()));
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        })();

    const diff = resetTime - now;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    return { hours, minutes, totalMs: diff };
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const listeners = this.listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    for (const callback of this.listeners.get(event)) {
      callback(data);
    }
  }
}

export const challengeSystemService = new ChallengeSystemService();
export default challengeSystemService;

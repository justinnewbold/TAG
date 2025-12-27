// Season & Competitive Leaderboard Service
// Handles seasonal rankings, rewards, and competitions

const SEASON_DURATIONS = {
  WEEKLY: 7 * 24 * 60 * 60 * 1000, // 7 days
  MONTHLY: 30 * 24 * 60 * 60 * 1000, // 30 days
  SEASONAL: 90 * 24 * 60 * 60 * 1000, // 90 days (quarterly)
};

const RANK_TIERS = {
  BRONZE: { min: 0, max: 999, name: 'Bronze', color: '#CD7F32', icon: '🥉' },
  SILVER: { min: 1000, max: 2499, name: 'Silver', color: '#C0C0C0', icon: '🥈' },
  GOLD: { min: 2500, max: 4999, name: 'Gold', color: '#FFD700', icon: '🥇' },
  PLATINUM: { min: 5000, max: 9999, name: 'Platinum', color: '#E5E4E2', icon: '💎' },
  DIAMOND: { min: 10000, max: 19999, name: 'Diamond', color: '#B9F2FF', icon: '💠' },
  MASTER: { min: 20000, max: 49999, name: 'Master', color: '#9B59B6', icon: '👑' },
  GRANDMASTER: { min: 50000, max: Infinity, name: 'Grandmaster', color: '#FF4500', icon: '🔥' },
};

const SEASON_REWARDS = {
  BRONZE: { xp: 100, coins: 50, title: null },
  SILVER: { xp: 250, coins: 150, title: 'Silver Chaser' },
  GOLD: { xp: 500, coins: 300, title: 'Golden Runner' },
  PLATINUM: { xp: 1000, coins: 600, title: 'Platinum Pursuer' },
  DIAMOND: { xp: 2000, coins: 1200, title: 'Diamond Dasher' },
  MASTER: { xp: 4000, coins: 2500, title: 'Master Tagger' },
  GRANDMASTER: { xp: 8000, coins: 5000, title: 'Grandmaster Legend' },
};

class SeasonService {
  constructor() {
    this.currentSeason = null;
    this.playerStats = new Map();
    this.leaderboardCache = new Map();
    this.listeners = new Set();
  }

  // Initialize season service
  async initialize(supabase) {
    this.supabase = supabase;
    await this.loadCurrentSeason();
    this.startSeasonTimer();
  }

  // Load current active season
  async loadCurrentSeason() {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) throw error;

      this.currentSeason = data || this.createNewSeason();
      return this.currentSeason;
    } catch (error) {
      console.error('Error loading season:', error);
      return this.createNewSeason();
    }
  }

  // Create a new season
  createNewSeason(type = 'MONTHLY') {
    const now = new Date();
    const duration = SEASON_DURATIONS[type];
    
    return {
      id: `season_${Date.now()}`,
      name: this.generateSeasonName(now),
      type,
      startDate: now.toISOString(),
      endDate: new Date(now.getTime() + duration).toISOString(),
      is_active: true,
      theme: this.getSeasonTheme(now),
      rewards: SEASON_REWARDS,
    };
  }

  // Generate season name based on date
  generateSeasonName(date) {
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    
    return `${month} ${year} - Season Q${quarter}`;
  }

  // Get seasonal theme
  getSeasonTheme(date) {
    const month = date.getMonth();
    
    if (month >= 2 && month <= 4) return { name: 'Spring Sprint', color: '#90EE90', emoji: '🌸' };
    if (month >= 5 && month <= 7) return { name: 'Summer Chase', color: '#FFD700', emoji: '☀️' };
    if (month >= 8 && month <= 10) return { name: 'Autumn Hunt', color: '#FF8C00', emoji: '🍂' };
    return { name: 'Winter Pursuit', color: '#87CEEB', emoji: '❄️' };
  }

  // Calculate player rank tier
  getRankTier(points) {
    for (const [tier, config] of Object.entries(RANK_TIERS)) {
      if (points >= config.min && points <= config.max) {
        return { tier, ...config };
      }
    }
    return { tier: 'BRONZE', ...RANK_TIERS.BRONZE };
  }

  // Calculate points from game stats
  calculateSeasonPoints(gameStats) {
    let points = 0;
    
    // Base points
    points += (gameStats.tags || 0) * 10;
    points += (gameStats.survivalTime || 0) * 2;
    points += (gameStats.gamesWon || 0) * 50;
    points += (gameStats.gamesPlayed || 0) * 5;
    
    // Bonus multipliers
    if (gameStats.winStreak >= 3) points *= 1.2;
    if (gameStats.winStreak >= 5) points *= 1.5;
    if (gameStats.perfectGame) points += 100;
    
    return Math.floor(points);
  }

  // Update player season stats
  async updatePlayerStats(playerId, gameStats) {
    const points = this.calculateSeasonPoints(gameStats);
    const currentStats = this.playerStats.get(playerId) || {
      points: 0,
      gamesPlayed: 0,
      tags: 0,
      wins: 0,
      winStreak: 0,
      bestStreak: 0,
    };

    const newStats = {
      ...currentStats,
      points: currentStats.points + points,
      gamesPlayed: currentStats.gamesPlayed + 1,
      tags: currentStats.tags + (gameStats.tags || 0),
      wins: currentStats.wins + (gameStats.won ? 1 : 0),
      winStreak: gameStats.won ? currentStats.winStreak + 1 : 0,
      bestStreak: Math.max(currentStats.bestStreak, gameStats.won ? currentStats.winStreak + 1 : currentStats.winStreak),
    };

    this.playerStats.set(playerId, newStats);

    // Save to database
    if (this.supabase && this.currentSeason) {
      try {
        await this.supabase.from('season_stats').upsert({
          player_id: playerId,
          season_id: this.currentSeason.id,
          ...newStats,
          updated_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error saving season stats:', error);
      }
    }

    this.notifyListeners('statsUpdated', { playerId, stats: newStats });
    return newStats;
  }

  // Get leaderboard
  async getLeaderboard(type = 'season', limit = 100) {
    const cacheKey = `${type}_${limit}`;
    const cached = this.leaderboardCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }

    if (!this.supabase) {
      return this.getMockLeaderboard(limit);
    }

    try {
      const { data, error } = await this.supabase
        .from('season_stats')
        .select(`
          *,
          profiles:player_id (
            username,
            avatar_url,
            display_name
          )
        `)
        .eq('season_id', this.currentSeason?.id)
        .order('points', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const leaderboard = data.map((entry, index) => ({
        rank: index + 1,
        playerId: entry.player_id,
        username: entry.profiles?.username || 'Unknown',
        displayName: entry.profiles?.display_name,
        avatarUrl: entry.profiles?.avatar_url,
        points: entry.points,
        tier: this.getRankTier(entry.points),
        stats: {
          gamesPlayed: entry.gamesPlayed,
          wins: entry.wins,
          tags: entry.tags,
          winStreak: entry.winStreak,
          bestStreak: entry.bestStreak,
        },
      }));

      this.leaderboardCache.set(cacheKey, {
        data: leaderboard,
        timestamp: Date.now(),
      });

      return leaderboard;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return this.getMockLeaderboard(limit);
    }
  }

  // Get mock leaderboard for demo
  getMockLeaderboard(limit) {
    const mockNames = ['SpeedyTag', 'NinjaRunner', 'TagMaster', 'SwiftChaser', 'ProTagger', 
                       'FlashDash', 'StealthHunter', 'QuickSilver', 'TagKing', 'RunnerElite'];
    
    return mockNames.slice(0, limit).map((name, index) => ({
      rank: index + 1,
      playerId: `mock_${index}`,
      username: name,
      displayName: name,
      points: Math.floor(50000 - (index * 4500) + Math.random() * 1000),
      tier: this.getRankTier(50000 - (index * 4500)),
      stats: {
        gamesPlayed: Math.floor(100 - index * 8),
        wins: Math.floor(50 - index * 4),
        tags: Math.floor(500 - index * 40),
        winStreak: Math.floor(10 - index),
        bestStreak: Math.floor(15 - index),
      },
    }));
  }

  // Get player's rank position
  async getPlayerRank(playerId) {
    const leaderboard = await this.getLeaderboard('season', 1000);
    const playerEntry = leaderboard.find(e => e.playerId === playerId);
    
    if (!playerEntry) {
      return { rank: null, tier: this.getRankTier(0), points: 0 };
    }

    return {
      rank: playerEntry.rank,
      tier: playerEntry.tier,
      points: playerEntry.points,
      stats: playerEntry.stats,
    };
  }

  // Get time remaining in season
  getSeasonTimeRemaining() {
    if (!this.currentSeason) return null;
    
    const endDate = new Date(this.currentSeason.endDate);
    const now = new Date();
    const remaining = endDate - now;

    if (remaining <= 0) return { expired: true };

    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

    return { days, hours, minutes, total: remaining };
  }

  // Calculate rewards for player
  calculateSeasonRewards(points) {
    const tier = this.getRankTier(points);
    const rewards = SEASON_REWARDS[tier.tier];
    
    return {
      tier: tier.tier,
      tierName: tier.name,
      ...rewards,
    };
  }

  // End season and distribute rewards
  async endSeason() {
    if (!this.currentSeason) return;

    const leaderboard = await this.getLeaderboard('season', 1000);
    
    // Award top players extra rewards
    const topRewards = [
      { position: 1, bonus: { xp: 10000, coins: 5000, title: 'Season Champion', badge: '🏆' } },
      { position: 2, bonus: { xp: 5000, coins: 2500, title: 'Season Runner-Up', badge: '🥈' } },
      { position: 3, bonus: { xp: 2500, coins: 1000, title: 'Season Finalist', badge: '🥉' } },
    ];

    const rewardsDistribution = leaderboard.map(entry => {
      const baseRewards = this.calculateSeasonRewards(entry.points);
      const topBonus = topRewards.find(t => t.position === entry.rank);
      
      return {
        playerId: entry.playerId,
        rewards: {
          ...baseRewards,
          ...(topBonus ? topBonus.bonus : {}),
        },
      };
    });

    this.notifyListeners('seasonEnded', {
      season: this.currentSeason,
      rewards: rewardsDistribution,
      topPlayers: leaderboard.slice(0, 10),
    });

    return rewardsDistribution;
  }

  // Start season timer
  startSeasonTimer() {
    setInterval(() => {
      const remaining = this.getSeasonTimeRemaining();
      
      if (remaining?.expired) {
        this.endSeason();
        this.loadCurrentSeason();
      }

      this.notifyListeners('timerUpdate', remaining);
    }, 60000); // Check every minute
  }

  // Subscribe to events
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in season listener:', error);
      }
    });
  }
}

// Export singleton instance
export const seasonService = new SeasonService();
export { RANK_TIERS, SEASON_REWARDS, SEASON_DURATIONS };
export default seasonService;

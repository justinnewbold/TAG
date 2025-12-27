// Player Statistics & Analytics Service
// Comprehensive tracking of player performance, trends, and records

const STATS_STORAGE_KEY = 'tag_player_stats';

// Initialize default stats structure
const createDefaultStats = () => ({
  // Overall metrics
  totalGamesPlayed: 0,
  totalTagsMade: 0,
  totalTimesTagged: 0,
  totalTimePlayedMs: 0,
  totalDistanceTraveledM: 0,
  
  // Win/Loss tracking
  wins: 0,
  losses: 0,
  draws: 0,
  winStreak: 0,
  bestWinStreak: 0,
  
  // Performance metrics
  averageGameDurationMs: 0,
  averageTagsPerGame: 0,
  longestSurvivalTimeMs: 0,
  fastestTagMs: null,
  
  // Game mode specific stats
  gameModeStats: {
    classic: { played: 0, won: 0, tags: 0 },
    freeze: { played: 0, won: 0, freezes: 0, unfreezes: 0 },
    infection: { played: 0, survived: 0, infected: 0 },
    team: { played: 0, won: 0, teamTags: 0 },
    manhunt: { played: 0, escaped: 0, caught: 0 },
    hotPotato: { played: 0, survived: 0 },
    hideSeek: { played: 0, found: 0, hid: 0 }
  },
  
  // Time-based analytics
  hourlyActivity: Array(24).fill(0),
  weeklyActivity: Array(7).fill(0),
  monthlyTrends: [],
  
  // Power-up usage
  powerupsCollected: 0,
  powerupsUsed: 0,
  powerupStats: {
    speedBoost: { collected: 0, used: 0 },
    shield: { collected: 0, used: 0 },
    invisibility: { collected: 0, used: 0 },
    radar: { collected: 0, used: 0 },
    freeze: { collected: 0, used: 0 },
    teleport: { collected: 0, used: 0 }
  },
  
  // Social stats
  friendsTagged: {},
  taggedByFriends: {},
  favoriteOpponents: [],
  
  // Achievements unlocked
  achievements: [],
  
  // Records
  records: {
    mostTagsInGame: 0,
    longestGame: 0,
    shortestWin: null,
    highestSpeedReached: 0,
    farthestDistanceInGame: 0
  },
  
  // Recent games history (last 50)
  recentGames: [],
  
  // Daily/Weekly challenges completed
  challengesCompleted: 0,
  
  // Metadata
  firstGameDate: null,
  lastGameDate: null,
  lastUpdated: null
});

class StatsService {
  constructor() {
    this.stats = this.loadStats();
    this.currentGameStats = null;
    this.gameStartTime = null;
    this.distanceTracker = {
      lastPosition: null,
      totalDistance: 0
    };
  }

  loadStats() {
    try {
      const stored = localStorage.getItem(STATS_STORAGE_KEY);
      if (stored) {
        return { ...createDefaultStats(), ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
    return createDefaultStats();
  }

  saveStats() {
    try {
      this.stats.lastUpdated = new Date().toISOString();
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(this.stats));
    } catch (e) {
      console.error('Failed to save stats:', e);
    }
  }

  // Start tracking a new game
  startGame(gameMode, players = []) {
    this.gameStartTime = Date.now();
    this.distanceTracker = { lastPosition: null, totalDistance: 0 };
    this.currentGameStats = {
      gameMode,
      players,
      startTime: this.gameStartTime,
      tags: 0,
      timesTagged: 0,
      powerupsUsed: [],
      events: []
    };
  }

  // Record a tag event
  recordTag(taggerId, taggedId, isUserTagger) {
    if (!this.currentGameStats) return;

    const event = {
      type: 'tag',
      timestamp: Date.now(),
      taggerId,
      taggedId,
      timeSinceStart: Date.now() - this.gameStartTime
    };

    this.currentGameStats.events.push(event);

    if (isUserTagger) {
      this.currentGameStats.tags++;
      this.stats.totalTagsMade++;
      
      // Track fastest tag
      const tagTime = event.timeSinceStart;
      if (this.stats.fastestTagMs === null || tagTime < this.stats.fastestTagMs) {
        this.stats.fastestTagMs = tagTime;
      }
      
      // Track friend tags
      if (this.stats.friendsTagged[taggedId]) {
        this.stats.friendsTagged[taggedId]++;
      } else {
        this.stats.friendsTagged[taggedId] = 1;
      }
    } else if (taggedId === 'user') {
      this.currentGameStats.timesTagged++;
      this.stats.totalTimesTagged++;
      
      // Track tagged by friends
      if (this.stats.taggedByFriends[taggerId]) {
        this.stats.taggedByFriends[taggerId]++;
      } else {
        this.stats.taggedByFriends[taggerId] = 1;
      }
    }

    this.saveStats();
  }

  // Record position update for distance tracking
  recordPosition(lat, lng) {
    if (!this.distanceTracker.lastPosition) {
      this.distanceTracker.lastPosition = { lat, lng };
      return;
    }

    const distance = this.calculateDistance(
      this.distanceTracker.lastPosition.lat,
      this.distanceTracker.lastPosition.lng,
      lat,
      lng
    );

    this.distanceTracker.totalDistance += distance;
    this.distanceTracker.lastPosition = { lat, lng };
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Record power-up usage
  recordPowerup(powerupType, collected = false, used = false) {
    if (collected) {
      this.stats.powerupsCollected++;
      if (this.stats.powerupStats[powerupType]) {
        this.stats.powerupStats[powerupType].collected++;
      }
    }
    
    if (used) {
      this.stats.powerupsUsed++;
      if (this.stats.powerupStats[powerupType]) {
        this.stats.powerupStats[powerupType].used++;
      }
      if (this.currentGameStats) {
        this.currentGameStats.powerupsUsed.push(powerupType);
      }
    }

    this.saveStats();
  }

  // End game and calculate final stats
  endGame(result, gameMode) {
    if (!this.currentGameStats) return;

    const endTime = Date.now();
    const gameDuration = endTime - this.gameStartTime;
    const now = new Date();

    // Update overall stats
    this.stats.totalGamesPlayed++;
    this.stats.totalTimePlayedMs += gameDuration;
    this.stats.totalDistanceTraveledM += this.distanceTracker.totalDistance;

    // Track first game date
    if (!this.stats.firstGameDate) {
      this.stats.firstGameDate = now.toISOString();
    }
    this.stats.lastGameDate = now.toISOString();

    // Win/Loss tracking
    if (result === 'win') {
      this.stats.wins++;
      this.stats.winStreak++;
      if (this.stats.winStreak > this.stats.bestWinStreak) {
        this.stats.bestWinStreak = this.stats.winStreak;
      }
    } else if (result === 'loss') {
      this.stats.losses++;
      this.stats.winStreak = 0;
    } else {
      this.stats.draws++;
    }

    // Update averages
    this.stats.averageGameDurationMs = 
      this.stats.totalTimePlayedMs / this.stats.totalGamesPlayed;
    this.stats.averageTagsPerGame = 
      this.stats.totalTagsMade / this.stats.totalGamesPlayed;

    // Update game mode stats
    const modeKey = gameMode?.toLowerCase().replace(/\s+/g, '') || 'classic';
    if (this.stats.gameModeStats[modeKey]) {
      this.stats.gameModeStats[modeKey].played++;
      if (result === 'win') {
        this.stats.gameModeStats[modeKey].won++;
      }
      this.stats.gameModeStats[modeKey].tags = 
        (this.stats.gameModeStats[modeKey].tags || 0) + this.currentGameStats.tags;
    }

    // Update records
    if (this.currentGameStats.tags > this.stats.records.mostTagsInGame) {
      this.stats.records.mostTagsInGame = this.currentGameStats.tags;
    }
    if (gameDuration > this.stats.records.longestGame) {
      this.stats.records.longestGame = gameDuration;
    }
    if (result === 'win' && 
        (this.stats.records.shortestWin === null || gameDuration < this.stats.records.shortestWin)) {
      this.stats.records.shortestWin = gameDuration;
    }
    if (this.distanceTracker.totalDistance > this.stats.records.farthestDistanceInGame) {
      this.stats.records.farthestDistanceInGame = this.distanceTracker.totalDistance;
    }

    // Track hourly/weekly activity
    this.stats.hourlyActivity[now.getHours()]++;
    this.stats.weeklyActivity[now.getDay()]++;

    // Add to recent games
    const gameRecord = {
      id: `game_${Date.now()}`,
      date: now.toISOString(),
      mode: gameMode,
      duration: gameDuration,
      result,
      tags: this.currentGameStats.tags,
      timesTagged: this.currentGameStats.timesTagged,
      distance: this.distanceTracker.totalDistance,
      powerupsUsed: this.currentGameStats.powerupsUsed.length
    };

    this.stats.recentGames.unshift(gameRecord);
    if (this.stats.recentGames.length > 50) {
      this.stats.recentGames.pop();
    }

    this.currentGameStats = null;
    this.saveStats();

    return gameRecord;
  }

  // Get computed analytics
  getAnalytics() {
    const stats = this.stats;
    
    return {
      // Basic stats
      overview: {
        totalGames: stats.totalGamesPlayed,
        winRate: stats.totalGamesPlayed > 0 
          ? ((stats.wins / stats.totalGamesPlayed) * 100).toFixed(1) 
          : 0,
        totalPlayTime: this.formatDuration(stats.totalTimePlayedMs),
        totalDistance: (stats.totalDistanceTraveledM / 1000).toFixed(2) + ' km',
        averageGameTime: this.formatDuration(stats.averageGameDurationMs),
        tagRatio: stats.totalTimesTagged > 0 
          ? (stats.totalTagsMade / stats.totalTimesTagged).toFixed(2)
          : stats.totalTagsMade
      },
      
      // Performance trends
      performance: {
        currentStreak: stats.winStreak,
        bestStreak: stats.bestWinStreak,
        averageTagsPerGame: stats.averageTagsPerGame.toFixed(1),
        fastestTag: stats.fastestTagMs 
          ? (stats.fastestTagMs / 1000).toFixed(1) + 's' 
          : 'N/A'
      },
      
      // Records
      records: {
        mostTagsInGame: stats.records.mostTagsInGame,
        longestGame: this.formatDuration(stats.records.longestGame),
        shortestWin: stats.records.shortestWin 
          ? this.formatDuration(stats.records.shortestWin) 
          : 'N/A',
        farthestDistance: (stats.records.farthestDistanceInGame / 1000).toFixed(2) + ' km'
      },
      
      // Activity patterns
      activity: {
        peakHour: this.getPeakIndex(stats.hourlyActivity),
        peakDay: this.getDayName(this.getPeakIndex(stats.weeklyActivity)),
        hourlyDistribution: stats.hourlyActivity,
        weeklyDistribution: stats.weeklyActivity
      },
      
      // Game mode breakdown
      gameModes: stats.gameModeStats,
      
      // Power-up efficiency
      powerups: {
        collected: stats.powerupsCollected,
        used: stats.powerupsUsed,
        efficiency: stats.powerupsCollected > 0 
          ? ((stats.powerupsUsed / stats.powerupsCollected) * 100).toFixed(0) + '%'
          : 'N/A',
        breakdown: stats.powerupStats
      },
      
      // Recent form (last 10 games)
      recentForm: this.getRecentForm(stats.recentGames.slice(0, 10)),
      
      // Recent games
      recentGames: stats.recentGames.slice(0, 10)
    };
  }

  getRecentForm(games) {
    if (!games.length) return { wins: 0, losses: 0, draws: 0, form: [] };
    
    const form = games.map(g => g.result === 'win' ? 'W' : g.result === 'loss' ? 'L' : 'D');
    const wins = form.filter(f => f === 'W').length;
    const losses = form.filter(f => f === 'L').length;
    const draws = form.filter(f => f === 'D').length;
    
    return { wins, losses, draws, form };
  }

  formatDuration(ms) {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  getPeakIndex(arr) {
    return arr.indexOf(Math.max(...arr));
  }

  getDayName(dayIndex) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex] || 'Unknown';
  }

  // Reset all stats
  resetStats() {
    this.stats = createDefaultStats();
    this.saveStats();
  }

  // Export stats as JSON
  exportStats() {
    return JSON.stringify(this.stats, null, 2);
  }

  // Import stats from JSON
  importStats(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this.stats = { ...createDefaultStats(), ...imported };
      this.saveStats();
      return true;
    } catch (e) {
      console.error('Failed to import stats:', e);
      return false;
    }
  }
}

// Singleton instance
export const statsService = new StatsService();
export default statsService;

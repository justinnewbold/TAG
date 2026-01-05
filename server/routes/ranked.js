/**
 * Ranked/Competitive Mode Routes
 * ELO system, matchmaking, seasons, leaderboards
 */

import express from 'express';

const router = express.Router();

// Skill divisions
const SKILL_DIVISIONS = {
  bronze: { name: 'Bronze', minRating: 0, maxRating: 999, icon: '🥉' },
  silver: { name: 'Silver', minRating: 1000, maxRating: 1499, icon: '🥈' },
  gold: { name: 'Gold', minRating: 1500, maxRating: 1999, icon: '🥇' },
  platinum: { name: 'Platinum', minRating: 2000, maxRating: 2499, icon: '💎' },
  diamond: { name: 'Diamond', minRating: 2500, maxRating: 2999, icon: '💠' },
  master: { name: 'Master', minRating: 3000, maxRating: 3499, icon: '👑' },
  legend: { name: 'Legend', minRating: 3500, maxRating: Infinity, icon: '🏆' },
};

// Get player's ranked profile
router.get('/profile/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;

    // In production, fetch from database
    const profile = {
      playerId,
      rating: 1500,
      division: SKILL_DIVISIONS.gold,
      tier: 3,
      wins: 45,
      losses: 30,
      winStreak: 3,
      bestWinStreak: 7,
      gamesPlayed: 75,
      seasonGames: 25,
      placements: { completed: 10, required: 10 },
      rankHistory: [],
      seasonRewards: [],
    };

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update rating after match
router.post('/match-result', async (req, res) => {
  try {
    const { winnerId, loserId, gameId, gameMode } = req.body;

    // ELO calculation
    const K = 32; // K-factor
    const winnerRating = 1500; // Would fetch from DB
    const loserRating = 1500;

    const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

    const newWinnerRating = Math.round(winnerRating + K * (1 - expectedWinner));
    const newLoserRating = Math.round(loserRating + K * (0 - expectedLoser));

    res.json({
      winner: {
        playerId: winnerId,
        oldRating: winnerRating,
        newRating: newWinnerRating,
        change: newWinnerRating - winnerRating,
      },
      loser: {
        playerId: loserId,
        oldRating: loserRating,
        newRating: newLoserRating,
        change: newLoserRating - loserRating,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ranked leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { division, page = 1, limit = 50 } = req.query;

    // Mock leaderboard data
    const leaderboard = Array.from({ length: limit }, (_, i) => ({
      rank: (page - 1) * limit + i + 1,
      playerId: `player_${i}`,
      playerName: `Player ${i + 1}`,
      rating: 3500 - i * 25,
      division: 'legend',
      wins: 100 - i,
      losses: 20 + i,
      winRate: ((100 - i) / (120) * 100).toFixed(1),
    }));

    res.json({
      leaderboard,
      page: parseInt(page),
      totalPages: 20,
      totalPlayers: 1000,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current season info
router.get('/season', async (req, res) => {
  try {
    const season = {
      id: 'season_1',
      name: 'Season 1: The Hunt Begins',
      startDate: new Date('2024-01-01').toISOString(),
      endDate: new Date('2024-04-01').toISOString(),
      rewards: [
        { division: 'bronze', rewards: ['Bronze Badge', '100 Coins'] },
        { division: 'silver', rewards: ['Silver Badge', '250 Coins'] },
        { division: 'gold', rewards: ['Gold Badge', '500 Coins', 'Golden Trail'] },
        { division: 'platinum', rewards: ['Platinum Badge', '1000 Coins', 'Platinum Trail'] },
        { division: 'diamond', rewards: ['Diamond Badge', '2000 Coins', 'Diamond Trail', 'Diamond Avatar Frame'] },
        { division: 'master', rewards: ['Master Badge', '5000 Coins', 'Master Trail', 'Master Avatar Frame', 'Exclusive Skin'] },
        { division: 'legend', rewards: ['Legend Badge', '10000 Coins', 'Legend Trail', 'Legend Avatar Frame', 'Legendary Skin', 'Season Title'] },
      ],
    };

    res.json(season);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Queue for ranked match
router.post('/queue', async (req, res) => {
  try {
    const { playerId, gameMode } = req.body;

    res.json({
      queued: true,
      playerId,
      gameMode,
      estimatedWait: 30, // seconds
      queuePosition: 5,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave ranked queue
router.delete('/queue/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;

    res.json({
      success: true,
      playerId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get match history
router.get('/history/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const history = Array.from({ length: limit }, (_, i) => ({
      matchId: `match_${i}`,
      date: new Date(Date.now() - i * 86400000).toISOString(),
      result: i % 3 === 0 ? 'loss' : 'win',
      ratingChange: i % 3 === 0 ? -15 : 20,
      opponent: `Opponent ${i}`,
      opponentRating: 1500 + Math.floor(Math.random() * 200) - 100,
      gameMode: 'standard',
      duration: 300 + Math.floor(Math.random() * 300),
    }));

    res.json({
      history,
      page: parseInt(page),
      totalPages: 10,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

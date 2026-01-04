/**
 * Matchmaking Routes
 * Phase 6: Skill-based matchmaking API
 */

import express from 'express';

const router = express.Router();

// In-memory matchmaking queue
const matchmakingQueue = new Map();
const activeSearches = new Map();

// Matchmaking settings
const SETTINGS = {
  MIN_PLAYERS: 4,
  MAX_PLAYERS: 10,
  SEARCH_TIMEOUT: 120000, // 2 minutes
  SKILL_RANGE_INITIAL: 100,
  SKILL_RANGE_INCREMENT: 50, // Increase range over time
  SKILL_RANGE_MAX: 500,
  MATCH_CHECK_INTERVAL: 3000, // 3 seconds
};

// Simple skill calculation (would be more complex in production)
function calculateSkill(stats) {
  const winRate = stats.gamesPlayed > 0 ? stats.gamesWon / stats.gamesPlayed : 0.5;
  const tagRate = stats.gamesPlayed > 0 ? stats.totalTags / stats.gamesPlayed : 0;

  return Math.round(
    winRate * 500 +
    tagRate * 10 +
    Math.min(stats.gamesPlayed * 2, 200) // Experience bonus
  );
}

// Find compatible players
function findMatch(userId) {
  const userSearch = activeSearches.get(userId);
  if (!userSearch) return null;

  const now = Date.now();
  const timeWaiting = now - userSearch.startTime;
  const dynamicRange = Math.min(
    SETTINGS.SKILL_RANGE_INITIAL + Math.floor(timeWaiting / 10000) * SETTINGS.SKILL_RANGE_INCREMENT,
    SETTINGS.SKILL_RANGE_MAX
  );

  const compatiblePlayers = [];

  for (const [otherId, otherSearch] of activeSearches) {
    if (otherId === userId) continue;
    if (otherSearch.mode !== userSearch.mode) continue;

    const skillDiff = Math.abs(userSearch.skill - otherSearch.skill);
    if (skillDiff <= dynamicRange) {
      compatiblePlayers.push({
        id: otherId,
        ...otherSearch,
        skillDiff,
      });
    }
  }

  // Sort by skill difference
  compatiblePlayers.sort((a, b) => a.skillDiff - b.skillDiff);

  return compatiblePlayers.slice(0, SETTINGS.MAX_PLAYERS - 1);
}

// Check if we have enough players for a match
function tryCreateMatch(userId) {
  const compatible = findMatch(userId);
  if (!compatible || compatible.length < SETTINGS.MIN_PLAYERS - 1) {
    return null;
  }

  const userSearch = activeSearches.get(userId);
  const matchPlayers = [
    { id: userId, ...userSearch },
    ...compatible.slice(0, SETTINGS.MAX_PLAYERS - 1),
  ];

  // Create match
  const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const match = {
    id: matchId,
    mode: userSearch.mode,
    players: matchPlayers.map(p => ({
      id: p.id,
      name: p.name,
      skill: p.skill,
    })),
    createdAt: Date.now(),
    status: 'pending_confirmation',
    confirmations: new Set(),
  };

  matchmakingQueue.set(matchId, match);

  // Remove players from queue
  matchPlayers.forEach(p => activeSearches.delete(p.id));

  return match;
}

// Join matchmaking queue
router.post('/join', async (req, res) => {
  try {
    const userId = req.user.id;
    const { mode = 'classic', stats = {} } = req.body;

    // Check if already in queue
    if (activeSearches.has(userId)) {
      return res.status(400).json({ error: 'Already in queue' });
    }

    const skill = calculateSkill(stats);

    const searchEntry = {
      userId,
      name: req.user.name,
      mode,
      skill,
      stats,
      startTime: Date.now(),
    };

    activeSearches.set(userId, searchEntry);

    res.json({
      success: true,
      position: activeSearches.size,
      estimatedWait: Math.round(60 / Math.max(activeSearches.size, 1)), // Rough estimate in seconds
    });
  } catch (error) {
    console.error('Failed to join matchmaking:', error);
    res.status(500).json({ error: 'Failed to join queue' });
  }
});

// Leave matchmaking queue
router.post('/leave', async (req, res) => {
  try {
    const userId = req.user.id;

    if (!activeSearches.has(userId)) {
      return res.status(400).json({ error: 'Not in queue' });
    }

    activeSearches.delete(userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to leave matchmaking:', error);
    res.status(500).json({ error: 'Failed to leave queue' });
  }
});

// Get queue status
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const search = activeSearches.get(userId);

    if (!search) {
      return res.json({ inQueue: false });
    }

    const timeWaiting = Date.now() - search.startTime;
    const compatible = findMatch(userId);

    res.json({
      inQueue: true,
      mode: search.mode,
      timeWaiting,
      playersInQueue: activeSearches.size,
      compatiblePlayers: compatible?.length || 0,
    });
  } catch (error) {
    console.error('Failed to get queue status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Poll for match
router.get('/poll', async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if in queue
    if (!activeSearches.has(userId)) {
      // Check if already matched
      for (const [matchId, match] of matchmakingQueue) {
        if (match.players.some(p => p.id === userId)) {
          return res.json({
            matched: true,
            matchId,
            match,
          });
        }
      }
      return res.json({ matched: false, inQueue: false });
    }

    // Try to create a match
    const match = tryCreateMatch(userId);
    if (match) {
      return res.json({
        matched: true,
        matchId: match.id,
        match,
      });
    }

    const search = activeSearches.get(userId);
    const timeWaiting = Date.now() - search.startTime;

    // Check timeout
    if (timeWaiting > SETTINGS.SEARCH_TIMEOUT) {
      activeSearches.delete(userId);
      return res.json({
        matched: false,
        inQueue: false,
        timeout: true,
      });
    }

    res.json({
      matched: false,
      inQueue: true,
      timeWaiting,
      playersSearching: activeSearches.size,
    });
  } catch (error) {
    console.error('Failed to poll for match:', error);
    res.status(500).json({ error: 'Failed to poll' });
  }
});

// Confirm match (accept/decline)
router.post('/confirm/:matchId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;
    const { accept } = req.body;

    const match = matchmakingQueue.get(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (!match.players.some(p => p.id === userId)) {
      return res.status(403).json({ error: 'Not part of this match' });
    }

    if (!accept) {
      // Player declined - cancel match
      matchmakingQueue.delete(matchId);

      // Re-add other players to queue
      for (const player of match.players) {
        if (player.id !== userId) {
          activeSearches.set(player.id, {
            userId: player.id,
            name: player.name,
            mode: match.mode,
            skill: player.skill,
            startTime: Date.now(),
          });
        }
      }

      return res.json({ success: true, matchCancelled: true });
    }

    // Player accepted
    match.confirmations.add(userId);

    // Check if all players confirmed
    if (match.confirmations.size === match.players.length) {
      match.status = 'confirmed';
      // In production, would create actual game here
      return res.json({
        success: true,
        allConfirmed: true,
        gameReady: true,
      });
    }

    res.json({
      success: true,
      confirmations: match.confirmations.size,
      required: match.players.length,
    });
  } catch (error) {
    console.error('Failed to confirm match:', error);
    res.status(500).json({ error: 'Failed to confirm' });
  }
});

// Get queue stats (admin)
router.get('/admin/stats', async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin required' });
    }

    const modeCount = {};
    for (const [, search] of activeSearches) {
      modeCount[search.mode] = (modeCount[search.mode] || 0) + 1;
    }

    res.json({
      totalInQueue: activeSearches.size,
      pendingMatches: matchmakingQueue.size,
      byMode: modeCount,
    });
  } catch (error) {
    console.error('Failed to get admin stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export { router as matchmakingRouter };

// Social/Competitive Routes - Leaderboards, Clans, Tournaments, XP
import express from 'express';
import { socialDb } from '../db/social.js';
import { sanitize, validate } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// ============ LEADERBOARDS ============

// Get global leaderboard
router.get('/leaderboard/:type?', async (req, res) => {
  try {
    const type = req.params.type || 'wins';
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;

    const leaderboard = await socialDb.getLeaderboard(type, limit, offset);
    const userRank = req.user ? await socialDb.getUserRank(req.user.id, type) : null;

    res.json({ 
      leaderboard,
      userRank,
      type,
      limit,
      offset
    });
  } catch (error) {
    logger.error('Leaderboard error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user's rank
router.get('/rank/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const ranks = {
      wins: await socialDb.getUserRank(userId, 'wins'),
      tags: await socialDb.getUserRank(userId, 'tags'),
      xp: await socialDb.getUserRank(userId, 'xp'),
      level: await socialDb.getUserRank(userId, 'level')
    };
    
    const entry = await socialDb.getOrCreateLeaderboardEntry(userId);
    
    res.json({ ranks, stats: entry });
  } catch (error) {
    logger.error('Rank error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch rank' });
  }
});

// ============ XP/LEVELS ============

// Get XP progress
router.get('/xp', async (req, res) => {
  try {
    const entry = await socialDb.getOrCreateLeaderboardEntry(req.user.id);
    const xpForNextLevel = entry.level * 1000;
    
    res.json({
      xp: entry.xp,
      level: entry.level,
      xpForNextLevel,
      xpProgress: entry.xp % 1000,
      xpToNextLevel: xpForNextLevel - (entry.xp % 1000)
    });
  } catch (error) {
    logger.error('XP error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch XP' });
  }
});

// ============ CLANS ============

// Create a clan
router.post('/clans', async (req, res) => {
  try {
    const { name, tag, description, avatar } = req.body;
    
    const cleanName = sanitize.string(name, 50);
    const cleanTag = sanitize.string(tag, 10);
    
    if (!cleanName || cleanName.length < 3) {
      return res.status(400).json({ error: 'Clan name must be at least 3 characters' });
    }
    if (!cleanTag || cleanTag.length < 2 || cleanTag.length > 6) {
      return res.status(400).json({ error: 'Clan tag must be 2-6 characters' });
    }

    // Check if user already in a clan
    const existingClan = await socialDb.getUserClan(req.user.id);
    if (existingClan) {
      return res.status(400).json({ error: 'You are already in a clan' });
    }

    const clan = await socialDb.createClan(cleanName, cleanTag, req.user.id, description, avatar);
    res.status(201).json({ clan });
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Clan name or tag already taken' });
    }
    logger.error('Create clan error', { error: error.message });
    res.status(500).json({ error: 'Failed to create clan' });
  }
});

// Get clan details
router.get('/clans/:clanId', async (req, res) => {
  try {
    const clan = await socialDb.getClan(req.params.clanId);
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }

    const members = await socialDb.getClanMembers(req.params.clanId);
    res.json({ clan, members });
  } catch (error) {
    logger.error('Get clan error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch clan' });
  }
});

// Get user's clan
router.get('/my-clan', async (req, res) => {
  try {
    const clan = await socialDb.getUserClan(req.user.id);
    if (!clan) {
      return res.json({ clan: null });
    }

    const members = await socialDb.getClanMembers(clan.id);
    res.json({ clan, members });
  } catch (error) {
    logger.error('Get my clan error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch clan' });
  }
});

// Join a clan
router.post('/clans/:clanId/join', async (req, res) => {
  try {
    const existingClan = await socialDb.getUserClan(req.user.id);
    if (existingClan) {
      return res.status(400).json({ error: 'You are already in a clan' });
    }

    const clan = await socialDb.getClan(req.params.clanId);
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }

    await socialDb.joinClan(req.params.clanId, req.user.id);
    res.json({ success: true, clan });
  } catch (error) {
    logger.error('Join clan error', { error: error.message });
    res.status(500).json({ error: 'Failed to join clan' });
  }
});

// Leave clan
router.post('/clans/:clanId/leave', async (req, res) => {
  try {
    const clan = await socialDb.getClan(req.params.clanId);
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    
    if (clan.owner_id === req.user.id) {
      return res.status(400).json({ error: 'Owners cannot leave. Transfer ownership first.' });
    }

    await socialDb.leaveClan(req.params.clanId, req.user.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Leave clan error', { error: error.message });
    res.status(500).json({ error: 'Failed to leave clan' });
  }
});

// ============ TOURNAMENTS ============

// Get upcoming tournaments
router.get('/tournaments', async (req, res) => {
  try {
    const tournaments = await socialDb.getUpcomingTournaments();
    res.json({ tournaments });
  } catch (error) {
    logger.error('Get tournaments error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Get tournament details
router.get('/tournaments/:id', async (req, res) => {
  try {
    const tournament = await socialDb.getTournament(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json({ tournament });
  } catch (error) {
    logger.error('Get tournament error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// Create tournament (admin only for now)
router.post('/tournaments', async (req, res) => {
  try {
    const { name, description, gameMode, maxParticipants, entryType, startTime, prizeDescription, rules } = req.body;
    
    if (!name || !startTime) {
      return res.status(400).json({ error: 'Name and start time required' });
    }

    const tournament = await socialDb.createTournament({
      name: sanitize.string(name, 100),
      description: sanitize.string(description, 500),
      gameMode: gameMode || 'classic',
      maxParticipants: maxParticipants || 32,
      entryType: entryType || 'solo',
      startTime,
      prizeDescription,
      rules,
      createdBy: req.user.id
    });

    res.status(201).json({ tournament });
  } catch (error) {
    logger.error('Create tournament error', { error: error.message });
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// Register for tournament
router.post('/tournaments/:id/register', async (req, res) => {
  try {
    const tournament = await socialDb.getTournament(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'upcoming') {
      return res.status(400).json({ error: 'Registration closed' });
    }

    const { clanId } = req.body;
    const participantId = await socialDb.registerForTournament(req.params.id, req.user.id, clanId);
    
    res.json({ success: true, participantId });
  } catch (error) {
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Already registered' });
    }
    logger.error('Register tournament error', { error: error.message });
    res.status(500).json({ error: 'Failed to register' });
  }
});

// ============ PLAYER REPORTS ============

// Report a player
router.post('/reports', async (req, res) => {
  try {
    const { reportedId, reason, description, gameId, evidence } = req.body;
    
    if (!reportedId || !reason) {
      return res.status(400).json({ error: 'Reported player and reason required' });
    }

    const validReasons = ['cheating', 'harassment', 'inappropriate_name', 'griefing', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Invalid report reason' });
    }

    const reportId = await socialDb.createReport(
      req.user.id,
      reportedId,
      reason,
      sanitize.string(description, 1000),
      gameId,
      evidence || []
    );

    res.status(201).json({ success: true, reportId });
  } catch (error) {
    logger.error('Create report error', { error: error.message });
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// ============ CHAT HISTORY ============

// Get chat history for a game
router.get('/chat/:gameId', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const messages = await socialDb.getChatHistory(req.params.gameId, limit);
    res.json({ messages });
  } catch (error) {
    logger.error('Get chat error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// ============ PROFILES ============

// Get player profile
router.get('/profile/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    const [entry, clan] = await Promise.all([
      socialDb.getOrCreateLeaderboardEntry(userId),
      socialDb.getUserClan(userId)
    ]);

    const ranks = {
      wins: await socialDb.getUserRank(userId, 'wins'),
      tags: await socialDb.getUserRank(userId, 'tags'),
      xp: await socialDb.getUserRank(userId, 'xp')
    };

    res.json({
      stats: entry,
      clan,
      ranks,
      xpProgress: {
        current: entry.xp % 1000,
        needed: entry.level * 1000,
        level: entry.level
      }
    });
  } catch (error) {
    logger.error('Get profile error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export { router as socialRouter };

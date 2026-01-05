/**
 * Clan/Team System Routes
 * Clan management, wars, leaderboards
 */

import express from 'express';

const router = express.Router();

// Create a new clan
router.post('/', async (req, res) => {
  try {
    const { name, tag, description, isPublic, creatorId } = req.body;

    // Validate clan name and tag
    if (!name || name.length < 3 || name.length > 30) {
      return res.status(400).json({ error: 'Clan name must be 3-30 characters' });
    }

    if (!tag || tag.length < 2 || tag.length > 6) {
      return res.status(400).json({ error: 'Clan tag must be 2-6 characters' });
    }

    const clan = {
      id: `clan_${Date.now()}`,
      name,
      tag: tag.toUpperCase(),
      description: description || '',
      isPublic: isPublic !== false,
      leaderId: creatorId,
      members: [{
        id: creatorId,
        role: 'leader',
        joinedAt: new Date().toISOString(),
      }],
      memberCount: 1,
      maxMembers: 50,
      level: 1,
      xp: 0,
      trophies: 0,
      wins: 0,
      losses: 0,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json(clan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get clan by ID
router.get('/:clanId', async (req, res) => {
  try {
    const { clanId } = req.params;

    // Mock clan data
    const clan = {
      id: clanId,
      name: 'Shadow Hunters',
      tag: 'SHDW',
      description: 'Elite hunters seeking glory',
      isPublic: true,
      leaderId: 'player_1',
      memberCount: 25,
      maxMembers: 50,
      level: 10,
      xp: 15000,
      trophies: 5000,
      wins: 45,
      losses: 12,
      createdAt: new Date('2024-01-01').toISOString(),
      emblem: { shape: 'shield', color: '#4a90d9', icon: 'wolf' },
    };

    res.json(clan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get clan members
router.get('/:clanId/members', async (req, res) => {
  try {
    const { clanId } = req.params;

    const members = [
      { id: 'player_1', name: 'Leader', role: 'leader', trophies: 2500, joinedAt: '2024-01-01T00:00:00Z' },
      { id: 'player_2', name: 'CoLeader1', role: 'co_leader', trophies: 2200, joinedAt: '2024-01-05T00:00:00Z' },
      { id: 'player_3', name: 'Elder1', role: 'elder', trophies: 1800, joinedAt: '2024-01-10T00:00:00Z' },
      { id: 'player_4', name: 'Member1', role: 'member', trophies: 1500, joinedAt: '2024-01-15T00:00:00Z' },
    ];

    res.json({ members, total: members.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join clan
router.post('/:clanId/join', async (req, res) => {
  try {
    const { clanId } = req.params;
    const { playerId } = req.body;

    res.json({
      success: true,
      message: 'Successfully joined clan',
      member: {
        id: playerId,
        role: 'member',
        joinedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave clan
router.post('/:clanId/leave', async (req, res) => {
  try {
    const { clanId } = req.params;
    const { playerId } = req.body;

    res.json({
      success: true,
      message: 'Successfully left clan',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Invite player to clan
router.post('/:clanId/invite', async (req, res) => {
  try {
    const { clanId } = req.params;
    const { playerId, inviterId } = req.body;

    res.json({
      success: true,
      invite: {
        id: `invite_${Date.now()}`,
        clanId,
        playerId,
        inviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Kick member
router.post('/:clanId/kick', async (req, res) => {
  try {
    const { clanId } = req.params;
    const { playerId, kickedBy } = req.body;

    res.json({
      success: true,
      message: 'Member kicked from clan',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Promote/demote member
router.post('/:clanId/role', async (req, res) => {
  try {
    const { clanId } = req.params;
    const { playerId, newRole, changedBy } = req.body;

    res.json({
      success: true,
      playerId,
      newRole,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search clans
router.get('/search', async (req, res) => {
  try {
    const { query, minMembers, maxMembers, minTrophies } = req.query;

    const clans = [
      { id: 'clan_1', name: 'Shadow Hunters', tag: 'SHDW', memberCount: 45, trophies: 5000, isPublic: true },
      { id: 'clan_2', name: 'Tag Masters', tag: 'TAGM', memberCount: 38, trophies: 4500, isPublic: true },
      { id: 'clan_3', name: 'Speed Demons', tag: 'SPDM', memberCount: 50, trophies: 6000, isPublic: false },
    ];

    res.json({ clans, total: clans.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get clan leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const leaderboard = Array.from({ length: limit }, (_, i) => ({
      rank: (page - 1) * limit + i + 1,
      clanId: `clan_${i}`,
      name: `Clan ${i + 1}`,
      tag: `C${i + 1}`,
      trophies: 10000 - i * 100,
      memberCount: 50 - Math.floor(i / 5),
      wins: 100 - i,
    }));

    res.json({
      leaderboard,
      page: parseInt(page),
      totalPages: 20,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CLAN WARS ============

// Start war search
router.post('/:clanId/war/search', async (req, res) => {
  try {
    const { clanId } = req.params;

    res.json({
      searching: true,
      clanId,
      searchStarted: new Date().toISOString(),
      estimatedTime: 60, // seconds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel war search
router.delete('/:clanId/war/search', async (req, res) => {
  try {
    const { clanId } = req.params;

    res.json({
      success: true,
      message: 'War search cancelled',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current war
router.get('/:clanId/war/current', async (req, res) => {
  try {
    const { clanId } = req.params;

    const war = {
      id: 'war_123',
      status: 'in_progress',
      clan1: {
        id: clanId,
        name: 'Shadow Hunters',
        score: 15,
        stars: 3,
      },
      clan2: {
        id: 'clan_enemy',
        name: 'Night Stalkers',
        score: 12,
        stars: 2,
      },
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      battles: [],
    };

    res.json(war);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get war history
router.get('/:clanId/war/history', async (req, res) => {
  try {
    const { clanId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const history = Array.from({ length: limit }, (_, i) => ({
      id: `war_${i}`,
      opponent: `Enemy Clan ${i}`,
      result: i % 3 === 0 ? 'loss' : 'win',
      ourScore: 20 + Math.floor(Math.random() * 10),
      theirScore: 15 + Math.floor(Math.random() * 10),
      date: new Date(Date.now() - i * 86400000).toISOString(),
    }));

    res.json({
      history,
      page: parseInt(page),
      totalPages: 5,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get clan chat
router.get('/:clanId/chat', async (req, res) => {
  try {
    const { clanId } = req.params;
    const { before, limit = 50 } = req.query;

    const messages = Array.from({ length: limit }, (_, i) => ({
      id: `msg_${i}`,
      senderId: `player_${i % 5}`,
      senderName: `Player ${i % 5}`,
      content: `Message ${i}`,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
    }));

    res.json({
      messages,
      hasMore: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send clan chat message
router.post('/:clanId/chat', async (req, res) => {
  try {
    const { clanId } = req.params;
    const { senderId, content } = req.body;

    const message = {
      id: `msg_${Date.now()}`,
      senderId,
      content,
      timestamp: new Date().toISOString(),
    };

    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

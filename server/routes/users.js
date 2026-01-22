import express from 'express';
import { userDb } from '../db/index.js';
import { socialDb } from '../db/social.js';
import { sanitize } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get current user's profile
router.get('/me/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data
    const user = await userDb.getById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get stats from social db
    const stats = await socialDb.getUserStats?.(userId) || {
      level: 1,
      xp: 0,
      total_games: 0,
      total_wins: 0,
      total_tags: 0,
      total_survival_time: 0,
      avg_survival_time: 0,
      tag_accuracy: 0,
      best_win_streak: 0
    };
    
    // Get ranks
    const ranks = await socialDb.getUserRanks?.(userId) || {};
    
    // Get achievements
    const achievements = await socialDb.getUserAchievements?.(userId) || [];
    
    // Get recent games
    const recentGames = await socialDb.getRecentGames?.(userId, 10) || [];
    
    // Get clan info
    const clan = await socialDb.getUserClan?.(userId);
    
    res.json({
      id: user.id,
      name: user.name,
      avatar: user.avatar || '😀',
      bio: user.bio || '',
      created_at: user.created_at,
      last_active: user.last_active,
      stats,
      ranks,
      achievements,
      recentGames,
      clan
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update current user's profile
router.put('/me/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, avatar, bio } = req.body;
    
    const updates = {};
    
    if (name !== undefined) {
      const sanitizedName = sanitize.playerName(name);
      if (sanitizedName.length < 2 || sanitizedName.length > 24) {
        return res.status(400).json({ error: 'Name must be 2-24 characters' });
      }
      updates.name = sanitizedName;
    }
    
    if (avatar !== undefined) {
      // Validate avatar is a single emoji or short string
      if (avatar.length > 4) {
        return res.status(400).json({ error: 'Invalid avatar' });
      }
      updates.avatar = avatar;
    }
    
    if (bio !== undefined) {
      updates.bio = sanitize.string(bio).slice(0, 150);
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    
    await userDb.update(userId, updates);
    
    res.json({ success: true, ...updates });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get another user's profile
router.get('/:userId/profile', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Get user data (limited for privacy)
    const user = await userDb.getById(targetUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get stats
    const stats = await socialDb.getUserStats?.(targetUserId) || {
      level: 1,
      xp: 0,
      total_games: 0,
      total_wins: 0,
      total_tags: 0
    };
    
    // Get ranks
    const ranks = await socialDb.getUserRanks?.(targetUserId) || {};
    
    // Get achievements (public only)
    const achievements = await socialDb.getUserAchievements?.(targetUserId) || [];
    
    // Get recent games (public only)
    const recentGames = await socialDb.getRecentGames?.(targetUserId, 5) || [];
    
    // Get clan info
    const clan = await socialDb.getUserClan?.(targetUserId);
    
    res.json({
      id: user.id,
      name: user.name,
      avatar: user.avatar || '😀',
      bio: user.bio || '',
      created_at: user.created_at,
      stats: {
        level: stats.level,
        xp: stats.xp,
        total_games: stats.total_games,
        total_wins: stats.total_wins,
        total_tags: stats.total_tags
      },
      ranks,
      achievements: achievements.slice(0, 10),
      recentGames,
      clan
    });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Search users
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const sanitizedQuery = sanitize.string(q).slice(0, 50);
    const users = await userDb.search?.(sanitizedQuery, 20) || [];
    
    res.json({
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar || '😀',
        level: u.level || 1
      }))
    });
  } catch (error) {
    logger.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export { router as usersRouter };

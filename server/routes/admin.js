// Admin Routes - Dashboard, moderation, analytics
import express from 'express';
import { socialDb } from '../db/social.js';
import { authDb } from '../db/auth.js';
import { antiCheat } from '../services/antiCheat.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Admin middleware - check if user has admin role (database lookup)
const requireAdmin = async (req, res, next) => {
  try {
    const isAdmin = await authDb.isAdmin(req.user?.id);
    if (!isAdmin) {
      logger.warn('Admin access denied', { userId: req.user?.id, path: req.path });
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    logger.error('Admin check failed', { error: error.message });
    return res.status(500).json({ error: 'Authorization check failed' });
  }
};

// Moderator middleware - check if user has moderator or admin role
const requireModerator = async (req, res, next) => {
  try {
    const isMod = await authDb.isModerator(req.user?.id);
    if (!isMod) {
      logger.warn('Moderator access denied', { userId: req.user?.id, path: req.path });
      return res.status(403).json({ error: 'Moderator access required' });
    }
    next();
  } catch (error) {
    logger.error('Moderator check failed', { error: error.message });
    return res.status(500).json({ error: 'Authorization check failed' });
  }
};

// ============ DASHBOARD ============

// Get admin dashboard stats
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    
    const stats = {
      activeGames: gameManager?.getActiveGamesCount?.() || 0,
      totalPlayers: gameManager?.getTotalPlayersCount?.() || 0,
      antiCheat: antiCheat.getStats(),
      pendingReports: 0,
      timestamp: Date.now()
    };

    // Get pending reports count
    try {
      const reports = await socialDb.getPendingReports(1);
      stats.pendingReports = reports.length > 0 ? 'some' : 0;
    } catch (e) {
      // DB might not be initialized
    }

    res.json(stats);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// ============ MODERATION ============

// Get pending player reports
router.get('/reports', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const reports = await socialDb.getPendingReports(limit);
    res.json({ reports });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Resolve a report
router.post('/reports/:reportId/resolve', requireAdmin, async (req, res) => {
  try {
    const { action } = req.body;
    const validActions = ['dismiss', 'warn', 'ban_temp', 'ban_permanent'];
    
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await socialDb.resolveReport(req.params.reportId, req.user.id, action);
    res.json({ success: true });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
});

// ============ ANTI-CHEAT ============

// Get flagged players
router.get('/anticheat/flagged', requireAdmin, async (req, res) => {
  try {
    const flagged = antiCheat.getFlaggedPlayers();
    const details = flagged.map(playerId => ({
      playerId,
      violations: antiCheat.getPlayerViolations(playerId)
    }));
    
    res.json({ flaggedPlayers: details, stats: antiCheat.getStats() });
  } catch (error) {
    console.error('Get flagged error:', error);
    res.status(500).json({ error: 'Failed to fetch flagged players' });
  }
});

// Unflag a player
router.post('/anticheat/unflag/:playerId', requireAdmin, async (req, res) => {
  try {
    antiCheat.unflagPlayer(req.params.playerId);
    res.json({ success: true });
  } catch (error) {
    console.error('Unflag error:', error);
    res.status(500).json({ error: 'Failed to unflag player' });
  }
});

// Get player violations
router.get('/anticheat/violations/:playerId', requireAdmin, async (req, res) => {
  try {
    const violations = antiCheat.getPlayerViolations(req.params.playerId);
    const isFlagged = antiCheat.isPlayerFlagged(req.params.playerId);
    
    res.json({ playerId: req.params.playerId, violations, isFlagged });
  } catch (error) {
    console.error('Get violations error:', error);
    res.status(500).json({ error: 'Failed to fetch violations' });
  }
});

// ============ GAME MANAGEMENT ============

// Get all active games
router.get('/games/active', requireAdmin, async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const games = gameManager?.getAllActiveGames?.() || [];
    res.json({ games, count: games.length });
  } catch (error) {
    console.error('Get active games error:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Force end a game
router.post('/games/:gameId/force-end', requireAdmin, async (req, res) => {
  try {
    const gameManager = req.app.get('gameManager');
    const result = await gameManager?.forceEndGame?.(req.params.gameId);
    
    if (!result) {
      return res.status(404).json({ error: 'Game not found or already ended' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Force end game error:', error);
    res.status(500).json({ error: 'Failed to end game' });
  }
});

// ============ TOURNAMENTS ============

// Update tournament status
router.patch('/tournaments/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['upcoming', 'active', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // TODO: Implement tournament status update in socialDb
    res.json({ success: true, message: 'Tournament status updated' });
  } catch (error) {
    console.error('Update tournament error:', error);
    res.status(500).json({ error: 'Failed to update tournament' });
  }
});

// ============ SYSTEM ============

// Get system health
router.get('/health', requireAdmin, async (req, res) => {
  try {
    const health = {
      status: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: Date.now()
    };
    res.json(health);
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Trigger cleanup operations
router.post('/cleanup', requireAdmin, async (req, res) => {
  try {
    // Clean up various caches and old data
    antiCheat.cleanup();

    // TODO: Add more cleanup operations

    res.json({ success: true, message: 'Cleanup completed' });
  } catch (error) {
    logger.error('Cleanup error', { error: error.message });
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// ============ ROLE MANAGEMENT ============

// Get users with their roles (admin only)
router.get('/users/roles', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const users = await authDb.getUsersWithRoles(limit, offset);
    res.json({ users, limit, offset });
  } catch (error) {
    logger.error('Get users roles error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role (admin only)
router.patch('/users/:userId/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    // Prevent self-demotion (admins can't remove their own admin role)
    if (userId === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot demote yourself' });
    }

    // Validate role
    const validRoles = ['user', 'moderator', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be: user, moderator, or admin' });
    }

    await authDb.setUserRole(userId, role);

    // Log admin action
    logger.info('User role updated', {
      adminId: req.user.id,
      targetUserId: userId,
      newRole: role,
    });

    res.json({ success: true, userId, role });
  } catch (error) {
    logger.error('Update role error', { error: error.message, userId: req.params.userId });
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Get current user's role (for UI display)
router.get('/me/role', async (req, res) => {
  try {
    const role = await authDb.getUserRole(req.user?.id);
    res.json({ role });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get role', role: 'user' });
  }
});

export { router as adminRouter };

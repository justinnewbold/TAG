/**
 * Privacy & Settings Routes
 * Phase 6: User privacy controls and GDPR compliance
 */

import express from 'express';

const router = express.Router();

// Default privacy settings
const DEFAULT_SETTINGS = {
  profileVisibility: 'public',
  showOnlineStatus: true,
  showLastSeen: true,
  showGameHistory: true,
  showStats: true,
  showAchievements: true,
  shareLocationWithFriends: true,
  showOnLeaderboards: true,
  showInPublicGames: true,
  allowFriendRequests: true,
  allowPartyInvites: true,
  allowDirectMessages: true,
  allowSpectators: true,
  allowAnalytics: true,
  marketingEmails: false,
};

// In-memory storage (use DB in production)
const userSettings = new Map();
const blockedUsers = new Map();
const dataExportRequests = new Map();
const deletionRequests = new Map();

// Get user settings
function getUserSettings(userId) {
  if (!userSettings.has(userId)) {
    userSettings.set(userId, { ...DEFAULT_SETTINGS });
  }
  return userSettings.get(userId);
}

// Get user blocked list
function getUserBlocked(userId) {
  if (!blockedUsers.has(userId)) {
    blockedUsers.set(userId, []);
  }
  return blockedUsers.get(userId);
}

// Get privacy settings
router.get('/privacy', async (req, res) => {
  try {
    const settings = getUserSettings(req.user.id);
    res.json(settings);
  } catch (error) {
    console.error('Failed to get privacy settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update privacy settings
router.put('/privacy', async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const currentSettings = getUserSettings(userId);
    const newSettings = { ...currentSettings };

    // Only update known settings
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (updates.hasOwnProperty(key)) {
        newSettings[key] = updates[key];
      }
    }

    userSettings.set(userId, newSettings);

    res.json({ success: true, settings: newSettings });
  } catch (error) {
    console.error('Failed to update privacy settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get blocked users
router.get('/blocked', async (req, res) => {
  try {
    const blocked = getUserBlocked(req.user.id);
    res.json({ blocked });
  } catch (error) {
    console.error('Failed to get blocked users:', error);
    res.status(500).json({ error: 'Failed to fetch blocked users' });
  }
});

// Block a user
router.post('/users/:userId/block', async (req, res) => {
  try {
    const userId = req.user.id;
    const targetId = req.params.userId;
    const { reason = 'other' } = req.body;

    if (userId === targetId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const blocked = getUserBlocked(userId);
    if (blocked.some(b => b.userId === targetId)) {
      return res.status(400).json({ error: 'User already blocked' });
    }

    blocked.push({
      userId: targetId,
      reason,
      blockedAt: Date.now(),
    });

    blockedUsers.set(userId, blocked);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to block user:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// Unblock a user
router.delete('/users/:userId/block', async (req, res) => {
  try {
    const userId = req.user.id;
    const targetId = req.params.userId;

    const blocked = getUserBlocked(userId);
    const index = blocked.findIndex(b => b.userId === targetId);

    if (index === -1) {
      return res.status(404).json({ error: 'User not blocked' });
    }

    blocked.splice(index, 1);
    blockedUsers.set(userId, blocked);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to unblock user:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// Report a user
router.post('/users/:userId/report', async (req, res) => {
  try {
    const { reason, details } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason required' });
    }

    // In production, would save to database
    console.log('User report:', {
      reporter: req.user.id,
      reported: req.params.userId,
      reason,
      details,
      timestamp: Date.now(),
    });

    res.json({ success: true, message: 'Report submitted' });
  } catch (error) {
    console.error('Failed to submit report:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// Request data export (GDPR)
router.post('/data-export', async (req, res) => {
  try {
    const userId = req.user.id;

    if (dataExportRequests.has(userId)) {
      const existing = dataExportRequests.get(userId);
      if (Date.now() - existing.requestedAt < 24 * 60 * 60 * 1000) {
        return res.status(429).json({
          error: 'Export already requested',
          estimatedCompletion: existing.estimatedCompletion,
        });
      }
    }

    const request = {
      userId,
      requestedAt: Date.now(),
      status: 'pending',
      estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    dataExportRequests.set(userId, request);

    // In production, would queue a job to generate the export

    res.json({
      success: true,
      message: 'Data export requested',
      estimatedCompletion: request.estimatedCompletion,
    });
  } catch (error) {
    console.error('Failed to request data export:', error);
    res.status(500).json({ error: 'Failed to request export' });
  }
});

// Get data export status
router.get('/data-export/status', async (req, res) => {
  try {
    const request = dataExportRequests.get(req.user.id);

    if (!request) {
      return res.json({ hasRequest: false });
    }

    res.json({
      hasRequest: true,
      ...request,
    });
  } catch (error) {
    console.error('Failed to get export status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Request account deletion (GDPR)
router.post('/delete-account', async (req, res) => {
  try {
    const userId = req.user.id;

    if (deletionRequests.has(userId)) {
      const existing = deletionRequests.get(userId);
      return res.status(400).json({
        error: 'Deletion already requested',
        scheduledDeletion: existing.scheduledDeletion,
        message: 'To cancel, contact support',
      });
    }

    const request = {
      userId,
      requestedAt: Date.now(),
      scheduledDeletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    };

    deletionRequests.set(userId, request);

    // In production, would schedule deletion and notify user

    res.json({
      success: true,
      message: 'Account deletion scheduled',
      scheduledDeletion: request.scheduledDeletion,
      cancelInfo: 'Contact support within 30 days to cancel',
    });
  } catch (error) {
    console.error('Failed to request deletion:', error);
    res.status(500).json({ error: 'Failed to request deletion' });
  }
});

// Clear location history
router.delete('/location-history', async (req, res) => {
  try {
    // In production, would clear location data from database
    console.log('Clearing location history for user:', req.user.id);

    res.json({ success: true, message: 'Location history cleared' });
  } catch (error) {
    console.error('Failed to clear location history:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

export { router as privacyRouter };

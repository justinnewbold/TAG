import express from 'express';
import { expoPushService, NotificationType } from '../services/expoPush.js';
import { pushService } from '../services/push.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Register a push token (Expo or Web)
router.post('/register', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { token, platform, deviceId } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({ error: 'Valid platform is required (ios, android, web)' });
    }

    // Handle Expo tokens (for mobile)
    if (platform === 'ios' || platform === 'android') {
      if (!expoPushService.isValidExpoPushToken(token)) {
        return res.status(400).json({ error: 'Invalid Expo push token' });
      }

      await expoPushService.registerToken(userId, token, platform, deviceId);
      logger.info('Expo push token registered', { userId, platform });

      return res.json({ success: true, message: 'Push token registered' });
    }

    // Handle Web push subscriptions
    if (platform === 'web') {
      const success = pushService.subscribe(userId, token);
      if (!success) {
        return res.status(400).json({ error: 'Failed to register web push subscription' });
      }

      logger.info('Web push subscription registered', { userId });
      return res.json({ success: true, message: 'Web push subscription registered' });
    }

  } catch (error) {
    logger.error('Error registering push token', { error: error.message });
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

// Unregister a push token
router.post('/unregister', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (platform === 'ios' || platform === 'android') {
      await expoPushService.unregisterToken(userId, token);
    } else if (platform === 'web') {
      pushService.unsubscribe(userId);
    }

    res.json({ success: true, message: 'Push token unregistered' });
  } catch (error) {
    logger.error('Error unregistering push token', { error: error.message });
    res.status(500).json({ error: 'Failed to unregister push token' });
  }
});

// Get notification preferences
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const preferences = await expoPushService.getPreferences(userId);
    res.json({ preferences });
  } catch (error) {
    logger.error('Error getting notification preferences', { error: error.message });
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Update notification preferences
router.put('/preferences', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const preferences = req.body;

    // Validate preferences
    const validKeys = ['game_invites', 'game_events', 'proximity_alerts', 'friend_activity', 'achievements', 'quiet_hours_start', 'quiet_hours_end'];
    const filteredPrefs = {};

    for (const key of validKeys) {
      if (preferences[key] !== undefined) {
        filteredPrefs[key] = preferences[key];
      }
    }

    await expoPushService.updatePreferences(userId, filteredPrefs);
    res.json({ success: true, message: 'Preferences updated' });
  } catch (error) {
    logger.error('Error updating notification preferences', { error: error.message });
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Send a test notification (development only)
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type } = req.body;

    let notification;
    switch (type) {
      case 'game_invite':
        notification = expoPushService.notifications.gameInvite('Test User', 'TEST123');
        break;
      case 'you_are_it':
        notification = expoPushService.notifications.youAreIt('Test Tagger');
        break;
      case 'game_ended':
        notification = expoPushService.notifications.gameEnded('You', 'win');
        break;
      default:
        notification = {
          title: 'Test Notification',
          body: 'This is a test notification from TAG!',
          data: { type: 'test' },
        };
    }

    const result = await expoPushService.sendToUser(userId, notification);
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Error sending test notification', { error: error.message });
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;

import express from 'express';
import { pushService } from '../services/push.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  const publicKey = pushService.getPublicKey();

  if (!publicKey) {
    return res.status(503).json({
      error: 'Push notifications not configured',
      enabled: false,
    });
  }

  res.json({
    publicKey,
    enabled: true,
  });
});

// Subscribe to push notifications
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    const success = await pushService.subscribe(req.user.id, subscription);

    if (!success) {
      return res.status(503).json({ error: 'Push notifications not available' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Push subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', async (req, res) => {
  try {
    await pushService.unsubscribe(req.user.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Push unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Test push notification (dev only)
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  try {
    const success = await pushService.sendToUser(req.user.id, {
      title: 'Test Notification',
      body: 'Push notifications are working!',
      icon: '/icons/icon-192x192.png',
    });

    res.json({ success });
  } catch (error) {
    logger.error('Push test error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export { router as pushRouter };

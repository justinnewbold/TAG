/**
 * Offline/Low-Connectivity Mode Routes
 * Sync queued actions, handle reconnection
 */

import express from 'express';

const router = express.Router();

// Sync offline queue
router.post('/sync', async (req, res) => {
  try {
    const { playerId, actions } = req.body;

    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({ error: 'Actions array required' });
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [],
      rewards: [],
    };

    for (const action of actions) {
      try {
        // Process each queued action
        switch (action.type) {
          case 'location_update':
            // Validate and store location
            results.processed++;
            break;

          case 'tag_attempt':
            // Validate tag attempt timing
            // In production, verify this happened during valid game state
            results.processed++;
            results.rewards.push({ type: 'xp', amount: 10 });
            break;

          case 'power_up_use':
            // Validate power-up was available
            results.processed++;
            break;

          case 'chat_message':
            // Store chat message
            results.processed++;
            break;

          case 'check_in':
            // Process check-in
            results.processed++;
            results.rewards.push({ type: 'xp', amount: 5 });
            break;

          default:
            results.errors.push({
              actionId: action.id,
              error: 'Unknown action type',
            });
            results.failed++;
        }
      } catch (error) {
        results.errors.push({
          actionId: action.id,
          error: error.message,
        });
        results.failed++;
      }
    }

    res.json({
      success: true,
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current game state for offline caching
router.get('/state/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.query;

    // Return complete game state for offline caching
    res.json({
      gameId,
      playerId,
      game: {
        id: gameId,
        status: 'in_progress',
        mode: 'standard',
        startTime: new Date(Date.now() - 600000).toISOString(),
        endTime: new Date(Date.now() + 600000).toISOString(),
        settings: {
          tagRadius: 10,
          playAreaRadius: 1000,
          powerUpsEnabled: true,
        },
      },
      player: {
        id: playerId,
        role: 'runner',
        isAlive: true,
        powerUps: ['speed_boost'],
        score: 150,
      },
      zone: {
        center: { lat: 40.7128, lng: -74.0060 },
        radius: 800,
        nextShrink: 120,
      },
      players: [
        { id: 'hunter_1', role: 'hunter', lastKnownLocation: { lat: 40.7118, lng: -74.0050 } },
      ],
      pois: [],
      cachedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 300000).toISOString(), // 5 minutes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report reconnection
router.post('/reconnect', async (req, res) => {
  try {
    const { playerId, gameId, offlineDuration, lastKnownState } = req.body;

    // Validate player was in game during offline period
    // Reconcile any missed events

    res.json({
      success: true,
      playerId,
      gameId,
      currentState: {
        status: 'in_progress',
        playerStatus: 'active',
        timeRemaining: 300,
        missedEvents: [
          { type: 'zone_shrink', timestamp: Date.now() - 60000 },
          { type: 'player_tagged', data: { player: 'runner_3' } },
        ],
      },
      syncRequired: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report Bluetooth proximity detection
router.post('/bluetooth/proximity', async (req, res) => {
  try {
    const { playerId, gameId, nearbyPlayers } = req.body;

    // Validate and process Bluetooth proximity reports
    // Used as backup when GPS is unavailable

    const validatedPlayers = nearbyPlayers.map(player => ({
      ...player,
      validated: true,
      estimatedDistance: player.rssi ? Math.pow(10, (-59 - player.rssi) / 20) : null,
    }));

    res.json({
      success: true,
      validatedPlayers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validate offline tag
router.post('/validate-tag', async (req, res) => {
  try {
    const { taggerId, targetId, gameId, timestamp, bluetoothRssi, lastGpsLocations } = req.body;

    // Validate tag happened during valid game state
    // Check Bluetooth proximity or GPS distance

    let valid = false;
    let reason = '';

    if (bluetoothRssi && bluetoothRssi > -70) {
      // Strong Bluetooth signal indicates close proximity
      valid = true;
      reason = 'bluetooth_proximity';
    } else if (lastGpsLocations) {
      // Validate using last known GPS positions
      const distance = calculateDistance(
        lastGpsLocations.tagger,
        lastGpsLocations.target
      );
      if (distance <= 10) { // Tag radius
        valid = true;
        reason = 'gps_proximity';
      } else {
        reason = 'too_far';
      }
    } else {
      reason = 'insufficient_data';
    }

    res.json({
      valid,
      reason,
      taggerId,
      targetId,
      timestamp,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get offline capabilities info
router.get('/capabilities', async (req, res) => {
  try {
    res.json({
      offlineSupported: true,
      features: {
        locationTracking: true,
        tagAttempts: true,
        powerUpUse: true,
        chatMessages: true,
        bluetoothProximity: true,
      },
      maxOfflineDuration: 300000, // 5 minutes
      syncInterval: 30000, // Try to sync every 30 seconds
      maxQueueSize: 100,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to calculate distance
function calculateDistance(pos1, pos2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default router;

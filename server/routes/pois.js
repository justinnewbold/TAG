/**
 * Points of Interest (POI) Routes
 * Game objectives, power-ups, safe houses
 */

import express from 'express';

const router = express.Router();

// POI Types
const POI_TYPES = {
  POWER_UP_SPAWN: { id: 'power_up_spawn', name: 'Power-Up Spawn', radius: 20 },
  XP_BOOST: { id: 'xp_boost', name: 'XP Boost Zone', radius: 50 },
  COIN_CACHE: { id: 'coin_cache', name: 'Coin Cache', radius: 15 },
  CAPTURE_POINT: { id: 'capture_point', name: 'Capture Point', radius: 30, captureTime: 30000 },
  FLAG_BASE: { id: 'flag_base', name: 'Flag Base', radius: 25 },
  CHECKPOINT: { id: 'checkpoint', name: 'Checkpoint', radius: 20 },
  SAFE_HOUSE: { id: 'safe_house', name: 'Safe House', radius: 40, cooldown: 300000 },
  HOSPITAL: { id: 'hospital', name: 'Hospital', radius: 35 },
  MYSTERY_BOX: { id: 'mystery_box', name: 'Mystery Box', radius: 10, respawnTime: 180000 },
  TELEPORTER: { id: 'teleporter', name: 'Teleporter', radius: 15, cooldown: 120000 },
  LOOKOUT_TOWER: { id: 'lookout_tower', name: 'Lookout Tower', radius: 20, duration: 30000 },
};

// Get all POIs for a game
router.get('/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    const pois = [
      {
        id: 'poi_1',
        type: 'capture_point',
        name: 'Central Plaza',
        lat: 40.7128,
        lng: -74.0060,
        radius: 30,
        status: 'available',
        capturedBy: null,
      },
      {
        id: 'poi_2',
        type: 'safe_house',
        name: 'North Shelter',
        lat: 40.7148,
        lng: -74.0080,
        radius: 40,
        status: 'available',
      },
      {
        id: 'poi_3',
        type: 'power_up_spawn',
        name: 'Power Corner',
        lat: 40.7108,
        lng: -74.0040,
        radius: 20,
        status: 'available',
        nextSpawn: Date.now() + 30000,
      },
      {
        id: 'poi_4',
        type: 'teleporter',
        name: 'Portal A',
        lat: 40.7118,
        lng: -74.0070,
        radius: 15,
        linkedTo: 'poi_5',
      },
      {
        id: 'poi_5',
        type: 'teleporter',
        name: 'Portal B',
        lat: 40.7158,
        lng: -74.0020,
        radius: 15,
        linkedTo: 'poi_4',
      },
    ];

    res.json({ pois, gameId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single POI
router.get('/:poiId', async (req, res) => {
  try {
    const { poiId } = req.params;

    res.json({
      id: poiId,
      type: 'capture_point',
      name: 'Central Plaza',
      lat: 40.7128,
      lng: -74.0060,
      radius: 30,
      status: 'contested',
      capturedBy: null,
      captureProgress: 45,
      playersInRange: ['player_1', 'player_2'],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Interact with POI
router.post('/:poiId/interact', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { playerId, playerLat, playerLng } = req.body;

    // Validate player is in range
    // In production, verify position server-side

    res.json({
      success: true,
      poiId,
      interaction: 'activated',
      reward: {
        type: 'coins',
        amount: 50,
      },
      cooldownUntil: Date.now() + 60000,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start capturing a point
router.post('/:poiId/capture/start', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { playerId, teamId } = req.body;

    res.json({
      success: true,
      poiId,
      capturingPlayer: playerId,
      capturingTeam: teamId,
      captureStartTime: Date.now(),
      captureTimeRequired: 30000, // 30 seconds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete capture
router.post('/:poiId/capture/complete', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { playerId, teamId } = req.body;

    res.json({
      success: true,
      poiId,
      capturedBy: playerId,
      capturedByTeam: teamId,
      captureTime: Date.now(),
      pointsAwarded: 100,
      poi: {
        id: poiId,
        status: 'captured',
        capturedBy: playerId,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel capture
router.post('/:poiId/capture/cancel', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { playerId } = req.body;

    res.json({
      success: true,
      poiId,
      status: 'available',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pick up flag
router.post('/:poiId/flag/pickup', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { playerId } = req.body;

    res.json({
      success: true,
      poiId,
      playerId,
      flagPickedUp: true,
      returnBase: 'poi_team_base',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Drop flag
router.post('/flag/drop', async (req, res) => {
  try {
    const { playerId, lat, lng } = req.body;

    res.json({
      success: true,
      playerId,
      location: { lat, lng },
      flagRespawnIn: 30000, // 30 seconds before auto-return
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Score flag
router.post('/flag/score', async (req, res) => {
  try {
    const { playerId, teamId } = req.body;

    res.json({
      success: true,
      playerId,
      team: teamId,
      pointsScored: 1,
      teamScore: 3,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enter safe house
router.post('/:poiId/safehouse/enter', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { playerId } = req.body;

    const maxStayTime = 60000; // 1 minute max

    res.json({
      success: true,
      poiId,
      playerId,
      immunity: true,
      expiresAt: Date.now() + maxStayTime,
      maxStay: maxStayTime,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave safe house
router.post('/:poiId/safehouse/leave', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { playerId } = req.body;

    res.json({
      success: true,
      poiId,
      playerId,
      immunity: false,
      cooldownUntil: Date.now() + 300000, // 5 minute cooldown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unlock safe house
router.post('/:poiId/safehouse/unlock', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { playerId, keyUsed } = req.body;

    res.json({
      success: true,
      poiId,
      unlockedBy: playerId,
      keyUsed,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Use teleporter
router.post('/:poiId/teleport', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { playerId } = req.body;

    res.json({
      success: true,
      from: poiId,
      destination: {
        poiId: 'poi_linked',
        lat: 40.7158,
        lng: -74.0020,
      },
      cooldownUntil: Date.now() + 120000, // 2 minute cooldown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Use lookout tower
router.post('/:poiId/lookout', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { playerId } = req.body;

    res.json({
      success: true,
      poiId,
      playerId,
      revealedPlayers: [
        { id: 'p1', lat: 40.7128, lng: -74.0060, role: 'hunter' },
        { id: 'p2', lat: 40.7138, lng: -74.0070, role: 'runner' },
      ],
      duration: 30000,
      expiresAt: Date.now() + 30000,
      cooldownUntil: Date.now() + 180000,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Open mystery box
router.post('/:poiId/mystery', async (req, res) => {
  try {
    const { poiId } = req.params;
    const { playerId } = req.body;

    // Random reward
    const rewards = [
      { type: 'coins', amount: 100 },
      { type: 'powerup', item: 'speed_boost' },
      { type: 'xp', amount: 50 },
      { type: 'cosmetic', item: 'mystery_trail' },
    ];

    const reward = rewards[Math.floor(Math.random() * rewards.length)];

    res.json({
      success: true,
      poiId,
      playerId,
      reward,
      nextSpawn: Date.now() + 180000, // 3 minutes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get POI types info
router.get('/types/all', async (req, res) => {
  try {
    res.json({ types: POI_TYPES });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

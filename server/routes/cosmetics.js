/**
 * Cosmetics Routes
 * Phase 5: Cosmetics and customization API
 */

import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Cosmetic catalog
const COSMETICS_CATALOG = [
  // Avatar Frames
  { id: 'frame_fire', type: 'avatar_frame', name: 'Fire Frame', rarity: 'rare', price: 500 },
  { id: 'frame_ice', type: 'avatar_frame', name: 'Ice Frame', rarity: 'rare', price: 500 },
  { id: 'frame_gold', type: 'avatar_frame', name: 'Golden Frame', rarity: 'epic', price: 1000 },
  { id: 'frame_champion', type: 'avatar_frame', name: 'Champion Frame', rarity: 'legendary', unlockCondition: 'Win 100 games' },

  // Trails
  { id: 'trail_sparkle', type: 'trail', name: 'Sparkle Trail', rarity: 'uncommon', price: 200 },
  { id: 'trail_rainbow', type: 'trail', name: 'Rainbow Trail', rarity: 'rare', price: 750 },
  { id: 'trail_lightning', type: 'trail', name: 'Lightning Trail', rarity: 'epic', price: 1500 },

  // Tag Effects
  { id: 'tag_explosion', type: 'tag_effect', name: 'Explosion', rarity: 'uncommon', price: 300 },
  { id: 'tag_confetti', type: 'tag_effect', name: 'Confetti', rarity: 'rare', price: 600 },

  // Name Colors
  { id: 'name_cyan', type: 'name_color', name: 'Neon Cyan', rarity: 'common', price: 100, value: '#00FFFF' },
  { id: 'name_purple', type: 'name_color', name: 'Neon Purple', rarity: 'common', price: 100, value: '#FF00FF' },
];

// In-memory storage (use DB in production)
const userCosmetics = new Map();
const userCoins = new Map();

// Get default coins for new users
function getUserCoins(userId) {
  if (!userCoins.has(userId)) {
    userCoins.set(userId, 100); // Starting coins
  }
  return userCoins.get(userId);
}

// Get user cosmetics
function getUserCosmeticsData(userId) {
  if (!userCosmetics.has(userId)) {
    userCosmetics.set(userId, {
      owned: [],
      equipped: {
        avatar_frame: 'default',
        trail: 'none',
        tag_effect: 'default',
        name_color: '#FFFFFF',
      },
    });
  }
  return userCosmetics.get(userId);
}

// Get cosmetics catalog
router.get('/catalog', async (req, res) => {
  try {
    res.json(COSMETICS_CATALOG);
  } catch (error) {
    logger.error('Failed to get catalog', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch catalog' });
  }
});

// Get user's cosmetics
router.get('/user', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = getUserCosmeticsData(userId);
    const coins = getUserCoins(userId);

    res.json({
      owned: data.owned,
      equipped: data.equipped,
      coins,
    });
  } catch (error) {
    logger.error('Failed to get user cosmetics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch cosmetics' });
  }
});

// Purchase a cosmetic
router.post('/:cosmeticId/purchase', async (req, res) => {
  try {
    const userId = req.user.id;
    const { cosmeticId } = req.params;

    const cosmetic = COSMETICS_CATALOG.find(c => c.id === cosmeticId);
    if (!cosmetic) {
      return res.status(404).json({ error: 'Cosmetic not found' });
    }

    if (!cosmetic.price) {
      return res.status(400).json({ error: 'This cosmetic cannot be purchased' });
    }

    const coins = getUserCoins(userId);
    if (coins < cosmetic.price) {
      return res.status(400).json({ error: 'Insufficient coins' });
    }

    const data = getUserCosmeticsData(userId);
    if (data.owned.includes(cosmeticId)) {
      return res.status(400).json({ error: 'Already owned' });
    }

    // Deduct coins and add cosmetic
    userCoins.set(userId, coins - cosmetic.price);
    data.owned.push(cosmeticId);
    userCosmetics.set(userId, data);

    res.json({
      success: true,
      remainingCoins: coins - cosmetic.price,
    });
  } catch (error) {
    logger.error('Failed to purchase cosmetic', { error: error.message });
    res.status(500).json({ error: 'Failed to purchase' });
  }
});

// Equip a cosmetic
router.post('/equip', async (req, res) => {
  try {
    const userId = req.user.id;
    const { cosmeticId, type } = req.body;

    const data = getUserCosmeticsData(userId);

    // Check ownership (allow default/none)
    if (cosmeticId !== 'default' && cosmeticId !== 'none' && !data.owned.includes(cosmeticId)) {
      return res.status(400).json({ error: 'Cosmetic not owned' });
    }

    // Validate type
    if (!data.equipped.hasOwnProperty(type)) {
      return res.status(400).json({ error: 'Invalid cosmetic type' });
    }

    data.equipped[type] = cosmeticId;
    userCosmetics.set(userId, data);

    res.json({ success: true, equipped: data.equipped });
  } catch (error) {
    logger.error('Failed to equip cosmetic', { error: error.message });
    res.status(500).json({ error: 'Failed to equip' });
  }
});

// Unlock a cosmetic (from achievement, event, etc.)
router.post('/:cosmeticId/unlock', async (req, res) => {
  try {
    const userId = req.user.id;
    const { cosmeticId } = req.params;
    const { source } = req.body;

    const cosmetic = COSMETICS_CATALOG.find(c => c.id === cosmeticId);
    if (!cosmetic) {
      return res.status(404).json({ error: 'Cosmetic not found' });
    }

    const data = getUserCosmeticsData(userId);
    if (data.owned.includes(cosmeticId)) {
      return res.status(400).json({ error: 'Already owned' });
    }

    data.owned.push(cosmeticId);
    userCosmetics.set(userId, data);

    res.json({ success: true, unlockedFrom: source });
  } catch (error) {
    logger.error('Failed to unlock cosmetic', { error: error.message });
    res.status(500).json({ error: 'Failed to unlock' });
  }
});

export { router as cosmeticsRouter };

import express from 'express';
import { logger } from '../utils/logger.js';
import { HOME_BASE_CONFIG } from '../../shared/constants.js';

const router = express.Router();

// Get user's home base
router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const userId = req.user.id;

    let base;
    if (isPostgres) {
      const result = await db.query(`SELECT * FROM home_bases WHERE user_id = $1`, [userId]);
      base = result.rows[0] || null;
    } else {
      base = db.prepare(`SELECT * FROM home_bases WHERE user_id = ?`).get(userId) || null;
    }

    if (base && base.upgrades) {
      try {
        base.upgrades = typeof base.upgrades === 'string' ? JSON.parse(base.upgrades) : base.upgrades;
      } catch { base.upgrades = {}; }
    }

    // Get visitor log
    let visitors = [];
    if (base) {
      if (isPostgres) {
        const result = await db.query(`
          SELECT bv.*, u.name, u.avatar FROM base_visitors bv
          JOIN users u ON bv.visitor_id = u.id
          WHERE bv.base_id = $1
          ORDER BY bv.visited_at DESC LIMIT 20
        `, [base.id]);
        visitors = result.rows;
      } else {
        visitors = db.prepare(`
          SELECT bv.*, u.name, u.avatar FROM base_visitors bv
          JOIN users u ON bv.visitor_id = u.id
          WHERE bv.base_id = ?
          ORDER BY bv.visited_at DESC LIMIT 20
        `).all(base.id);
      }
    }

    res.json({ base, visitors });
  } catch (error) {
    logger.error('Get home base error', { error: error.message });
    res.status(500).json({ error: 'Failed to get home base' });
  }
});

// Get another player's home base
router.get('/:userId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { userId } = req.params;

    let base;
    if (isPostgres) {
      const result = await db.query(`
        SELECT hb.*, u.name as owner_name, u.avatar as owner_avatar
        FROM home_bases hb JOIN users u ON hb.user_id = u.id WHERE hb.user_id = $1
      `, [userId]);
      base = result.rows[0] || null;
    } else {
      base = db.prepare(`
        SELECT hb.*, u.name as owner_name, u.avatar as owner_avatar
        FROM home_bases hb JOIN users u ON hb.user_id = u.id WHERE hb.user_id = ?
      `).get(userId) || null;
    }

    if (base && base.upgrades) {
      try {
        base.upgrades = typeof base.upgrades === 'string' ? JSON.parse(base.upgrades) : base.upgrades;
      } catch { base.upgrades = {}; }
    }

    // Log visit
    if (base && req.user.id !== userId) {
      const visitId = `visit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const now = Date.now();
      if (isPostgres) {
        await db.query(`
          INSERT INTO base_visitors (id, base_id, visitor_id, visited_at)
          VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING
        `, [visitId, base.id, req.user.id, now]);
      } else {
        try {
          db.prepare(`
            INSERT INTO base_visitors (id, base_id, visitor_id, visited_at) VALUES (?, ?, ?, ?)
          `).run(visitId, base.id, req.user.id, now);
        } catch { /* duplicate visitor, ignore */ }
      }
    }

    res.json({ base });
  } catch (error) {
    logger.error('Get player base error', { error: error.message });
    res.status(500).json({ error: 'Failed to get base' });
  }
});

// Claim or relocate home base
router.post('/claim', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { lat, lng, name } = req.body;
    const userId = req.user.id;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location required' });
    }

    const now = Date.now();

    // Check if user already has a base
    let existing;
    if (isPostgres) {
      const result = await db.query(`SELECT * FROM home_bases WHERE user_id = $1`, [userId]);
      existing = result.rows[0];
    } else {
      existing = db.prepare(`SELECT * FROM home_bases WHERE user_id = ?`).get(userId);
    }

    if (existing) {
      // Check cooldown
      if (existing.claimed_at && (now - existing.claimed_at) < HOME_BASE_CONFIG.CLAIM_COOLDOWN) {
        const remaining = HOME_BASE_CONFIG.CLAIM_COOLDOWN - (now - existing.claimed_at);
        return res.status(400).json({
          error: `Can relocate in ${Math.ceil(remaining / 3600000)} hours`
        });
      }

      // Relocate
      if (isPostgres) {
        await db.query(`
          UPDATE home_bases SET lat = $1, lng = $2, name = $3, claimed_at = $4 WHERE user_id = $5
        `, [lat, lng, name || 'My Base', now, userId]);
      } else {
        db.prepare(`
          UPDATE home_bases SET lat = ?, lng = ?, name = ?, claimed_at = ? WHERE user_id = ?
        `).run(lat, lng, name || 'My Base', now, userId);
      }

      return res.json({ base: { ...existing, lat, lng, name: name || 'My Base', claimed_at: now }, relocated: true });
    }

    // Create new base
    const id = `base_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const defaultUpgrades = JSON.stringify({
      safe_zone: 0,
      radar_tower: 0,
      trap_layer: 0,
      income: 0,
    });

    if (isPostgres) {
      await db.query(`
        INSERT INTO home_bases (id, user_id, lat, lng, name, level, upgrades, claimed_at, created_at)
        VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $7)
      `, [id, userId, lat, lng, name || 'My Base', defaultUpgrades, now]);
    } else {
      db.prepare(`
        INSERT INTO home_bases (id, user_id, lat, lng, name, level, upgrades, claimed_at, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).run(id, userId, lat, lng, name || 'My Base', defaultUpgrades, now, now);
    }

    res.status(201).json({
      base: { id, user_id: userId, lat, lng, name: name || 'My Base', level: 1, upgrades: JSON.parse(defaultUpgrades), claimed_at: now },
      created: true
    });
  } catch (error) {
    logger.error('Claim base error', { error: error.message });
    res.status(500).json({ error: 'Failed to claim base' });
  }
});

// Upgrade home base
router.post('/upgrade', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { upgradeId } = req.body;
    const userId = req.user.id;

    const upgradeConfig = HOME_BASE_CONFIG.UPGRADES[upgradeId.toUpperCase()];
    if (!upgradeConfig) {
      return res.status(400).json({ error: 'Invalid upgrade' });
    }

    let base;
    if (isPostgres) {
      const result = await db.query(`SELECT * FROM home_bases WHERE user_id = $1`, [userId]);
      base = result.rows[0];
    } else {
      base = db.prepare(`SELECT * FROM home_bases WHERE user_id = ?`).get(userId);
    }

    if (!base) return res.status(404).json({ error: 'No home base found' });

    let upgrades = {};
    try {
      upgrades = typeof base.upgrades === 'string' ? JSON.parse(base.upgrades) : base.upgrades;
    } catch { upgrades = {}; }

    const currentLevel = upgrades[upgradeId] || 0;
    if (currentLevel >= upgradeConfig.levels.length - 1) {
      return res.status(400).json({ error: 'Already at max level' });
    }

    const cost = upgradeConfig.costs[currentLevel + 1];
    upgrades[upgradeId] = currentLevel + 1;

    // Calculate overall base level
    const totalUpgrades = Object.values(upgrades).reduce((sum, l) => sum + l, 0);
    const baseLevel = Math.min(Math.floor(totalUpgrades / 2) + 1, HOME_BASE_CONFIG.MAX_LEVEL);

    if (isPostgres) {
      await db.query(`
        UPDATE home_bases SET upgrades = $1, level = $2 WHERE user_id = $3
      `, [JSON.stringify(upgrades), baseLevel, userId]);
    } else {
      db.prepare(`
        UPDATE home_bases SET upgrades = ?, level = ? WHERE user_id = ?
      `).run(JSON.stringify(upgrades), baseLevel, userId);
    }

    res.json({ upgrades, baseLevel, cost, upgradeId, newLevel: currentLevel + 1 });
  } catch (error) {
    logger.error('Upgrade base error', { error: error.message });
    res.status(500).json({ error: 'Failed to upgrade base' });
  }
});

export default router;

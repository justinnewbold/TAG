import express from 'express';
import { logger } from '../utils/logger.js';
import { PRESTIGE_CONFIG } from '../../shared/constants.js';

const router = express.Router();

// Get prestige info for the current user
router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const userId = req.user.id;

    let prestige;
    if (isPostgres) {
      const result = await db.query(`SELECT * FROM prestige_records WHERE user_id = $1`, [userId]);
      prestige = result.rows[0] || null;
    } else {
      prestige = db.prepare(`SELECT * FROM prestige_records WHERE user_id = ?`).get(userId) || null;
    }

    if (!prestige) {
      prestige = {
        user_id: userId,
        prestige_level: 0,
        total_prestiges: 0,
        current_xp: 0,
        current_level: 1,
        lifetime_xp: 0,
      };
    }

    const prestigeName = prestige.prestige_level > 0 ? PRESTIGE_CONFIG.PRESTIGE_NAMES[prestige.prestige_level - 1] : 'Unranked';
    const prestigeColor = prestige.prestige_level > 0 ? PRESTIGE_CONFIG.PRESTIGE_COLORS[prestige.prestige_level - 1] : 'gray-400';
    const xpMultiplier = 1 + (prestige.prestige_level * PRESTIGE_CONFIG.XP_MULTIPLIER_PER_PRESTIGE);
    const canPrestige = prestige.current_level >= PRESTIGE_CONFIG.MAX_LEVEL && prestige.prestige_level < PRESTIGE_CONFIG.MAX_PRESTIGE;
    const nextReward = canPrestige ? PRESTIGE_CONFIG.REWARDS[prestige.prestige_level + 1] : null;

    res.json({
      prestige: {
        ...prestige,
        prestigeName,
        prestigeColor,
        xpMultiplier,
        canPrestige,
        nextReward,
        maxPrestige: PRESTIGE_CONFIG.MAX_PRESTIGE,
        maxLevel: PRESTIGE_CONFIG.MAX_LEVEL,
      }
    });
  } catch (error) {
    logger.error('Get prestige error', { error: error.message });
    res.status(500).json({ error: 'Failed to get prestige info' });
  }
});

// Perform prestige (reset level, gain prestige)
router.post('/prestige', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const userId = req.user.id;

    let prestige;
    if (isPostgres) {
      const result = await db.query(`SELECT * FROM prestige_records WHERE user_id = $1`, [userId]);
      prestige = result.rows[0];
    } else {
      prestige = db.prepare(`SELECT * FROM prestige_records WHERE user_id = ?`).get(userId);
    }

    if (!prestige) {
      return res.status(400).json({ error: 'No prestige record found. Play some games first!' });
    }

    if (prestige.current_level < PRESTIGE_CONFIG.MAX_LEVEL) {
      return res.status(400).json({ error: `Must be level ${PRESTIGE_CONFIG.MAX_LEVEL} to prestige` });
    }

    if (prestige.prestige_level >= PRESTIGE_CONFIG.MAX_PRESTIGE) {
      return res.status(400).json({ error: 'Already at maximum prestige' });
    }

    const newPrestigeLevel = prestige.prestige_level + 1;
    const reward = PRESTIGE_CONFIG.REWARDS[newPrestigeLevel];
    const now = Date.now();

    if (isPostgres) {
      await db.query(`
        UPDATE prestige_records SET
          prestige_level = $1, current_level = 1, current_xp = 0,
          total_prestiges = total_prestiges + 1, last_prestige_at = $2
        WHERE user_id = $3
      `, [newPrestigeLevel, now, userId]);
    } else {
      db.prepare(`
        UPDATE prestige_records SET
          prestige_level = ?, current_level = 1, current_xp = 0,
          total_prestiges = total_prestiges + 1, last_prestige_at = ?
        WHERE user_id = ?
      `).run(newPrestigeLevel, now, userId);
    }

    // Emit prestige event
    const io = req.app.get('io');
    if (io) {
      io.emit('playerPrestiged', {
        userId,
        prestigeLevel: newPrestigeLevel,
        prestigeName: PRESTIGE_CONFIG.PRESTIGE_NAMES[newPrestigeLevel - 1],
        reward,
      });
    }

    res.json({
      success: true,
      newPrestigeLevel,
      prestigeName: PRESTIGE_CONFIG.PRESTIGE_NAMES[newPrestigeLevel - 1],
      reward,
      xpMultiplier: 1 + (newPrestigeLevel * PRESTIGE_CONFIG.XP_MULTIPLIER_PER_PRESTIGE),
    });
  } catch (error) {
    logger.error('Prestige error', { error: error.message });
    res.status(500).json({ error: 'Failed to prestige' });
  }
});

// Add XP (called after games)
router.post('/xp', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid XP amount' });
    }

    let prestige;
    if (isPostgres) {
      const result = await db.query(`SELECT * FROM prestige_records WHERE user_id = $1`, [userId]);
      prestige = result.rows[0];
    } else {
      prestige = db.prepare(`SELECT * FROM prestige_records WHERE user_id = ?`).get(userId);
    }

    const now = Date.now();
    if (!prestige) {
      // Create initial record
      if (isPostgres) {
        await db.query(`
          INSERT INTO prestige_records (user_id, prestige_level, current_level, current_xp, lifetime_xp, total_prestiges, created_at)
          VALUES ($1, 0, 1, $2, $2, 0, $3)
        `, [userId, amount, now]);
      } else {
        db.prepare(`
          INSERT INTO prestige_records (user_id, prestige_level, current_level, current_xp, lifetime_xp, total_prestiges, created_at)
          VALUES (?, 0, 1, ?, ?, 0, ?)
        `).run(userId, amount, amount, now);
      }
      return res.json({ currentLevel: 1, currentXp: amount, leveledUp: false });
    }

    // Apply prestige XP multiplier
    const multiplier = 1 + (prestige.prestige_level * PRESTIGE_CONFIG.XP_MULTIPLIER_PER_PRESTIGE);
    const adjustedAmount = Math.floor(amount * multiplier);

    let newXp = prestige.current_xp + adjustedAmount;
    let newLevel = prestige.current_level;
    let leveledUp = false;

    // XP per level: 100 * level (level 1 = 100, level 50 = 5000, level 100 = 10000)
    while (newLevel < PRESTIGE_CONFIG.MAX_LEVEL) {
      const xpNeeded = newLevel * 100;
      if (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        newLevel++;
        leveledUp = true;
      } else {
        break;
      }
    }

    if (isPostgres) {
      await db.query(`
        UPDATE prestige_records SET current_xp = $1, current_level = $2, lifetime_xp = lifetime_xp + $3
        WHERE user_id = $4
      `, [newXp, newLevel, adjustedAmount, userId]);
    } else {
      db.prepare(`
        UPDATE prestige_records SET current_xp = ?, current_level = ?, lifetime_xp = lifetime_xp + ?
        WHERE user_id = ?
      `).run(newXp, newLevel, adjustedAmount, userId);
    }

    res.json({ currentLevel: newLevel, currentXp: newXp, leveledUp, xpGained: adjustedAmount, multiplier });
  } catch (error) {
    logger.error('Add XP error', { error: error.message });
    res.status(500).json({ error: 'Failed to add XP' });
  }
});

// Get prestige leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');

    let leaders;
    if (isPostgres) {
      const result = await db.query(`
        SELECT pr.*, u.name, u.avatar
        FROM prestige_records pr
        JOIN users u ON pr.user_id = u.id
        ORDER BY pr.prestige_level DESC, pr.current_level DESC, pr.lifetime_xp DESC
        LIMIT 25
      `);
      leaders = result.rows;
    } else {
      leaders = db.prepare(`
        SELECT pr.*, u.name, u.avatar
        FROM prestige_records pr
        JOIN users u ON pr.user_id = u.id
        ORDER BY pr.prestige_level DESC, pr.current_level DESC, pr.lifetime_xp DESC
        LIMIT 25
      `).all();
    }

    res.json({ leaders });
  } catch (error) {
    logger.error('Get prestige leaderboard error', { error: error.message });
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

export default router;

import express from 'express';
import { logger } from '../utils/logger.js';
import { CONTRACT_CONFIG } from '../../shared/constants.js';

const router = express.Router();

const CONTRACT_TEMPLATES = [
  { type: 'tag_count', title: 'Tag Frenzy', desc: 'Tag {count} players in a single game', difficulty: 'EASY', params: { count: 3 } },
  { type: 'tag_count', title: 'Tag Rampage', desc: 'Tag {count} players in a single game', difficulty: 'MEDIUM', params: { count: 5 } },
  { type: 'tag_count', title: 'Unstoppable', desc: 'Tag {count} players in a single game', difficulty: 'HARD', params: { count: 8 } },
  { type: 'survive_time', title: 'Survivor', desc: 'Survive for {minutes} minutes without being tagged', difficulty: 'EASY', params: { minutes: 3 } },
  { type: 'survive_time', title: 'Ghost', desc: 'Survive for {minutes} minutes without being tagged', difficulty: 'MEDIUM', params: { minutes: 7 } },
  { type: 'survive_time', title: 'Untouchable', desc: 'Survive for {minutes} minutes in a single game', difficulty: 'HARD', params: { minutes: 15 } },
  { type: 'win_streak', title: 'On a Roll', desc: 'Win {count} games in a row', difficulty: 'MEDIUM', params: { count: 2 } },
  { type: 'win_streak', title: 'Domination', desc: 'Win {count} games in a row', difficulty: 'HARD', params: { count: 3 } },
  { type: 'win_streak', title: 'Legendary Run', desc: 'Win {count} games in a row', difficulty: 'LEGENDARY', params: { count: 5 } },
  { type: 'speed_tag', title: 'Quick Draw', desc: 'Tag someone within {seconds} seconds of becoming IT', difficulty: 'EASY', params: { seconds: 60 } },
  { type: 'speed_tag', title: 'Lightning Strike', desc: 'Tag someone within {seconds} seconds of becoming IT', difficulty: 'MEDIUM', params: { seconds: 30 } },
  { type: 'speed_tag', title: 'Instant Kill', desc: 'Tag someone within {seconds} seconds of becoming IT', difficulty: 'HARD', params: { seconds: 15 } },
  { type: 'tag_bounty', title: 'Bounty Hunter', desc: 'Tag a player who has an active bounty', difficulty: 'MEDIUM', params: {} },
  { type: 'tag_bounty', title: 'Big Game Hunter', desc: 'Collect a bounty worth {amount}+ coins', difficulty: 'HARD', params: { amount: 500 } },
  { type: 'zone_control', title: 'Land Grab', desc: 'Capture {count} turf zones', difficulty: 'EASY', params: { count: 1 } },
  { type: 'zone_control', title: 'Conqueror', desc: 'Capture {count} turf zones', difficulty: 'MEDIUM', params: { count: 3 } },
  { type: 'heist_complete', title: 'The Heist', desc: 'Successfully extract in a Heist game', difficulty: 'HARD', params: {} },
];

function generateDailyContracts(userId) {
  // Deterministic seed based on user + day
  const day = Math.floor(Date.now() / 86400000);
  const seed = hashCode(`${userId}_${day}`);
  const rng = seedRandom(seed);

  const shuffled = [...CONTRACT_TEMPLATES].sort(() => rng() - 0.5);
  return shuffled.slice(0, 3).map((template, i) => {
    const diff = CONTRACT_CONFIG.DIFFICULTIES[template.difficulty];
    return {
      id: `contract_${day}_${userId}_${i}`,
      ...template,
      xpReward: diff.xpReward,
      coinReward: diff.coinReward,
      color: diff.color,
      difficultyName: diff.name,
      expiresAt: (day + 1) * 86400000,
      progress: 0,
      completed: false,
    };
  });
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seedRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Get current contracts for the user
router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const userId = req.user.id;

    // Get completion status from DB
    let completions;
    if (isPostgres) {
      const result = await db.query(
        `SELECT contract_id, progress, completed_at FROM contract_completions WHERE user_id = $1 AND expires_at > $2`,
        [userId, Date.now()]
      );
      completions = result.rows;
    } else {
      completions = db.prepare(
        `SELECT contract_id, progress, completed_at FROM contract_completions WHERE user_id = ? AND expires_at > ?`
      ).all(userId, Date.now());
    }

    const completionMap = {};
    completions.forEach(c => { completionMap[c.contract_id] = c; });

    const contracts = generateDailyContracts(userId).map(contract => ({
      ...contract,
      progress: completionMap[contract.id]?.progress || 0,
      completed: !!completionMap[contract.id]?.completed_at,
      completedAt: completionMap[contract.id]?.completed_at || null,
    }));

    // Get total stats
    let totalCompleted;
    if (isPostgres) {
      const result = await db.query(
        `SELECT COUNT(*) as total FROM contract_completions WHERE user_id = $1 AND completed_at IS NOT NULL`,
        [userId]
      );
      totalCompleted = parseInt(result.rows[0].total);
    } else {
      totalCompleted = db.prepare(
        `SELECT COUNT(*) as total FROM contract_completions WHERE user_id = ? AND completed_at IS NOT NULL`
      ).get(userId).total;
    }

    res.json({ contracts, totalCompleted });
  } catch (error) {
    logger.error('Get contracts error', { error: error.message });
    res.status(500).json({ error: 'Failed to get contracts' });
  }
});

// Update contract progress
router.post('/:contractId/progress', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { contractId } = req.params;
    const { progress, completed } = req.body;
    const userId = req.user.id;
    const now = Date.now();
    const expiresAt = (Math.floor(now / 86400000) + 1) * 86400000;

    if (isPostgres) {
      await db.query(`
        INSERT INTO contract_completions (user_id, contract_id, progress, completed_at, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, contract_id)
        DO UPDATE SET progress = $3, completed_at = COALESCE(contract_completions.completed_at, $4)
      `, [userId, contractId, progress, completed ? now : null, expiresAt]);
    } else {
      const existing = db.prepare(
        `SELECT * FROM contract_completions WHERE user_id = ? AND contract_id = ?`
      ).get(userId, contractId);

      if (existing) {
        db.prepare(`
          UPDATE contract_completions SET progress = ?, completed_at = COALESCE(completed_at, ?)
          WHERE user_id = ? AND contract_id = ?
        `).run(progress, completed ? now : null, userId, contractId);
      } else {
        db.prepare(`
          INSERT INTO contract_completions (user_id, contract_id, progress, completed_at, expires_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, contractId, progress, completed ? now : null, expiresAt);
      }
    }

    if (completed) {
      const io = req.app.get('io');
      if (io) {
        io.emit('contractCompleted', { userId, contractId });
      }
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Update contract progress error', { error: error.message });
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

export default router;

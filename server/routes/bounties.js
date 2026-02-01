import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get all active bounties
router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');

    let bounties;
    if (isPostgres) {
      const result = await db.query(`
        SELECT b.*, u.name as placer_name, u.avatar as placer_avatar,
               t.name as target_name, t.avatar as target_avatar
        FROM bounties b
        JOIN users u ON b.placer_id = u.id
        JOIN users t ON b.target_id = t.id
        WHERE b.status = 'active' AND b.expires_at > $1
        ORDER BY b.amount DESC
        LIMIT 50
      `, [Date.now()]);
      bounties = result.rows;
    } else {
      bounties = db.prepare(`
        SELECT b.*, u.name as placer_name, u.avatar as placer_avatar,
               t.name as target_name, t.avatar as target_avatar
        FROM bounties b
        JOIN users u ON b.placer_id = u.id
        JOIN users t ON b.target_id = t.id
        WHERE b.status = 'active' AND b.expires_at > ?
        ORDER BY b.amount DESC
        LIMIT 50
      `).all(Date.now());
    }

    res.json({ bounties });
  } catch (error) {
    logger.error('Get bounties error', { error: error.message });
    res.status(500).json({ error: 'Failed to get bounties' });
  }
});

// Get bounties on a specific player
router.get('/target/:userId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { userId } = req.params;

    let bounties;
    if (isPostgres) {
      const result = await db.query(`
        SELECT b.*, u.name as placer_name, u.avatar as placer_avatar
        FROM bounties b
        JOIN users u ON b.placer_id = u.id
        WHERE b.target_id = $1 AND b.status = 'active' AND b.expires_at > $2
        ORDER BY b.amount DESC
      `, [userId, Date.now()]);
      bounties = result.rows;
    } else {
      bounties = db.prepare(`
        SELECT b.*, u.name as placer_name, u.avatar as placer_avatar
        FROM bounties b
        JOIN users u ON b.placer_id = u.id
        WHERE b.target_id = ? AND b.status = 'active' AND b.expires_at > ?
        ORDER BY b.amount DESC
      `).all(userId, Date.now());
    }

    const totalBounty = bounties.reduce((sum, b) => sum + b.amount, 0);
    res.json({ bounties, totalBounty });
  } catch (error) {
    logger.error('Get target bounties error', { error: error.message });
    res.status(500).json({ error: 'Failed to get bounties' });
  }
});

// Place a bounty
router.post('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { targetId, amount, reason } = req.body;
    const placerId = req.user.id;

    if (!targetId || !amount) {
      return res.status(400).json({ error: 'Target and amount required' });
    }

    if (targetId === placerId) {
      return res.status(400).json({ error: 'Cannot place bounty on yourself' });
    }

    if (amount < 50 || amount > 10000) {
      return res.status(400).json({ error: 'Bounty must be between 50 and 10,000 coins' });
    }

    const id = `bounty_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const expiresAt = now + (48 * 60 * 60 * 1000); // 48 hours

    if (isPostgres) {
      // Check active bounty count
      const countResult = await db.query(
        `SELECT COUNT(*) as cnt FROM bounties WHERE placer_id = $1 AND status = 'active'`,
        [placerId]
      );
      if (parseInt(countResult.rows[0].cnt) >= 5) {
        return res.status(400).json({ error: 'Maximum 5 active bounties allowed' });
      }

      await db.query(`
        INSERT INTO bounties (id, placer_id, target_id, amount, reason, status, created_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
      `, [id, placerId, targetId, amount, reason || null, now, expiresAt]);
    } else {
      const count = db.prepare(
        `SELECT COUNT(*) as cnt FROM bounties WHERE placer_id = ? AND status = 'active'`
      ).get(placerId);
      if (count.cnt >= 5) {
        return res.status(400).json({ error: 'Maximum 5 active bounties allowed' });
      }

      db.prepare(`
        INSERT INTO bounties (id, placer_id, target_id, amount, reason, status, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(id, placerId, targetId, amount, reason || null, now, expiresAt);
    }

    // Emit bounty event via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('bountyPlaced', { id, placerId, targetId, amount, reason });
    }

    res.status(201).json({ bounty: { id, placerId, targetId, amount, reason, status: 'active', createdAt: now, expiresAt } });
  } catch (error) {
    logger.error('Place bounty error', { error: error.message });
    res.status(500).json({ error: 'Failed to place bounty' });
  }
});

// Claim a bounty (called when someone tags a bounty target)
router.post('/claim/:bountyId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { bountyId } = req.params;
    const claimerId = req.user.id;

    if (isPostgres) {
      const bountyResult = await db.query(
        `SELECT * FROM bounties WHERE id = $1 AND status = 'active'`, [bountyId]
      );
      if (bountyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Bounty not found or already claimed' });
      }
      const bounty = bountyResult.rows[0];

      await db.query(`
        UPDATE bounties SET status = 'claimed', claimed_by = $1, claimed_at = $2 WHERE id = $3
      `, [claimerId, Date.now(), bountyId]);

      res.json({ bounty: { ...bounty, status: 'claimed', claimed_by: claimerId }, reward: bounty.amount });
    } else {
      const bounty = db.prepare(
        `SELECT * FROM bounties WHERE id = ? AND status = 'active'`
      ).get(bountyId);
      if (!bounty) {
        return res.status(404).json({ error: 'Bounty not found or already claimed' });
      }

      db.prepare(`
        UPDATE bounties SET status = 'claimed', claimed_by = ?, claimed_at = ? WHERE id = ?
      `).run(claimerId, Date.now(), bountyId);

      res.json({ bounty: { ...bounty, status: 'claimed', claimed_by: claimerId }, reward: bounty.amount });
    }

    // Emit bounty claimed event
    const io = req.app.get('io');
    if (io) {
      io.emit('bountyClaimed', { bountyId, claimerId });
    }
  } catch (error) {
    logger.error('Claim bounty error', { error: error.message });
    res.status(500).json({ error: 'Failed to claim bounty' });
  }
});

// Cancel a bounty (only placer can cancel)
router.delete('/:bountyId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { bountyId } = req.params;

    if (isPostgres) {
      const result = await db.query(
        `UPDATE bounties SET status = 'cancelled' WHERE id = $1 AND placer_id = $2 AND status = 'active' RETURNING *`,
        [bountyId, req.user.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Bounty not found or not yours' });
      }
      res.json({ success: true });
    } else {
      const result = db.prepare(
        `UPDATE bounties SET status = 'cancelled' WHERE id = ? AND placer_id = ? AND status = 'active'`
      ).run(bountyId, req.user.id);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Bounty not found or not yours' });
      }
      res.json({ success: true });
    }
  } catch (error) {
    logger.error('Cancel bounty error', { error: error.message });
    res.status(500).json({ error: 'Failed to cancel bounty' });
  }
});

// Get leaderboard of bounty hunters
router.get('/leaderboard', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');

    let leaders;
    if (isPostgres) {
      const result = await db.query(`
        SELECT claimed_by as user_id, u.name, u.avatar,
               COUNT(*) as bounties_claimed,
               SUM(amount) as total_earned
        FROM bounties b
        JOIN users u ON b.claimed_by = u.id
        WHERE b.status = 'claimed'
        GROUP BY claimed_by, u.name, u.avatar
        ORDER BY total_earned DESC
        LIMIT 25
      `);
      leaders = result.rows;
    } else {
      leaders = db.prepare(`
        SELECT claimed_by as user_id, u.name, u.avatar,
               COUNT(*) as bounties_claimed,
               SUM(amount) as total_earned
        FROM bounties b
        JOIN users u ON b.claimed_by = u.id
        WHERE b.status = 'claimed'
        GROUP BY claimed_by
        ORDER BY total_earned DESC
        LIMIT 25
      `).all();
    }

    res.json({ leaders });
  } catch (error) {
    logger.error('Get bounty leaderboard error', { error: error.message });
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

export default router;

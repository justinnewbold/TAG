import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get all turf zones (with optional bounding box filter)
router.get('/zones', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { minLat, maxLat, minLng, maxLng } = req.query;

    let zones;
    if (minLat && maxLat && minLng && maxLng) {
      if (isPostgres) {
        const result = await db.query(`
          SELECT tz.*, u.name as owner_name, u.avatar as owner_avatar, c.name as clan_name
          FROM turf_zones tz
          LEFT JOIN users u ON tz.owner_id = u.id
          LEFT JOIN clans c ON tz.clan_id = c.id
          WHERE tz.lat BETWEEN $1 AND $2 AND tz.lng BETWEEN $3 AND $4
          ORDER BY tz.level DESC
          LIMIT 200
        `, [parseFloat(minLat), parseFloat(maxLat), parseFloat(minLng), parseFloat(maxLng)]);
        zones = result.rows;
      } else {
        zones = db.prepare(`
          SELECT tz.*, u.name as owner_name, u.avatar as owner_avatar, c.name as clan_name
          FROM turf_zones tz
          LEFT JOIN users u ON tz.owner_id = u.id
          LEFT JOIN clans c ON tz.clan_id = c.id
          WHERE tz.lat BETWEEN ? AND ? AND tz.lng BETWEEN ? AND ?
          ORDER BY tz.level DESC
          LIMIT 200
        `).all(parseFloat(minLat), parseFloat(maxLat), parseFloat(minLng), parseFloat(maxLng));
      }
    } else {
      if (isPostgres) {
        const result = await db.query(`
          SELECT tz.*, u.name as owner_name, c.name as clan_name
          FROM turf_zones tz
          LEFT JOIN users u ON tz.owner_id = u.id
          LEFT JOIN clans c ON tz.clan_id = c.id
          WHERE tz.status != 'unclaimed'
          ORDER BY tz.level DESC
          LIMIT 100
        `);
        zones = result.rows;
      } else {
        zones = db.prepare(`
          SELECT tz.*, u.name as owner_name, c.name as clan_name
          FROM turf_zones tz
          LEFT JOIN users u ON tz.owner_id = u.id
          LEFT JOIN clans c ON tz.clan_id = c.id
          WHERE tz.status != 'unclaimed'
          ORDER BY tz.level DESC
          LIMIT 100
        `).all();
      }
    }

    res.json({ zones });
  } catch (error) {
    logger.error('Get turf zones error', { error: error.message });
    res.status(500).json({ error: 'Failed to get zones' });
  }
});

// Claim or capture a zone
router.post('/zones/capture', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { lat, lng, clanId } = req.body;
    const userId = req.user.id;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location required' });
    }

    const id = `zone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    // Check if zone already exists nearby (within 200m)
    let existingZone;
    if (isPostgres) {
      const result = await db.query(`
        SELECT * FROM turf_zones
        WHERE ABS(lat - $1) < 0.002 AND ABS(lng - $2) < 0.002
        LIMIT 1
      `, [lat, lng]);
      existingZone = result.rows[0];
    } else {
      existingZone = db.prepare(`
        SELECT * FROM turf_zones
        WHERE ABS(lat - ?) < 0.002 AND ABS(lng - ?) < 0.002
        LIMIT 1
      `).get(lat, lng);
    }

    if (existingZone) {
      // Check cooldown
      if (existingZone.last_captured_at && (now - existingZone.last_captured_at) < 1800000) {
        return res.status(400).json({ error: 'Zone was recently captured. Try again later.' });
      }

      // Capture existing zone
      if (isPostgres) {
        await db.query(`
          UPDATE turf_zones SET owner_id = $1, clan_id = $2, status = 'claimed',
          last_captured_at = $3, capture_count = capture_count + 1
          WHERE id = $4
        `, [userId, clanId || null, now, existingZone.id]);
      } else {
        db.prepare(`
          UPDATE turf_zones SET owner_id = ?, clan_id = ?, status = 'claimed',
          last_captured_at = ?, capture_count = capture_count + 1
          WHERE id = ?
        `).run(userId, clanId || null, now, existingZone.id);
      }

      const io = req.app.get('io');
      if (io) {
        io.emit('zoneCaptured', { zoneId: existingZone.id, userId, clanId, lat, lng });
      }

      return res.json({ zone: { ...existingZone, owner_id: userId, clan_id: clanId, status: 'claimed' }, captured: true });
    }

    // Create new zone
    if (isPostgres) {
      await db.query(`
        INSERT INTO turf_zones (id, lat, lng, owner_id, clan_id, status, level, capture_count, created_at, last_captured_at, last_visited_at)
        VALUES ($1, $2, $3, $4, $5, 'claimed', 1, 1, $6, $6, $6)
      `, [id, lat, lng, userId, clanId || null, now]);
    } else {
      db.prepare(`
        INSERT INTO turf_zones (id, lat, lng, owner_id, clan_id, status, level, capture_count, created_at, last_captured_at, last_visited_at)
        VALUES (?, ?, ?, ?, ?, 'claimed', 1, 1, ?, ?, ?)
      `).run(id, lat, lng, userId, clanId || null, now, now, now);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('zoneCaptured', { zoneId: id, userId, clanId, lat, lng });
    }

    res.status(201).json({ zone: { id, lat, lng, owner_id: userId, clan_id: clanId, status: 'claimed', level: 1 }, created: true });
  } catch (error) {
    logger.error('Capture zone error', { error: error.message });
    res.status(500).json({ error: 'Failed to capture zone' });
  }
});

// Upgrade a zone
router.post('/zones/:zoneId/upgrade', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { zoneId } = req.params;
    const userId = req.user.id;

    let zone;
    if (isPostgres) {
      const result = await db.query(`SELECT * FROM turf_zones WHERE id = $1`, [zoneId]);
      zone = result.rows[0];
    } else {
      zone = db.prepare(`SELECT * FROM turf_zones WHERE id = ?`).get(zoneId);
    }

    if (!zone) return res.status(404).json({ error: 'Zone not found' });
    if (zone.owner_id !== userId) return res.status(403).json({ error: 'Not your zone' });
    if (zone.level >= 4) return res.status(400).json({ error: 'Zone at max level' });

    const newLevel = zone.level + 1;
    if (isPostgres) {
      await db.query(`UPDATE turf_zones SET level = $1 WHERE id = $2`, [newLevel, zoneId]);
    } else {
      db.prepare(`UPDATE turf_zones SET level = ? WHERE id = ?`).run(newLevel, zoneId);
    }

    res.json({ zone: { ...zone, level: newLevel } });
  } catch (error) {
    logger.error('Upgrade zone error', { error: error.message });
    res.status(500).json({ error: 'Failed to upgrade zone' });
  }
});

// Get clan turf stats
router.get('/stats/:clanId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { clanId } = req.params;

    let stats;
    if (isPostgres) {
      const result = await db.query(`
        SELECT COUNT(*) as total_zones, SUM(level) as total_levels,
               SUM(CASE WHEN level >= 3 THEN 1 ELSE 0 END) as fortified_zones
        FROM turf_zones WHERE clan_id = $1 AND status != 'unclaimed'
      `, [clanId]);
      stats = result.rows[0];
    } else {
      stats = db.prepare(`
        SELECT COUNT(*) as total_zones, SUM(level) as total_levels,
               SUM(CASE WHEN level >= 3 THEN 1 ELSE 0 END) as fortified_zones
        FROM turf_zones WHERE clan_id = ? AND status != 'unclaimed'
      `).get(clanId);
    }

    res.json({ stats });
  } catch (error) {
    logger.error('Get turf stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get turf war leaderboard (by clan)
router.get('/leaderboard', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');

    let leaders;
    if (isPostgres) {
      const result = await db.query(`
        SELECT c.id, c.name, c.tag, COUNT(tz.id) as zone_count, SUM(tz.level) as total_power
        FROM clans c
        JOIN turf_zones tz ON tz.clan_id = c.id
        WHERE tz.status != 'unclaimed'
        GROUP BY c.id, c.name, c.tag
        ORDER BY zone_count DESC
        LIMIT 25
      `);
      leaders = result.rows;
    } else {
      leaders = db.prepare(`
        SELECT c.id, c.name, c.tag, COUNT(tz.id) as zone_count, SUM(tz.level) as total_power
        FROM clans c
        JOIN turf_zones tz ON tz.clan_id = c.id
        WHERE tz.status != 'unclaimed'
        GROUP BY c.id
        ORDER BY zone_count DESC
        LIMIT 25
      `).all();
    }

    res.json({ leaders });
  } catch (error) {
    logger.error('Get turf leaderboard error', { error: error.message });
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

export default router;

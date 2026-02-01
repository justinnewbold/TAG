import express from 'express';
import { logger } from '../utils/logger.js';
import { NEMESIS_CONFIG } from '../../shared/constants.js';

const router = express.Router();

// Get nemesis data for the current user
router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const userId = req.user.id;

    let rivalries;
    if (isPostgres) {
      const result = await db.query(`
        SELECT nr.*,
               u1.name as player_name, u1.avatar as player_avatar,
               u2.name as opponent_name, u2.avatar as opponent_avatar
        FROM nemesis_records nr
        JOIN users u1 ON nr.player_id = u1.id
        JOIN users u2 ON nr.opponent_id = u2.id
        WHERE (nr.player_id = $1 OR nr.opponent_id = $1)
        AND nr.total_encounters >= $2
        ORDER BY nr.total_encounters DESC
        LIMIT 10
      `, [userId, NEMESIS_CONFIG.MIN_ENCOUNTERS]);
      rivalries = result.rows;
    } else {
      rivalries = db.prepare(`
        SELECT nr.*,
               u1.name as player_name, u1.avatar as player_avatar,
               u2.name as opponent_name, u2.avatar as opponent_avatar
        FROM nemesis_records nr
        JOIN users u1 ON nr.player_id = u1.id
        JOIN users u2 ON nr.opponent_id = u2.id
        WHERE (nr.player_id = ? OR nr.opponent_id = ?)
        AND nr.total_encounters >= ?
        ORDER BY nr.total_encounters DESC
        LIMIT 10
      `).all(userId, userId, NEMESIS_CONFIG.MIN_ENCOUNTERS);
    }

    // Format rivalries with titles
    const formatted = rivalries.map(r => {
      const isPlayer = r.player_id === userId;
      const opponentId = isPlayer ? r.opponent_id : r.player_id;
      const opponentName = isPlayer ? r.opponent_name : r.player_name;
      const opponentAvatar = isPlayer ? r.opponent_avatar : r.player_avatar;
      const myTags = isPlayer ? r.player_tags : r.opponent_tags;
      const theirTags = isPlayer ? r.opponent_tags : r.player_tags;

      let title = NEMESIS_CONFIG.TITLES.RIVAL;
      if (r.total_encounters >= NEMESIS_CONFIG.TITLES.ARCHENEMY.min) {
        title = NEMESIS_CONFIG.TITLES.ARCHENEMY;
      } else if (r.total_encounters >= NEMESIS_CONFIG.TITLES.NEMESIS.min) {
        title = NEMESIS_CONFIG.TITLES.NEMESIS;
      }

      return {
        opponentId,
        opponentName,
        opponentAvatar,
        myTags,
        theirTags,
        totalEncounters: r.total_encounters,
        title: title.name,
        titleColor: title.color,
        lastEncounter: r.last_encounter_at,
        winRate: myTags / (myTags + theirTags),
      };
    });

    res.json({ rivalries: formatted });
  } catch (error) {
    logger.error('Get nemesis error', { error: error.message });
    res.status(500).json({ error: 'Failed to get nemesis data' });
  }
});

// Record a tag encounter between two players
router.post('/encounter', async (req, res) => {
  try {
    const db = req.app.get('db');
    const isPostgres = req.app.get('isPostgres');
    const { taggerId, taggedId } = req.body;

    if (!taggerId || !taggedId) {
      return res.status(400).json({ error: 'Both player IDs required' });
    }

    // Ensure consistent ordering (lower ID is always player_id)
    const playerId = taggerId < taggedId ? taggerId : taggedId;
    const opponentId = taggerId < taggedId ? taggedId : taggerId;
    const taggerIsPlayer = taggerId === playerId;
    const now = Date.now();

    if (isPostgres) {
      const existing = await db.query(
        `SELECT * FROM nemesis_records WHERE player_id = $1 AND opponent_id = $2`,
        [playerId, opponentId]
      );

      if (existing.rows.length > 0) {
        const tagField = taggerIsPlayer ? 'player_tags' : 'opponent_tags';
        await db.query(`
          UPDATE nemesis_records SET ${tagField} = ${tagField} + 1,
          total_encounters = total_encounters + 1, last_encounter_at = $1
          WHERE player_id = $2 AND opponent_id = $3
        `, [now, playerId, opponentId]);
      } else {
        await db.query(`
          INSERT INTO nemesis_records (player_id, opponent_id, player_tags, opponent_tags, total_encounters, last_encounter_at, created_at)
          VALUES ($1, $2, $3, $4, 1, $5, $5)
        `, [playerId, opponentId, taggerIsPlayer ? 1 : 0, taggerIsPlayer ? 0 : 1, now]);
      }
    } else {
      const existing = db.prepare(
        `SELECT * FROM nemesis_records WHERE player_id = ? AND opponent_id = ?`
      ).get(playerId, opponentId);

      if (existing) {
        const tagField = taggerIsPlayer ? 'player_tags' : 'opponent_tags';
        db.prepare(`
          UPDATE nemesis_records SET ${tagField} = ${tagField} + 1,
          total_encounters = total_encounters + 1, last_encounter_at = ?
          WHERE player_id = ? AND opponent_id = ?
        `).run(now, playerId, opponentId);
      } else {
        db.prepare(`
          INSERT INTO nemesis_records (player_id, opponent_id, player_tags, opponent_tags, total_encounters, last_encounter_at, created_at)
          VALUES (?, ?, ?, ?, 1, ?, ?)
        `).run(playerId, opponentId, taggerIsPlayer ? 1 : 0, taggerIsPlayer ? 0 : 1, now, now);
      }
    }

    // Check if this creates/upgrades a nemesis relationship
    let record;
    if (isPostgres) {
      const result = await db.query(
        `SELECT * FROM nemesis_records WHERE player_id = $1 AND opponent_id = $2`,
        [playerId, opponentId]
      );
      record = result.rows[0];
    } else {
      record = db.prepare(
        `SELECT * FROM nemesis_records WHERE player_id = ? AND opponent_id = ?`
      ).get(playerId, opponentId);
    }

    let isNemesisTag = false;
    if (record && record.total_encounters >= NEMESIS_CONFIG.MIN_ENCOUNTERS) {
      isNemesisTag = true;
      const io = req.app.get('io');
      if (io) {
        io.emit('nemesisTag', { taggerId, taggedId, encounters: record.total_encounters });
      }
    }

    res.json({ success: true, isNemesisTag, encounters: record?.total_encounters || 1 });
  } catch (error) {
    logger.error('Record encounter error', { error: error.message });
    res.status(500).json({ error: 'Failed to record encounter' });
  }
});

export default router;

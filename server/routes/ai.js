/**
 * AI Feature API Routes
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import aiService from '../services/ai.js';

const router = express.Router();

/**
 * POST /api/ai/recap
 * Generate a game recap
 */
router.post('/recap', authMiddleware, async (req, res) => {
  try {
    const { gameData } = req.body;
    
    if (!gameData) {
      return res.status(400).json({ error: 'Game data required' });
    }

    const recap = await aiService.generateGameRecap(gameData);
    res.json({ recap });
  } catch (error) {
    console.error('Recap generation error:', error);
    res.status(500).json({ error: 'Failed to generate recap' });
  }
});

/**
 * POST /api/ai/trash-talk
 * Get contextual trash talk suggestions
 */
router.post('/trash-talk', authMiddleware, async (req, res) => {
  try {
    const { context } = req.body;
    
    if (!context) {
      return res.status(400).json({ error: 'Context required' });
    }

    const result = await aiService.generateTrashTalk(context);
    res.json(result);
  } catch (error) {
    console.error('Trash talk generation error:', error);
    res.status(500).json({ error: 'Failed to generate messages' });
  }
});

/**
 * POST /api/ai/analyze-movement
 * Analyze player movement for anti-cheat
 */
router.post('/analyze-movement', authMiddleware, async (req, res) => {
  try {
    const { locationHistory } = req.body;
    
    if (!locationHistory || !Array.isArray(locationHistory)) {
      return res.status(400).json({ error: 'Location history required' });
    }

    const analysis = aiService.analyzeMovement(locationHistory);
    res.json(analysis);
  } catch (error) {
    console.error('Movement analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze movement' });
  }
});

/**
 * POST /api/ai/commentary
 * Generate real-time commentary for an event
 */
router.post('/commentary', authMiddleware, async (req, res) => {
  try {
    const { event } = req.body;
    
    if (!event) {
      return res.status(400).json({ error: 'Event required' });
    }

    const commentary = await aiService.generateCommentary(event);
    res.json({ commentary });
  } catch (error) {
    console.error('Commentary generation error:', error);
    res.status(500).json({ error: 'Failed to generate commentary' });
  }
});

/**
 * GET /api/ai/skill-rating/:playerId
 * Get player's skill rating for matchmaking
 */
router.get('/skill-rating/:playerId', authMiddleware, async (req, res) => {
  try {
    const { playerId } = req.params;
    
    // Get player stats from database (simplified - you'd fetch from actual DB)
    const playerStats = req.playerStats || {
      gamesPlayed: 0,
      wins: 0,
      totalTags: 0,
      timesTagged: 0,
      avgSurvivalTime: 0,
      avgTagTime: 0,
    };

    const rating = aiService.calculateSkillRating(playerStats);
    res.json(rating);
  } catch (error) {
    console.error('Skill rating error:', error);
    res.status(500).json({ error: 'Failed to calculate rating' });
  }
});

/**
 * GET /api/ai/strategy-tips
 * Get personalized strategy tips
 */
router.get('/strategy-tips', authMiddleware, async (req, res) => {
  try {
    const playerStats = req.playerStats || {};
    const recentGames = req.recentGames || [];

    const tips = await aiService.generateStrategyTips(playerStats, recentGames);
    res.json({ tips });
  } catch (error) {
    console.error('Strategy tips error:', error);
    res.status(500).json({ error: 'Failed to generate tips' });
  }
});

/**
 * POST /api/ai/matchmaking
 * Find balanced match based on skill ratings
 */
router.post('/matchmaking', authMiddleware, async (req, res) => {
  try {
    const { playerId, gameMode, preferredRating } = req.body;
    
    // This would integrate with your game lobby system
    // For now, return mock data
    res.json({
      recommended: [],
      message: 'Matchmaking integration pending',
    });
  } catch (error) {
    console.error('Matchmaking error:', error);
    res.status(500).json({ error: 'Matchmaking failed' });
  }
});

export default router;

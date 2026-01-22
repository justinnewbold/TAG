/**
 * Challenges Routes
 * Phase 5: Daily/Weekly challenges API
 */

import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Challenge templates
const DAILY_CHALLENGES = [
  { id: 'daily_tag_3', name: 'Tag Trio', description: 'Tag 3 players', requirement: { type: 'tag_count', value: 3 }, reward: { xp: 50, coins: 10 }, difficulty: 'easy' },
  { id: 'daily_play_1', name: 'Daily Player', description: 'Play 1 game', requirement: { type: 'play_games', value: 1 }, reward: { xp: 30, coins: 5 }, difficulty: 'easy' },
  { id: 'daily_tag_10', name: 'Tag Master', description: 'Tag 10 players', requirement: { type: 'tag_count', value: 10 }, reward: { xp: 100, coins: 20 }, difficulty: 'medium' },
  { id: 'daily_win_1', name: 'Victory', description: 'Win a game', requirement: { type: 'win_games', value: 1 }, reward: { xp: 80, coins: 15 }, difficulty: 'medium' },
  { id: 'daily_tag_25', name: 'Tag Legend', description: 'Tag 25 players', requirement: { type: 'tag_count', value: 25 }, reward: { xp: 200, coins: 40 }, difficulty: 'hard' },
];

const WEEKLY_CHALLENGES = [
  { id: 'weekly_tag_100', name: 'Century', description: 'Tag 100 players this week', requirement: { type: 'tag_count', value: 100 }, reward: { xp: 500, coins: 100 }, difficulty: 'hard' },
  { id: 'weekly_win_10', name: 'Dominant', description: 'Win 10 games this week', requirement: { type: 'win_games', value: 10 }, reward: { xp: 400, coins: 80 }, difficulty: 'hard' },
  { id: 'weekly_play_20', name: 'Dedicated', description: 'Play 20 games this week', requirement: { type: 'play_games', value: 20 }, reward: { xp: 300, coins: 60 }, difficulty: 'medium' },
];

// In-memory storage for demo (use DB in production)
const userProgress = new Map();
const userStreaks = new Map();

// Get current daily seed for challenge rotation
function getDailySeed() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
}

// Get weekly seed
function getWeeklySeed() {
  const now = new Date();
  const week = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
  return `week-${week}`;
}

// Select random challenges for today
function getTodaysChallenges() {
  const seed = getDailySeed();
  const seedNum = seed.split('-').reduce((a, b) => a + parseInt(b), 0);

  // Select 3 daily challenges based on seed
  const daily = [];
  const shuffled = [...DAILY_CHALLENGES].sort((a, b) => {
    const aScore = (a.id.charCodeAt(0) * seedNum) % 100;
    const bScore = (b.id.charCodeAt(0) * seedNum) % 100;
    return aScore - bScore;
  });
  daily.push(...shuffled.slice(0, 3));

  // Select 1 weekly challenge
  const weekSeed = getWeeklySeed();
  const weekNum = parseInt(weekSeed.split('-')[1]) || 0;
  const weekly = [WEEKLY_CHALLENGES[weekNum % WEEKLY_CHALLENGES.length]];

  return { daily, weekly, seed, weekSeed };
}

// Get challenges
router.get('/', async (req, res) => {
  try {
    const challenges = getTodaysChallenges();
    res.json(challenges);
  } catch (error) {
    logger.error('Failed to get challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// Get user's challenge progress
router.get('/progress', async (req, res) => {
  try {
    const userId = req.user.id;
    const progress = userProgress.get(userId) || { challenges: [], streak: 0 };

    res.json(progress);
  } catch (error) {
    logger.error('Failed to get progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Update challenge progress
router.put('/progress', async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventType, value } = req.body;

    const progress = userProgress.get(userId) || { challenges: [], streak: 0 };
    const { daily, weekly } = getTodaysChallenges();
    const allChallenges = [...daily, ...weekly];

    const updated = [];

    for (const challenge of allChallenges) {
      if (challenge.requirement.type === eventType) {
        let userChallenge = progress.challenges.find(c => c.challengeId === challenge.id);

        if (!userChallenge) {
          userChallenge = { challengeId: challenge.id, progress: 0, completed: false, claimed: false };
          progress.challenges.push(userChallenge);
        }

        if (!userChallenge.completed) {
          userChallenge.progress += value;

          if (userChallenge.progress >= challenge.requirement.value) {
            userChallenge.completed = true;
          }

          updated.push(userChallenge);
        }
      }
    }

    userProgress.set(userId, progress);

    res.json({ updated, progress });
  } catch (error) {
    logger.error('Failed to update progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Claim a challenge reward
router.post('/:challengeId/claim', async (req, res) => {
  try {
    const userId = req.user.id;
    const { challengeId } = req.params;

    const progress = userProgress.get(userId);
    if (!progress) {
      return res.status(400).json({ error: 'No progress found' });
    }

    const userChallenge = progress.challenges.find(c => c.challengeId === challengeId);
    if (!userChallenge || !userChallenge.completed) {
      return res.status(400).json({ error: 'Challenge not completed' });
    }

    if (userChallenge.claimed) {
      return res.status(400).json({ error: 'Reward already claimed' });
    }

    // Find the challenge to get reward
    const { daily, weekly } = getTodaysChallenges();
    const allChallenges = [...daily, ...weekly];
    const challenge = allChallenges.find(c => c.id === challengeId);

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    userChallenge.claimed = true;
    userProgress.set(userId, progress);

    // Return reward info (actual reward would be applied in DB)
    res.json({
      success: true,
      reward: challenge.reward,
    });
  } catch (error) {
    logger.error('Failed to claim reward:', error);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

export { router as challengeRouter };

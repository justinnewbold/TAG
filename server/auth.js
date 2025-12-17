import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// In-memory user store (replace with database in production)
const users = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'tag-game-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, name: user.name, avatar: user.avatar },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Register new user (simplified - no password for game)
router.post('/register', async (req, res) => {
  try {
    const { name, avatar } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }

    const id = uuidv4();
    const user = {
      id,
      name: name.trim(),
      avatar: avatar || '😀',
      createdAt: Date.now(),
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalTags: 0,
        timesTagged: 0,
        longestSurvival: 0,
        totalPlayTime: 0,
        uniqueFriendsPlayed: 0,
        fastestTag: null,
        playedAtNight: false,
      },
      achievements: [],
    };

    users.set(id, user);

    const token = generateToken(user);

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        stats: user.stats,
        achievements: user.achievements,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login with existing token (re-authenticate)
router.post('/login', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generate fresh token
    const newToken = generateToken(user);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        stats: user.stats,
        achievements: user.achievements,
      },
      token: newToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = users.get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (avatar) user.avatar = avatar;

    users.set(user.id, user);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        stats: user.stats,
        achievements: user.achievements,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = users.get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        stats: user.stats,
        achievements: user.achievements,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Middleware to authenticate JWT token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Socket.io authentication middleware
export function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
}

// Helper to get user by ID
export function getUser(userId) {
  return users.get(userId);
}

// Helper to update user stats
export function updateUserStats(userId, statsUpdate) {
  const user = users.get(userId);
  if (user) {
    user.stats = { ...user.stats, ...statsUpdate };
    users.set(userId, user);
  }
  return user;
}

// Helper to add achievement
export function addAchievement(userId, achievementId) {
  const user = users.get(userId);
  if (user && !user.achievements.includes(achievementId)) {
    user.achievements.push(achievementId);
    users.set(userId, user);
    return true;
  }
  return false;
}

export { router as authRouter, users };

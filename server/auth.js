import express from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { userDb } from './db/index.js';

const router = express.Router();

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

    if (name.trim().length > 30) {
      return res.status(400).json({ error: 'Name must be 30 characters or less' });
    }

    const id = uuidv4();
    const user = userDb.create({
      id,
      name: name.trim(),
      avatar: avatar || '😀',
    });

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
    const user = userDb.getById(decoded.id);

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
    const user = userDb.getById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = userDb.update(user.id, {
      name: name ? name.trim() : user.name,
      avatar: avatar || user.avatar,
    });

    res.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        stats: updatedUser.stats,
        achievements: updatedUser.achievements,
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
    const user = userDb.getById(req.user.id);

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
  return userDb.getById(userId);
}

// Helper to update user stats
export function updateUserStats(userId, statsUpdate) {
  userDb.updateStats(userId, statsUpdate);
  return userDb.getById(userId);
}

// Helper to add achievement
export function addAchievement(userId, achievementId) {
  return userDb.addAchievement(userId, achievementId);
}

export { router as authRouter };

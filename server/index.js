import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { authRouter, authenticateToken, authenticateSocket } from './auth.js';
import { gameRouter } from './routes/games.js';
import { GameManager } from './game/GameManager.js';
import { setupSocketHandlers } from './socket/handlers.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Initialize game manager
const gameManager = new GameManager();

// Make gameManager and io available to routes
app.set('gameManager', gameManager);
app.set('io', io);

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 auth requests per window
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const gameLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 game requests per minute
  message: { error: 'Too many game requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10kb' })); // Limit body size

// Apply general rate limiting
app.use(generalLimiter);

// Health check (not rate limited)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Routes with specific rate limits
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/games', authenticateToken, gameLimiter, gameRouter);

// Socket.io authentication middleware
io.use(authenticateSocket);

// Socket.io connection handling with rate limiting
const socketRateLimits = new Map();
const SOCKET_RATE_WINDOW = 1000; // 1 second
const SOCKET_MAX_EVENTS = 30; // max events per second

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.id} (${socket.user.name})`);

  // Socket-level rate limiting
  socket.use((packet, next) => {
    const now = Date.now();
    const userId = socket.user.id;
    const userLimits = socketRateLimits.get(userId) || { count: 0, resetAt: now + SOCKET_RATE_WINDOW };

    if (now > userLimits.resetAt) {
      userLimits.count = 1;
      userLimits.resetAt = now + SOCKET_RATE_WINDOW;
    } else {
      userLimits.count++;
    }

    socketRateLimits.set(userId, userLimits);

    if (userLimits.count > SOCKET_MAX_EVENTS) {
      return next(new Error('Rate limit exceeded'));
    }

    next();
  });

  setupSocketHandlers(io, socket, gameManager);

  socket.on('disconnect', () => {
    socketRateLimits.delete(socket.user.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Periodic cleanup of old games (every hour)
setInterval(() => {
  gameManager.cleanupOldGames();
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`TAG Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

export { io, gameManager };

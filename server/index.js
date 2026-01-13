import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { authRouter, authenticateToken, authenticateSocket } from './auth.js';
import { gameRouter } from './routes/games.js';
import aiRoutes from './routes/ai.js';
import { pushRouter } from './routes/push.js';
import { socialRouter } from './routes/social.js';
import { replayRouter } from './routes/replays.js';
import { adminRouter } from './routes/admin.js';
import { weatherRouter } from './routes/weather.js';
import { powerupRouter } from './routes/powerups.js';
import { usersRouter } from './routes/users.js';
import healthRouter from './routes/health.js';
import { challengeRouter } from './routes/challenges.js';
import { cosmeticsRouter } from './routes/cosmetics.js';
import { matchmakingRouter } from './routes/matchmaking.js';
import { privacyRouter } from './routes/privacy.js';
import { analyticsRouter } from './routes/analytics.js';
import rankedRouter from './routes/ranked.js';
import clansRouter from './routes/clans.js';
import spectatorRouter from './routes/spectator.js';
import poisRouter from './routes/pois.js';
import offlineRouter from './routes/offline.js';
import { tournamentRouter } from './routes/tournaments.js';
import { gameModesRouter } from './routes/gameModes.js';
import notificationsRouter from './routes/notifications.js';
import advancedAnalyticsRouter from './routes/advancedAnalytics.js';
import { GameManager } from './game/GameManager.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { logger } from './utils/logger.js';
import { sentry } from './services/sentry.js';
import { replayDb } from './db/replays.js';
import { socialDb } from './db/social.js';

dotenv.config();

// Initialize error tracking (Sentry - optional)
sentry.init();

// Validate critical environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const DEFAULT_SECRETS = [
  'tag-game-secret-key-change-in-production',
  'your-super-secret-jwt-key-change-this',
  'change-this',
  'secret',
];

if (!JWT_SECRET || DEFAULT_SECRETS.some(s => JWT_SECRET.includes(s))) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set to a secure value in production');
    process.exit(1);
  } else {
    console.warn('WARNING: Using default JWT secret. Set JWT_SECRET in .env for production');
  }
}

// Startup validation for required configuration
const validateStartup = () => {
  const warnings = [];
  const errors = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Database check
  if (!process.env.DATABASE_URL) {
    warnings.push('DATABASE_URL not set - using SQLite for local development');
  }

  // VAPID keys for push notifications
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    warnings.push('VAPID keys not configured - push notifications disabled');
  }

  // Check at least one auth method is available
  const hasEmailAuth = process.env.SMTP_HOST && process.env.SMTP_USER;
  const hasSmsAuth = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
  const hasOAuth = process.env.GOOGLE_CLIENT_ID || process.env.APPLE_CLIENT_ID;

  if (!hasEmailAuth && !hasSmsAuth && !hasOAuth && isProduction) {
    warnings.push('No auth providers configured (email/SMS/OAuth) - only anonymous users allowed');
  }

  // Sentry for error tracking in production
  if (!process.env.SENTRY_DSN && isProduction) {
    warnings.push('SENTRY_DSN not set - error tracking disabled in production');
  }

  // Log warnings and errors
  if (warnings.length > 0) {
    console.log('\n⚠️  Startup Warnings:');
    warnings.forEach(w => console.log(`   - ${w}`));
  }

  if (errors.length > 0) {
    console.error('\n❌ Startup Errors:');
    errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }

  if (warnings.length === 0 && errors.length === 0) {
    console.log('✅ All configuration validated');
  }
  console.log('');
};

validateStartup();

const app = express();
const httpServer = createServer(app);

// Define allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://tag.newbold.cloud',
  'https://tag-weld.vercel.app',
  'https://tag-newbold-cloud.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

// CORS origin checker function
const corsOriginChecker = (origin, callback) => {
  // Allow requests with no origin (mobile apps, curl, etc.)
  if (!origin) {
    return callback(null, true);
  }
  
  // Check if origin is in allowed list or matches Vercel preview pattern
  if (allowedOrigins.includes(origin) || 
      origin.endsWith('.vercel.app') || 
      origin.endsWith('.newbold.cloud')) {
    return callback(null, true);
  }
  
  callback(new Error('Not allowed by CORS'));
};

const io = new Server(httpServer, {
  cors: {
    origin: corsOriginChecker,
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

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org"],
      connectSrc: ["'self'", "ws:", "wss:", ...allowedOrigins],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for maps
}));

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
  origin: corsOriginChecker,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
}));
app.use(express.json({ limit: '10kb' })); // Limit body size

// Apply general rate limiting
app.use(generalLimiter);

// Health check (not rate limited)
app.get('/health', (req, res) => {
  const errorStats = logger.getErrorStats();
  res.json({
    status: errorStats.recentErrors < 10 ? 'ok' : 'degraded',
    timestamp: Date.now(),
    env: process.env.NODE_ENV || 'development',
    errors: errorStats,
  });
});

// Routes with specific rate limits
// Health check routes (no auth required)
app.use('/api', healthRouter);
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/games', authenticateToken, gameLimiter, gameRouter);
app.use('/api/push', authenticateToken, pushRouter);
app.use('/api/social', authenticateToken, socialRouter);
app.use('/api/replays', authenticateToken, replayRouter);
app.use('/api/admin', authenticateToken, adminRouter);
app.use('/api/weather', authenticateToken, weatherRouter);
app.use('/api/powerups', authenticateToken, powerupRouter);
app.use('/api/users', authenticateToken, usersRouter);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/challenges', authenticateToken, challengeRouter);
app.use('/api/cosmetics', authenticateToken, cosmeticsRouter);
app.use('/api/matchmaking', authenticateToken, matchmakingRouter);
app.use('/api/settings', authenticateToken, privacyRouter);
app.use('/api/analytics', authenticateToken, analyticsRouter);
app.use('/api/ranked', authenticateToken, rankedRouter);
app.use('/api/clans', authenticateToken, clansRouter);
app.use('/api/spectator', authenticateToken, spectatorRouter);
app.use('/api/pois', authenticateToken, poisRouter);
app.use('/api/offline', authenticateToken, offlineRouter);
app.use('/api/tournaments', authenticateToken, tournamentRouter);
app.use('/api/game-modes', gameModesRouter); // No auth required for reading modes
app.use('/api/notifications', authenticateToken, notificationsRouter);
app.use('/api/analytics/v2', authenticateToken, advancedAnalyticsRouter);

// Initialize additional database tables
(async () => {
  try {
    await replayDb.init();
    await socialDb.init();
  } catch (err) {
    console.error('Failed to initialize social/replay tables:', err);
  }
})();

// Socket.io authentication middleware
io.use(authenticateSocket);

// Socket.io connection handling with rate limiting
const socketRateLimits = new Map();
const SOCKET_RATE_WINDOW = 1000; // 1 second
const SOCKET_MAX_EVENTS = 30; // max events per second

io.on('connection', (socket) => {
  logger.info('User connected', logger.withSocket(socket));

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

// Sentry error handler (captures errors before responding)
app.use(sentry.errorHandler());

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Request error', {
    ...logger.withRequest(req),
    error: err.message,
    stack: err.stack,
  });
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;
  res.status(err.status || 500).json({ error: message });
});

// Periodic cleanup of old games (every hour)
setInterval(async () => {
  try {
    logger.info('Running scheduled game cleanup...');
    await gameManager.cleanupOldGames();
    logger.info('Game cleanup completed successfully');
  } catch (error) {
    logger.error('Game cleanup error', { error: error.message, stack: error.stack });
  }
}, 60 * 60 * 1000);

// Periodic check for inactive players (every 2 minutes)
setInterval(async () => {
  try {
    const bootedPlayers = await gameManager.bootInactivePlayers(io);
    if (bootedPlayers.length > 0) {
      logger.info(`Booted ${bootedPlayers.length} inactive players`, { 
        players: bootedPlayers.map(p => ({ name: p.name, game: p.gameName, isAnonymous: p.isAnonymous }))
      });
    }
  } catch (error) {
    logger.error('Inactive player boot error', { error: error.message });
  }
}, 2 * 60 * 1000);

// Run cleanup on startup (after a short delay to let everything initialize)
setTimeout(async () => {
  try {
    logger.info('Running initial game cleanup...');
    await gameManager.cleanupOldGames();
    logger.info('Initial game cleanup completed');
  } catch (error) {
    logger.error('Initial cleanup error', { error: error.message });
  }
}, 5000);

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');

  // Flush any pending error reports
  await sentry.flush(2000);

  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  // Force close after 10 seconds
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    allowedOrigins: allowedOrigins,
  });
});

export { io, gameManager };

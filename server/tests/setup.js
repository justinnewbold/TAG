// Test application setup (without starting server)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter, authenticateToken } from '../auth.js';
import { gameRouter } from '../routes/games.js';
import { GameManager } from '../game/GameManager.js';

// Mock socket.io for tests
function createMockIO() {
  return {
    to: () => ({
      emit: () => {},
    }),
    emit: () => {},
  };
}

export function createTestApp() {
  const app = express();
  const gameManager = new GameManager();
  const io = createMockIO();

  app.set('gameManager', gameManager);
  app.set('io', io);

  // Minimal middleware for testing
  app.use(cors());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '10kb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Routes
  app.use('/api/auth', authRouter);
  app.use('/api/games', authenticateToken, gameRouter);

  // Error handling
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return { app, gameManager, io };
}

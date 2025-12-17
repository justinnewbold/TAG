import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
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

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/games', authenticateToken, gameRouter);

// Socket.io authentication middleware
io.use(authenticateSocket);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.id} (${socket.user.name})`);
  setupSocketHandlers(io, socket, gameManager);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`TAG Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

export { io, gameManager };

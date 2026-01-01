import { io } from 'socket.io-client';
import { api } from './api';
import { useStore } from '../store';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.connectionCallbacks = new Set();
    this.isConnecting = false;
    this.lastConnectAttempt = 0;
    this.minConnectInterval = 2000;
  }

  onConnectionChange(callback) {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  notifyConnectionChange(status, error = null) {
    try {
      useStore.getState().setConnectionStatus(status, error);
    } catch (e) {
      // Store might not be ready yet
    }
    this.connectionCallbacks.forEach(cb => cb(status, error));
  }

  connect() {
    const now = Date.now();
    if (now - this.lastConnectAttempt < this.minConnectInterval) {
      if (import.meta.env.DEV) console.log('Socket: Rate limiting connection attempts');
      return this.socket;
    }
    this.lastConnectAttempt = now;

    if (this.isConnecting) {
      if (import.meta.env.DEV) console.log('Socket: Already connecting, skipping');
      return this.socket;
    }

    if (this.socket?.connected) {
      if (import.meta.env.DEV) console.log('Socket: Already connected');
      return this.socket;
    }

    const token = api.getToken();
    if (!token) {
      if (import.meta.env.DEV) console.warn('Socket: Cannot connect - no auth token');
      this.notifyConnectionChange('disconnected', 'No auth token');
      return null;
    }

    if (this.socket) {
      if (import.meta.env.DEV) console.log('Socket: Cleaning up existing socket');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = true;
    this.notifyConnectionChange('connecting');

    if (import.meta.env.DEV) console.log('Socket: Creating new connection to', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      forceNew: true,
    });

    this.socket.on('connect', () => {
      if (import.meta.env.DEV) console.log('Socket: Connected successfully');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.notifyConnectionChange('connected');
      this.emit('reconnect:game');
    });

    this.socket.on('disconnect', (reason) => {
      if (import.meta.env.DEV) console.log('Socket: Disconnected -', reason);
      this.isConnecting = false;
      this.notifyConnectionChange('disconnected', reason);
      
      if (reason === 'io server disconnect') {
        if (import.meta.env.DEV) console.log('Socket: Server initiated disconnect, not reconnecting');
      }
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      if (import.meta.env.DEV) console.log(`Socket: Reconnect attempt ${attempt}/${this.maxReconnectAttempts}`);
      this.notifyConnectionChange('reconnecting', `Attempt ${attempt}/${this.maxReconnectAttempts}`);
    });

    this.socket.on('reconnect', (attempt) => {
      if (import.meta.env.DEV) console.log('Socket: Reconnected after', attempt, 'attempts');
      this.isConnecting = false;
      this.notifyConnectionChange('connected');
    });

    this.socket.on('reconnect_failed', () => {
      if (import.meta.env.DEV) console.log('Socket: Reconnection failed after max attempts');
      this.isConnecting = false;
      this.notifyConnectionChange('disconnected', 'Reconnection failed');
    });

    this.socket.on('connect_error', (error) => {
      if (import.meta.env.DEV) console.error('Socket: Connection error -', error.message);
      this.isConnecting = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        if (import.meta.env.DEV) console.log('Socket: Max reconnect attempts reached, stopping');
        this.socket?.disconnect();
        this.notifyConnectionChange('disconnected', 'Connection failed');
      } else {
        this.notifyConnectionChange('error', error.message);
      }
    });

    // ============================================
    // CRITICAL: Game event handlers
    // These update the store when other players move
    // ============================================
    
    // Handle other players' location updates
    this.socket.on('player:location', (data) => {
      if (import.meta.env.DEV) console.log('Socket: Received player location', data.playerId);
      try {
        useStore.getState().handlePlayerLocation(data);
      } catch (e) {
        console.error('Error handling player location:', e);
      }
    });

    // Handle game state sync
    this.socket.on('game:sync', (gameData) => {
      if (import.meta.env.DEV) console.log('Socket: Received game sync');
      try {
        useStore.getState().syncGameState(gameData);
      } catch (e) {
        console.error('Error syncing game state:', e);
      }
    });

    // Handle tag events
    this.socket.on('game:tagged', (data) => {
      if (import.meta.env.DEV) console.log('Socket: Tag event', data);
      try {
        useStore.getState().handlePlayerTagged(data);
      } catch (e) {
        console.error('Error handling tag event:', e);
      }
    });

    // Handle player joined
    this.socket.on('player:joined', (data) => {
      if (import.meta.env.DEV) console.log('Socket: Player joined', data);
      try {
        useStore.getState().handlePlayerJoined(data);
      } catch (e) {
        console.error('Error handling player joined:', e);
      }
    });

    // Handle player left
    this.socket.on('player:left', (data) => {
      if (import.meta.env.DEV) console.log('Socket: Player left', data);
      try {
        useStore.getState().handlePlayerLeft(data);
      } catch (e) {
        console.error('Error handling player left:', e);
      }
    });

    // Handle game started
    this.socket.on('game:started', (data) => {
      if (import.meta.env.DEV) console.log('Socket: Game started', data);
      try {
        useStore.getState().handleGameStarted(data);
      } catch (e) {
        console.error('Error handling game started:', e);
      }
    });

    // Handle nearby players notification (for IT)
    this.socket.on('nearby:players', (data) => {
      if (import.meta.env.DEV) console.log('Socket: Nearby players', data);
      // This is handled in ActiveGame.jsx via listeners
    });

    // Handle IT nearby warning (for runners)
    this.socket.on('it:nearby', (data) => {
      if (import.meta.env.DEV) console.log('Socket: IT nearby', data);
      // This is handled in ActiveGame.jsx via listeners
    });

    // Handle anti-cheat warnings
    this.socket.on('warning:anticheat', (data) => {
      console.warn('[AntiCheat Warning]', data.message);
    });

    this.socket.on('error:anticheat', (data) => {
      console.error('[AntiCheat Error]', data.message);
    });

    this.socket.on('error:rateLimit', (data) => {
      console.warn('[Rate Limit]', data.message);
    });

    return this.socket;
  }

  disconnect() {
    if (import.meta.env.DEV) console.log('Socket: Disconnecting');
    this.isConnecting = false;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.notifyConnectionChange('disconnected');
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else if (import.meta.env.DEV) {
      console.warn('Socket: Not connected, cannot emit:', event);
    }
  }

  on(event, callback) {
    if (!this.socket) {
      if (import.meta.env.DEV) console.warn('Socket: No socket, cannot add listener for:', event);
      return;
    }

    const existingListeners = this.listeners.get(event) || [];
    if (existingListeners.includes(callback)) {
      return;
    }

    this.socket.on(event, callback);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);

      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(callback);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    }
  }

  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
      this.listeners.delete(event);
    }
  }

  // Game-specific methods
  joinGameRoom(gameId) {
    this.emit('game:join', gameId);
  }

  leaveGameRoom(gameId) {
    this.emit('game:leave', gameId);
  }

  updateLocation(location) {
    this.emit('location:update', location);
  }

  attemptTag(targetId) {
    this.emit('tag:attempt', { targetId });
  }

  syncGame() {
    this.emit('game:sync');
  }

  ping() {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve(-1);
        return;
      }

      const start = Date.now();
      let resolved = false;

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(-1);
        }
      }, 5000);

      this.socket.emit('ping');
      this.socket.once('pong', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve(Date.now() - start);
        }
      });
    });
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();

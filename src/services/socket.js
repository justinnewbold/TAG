import { io } from 'socket.io-client';
import { api } from './api';
import { useStore } from '../store';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.connectionCallbacks = new Set();
  }

  // Add callback for connection status changes
  onConnectionChange(callback) {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  // Notify all callbacks of connection status change
  notifyConnectionChange(status, error = null) {
    // Update store directly
    try {
      useStore.getState().setConnectionStatus(status, error);
    } catch (e) {
      // Store might not be ready yet
    }
    // Notify callbacks
    this.connectionCallbacks.forEach(cb => cb(status, error));
  }

  connect() {
    const token = api.getToken();
    if (!token) {
      if (import.meta.env.DEV) console.warn('Cannot connect socket: no auth token');
      this.notifyConnectionChange('disconnected', 'No auth token');
      return null;
    }

    if (this.socket?.connected) {
      return this.socket;
    }

    this.notifyConnectionChange('connecting');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      if (import.meta.env.DEV) console.log('Socket connected');
      this.reconnectAttempts = 0;
      this.notifyConnectionChange('connected');
      this.emit('reconnect:game');
    });

    this.socket.on('disconnect', (reason) => {
      if (import.meta.env.DEV) console.log('Socket disconnected:', reason);
      this.notifyConnectionChange('disconnected', reason);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      this.reconnectAttempts = attempt;
      this.notifyConnectionChange('reconnecting', `Attempt ${attempt}/${this.maxReconnectAttempts}`);
    });

    this.socket.on('reconnect', (attempt) => {
      if (import.meta.env.DEV) console.log('Socket reconnected after', attempt, 'attempts');
      this.notifyConnectionChange('connected');
    });

    this.socket.on('reconnect_failed', () => {
      this.notifyConnectionChange('disconnected', 'Reconnection failed after max attempts');
    });

    this.socket.on('connect_error', (error) => {
      if (import.meta.env.DEV) console.error('Socket connection error:', error.message);
      this.reconnectAttempts++;
      this.notifyConnectionChange('error', error.message);
    });

    // Handle anti-cheat warnings
    this.socket.on('warning:anticheat', (data) => {
      console.warn('[AntiCheat Warning]', data.message);
      // Could trigger a UI toast here
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
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else if (import.meta.env.DEV) {
      console.warn('Socket not connected, cannot emit:', event);
    }
  }

  on(event, callback) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket) {
      // Prevent duplicate listeners
      const existingListeners = this.listeners.get(event) || [];
      if (existingListeners.includes(callback)) {
        return; // Already registered
      }

      this.socket.on(event, callback);

      // Track listeners for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);

      // Remove from tracked listeners
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(callback);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    }
  }

  // Remove all listeners for an event
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

      // Timeout after 5 seconds
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

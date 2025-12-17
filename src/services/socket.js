import { io } from 'socket.io-client';
import { api } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    const token = api.getToken();
    if (!token) {
      if (import.meta.env.DEV) console.warn('Cannot connect socket: no auth token');
      return null;
    }

    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      if (import.meta.env.DEV) console.log('Socket connected');
      this.reconnectAttempts = 0;
      this.emit('reconnect:game');
    });

    this.socket.on('disconnect', (reason) => {
      if (import.meta.env.DEV) console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      if (import.meta.env.DEV) console.error('Socket connection error:', error.message);
      this.reconnectAttempts++;
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
      const start = Date.now();
      this.socket?.emit('ping');
      this.socket?.once('pong', () => {
        resolve(Date.now() - start);
      });

      // Timeout after 5 seconds
      setTimeout(() => resolve(-1), 5000);
    });
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();

import { io } from 'socket.io-client';
import { api } from './api';
import { getDistance } from '../utils/distance';
import { socketLogger as logger } from './errorLogger';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Minimum distance (meters) to move before sending location update
const LOCATION_DEDUP_THRESHOLD = 5;

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.connectionState = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
    this.stateListeners = new Set();
    this.lastSentLocation = null;
  }

  _setConnectionState(state) {
    this.connectionState = state;
    this.stateListeners.forEach(cb => cb(state));
  }

  onConnectionStateChange(callback) {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  getConnectionState() {
    return this.connectionState;
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

    this._setConnectionState('connecting');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      logger.info('Connected');
      this.reconnectAttempts = 0;
      this._setConnectionState('connected');
      this.emit('reconnect:game');
    });

    this.socket.on('disconnect', (reason) => {
      logger.info('Disconnected', { reason });
      this._setConnectionState('disconnected');
    });

    this.socket.on('reconnecting', () => {
      this._setConnectionState('reconnecting');
    });

    this.socket.on('reconnect_attempt', () => {
      this._setConnectionState('reconnecting');
      this.reconnectAttempts++;
    });

    this.socket.on('connect_error', (error) => {
      logger.warn('Connection error', { message: error.message, attempts: this.reconnectAttempts });
      this.reconnectAttempts++;
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this._setConnectionState('reconnecting');
      } else {
        this._setConnectionState('disconnected');
      }
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
    } else {
      logger.debug('Cannot emit - not connected', { event });
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
    this.resetLocationTracking(); // Reset deduplication when joining a new game
    this.emit('game:join', gameId);
  }

  leaveGameRoom(gameId) {
    this.emit('game:leave', gameId);
  }

  updateLocation(location, force = false) {
    // Skip if location hasn't changed significantly (deduplication)
    if (!force && this.lastSentLocation) {
      const distance = getDistance(
        this.lastSentLocation.lat,
        this.lastSentLocation.lng,
        location.lat,
        location.lng
      );
      if (distance < LOCATION_DEDUP_THRESHOLD) {
        logger.debug(`Location update skipped: moved only ${distance.toFixed(1)}m`, { threshold: LOCATION_DEDUP_THRESHOLD });
        return false;
      }
    }

    this.lastSentLocation = { lat: location.lat, lng: location.lng };
    this.emit('location:update', location);
    return true;
  }

  // Reset location tracking (call when joining a new game)
  resetLocationTracking() {
    this.lastSentLocation = null;
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

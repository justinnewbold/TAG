/**
 * Offline/Low-Connectivity Mode Service
 * Cache game state, Bluetooth proximity, sync when reconnected
 */

import { cacheService } from './cacheService';

// Sync status
export const SYNC_STATUS = {
  SYNCED: 'synced',
  PENDING: 'pending',
  SYNCING: 'syncing',
  FAILED: 'failed',
  OFFLINE: 'offline',
};

// Action types that can be queued offline
export const OFFLINE_ACTION_TYPES = {
  LOCATION_UPDATE: 'location_update',
  TAG_ATTEMPT: 'tag_attempt',
  POWER_UP_USE: 'power_up_use',
  CHAT_MESSAGE: 'chat_message',
  CHECK_IN: 'check_in',
};

// Bluetooth constants
const BLUETOOTH_SERVICE_UUID = '00001234-0000-1000-8000-00805f9b34fb';
const BLUETOOTH_CHARACTERISTIC_UUID = '00001235-0000-1000-8000-00805f9b34fb';

class OfflineService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncStatus = SYNC_STATUS.SYNCED;
    this.offlineQueue = [];
    this.cachedGameState = null;
    this.bluetoothEnabled = false;
    this.nearbyPlayers = new Map();
    this.listeners = new Map();
    this.syncInterval = null;
    this.lastSyncTime = null;

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Load offline queue from storage
    this.loadOfflineQueue();
  }

  /**
   * Initialize offline service
   */
  async initialize() {
    await this.loadOfflineQueue();
    await this.loadCachedGameState();

    // Start sync interval
    this.startSyncInterval();

    // Check Bluetooth availability
    this.checkBluetoothAvailability();

    return {
      isOnline: this.isOnline,
      hasCachedState: !!this.cachedGameState,
      pendingActions: this.offlineQueue.length,
    };
  }

  /**
   * Handle coming online
   */
  async handleOnline() {
    this.isOnline = true;
    this.emit('online', {});

    // Attempt to sync
    await this.syncOfflineQueue();
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    this.isOnline = false;
    this.syncStatus = SYNC_STATUS.OFFLINE;
    this.emit('offline', {});
  }

  /**
   * Load offline queue from storage
   */
  async loadOfflineQueue() {
    try {
      const stored = await cacheService.get('offline_queue');
      if (stored && Array.isArray(stored)) {
        this.offlineQueue = stored;
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  /**
   * Save offline queue to storage
   */
  async saveOfflineQueue() {
    try {
      await cacheService.set('offline_queue', this.offlineQueue, Infinity);
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Add action to offline queue
   */
  async queueAction(action) {
    const queuedAction = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: action.type,
      data: action.data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    this.offlineQueue.push(queuedAction);
    await this.saveOfflineQueue();

    this.emit('action_queued', queuedAction);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncOfflineQueue();
    }

    return queuedAction;
  }

  /**
   * Sync offline queue with server
   */
  async syncOfflineQueue() {
    if (!this.isOnline || this.syncStatus === SYNC_STATUS.SYNCING) {
      return;
    }

    if (this.offlineQueue.length === 0) {
      this.syncStatus = SYNC_STATUS.SYNCED;
      return;
    }

    this.syncStatus = SYNC_STATUS.SYNCING;
    this.emit('sync_start', { count: this.offlineQueue.length });

    const results = {
      success: 0,
      failed: 0,
    };

    // Process queue in order
    const processQueue = [...this.offlineQueue];

    for (const action of processQueue) {
      try {
        await this.processOfflineAction(action);
        results.success++;

        // Remove from queue
        const index = this.offlineQueue.findIndex(a => a.id === action.id);
        if (index > -1) {
          this.offlineQueue.splice(index, 1);
        }
      } catch (error) {
        results.failed++;
        action.retries++;

        // Remove after 3 retries
        if (action.retries >= 3) {
          action.status = 'failed';
          const index = this.offlineQueue.findIndex(a => a.id === action.id);
          if (index > -1) {
            this.offlineQueue.splice(index, 1);
          }
        }
      }
    }

    await this.saveOfflineQueue();

    this.syncStatus = this.offlineQueue.length > 0 ? SYNC_STATUS.PENDING : SYNC_STATUS.SYNCED;
    this.lastSyncTime = Date.now();

    this.emit('sync_complete', results);
  }

  /**
   * Process a single offline action
   */
  async processOfflineAction(action) {
    const { api } = await import('./api');

    switch (action.type) {
      case OFFLINE_ACTION_TYPES.LOCATION_UPDATE:
        await api.request('/games/location', {
          method: 'POST',
          body: JSON.stringify(action.data),
        });
        break;

      case OFFLINE_ACTION_TYPES.TAG_ATTEMPT:
        await api.request('/games/tag', {
          method: 'POST',
          body: JSON.stringify(action.data),
        });
        break;

      case OFFLINE_ACTION_TYPES.POWER_UP_USE:
        await api.request('/games/powerup/use', {
          method: 'POST',
          body: JSON.stringify(action.data),
        });
        break;

      case OFFLINE_ACTION_TYPES.CHAT_MESSAGE:
        await api.request('/games/chat', {
          method: 'POST',
          body: JSON.stringify(action.data),
        });
        break;

      case OFFLINE_ACTION_TYPES.CHECK_IN:
        await api.request('/games/checkin', {
          method: 'POST',
          body: JSON.stringify(action.data),
        });
        break;

      default:
        console.warn('Unknown offline action type:', action.type);
    }
  }

  /**
   * Start sync interval
   */
  startSyncInterval() {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.offlineQueue.length > 0) {
        this.syncOfflineQueue();
      }
    }, 30000); // Try every 30 seconds
  }

  /**
   * Stop sync interval
   */
  stopSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // ============ GAME STATE CACHING ============

  /**
   * Cache current game state
   */
  async cacheGameState(gameState) {
    this.cachedGameState = {
      ...gameState,
      cachedAt: Date.now(),
    };

    await cacheService.set('cached_game_state', this.cachedGameState, Infinity);
  }

  /**
   * Load cached game state
   */
  async loadCachedGameState() {
    try {
      this.cachedGameState = await cacheService.get('cached_game_state');
      return this.cachedGameState;
    } catch (error) {
      console.error('Failed to load cached game state:', error);
      return null;
    }
  }

  /**
   * Get cached game state
   */
  getCachedGameState() {
    return this.cachedGameState;
  }

  /**
   * Clear cached game state
   */
  async clearCachedGameState() {
    this.cachedGameState = null;
    await cacheService.remove('cached_game_state');
  }

  // ============ BLUETOOTH PROXIMITY ============

  /**
   * Check Bluetooth availability
   */
  async checkBluetoothAvailability() {
    if (!navigator.bluetooth) {
      this.bluetoothEnabled = false;
      return false;
    }

    try {
      const available = await navigator.bluetooth.getAvailability();
      this.bluetoothEnabled = available;
      return available;
    } catch (error) {
      console.error('Bluetooth availability check failed:', error);
      this.bluetoothEnabled = false;
      return false;
    }
  }

  /**
   * Start Bluetooth scanning for nearby players
   */
  async startBluetoothScanning() {
    if (!this.bluetoothEnabled) {
      console.warn('Bluetooth not available');
      return false;
    }

    try {
      // Request device with our service
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLUETOOTH_SERVICE_UUID] }],
        optionalServices: [BLUETOOTH_SERVICE_UUID],
      });

      // Connect to GATT server
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(BLUETOOTH_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(BLUETOOTH_CHARACTERISTIC_UUID);

      // Listen for notifications
      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        this.handleBluetoothData(event.target.value);
      });

      await characteristic.startNotifications();

      this.emit('bluetooth_connected', { device: device.name });
      return true;
    } catch (error) {
      console.error('Bluetooth scanning failed:', error);
      return false;
    }
  }

  /**
   * Handle Bluetooth data from nearby players
   */
  handleBluetoothData(dataView) {
    try {
      const decoder = new TextDecoder();
      const data = JSON.parse(decoder.decode(dataView.buffer));

      if (data.playerId && data.gameId) {
        this.nearbyPlayers.set(data.playerId, {
          ...data,
          lastSeen: Date.now(),
          rssi: data.rssi || -50, // Signal strength
        });

        this.emit('nearby_player', data);

        // Clean up old entries
        this.cleanupNearbyPlayers();
      }
    } catch (error) {
      console.error('Failed to parse Bluetooth data:', error);
    }
  }

  /**
   * Advertise player via Bluetooth (for others to discover)
   */
  async advertisePlayer(playerId, gameId) {
    // Note: Web Bluetooth doesn't support advertising directly
    // This would require a native app or service worker
    console.warn('Bluetooth advertising requires native implementation');
    return false;
  }

  /**
   * Get nearby players from Bluetooth
   */
  getNearbyPlayers() {
    return Array.from(this.nearbyPlayers.values());
  }

  /**
   * Clean up old nearby player entries
   */
  cleanupNearbyPlayers() {
    const timeout = 30000; // 30 seconds
    const now = Date.now();

    for (const [playerId, data] of this.nearbyPlayers) {
      if (now - data.lastSeen > timeout) {
        this.nearbyPlayers.delete(playerId);
      }
    }
  }

  /**
   * Estimate distance from RSSI (signal strength)
   */
  estimateDistanceFromRSSI(rssi) {
    // Simple path loss model
    // Distance = 10 ^ ((TxPower - RSSI) / (10 * n))
    // Assuming TxPower = -59 dBm and n = 2 (free space)
    const txPower = -59;
    const n = 2;
    return Math.pow(10, (txPower - rssi) / (10 * n));
  }

  /**
   * Check if player is within tag range via Bluetooth
   */
  isPlayerInBluetoothRange(playerId, maxDistance = 5) {
    const player = this.nearbyPlayers.get(playerId);
    if (!player) return false;

    const distance = this.estimateDistanceFromRSSI(player.rssi);
    return distance <= maxDistance;
  }

  // ============ EVENT EMITTER ============

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const listeners = this.listeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    for (const callback of this.listeners.get(event)) {
      callback(data);
    }
  }

  // ============ STATUS ============

  /**
   * Get current status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      syncStatus: this.syncStatus,
      pendingActions: this.offlineQueue.length,
      lastSyncTime: this.lastSyncTime,
      bluetoothEnabled: this.bluetoothEnabled,
      nearbyPlayers: this.nearbyPlayers.size,
      hasCachedState: !!this.cachedGameState,
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopSyncInterval();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}

// Singleton
export const offlineService = new OfflineService();
export default offlineService;

/**
 * Smart Watch Service
 * Handles communication with wearable devices (Apple Watch, Wear OS, etc.)
 * Provides haptic feedback, notifications, and quick glance data
 */

// Watch Connection States
export const WATCH_CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
};

// Haptic Patterns
export const HAPTIC_PATTERNS = {
  // Game events
  TAG_INCOMING: { pattern: [100, 50, 100, 50, 100], intensity: 'strong' },
  TAGGED: { pattern: [500], intensity: 'strong' },
  TAG_SUCCESS: { pattern: [50, 30, 50], intensity: 'medium' },
  GAME_START: { pattern: [100, 100, 100], intensity: 'medium' },
  GAME_END: { pattern: [200, 100, 200, 100, 200], intensity: 'strong' },

  // Proximity alerts
  DANGER_NEAR: { pattern: [100, 50, 100], intensity: 'strong' },
  DANGER_FAR: { pattern: [50], intensity: 'light' },
  PLAYER_NEARBY: { pattern: [30], intensity: 'light' },

  // Zone alerts
  ZONE_SHRINKING: { pattern: [100, 200, 100], intensity: 'medium' },
  ZONE_WARNING: { pattern: [200, 100, 200], intensity: 'strong' },
  OUT_OF_BOUNDS: { pattern: [100, 50, 100, 50, 100, 50, 100], intensity: 'strong' },

  // Power-ups
  POWERUP_AVAILABLE: { pattern: [50, 50, 50], intensity: 'light' },
  POWERUP_COLLECTED: { pattern: [100, 50, 100], intensity: 'medium' },
  POWERUP_EXPIRING: { pattern: [50, 100, 50], intensity: 'medium' },

  // UI feedback
  NOTIFICATION: { pattern: [50], intensity: 'light' },
  SUCCESS: { pattern: [50, 30, 50], intensity: 'light' },
  ERROR: { pattern: [200, 100, 200], intensity: 'medium' },
};

// Complication Types (for watch face)
export const COMPLICATION_TYPES = {
  GAME_STATUS: 'game_status',
  DISTANCE_TO_IT: 'distance_to_it',
  SURVIVAL_TIME: 'survival_time',
  TAG_COUNT: 'tag_count',
  ZONE_TIMER: 'zone_timer',
  SCORE: 'score',
};

class SmartWatchService {
  constructor() {
    this.connectionState = WATCH_CONNECTION_STATE.DISCONNECTED;
    this.watchType = null; // 'apple', 'wearos', 'generic'
    this.isSupported = false;
    this.listeners = new Map();

    // Game state for watch
    this.gameState = {
      isInGame: false,
      role: null,
      survivalTime: 0,
      tagCount: 0,
      nearestThreat: null,
      zoneTimer: null,
      score: 0,
      activePowerups: [],
    };

    // Settings
    this.settings = {
      hapticEnabled: true,
      hapticIntensity: 'medium', // light, medium, strong
      proximityAlerts: true,
      proximityThreshold: 50, // meters
      quickActions: ['tag', 'powerup', 'chat'],
      complicationRefreshRate: 5000, // ms
    };

    // Check for watch connectivity
    this.checkSupport();
  }

  /**
   * Check for smart watch support
   */
  async checkSupport() {
    // Check for Web Bluetooth (for generic watches)
    const hasBluetooth = 'bluetooth' in navigator;

    // Check for Vibration API (basic haptic)
    const hasVibration = 'vibrate' in navigator;

    // Check for WakeLock API (keep connection alive)
    const hasWakeLock = 'wakeLock' in navigator;

    this.isSupported = hasVibration; // At minimum, vibration support

    return {
      supported: this.isSupported,
      hasBluetooth,
      hasVibration,
      hasWakeLock,
    };
  }

  /**
   * Connect to smart watch
   */
  async connect(watchType = 'generic') {
    if (!this.isSupported) {
      return { success: false, error: 'Smart watch features not supported' };
    }

    this.connectionState = WATCH_CONNECTION_STATE.CONNECTING;
    this.watchType = watchType;

    try {
      switch (watchType) {
        case 'apple':
          await this.connectAppleWatch();
          break;
        case 'wearos':
          await this.connectWearOS();
          break;
        default:
          await this.connectGeneric();
      }

      this.connectionState = WATCH_CONNECTION_STATE.CONNECTED;
      this.emit('connected', { watchType });

      // Start complication updates
      this.startComplicationUpdates();

      return { success: true };
    } catch (error) {
      this.connectionState = WATCH_CONNECTION_STATE.ERROR;
      return { success: false, error: error.message };
    }
  }

  /**
   * Connect to Apple Watch (via companion app/WKWatchConnectivity)
   */
  async connectAppleWatch() {
    // In a real implementation, this would use the native iOS bridge
    // For web, we simulate via localStorage/BroadcastChannel
    this.watchChannel = new BroadcastChannel('tag_watch_channel');

    this.watchChannel.onmessage = (event) => {
      this.handleWatchMessage(event.data);
    };

    // Send initial handshake
    this.sendToWatch({ type: 'handshake', timestamp: Date.now() });
  }

  /**
   * Connect to Wear OS watch
   */
  async connectWearOS() {
    // Use Web Bluetooth to connect to Wear OS
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not available');
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }], // Example service
        optionalServices: ['battery_service'],
      });

      this.bluetoothDevice = device;

      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnect();
      });

      // Connect to GATT server
      const server = await device.gatt.connect();
      this.gattServer = server;
    } catch (error) {
      throw new Error(`Bluetooth connection failed: ${error.message}`);
    }
  }

  /**
   * Connect using generic method (phone vibration as fallback)
   */
  async connectGeneric() {
    // Use phone's vibration API as fallback
    if (!navigator.vibrate) {
      throw new Error('Vibration not available');
    }

    // Test vibration
    navigator.vibrate(50);
  }

  /**
   * Handle messages from watch
   */
  handleWatchMessage(data) {
    switch (data.type) {
      case 'action':
        this.handleWatchAction(data.action, data.payload);
        break;
      case 'heartbeat':
        this.lastHeartbeat = Date.now();
        break;
      case 'sensor_data':
        this.handleSensorData(data.sensors);
        break;
    }
  }

  /**
   * Handle quick actions from watch
   */
  handleWatchAction(action, payload) {
    switch (action) {
      case 'tag':
        this.emit('quick_action', { action: 'tag' });
        break;
      case 'powerup':
        this.emit('quick_action', { action: 'use_powerup', powerupIndex: payload?.index || 0 });
        break;
      case 'chat':
        this.emit('quick_action', { action: 'quick_chat', message: payload?.message });
        break;
      case 'sos':
        this.emit('quick_action', { action: 'sos' });
        break;
    }
  }

  /**
   * Handle sensor data from watch
   */
  handleSensorData(sensors) {
    if (sensors.heartRate) {
      this.emit('heart_rate', { bpm: sensors.heartRate });
    }

    if (sensors.steps) {
      this.emit('steps', { count: sensors.steps });
    }
  }

  /**
   * Send data to watch
   */
  sendToWatch(data) {
    switch (this.watchType) {
      case 'apple':
      case 'generic':
        if (this.watchChannel) {
          this.watchChannel.postMessage(data);
        }
        break;
      case 'wearos':
        // Send via Bluetooth characteristic
        if (this.gattServer) {
          // Implementation depends on watch app's service UUID
        }
        break;
    }
  }

  /**
   * Trigger haptic feedback
   */
  triggerHaptic(patternName) {
    if (!this.settings.hapticEnabled) return;

    const pattern = HAPTIC_PATTERNS[patternName];
    if (!pattern) return;

    // Adjust intensity
    let vibrationPattern = [...pattern.pattern];
    if (this.settings.hapticIntensity === 'light') {
      vibrationPattern = vibrationPattern.map(v => Math.round(v * 0.5));
    } else if (this.settings.hapticIntensity === 'strong') {
      vibrationPattern = vibrationPattern.map(v => Math.round(v * 1.5));
    }

    // Use native vibration
    if (navigator.vibrate) {
      navigator.vibrate(vibrationPattern);
    }

    // Also send to watch
    this.sendToWatch({
      type: 'haptic',
      pattern: patternName,
      vibration: vibrationPattern,
    });

    this.emit('haptic', { pattern: patternName });
  }

  /**
   * Update game state for watch display
   */
  updateGameState(state) {
    this.gameState = { ...this.gameState, ...state };

    // Send to watch
    this.sendToWatch({
      type: 'game_state',
      state: this.gameState,
    });

    // Trigger haptics based on state changes
    this.checkStateHaptics(state);
  }

  /**
   * Check if state changes should trigger haptics
   */
  checkStateHaptics(state) {
    // Proximity alert
    if (state.nearestThreat && this.settings.proximityAlerts) {
      const distance = state.nearestThreat.distance;

      if (distance < 20) {
        this.triggerHaptic('DANGER_NEAR');
      } else if (distance < this.settings.proximityThreshold) {
        this.triggerHaptic('DANGER_FAR');
      }
    }

    // Zone warning
    if (state.zoneWarning) {
      this.triggerHaptic('ZONE_WARNING');
    }

    // Out of bounds
    if (state.outOfBounds) {
      this.triggerHaptic('OUT_OF_BOUNDS');
    }
  }

  /**
   * Send notification to watch
   */
  sendNotification(notification) {
    this.sendToWatch({
      type: 'notification',
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        priority: notification.priority || 'default',
        actions: notification.actions || [],
      },
    });

    // Trigger haptic for notification
    this.triggerHaptic('NOTIFICATION');
  }

  /**
   * Get complication data
   */
  getComplicationData(type) {
    switch (type) {
      case COMPLICATION_TYPES.GAME_STATUS:
        return {
          value: this.gameState.isInGame ? 'In Game' : 'Lobby',
          icon: this.gameState.isInGame ? '🎮' : '⏳',
          color: this.gameState.isInGame ? '#4CAF50' : '#9E9E9E',
        };

      case COMPLICATION_TYPES.DISTANCE_TO_IT:
        return {
          value: this.gameState.nearestThreat
            ? `${this.gameState.nearestThreat.distance}m`
            : '---',
          icon: '📍',
          color: this.gameState.nearestThreat?.distance < 50 ? '#F44336' : '#FF9800',
          direction: this.gameState.nearestThreat?.direction,
        };

      case COMPLICATION_TYPES.SURVIVAL_TIME:
        return {
          value: this.formatTime(this.gameState.survivalTime),
          icon: '⏱️',
          color: '#2196F3',
        };

      case COMPLICATION_TYPES.TAG_COUNT:
        return {
          value: this.gameState.tagCount.toString(),
          icon: '🏃',
          color: '#4CAF50',
        };

      case COMPLICATION_TYPES.ZONE_TIMER:
        return {
          value: this.gameState.zoneTimer
            ? this.formatTime(this.gameState.zoneTimer)
            : '---',
          icon: '🌀',
          color: this.gameState.zoneTimer < 30 ? '#F44336' : '#FF9800',
        };

      case COMPLICATION_TYPES.SCORE:
        return {
          value: this.gameState.score.toString(),
          icon: '⭐',
          color: '#FFD700',
        };

      default:
        return null;
    }
  }

  /**
   * Format time for display
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Start complication updates
   */
  startComplicationUpdates() {
    if (this.complicationInterval) return;

    this.complicationInterval = setInterval(() => {
      const complications = {};

      Object.values(COMPLICATION_TYPES).forEach(type => {
        complications[type] = this.getComplicationData(type);
      });

      this.sendToWatch({
        type: 'complications',
        data: complications,
      });
    }, this.settings.complicationRefreshRate);
  }

  /**
   * Stop complication updates
   */
  stopComplicationUpdates() {
    if (this.complicationInterval) {
      clearInterval(this.complicationInterval);
      this.complicationInterval = null;
    }
  }

  /**
   * Get quick actions for watch
   */
  getQuickActions() {
    const actions = [];

    if (this.gameState.isInGame) {
      // In-game actions
      if (this.gameState.role === 'hunter') {
        actions.push({
          id: 'tag',
          label: 'Tag!',
          icon: '👆',
          color: '#F44336',
        });
      }

      if (this.gameState.activePowerups.length > 0) {
        actions.push({
          id: 'powerup',
          label: 'Use Power-up',
          icon: '⚡',
          color: '#FFD700',
        });
      }

      actions.push({
        id: 'chat',
        label: 'Quick Chat',
        icon: '💬',
        color: '#2196F3',
      });
    }

    // Always available
    actions.push({
      id: 'sos',
      label: 'SOS',
      icon: '🆘',
      color: '#FF5722',
    });

    return actions;
  }

  /**
   * Handle game events
   */
  handleGameEvent(event, data) {
    switch (event) {
      case 'tag_incoming':
        this.triggerHaptic('TAG_INCOMING');
        this.sendNotification({
          title: 'Incoming!',
          body: `${data.hunterName} is ${data.distance}m away!`,
          priority: 'high',
        });
        break;

      case 'tagged':
        this.triggerHaptic('TAGGED');
        this.sendNotification({
          title: 'Tagged!',
          body: `You were tagged by ${data.taggerName}`,
        });
        break;

      case 'tag_success':
        this.triggerHaptic('TAG_SUCCESS');
        this.sendNotification({
          title: 'Tag Success!',
          body: `You tagged ${data.targetName}`,
        });
        break;

      case 'game_start':
        this.triggerHaptic('GAME_START');
        this.updateGameState({ isInGame: true });
        break;

      case 'game_end':
        this.triggerHaptic('GAME_END');
        this.updateGameState({ isInGame: false });
        break;

      case 'zone_shrinking':
        this.triggerHaptic('ZONE_SHRINKING');
        this.updateGameState({ zoneTimer: data.timeLeft });
        break;

      case 'powerup_collected':
        this.triggerHaptic('POWERUP_COLLECTED');
        break;

      case 'powerup_available':
        this.triggerHaptic('POWERUP_AVAILABLE');
        break;
    }
  }

  /**
   * Handle disconnect
   */
  handleDisconnect() {
    this.connectionState = WATCH_CONNECTION_STATE.DISCONNECTED;
    this.stopComplicationUpdates();
    this.emit('disconnected');
  }

  /**
   * Disconnect from watch
   */
  disconnect() {
    this.stopComplicationUpdates();

    if (this.watchChannel) {
      this.watchChannel.close();
      this.watchChannel = null;
    }

    if (this.bluetoothDevice) {
      this.bluetoothDevice.gatt.disconnect();
      this.bluetoothDevice = null;
    }

    this.connectionState = WATCH_CONNECTION_STATE.DISCONNECTED;
    this.emit('disconnected');
  }

  /**
   * Update settings
   */
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };

    this.sendToWatch({
      type: 'settings',
      settings: this.settings,
    });

    this.emit('settings_changed', this.settings);
  }

  // Event emitter
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
}

export const smartWatchService = new SmartWatchService();
export default smartWatchService;

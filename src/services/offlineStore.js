// Offline Storage Service using IndexedDB
// Provides caching for game data when network is unavailable

const DB_NAME = 'tag-offline-db';
const DB_VERSION = 1;

class OfflineStore {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.pendingActions = [];
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingActions();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store for game data
        if (!db.objectStoreNames.contains('games')) {
          const gamesStore = db.createObjectStore('games', { keyPath: 'id' });
          gamesStore.createIndex('code', 'code', { unique: true });
          gamesStore.createIndex('status', 'status', { unique: false });
        }

        // Store for user location history (for heat maps)
        if (!db.objectStoreNames.contains('locationHistory')) {
          const locationStore = db.createObjectStore('locationHistory', { keyPath: 'id', autoIncrement: true });
          locationStore.createIndex('gameId', 'gameId', { unique: false });
          locationStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store for pending actions (to sync when back online)
        if (!db.objectStoreNames.contains('pendingActions')) {
          db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
        }

        // Store for player stats cache
        if (!db.objectStoreNames.contains('stats')) {
          db.createObjectStore('stats', { keyPath: 'userId' });
        }

        // Store for power-up inventory
        if (!db.objectStoreNames.contains('powerups')) {
          db.createObjectStore('powerups', { keyPath: 'id' });
        }
      };
    });
  }

  // Game caching
  async cacheGame(game) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['games'], 'readwrite');
      const store = transaction.objectStore('games');
      const request = store.put({
        ...game,
        cachedAt: Date.now(),
      });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedGame(gameId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['games'], 'readonly');
      const store = transaction.objectStore('games');
      const request = store.get(gameId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedGameByCode(code) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['games'], 'readonly');
      const store = transaction.objectStore('games');
      const index = store.index('code');
      const request = index.get(code);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCachedGames() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['games'], 'readonly');
      const store = transaction.objectStore('games');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Location history for heat maps
  async recordLocation(gameId, location) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['locationHistory'], 'readwrite');
      const store = transaction.objectStore('locationHistory');
      const request = store.add({
        gameId,
        lat: location.lat,
        lng: location.lng,
        timestamp: Date.now(),
      });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getLocationHistory(gameId = null) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['locationHistory'], 'readonly');
      const store = transaction.objectStore('locationHistory');
      
      if (gameId) {
        const index = store.index('gameId');
        const request = index.getAll(gameId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  // Pending actions queue (for offline mode)
  async queueAction(action) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingActions'], 'readwrite');
      const store = transaction.objectStore('pendingActions');
      const request = store.add({
        type: action.type,
        payload: action.payload,
        timestamp: Date.now(),
      });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingActions() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingActions'], 'readonly');
      const store = transaction.objectStore('pendingActions');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingAction(id) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingActions'], 'readwrite');
      const store = transaction.objectStore('pendingActions');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async syncPendingActions() {
    const actions = await this.getPendingActions();
    
    for (const action of actions) {
      try {
        // Import api dynamically to avoid circular dependency
        const { api } = await import('./api.js');
        
        switch (action.type) {
          case 'TAG_PLAYER':
            await api.tagPlayer(action.payload.gameId, action.payload.targetId);
            break;
          case 'UPDATE_LOCATION':
            // Location updates don't need to be replayed
            break;
          case 'END_GAME':
            await api.endGame(action.payload.gameId);
            break;
          default:
            console.log('Unknown pending action type:', action.type);
        }
        
        await this.clearPendingAction(action.id);
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        // Keep in queue for next attempt
      }
    }
  }

  // Power-up inventory
  async savePowerups(powerups) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['powerups'], 'readwrite');
    const store = transaction.objectStore('powerups');
    
    // Clear existing
    await new Promise((resolve) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = resolve;
    });
    
    // Add new ones
    for (const powerup of powerups) {
      store.add(powerup);
    }
  }

  async getPowerups() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['powerups'], 'readonly');
      const store = transaction.objectStore('powerups');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generate heat map data from location history
  async generateHeatMapData(gameId = null) {
    const locations = await this.getLocationHistory(gameId);
    
    // Group locations into grid cells
    const gridSize = 0.0001; // ~10 meters
    const grid = {};
    
    locations.forEach(loc => {
      const gridLat = Math.floor(loc.lat / gridSize) * gridSize;
      const gridLng = Math.floor(loc.lng / gridSize) * gridSize;
      const key = `${gridLat},${gridLng}`;
      
      if (!grid[key]) {
        grid[key] = { lat: gridLat, lng: gridLng, count: 0 };
      }
      grid[key].count++;
    });
    
    // Convert to array and normalize intensity
    const cells = Object.values(grid);
    const maxCount = Math.max(...cells.map(c => c.count), 1);
    
    return cells.map(cell => ({
      lat: cell.lat + gridSize / 2,
      lng: cell.lng + gridSize / 2,
      intensity: cell.count / maxCount,
    }));
  }

  // Check if we're offline
  get offline() {
    return !this.isOnline;
  }
}

export const offlineStore = new OfflineStore();

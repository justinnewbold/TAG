/**
 * Offline Queue Service
 * Queues actions when offline and syncs when back online
 */

const QUEUE_KEY = 'tag-offline-queue';
const MAX_QUEUE_SIZE = 100;
const LOCATION_DEDUPE_THRESHOLD = 5; // meters

class OfflineQueueService {
  constructor() {
    this.queue = this._loadQueue();
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.listeners = new Set();

    // Listen for online/offline events
    window.addEventListener('online', () => this._handleOnline());
    window.addEventListener('offline', () => this._handleOffline());
  }

  _loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  _saveQueue() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      // Storage full - remove oldest items
      if (this.queue.length > 10) {
        this.queue = this.queue.slice(-10);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
      }
    }
  }

  _handleOnline() {
    this.isOnline = true;
    this._notifyListeners({ type: 'online' });
    this.sync();
  }

  _handleOffline() {
    this.isOnline = false;
    this._notifyListeners({ type: 'offline' });
  }

  _notifyListeners(event) {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Subscribe to offline queue events
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current online status
   */
  getOnlineStatus() {
    return this.isOnline;
  }

  /**
   * Get queue length
   */
  getQueueLength() {
    return this.queue.length;
  }

  /**
   * Queue a location update
   */
  queueLocationUpdate(location) {
    // Dedupe - don't queue if very close to last queued location
    const lastLocation = this.queue
      .filter(item => item.type === 'location')
      .pop();

    if (lastLocation) {
      const distance = this._getDistance(
        lastLocation.data.lat,
        lastLocation.data.lng,
        location.lat,
        location.lng
      );
      if (distance < LOCATION_DEDUPE_THRESHOLD) {
        return; // Skip duplicate
      }
    }

    this._addToQueue({
      type: 'location',
      data: location,
      timestamp: Date.now(),
    });
  }

  /**
   * Queue a tag attempt
   */
  queueTagAttempt(targetId) {
    this._addToQueue({
      type: 'tag',
      data: { targetId },
      timestamp: Date.now(),
    });
  }

  /**
   * Queue a generic action
   */
  queueAction(type, data) {
    this._addToQueue({
      type,
      data,
      timestamp: Date.now(),
    });
  }

  _addToQueue(item) {
    // Enforce max queue size
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      // Remove oldest location updates first (keep other actions)
      const locationIndex = this.queue.findIndex(i => i.type === 'location');
      if (locationIndex !== -1) {
        this.queue.splice(locationIndex, 1);
      } else {
        this.queue.shift();
      }
    }

    this.queue.push(item);
    this._saveQueue();
    this._notifyListeners({ type: 'queued', item });
  }

  /**
   * Sync queued items to server
   */
  async sync(socketService) {
    if (!this.isOnline || this.syncInProgress || this.queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    this.syncInProgress = true;
    this._notifyListeners({ type: 'sync_start', queueLength: this.queue.length });

    let synced = 0;
    let failed = 0;
    const failedItems = [];

    // Process queue in order
    while (this.queue.length > 0) {
      const item = this.queue[0];

      try {
        await this._syncItem(item, socketService);
        this.queue.shift(); // Remove successfully synced item
        synced++;
      } catch (error) {
        // If we're offline again, stop syncing
        if (!navigator.onLine) {
          break;
        }

        // For failed items, keep tag attempts but drop old locations
        if (item.type === 'tag') {
          failedItems.push(item);
        }
        this.queue.shift();
        failed++;
      }
    }

    // Re-add failed important items
    this.queue = [...failedItems, ...this.queue];
    this._saveQueue();

    this.syncInProgress = false;
    this._notifyListeners({ type: 'sync_complete', synced, failed });

    return { synced, failed };
  }

  async _syncItem(item, socketService) {
    if (!socketService?.connected) {
      throw new Error('Socket not connected');
    }

    switch (item.type) {
      case 'location':
        socketService.emit('location:update', item.data);
        break;
      case 'tag':
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
          socketService.emit('tag:attempt', item.data);
          // For tag attempts, we wait for acknowledgment
          socketService.once('tag:result', (result) => {
            clearTimeout(timeout);
            if (result.success) {
              resolve(result);
            } else {
              reject(new Error(result.error));
            }
          });
        });
      default:
        socketService.emit(item.type, item.data);
    }
  }

  /**
   * Clear the queue
   */
  clearQueue() {
    this.queue = [];
    this._saveQueue();
    this._notifyListeners({ type: 'cleared' });
  }

  /**
   * Haversine distance calculation
   */
  _getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueService();

export default offlineQueue;

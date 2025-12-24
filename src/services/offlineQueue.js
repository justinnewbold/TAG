/**
 * Offline Queue Service
 * Queues failed API requests when offline and retries when back online.
 */

const STORAGE_KEY = 'tag-offline-queue';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

class OfflineQueueService {
  constructor() {
    this.queue = this._loadQueue();
    this.isProcessing = false;
    this.onlineListeners = new Set();

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this._handleOnline());
      window.addEventListener('offline', () => this._handleOffline());
    }
  }

  /**
   * Check if browser is currently online
   */
  isOnline() {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Add a listener for online status changes
   */
  onStatusChange(callback) {
    this.onlineListeners.add(callback);
    return () => this.onlineListeners.delete(callback);
  }

  /**
   * Queue a request to be retried later
   * @param {string} endpoint - API endpoint
   * @param {object} options - Fetch options (method, body, etc)
   * @param {object} metadata - Additional metadata for retry logic
   */
  enqueue(endpoint, options, metadata = {}) {
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      endpoint,
      options,
      metadata,
      attempts: 0,
      createdAt: Date.now(),
    };

    this.queue.push(item);
    this._saveQueue();

    if (import.meta.env.DEV) {
      console.log(`[OfflineQueue] Queued request: ${options.method || 'GET'} ${endpoint}`);
    }

    return item.id;
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      pending: this.queue.length,
      isProcessing: this.isProcessing,
      isOnline: this.isOnline(),
    };
  }

  /**
   * Clear all queued requests
   */
  clear() {
    this.queue = [];
    this._saveQueue();
  }

  /**
   * Manually trigger queue processing
   */
  async processQueue(requestFn) {
    if (this.isProcessing || !this.isOnline() || this.queue.length === 0) {
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;

    if (import.meta.env.DEV) {
      console.log(`[OfflineQueue] Processing ${this.queue.length} queued requests...`);
    }

    // Process queue items in order
    const itemsToProcess = [...this.queue];

    for (const item of itemsToProcess) {
      try {
        await requestFn(item.endpoint, item.options);

        // Remove successful item from queue
        this.queue = this.queue.filter(q => q.id !== item.id);
        processed++;

        if (import.meta.env.DEV) {
          console.log(`[OfflineQueue] Successfully processed: ${item.options.method || 'GET'} ${item.endpoint}`);
        }
      } catch (error) {
        item.attempts++;

        if (item.attempts >= MAX_RETRY_ATTEMPTS) {
          // Remove item after max retries
          this.queue = this.queue.filter(q => q.id !== item.id);
          failed++;

          if (import.meta.env.DEV) {
            console.log(`[OfflineQueue] Failed after ${MAX_RETRY_ATTEMPTS} attempts: ${item.endpoint}`, error.message);
          }
        } else {
          if (import.meta.env.DEV) {
            console.log(`[OfflineQueue] Retry ${item.attempts}/${MAX_RETRY_ATTEMPTS} for: ${item.endpoint}`);
          }
        }
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this._saveQueue();
    this.isProcessing = false;

    return { processed, failed };
  }

  _handleOnline() {
    if (import.meta.env.DEV) {
      console.log('[OfflineQueue] Back online');
    }
    this.onlineListeners.forEach(cb => cb(true));

    // Wait a moment before processing to allow network to stabilize
    setTimeout(() => {
      if (this.queue.length > 0) {
        // Emit event for the app to handle queue processing
        window.dispatchEvent(new CustomEvent('offlineQueueReady', {
          detail: { count: this.queue.length }
        }));
      }
    }, RETRY_DELAY_MS);
  }

  _handleOffline() {
    if (import.meta.env.DEV) {
      console.log('[OfflineQueue] Went offline');
    }
    this.onlineListeners.forEach(cb => cb(false));
  }

  _loadQueue() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const queue = JSON.parse(stored);
        // Filter out very old items (older than 24 hours)
        const maxAge = 24 * 60 * 60 * 1000;
        return queue.filter(item => Date.now() - item.createdAt < maxAge);
      }
    } catch (e) {
      console.warn('[OfflineQueue] Failed to load queue:', e);
    }
    return [];
  }

  _saveQueue() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.warn('[OfflineQueue] Failed to save queue:', e);
    }
  }
}

export const offlineQueue = new OfflineQueueService();

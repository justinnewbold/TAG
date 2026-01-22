/**
 * useOffline Hook
 * React hook for offline status and queue management
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineQueue } from '../services/offlineQueue';
import { socketService } from '../services/socket';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(offlineQueue.getOnlineStatus());
  const [queueLength, setQueueLength] = useState(offlineQueue.getQueueLength());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  useEffect(() => {
    const unsubscribe = offlineQueue.subscribe((event) => {
      switch (event.type) {
        case 'online':
          setIsOnline(true);
          break;
        case 'offline':
          setIsOnline(false);
          break;
        case 'queued':
          setQueueLength(offlineQueue.getQueueLength());
          break;
        case 'sync_start':
          setIsSyncing(true);
          break;
        case 'sync_complete':
          setIsSyncing(false);
          setQueueLength(offlineQueue.getQueueLength());
          setLastSyncResult({ synced: event.synced, failed: event.failed });
          break;
        case 'cleared':
          setQueueLength(0);
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queueLength > 0 && !isSyncing) {
      offlineQueue.sync(socketService);
    }
  }, [isOnline, queueLength, isSyncing]);

  const manualSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    return offlineQueue.sync(socketService);
  }, [isOnline, isSyncing]);

  const clearQueue = useCallback(() => {
    offlineQueue.clearQueue();
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    queueLength,
    isSyncing,
    lastSyncResult,
    manualSync,
    clearQueue,
  };
}

export default useOffline;

/**
 * Hook for integrating offline sync functionality into components
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineService, SYNC_STATUS, OFFLINE_ACTION_TYPES } from '../services/offlineService';

export function useOfflineSync() {
  const [status, setStatus] = useState(() => offlineService.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Initialize offline service
    offlineService.initialize();

    // Subscribe to events
    const unsubOnline = offlineService.on('online', () => {
      setStatus(offlineService.getStatus());
    });

    const unsubOffline = offlineService.on('offline', () => {
      setStatus(offlineService.getStatus());
    });

    const unsubSyncStart = offlineService.on('sync_start', () => {
      setIsSyncing(true);
      setStatus(offlineService.getStatus());
    });

    const unsubSyncComplete = offlineService.on('sync_complete', () => {
      setIsSyncing(false);
      setStatus(offlineService.getStatus());
    });

    const unsubActionQueued = offlineService.on('action_queued', () => {
      setStatus(offlineService.getStatus());
    });

    return () => {
      unsubOnline();
      unsubOffline();
      unsubSyncStart();
      unsubSyncComplete();
      unsubActionQueued();
    };
  }, []);

  // Queue a location update
  const queueLocationUpdate = useCallback(async (location, gameId) => {
    return offlineService.queueAction({
      type: OFFLINE_ACTION_TYPES.LOCATION_UPDATE,
      data: { location, gameId },
    });
  }, []);

  // Queue a tag attempt
  const queueTagAttempt = useCallback(async (targetId, gameId) => {
    return offlineService.queueAction({
      type: OFFLINE_ACTION_TYPES.TAG_ATTEMPT,
      data: { targetId, gameId },
    });
  }, []);

  // Queue a power-up use
  const queuePowerUpUse = useCallback(async (powerUpId, gameId) => {
    return offlineService.queueAction({
      type: OFFLINE_ACTION_TYPES.POWER_UP_USE,
      data: { powerUpId, gameId },
    });
  }, []);

  // Queue a chat message
  const queueChatMessage = useCallback(async (message, gameId) => {
    return offlineService.queueAction({
      type: OFFLINE_ACTION_TYPES.CHAT_MESSAGE,
      data: { message, gameId },
    });
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (status.isOnline) {
      await offlineService.syncOfflineQueue();
    }
  }, [status.isOnline]);

  // Cache game state
  const cacheGameState = useCallback(async (gameState) => {
    await offlineService.cacheGameState(gameState);
  }, []);

  // Get cached game state
  const getCachedGameState = useCallback(() => {
    return offlineService.getCachedGameState();
  }, []);

  // Clear cached game state
  const clearCachedGameState = useCallback(async () => {
    await offlineService.clearCachedGameState();
  }, []);

  return {
    // Status
    isOnline: status.isOnline,
    syncStatus: status.syncStatus,
    pendingActions: status.pendingActions,
    lastSyncTime: status.lastSyncTime,
    isSyncing,
    hasCachedState: status.hasCachedState,

    // Actions
    queueLocationUpdate,
    queueTagAttempt,
    queuePowerUpUse,
    queueChatMessage,
    triggerSync,

    // Game state caching
    cacheGameState,
    getCachedGameState,
    clearCachedGameState,

    // Status constants
    SYNC_STATUS,
  };
}

export default useOfflineSync;

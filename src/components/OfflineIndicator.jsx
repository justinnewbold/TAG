/**
 * OfflineIndicator Component
 * Shows offline status and queued actions
 */

import React from 'react';
import { WifiOff, CloudOff, RefreshCw, Check } from 'lucide-react';
import { useOffline } from '../hooks/useOffline';

export default function OfflineIndicator() {
  const { isOffline, queueLength, isSyncing, lastSyncResult, manualSync } = useOffline();

  // Don't show anything if online and no queue
  if (!isOffline && queueLength === 0 && !lastSyncResult) {
    return null;
  }

  // Show sync success briefly
  if (!isOffline && queueLength === 0 && lastSyncResult?.synced > 0) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
        <div className="bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">
            Synced {lastSyncResult.synced} updates
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div
        className={`
          backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-3
          ${isOffline ? 'bg-red-500/90 text-white' : 'bg-yellow-500/90 text-black'}
        `}
      >
        {isOffline ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Offline</span>
            {queueLength > 0 && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {queueLength} queued
              </span>
            )}
          </>
        ) : (
          <>
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Syncing...</span>
              </>
            ) : (
              <>
                <CloudOff className="w-4 h-4" />
                <span className="text-sm font-medium">{queueLength} pending</span>
                <button
                  onClick={manualSync}
                  className="text-xs bg-white/30 hover:bg-white/40 px-2 py-0.5 rounded-full transition-colors"
                >
                  Sync now
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

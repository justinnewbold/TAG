/**
 * Sync Status Component
 * Displays offline queue status and provides manual sync button
 */

import React from 'react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export function SyncStatus({ minimal = false }) {
  const {
    isOnline,
    syncStatus,
    pendingActions,
    lastSyncTime,
    isSyncing,
    triggerSync,
    SYNC_STATUS,
  } = useOfflineSync();

  // Get status color
  const getStatusColor = () => {
    if (!isOnline) return '#f59e0b'; // Yellow for offline
    if (isSyncing) return '#3b82f6'; // Blue for syncing
    if (syncStatus === SYNC_STATUS.SYNCED) return '#10b981'; // Green for synced
    if (syncStatus === SYNC_STATUS.PENDING) return '#f59e0b'; // Yellow for pending
    if (syncStatus === SYNC_STATUS.FAILED) return '#ef4444'; // Red for failed
    return '#6b7280'; // Gray for unknown
  };

  // Get status text
  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (syncStatus === SYNC_STATUS.SYNCED) return 'Synced';
    if (syncStatus === SYNC_STATUS.PENDING) return `${pendingActions} pending`;
    if (syncStatus === SYNC_STATUS.FAILED) return 'Sync failed';
    return 'Unknown';
  };

  // Get status icon
  const getStatusIcon = () => {
    if (!isOnline) return '📴';
    if (isSyncing) return '🔄';
    if (syncStatus === SYNC_STATUS.SYNCED) return '✓';
    if (syncStatus === SYNC_STATUS.PENDING) return '⏳';
    if (syncStatus === SYNC_STATUS.FAILED) return '⚠️';
    return '?';
  };

  // Format last sync time
  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    const diff = Date.now() - lastSyncTime;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(lastSyncTime).toLocaleDateString();
  };

  // Minimal display (just indicator)
  if (minimal) {
    return (
      <div
        className="sync-status-minimal"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          cursor: pendingActions > 0 && isOnline ? 'pointer' : 'default',
        }}
        onClick={pendingActions > 0 && isOnline ? triggerSync : undefined}
        title={`${getStatusText()}${pendingActions > 0 ? ` - Click to sync` : ''}`}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            animation: isSyncing ? 'pulse 1s infinite' : 'none',
          }}
        />
        {pendingActions > 0 && (
          <span style={{ fontSize: '12px', color: getStatusColor() }}>
            {pendingActions}
          </span>
        )}
      </div>
    );
  }

  // Full display
  return (
    <div
      className="sync-status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        backgroundColor: 'var(--dark-800, #1f2937)',
        borderRadius: '8px',
        border: `1px solid ${getStatusColor()}40`,
      }}
    >
      {/* Status indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            animation: isSyncing ? 'pulse 1s infinite' : 'none',
          }}
        />
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: getStatusColor(),
          }}
        >
          {getStatusIcon()} {getStatusText()}
        </span>
      </div>

      {/* Last sync time */}
      {lastSyncTime && (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--text-muted, #9ca3af)',
          }}
        >
          Last sync: {formatLastSync()}
        </span>
      )}

      {/* Sync button */}
      {pendingActions > 0 && isOnline && !isSyncing && (
        <button
          onClick={triggerSync}
          style={{
            padding: '4px 12px',
            backgroundColor: 'var(--neon-cyan, #00f5ff)',
            color: 'var(--dark-900, #0a0a0f)',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sync Now
        </button>
      )}

      {/* Offline indicator */}
      {!isOnline && (
        <span
          style={{
            fontSize: '12px',
            color: '#f59e0b',
          }}
        >
          Actions will sync when online
        </span>
      )}

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}

export default SyncStatus;

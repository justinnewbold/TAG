import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { socketService } from '../services/socket';
import { useUIStore } from '../stores/uiStore';

function SyncButton({ className = '' }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { showSuccess, showError } = useUIStore();

  const handleSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);

    try {
      if (!socketService.isConnected()) {
        socketService.connect();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (socketService.isConnected()) {
        socketService.syncGame();
        showSuccess('Game state synced');
      } else {
        showError('Unable to connect to server', 'Sync Failed');
      }
    } catch (err) {
      showError('Failed to sync game state', 'Sync Failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
      title="Sync with server"
    >
      <RefreshCw className={`w-5 h-5 text-gray-400 ${isSyncing ? 'animate-spin' : ''}`} />
    </button>
  );
}

export default SyncButton;

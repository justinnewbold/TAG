import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { socketService } from '../services/socket';

function ConnectionStatus() {
  const [connectionState, setConnectionState] = useState(socketService.getConnectionState());

  useEffect(() => {
    const unsubscribe = socketService.onConnectionStateChange(setConnectionState);
    return unsubscribe;
  }, []);

  // Only show banner for non-connected states
  if (connectionState === 'connected') {
    return null;
  }

  const stateConfig = {
    disconnected: {
      icon: WifiOff,
      text: 'Disconnected',
      className: 'bg-red-500/90',
    },
    connecting: {
      icon: Loader2,
      text: 'Connecting...',
      className: 'bg-yellow-500/90',
      spin: true,
    },
    reconnecting: {
      icon: Loader2,
      text: 'Reconnecting...',
      className: 'bg-yellow-500/90',
      spin: true,
    },
  };

  const config = stateConfig[connectionState] || stateConfig.disconnected;
  const Icon = config.icon;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${config.className} text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-lg`}>
      <Icon className={`w-4 h-4 ${config.spin ? 'animate-spin' : ''}`} />
      <span>{config.text}</span>
      {connectionState === 'disconnected' && (
        <button
          onClick={() => socketService.connect()}
          className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default ConnectionStatus;

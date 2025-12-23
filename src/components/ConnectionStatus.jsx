import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useStore } from '../store';

/**
 * ConnectionStatus - Displays the current socket connection status
 * Shows a banner when disconnected or reconnecting
 */
function ConnectionStatus() {
  const { connectionStatus, lastConnectionError } = useStore();

  // Don't show anything if connected
  if (connectionStatus === 'connected') {
    return null;
  }

  const statusConfig = {
    disconnected: {
      icon: WifiOff,
      text: 'Disconnected',
      bgColor: 'bg-red-500/90',
      textColor: 'text-white',
    },
    reconnecting: {
      icon: Loader2,
      text: 'Reconnecting...',
      bgColor: 'bg-yellow-500/90',
      textColor: 'text-dark-950',
      animate: true,
    },
    connecting: {
      icon: Loader2,
      text: 'Connecting...',
      bgColor: 'bg-blue-500/90',
      textColor: 'text-white',
      animate: true,
    },
    error: {
      icon: WifiOff,
      text: 'Connection Error',
      bgColor: 'bg-red-600/90',
      textColor: 'text-white',
    },
  };

  const config = statusConfig[connectionStatus] || statusConfig.disconnected;
  const Icon = config.icon;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${config.bgColor} ${config.textColor} py-2 px-4`}>
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <Icon className={`w-4 h-4 ${config.animate ? 'animate-spin' : ''}`} />
        <span>{config.text}</span>
        {lastConnectionError && (
          <span className="opacity-75 text-xs">
            ({typeof lastConnectionError === 'string' ? lastConnectionError : 'Unknown error'})
          </span>
        )}
      </div>
    </div>
  );
}

export default ConnectionStatus;

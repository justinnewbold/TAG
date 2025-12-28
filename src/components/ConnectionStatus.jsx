import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { socketService } from '../services/socket';
import { useStore } from '../store';

/**
 * Real-time connection status indicator
 * Shows WebSocket connection state with reconnection controls
 */
export default function ConnectionStatus() {
  const { connectionStatus, connectionError } = useStore();
  const [ping, setPing] = useState(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Measure ping periodically when connected
  useEffect(() => {
    if (connectionStatus !== 'connected') {
      setPing(null);
      return;
    }

    const measurePing = async () => {
      const latency = await socketService.ping();
      if (latency >= 0) {
        setPing(latency);
      }
    };

    measurePing();
    const interval = setInterval(measurePing, 10000);
    return () => clearInterval(interval);
  }, [connectionStatus]);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    socketService.disconnect();
    await new Promise(resolve => setTimeout(resolve, 500));
    socketService.connect();
    setIsReconnecting(false);
  };

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          label: 'Connected',
          showPing: true,
        };
      case 'connecting':
      case 'reconnecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          label: connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Connecting...',
          animate: true,
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: 'Error',
          showReconnect: true,
        };
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/30',
          label: 'Offline',
          showReconnect: true,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getPingColor = () => {
    if (!ping) return 'text-gray-500';
    if (ping < 100) return 'text-green-400';
    if (ping < 300) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Minimal indicator for top bar
  if (!showDetails) {
    return (
      <button
        onClick={() => setShowDetails(true)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${config.bgColor} ${config.borderColor} border transition-colors`}
      >
        <Icon className={`w-4 h-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
        {config.showPing && ping !== null && (
          <span className={`text-xs font-medium ${getPingColor()}`}>
            {ping}ms
          </span>
        )}
      </button>
    );
  }

  // Expanded details panel
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className={`${config.bgColor} ${config.borderColor} border rounded-xl p-4 backdrop-blur-sm`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
            <span className={`font-medium ${config.color}`}>{config.label}</span>
          </div>
          <button
            onClick={() => setShowDetails(false)}
            className="text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Close
          </button>
        </div>

        {connectionError && (
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{connectionError}</p>
        )}

        <div className="flex items-center gap-4 text-sm">
          {config.showPing && ping !== null && (
            <div className="flex items-center gap-1">
              <span style={{ color: 'var(--text-muted)' }}>Ping:</span>
              <span className={getPingColor()}>{ping}ms</span>
            </div>
          )}

          {config.showReconnect && (
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="flex items-center gap-1 px-3 py-1.5 disabled:opacity-50 rounded-lg text-sm transition-colors"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
            >
              <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
              Reconnect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline connection badge for headers
 */
export function ConnectionBadge() {
  const { connectionStatus } = useStore();

  const configs = {
    connected: { color: 'bg-green-500', pulse: false },
    connecting: { color: 'bg-yellow-500', pulse: true },
    reconnecting: { color: 'bg-yellow-500', pulse: true },
    error: { color: 'bg-red-500', pulse: false },
    disconnected: { color: 'bg-gray-500', pulse: false },
  };

  const config = configs[connectionStatus] || configs.disconnected;

  return (
    <div className="relative">
      <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
      {config.pulse && (
        <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${config.color} animate-ping`} />
      )}
    </div>
  );
}

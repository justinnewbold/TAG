import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, MapPin, AlertCircle, Hand, X } from 'lucide-react';
import { tauntPingService } from '../services/tauntPingService';
import { useStore } from '../store';
import { socketService } from '../services/socket';

/**
 * TauntPingControls Component
 *
 * Quick action buttons for taunts, decoys, and SOS pings.
 * Creates psychological gameplay without complexity.
 */
export default function TauntPingControls({ players = [], onAction }) {
  const user = useStore((state) => state.user);
  const [statuses, setStatuses] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [showPlayerSelect, setShowPlayerSelect] = useState(false);
  const [cooldownTimers, setCooldownTimers] = useState({});

  // Update statuses
  useEffect(() => {
    if (!user?.id) return;

    const updateStatuses = () => {
      setStatuses(tauntPingService.getActionStatuses(user.id));
    };

    updateStatuses();
    const interval = setInterval(updateStatuses, 1000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Format cooldown time
  const formatCooldown = (ms) => {
    if (ms <= 0) return '';
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  // Handle action selection
  const handleActionSelect = (action) => {
    if (statuses?.[action]?.cooldownRemaining > 0) return;
    if (statuses?.[action]?.remainingUses <= 0) return;

    if (action === 'taunt' || action === 'poke') {
      setSelectedAction(action);
      setShowPlayerSelect(true);
    } else if (action === 'decoy') {
      handleDecoy();
    } else if (action === 'sos') {
      handleSOS();
    }
  };

  // Handle taunt to specific player
  const handleTaunt = (targetPlayerId) => {
    const result = tauntPingService.sendTaunt(user.id, targetPlayerId, {
      type: selectedAction,
    });

    if (result.success) {
      // Send via socket
      socketService.emit('action:taunt', {
        targetId: targetPlayerId,
        type: selectedAction,
      });

      onAction?.('taunt', { targetId: targetPlayerId });
    }

    setShowPlayerSelect(false);
    setSelectedAction(null);
  };

  // Handle decoy placement
  const handleDecoy = () => {
    if (!user?.location) return;

    const result = tauntPingService.createDecoy(user.id, user.location);

    if (result.success) {
      socketService.emit('action:decoy', {
        location: result.decoy.location,
        expiresAt: result.decoy.expiresAt,
      });

      onAction?.('decoy', result.decoy);
    }
  };

  // Handle SOS
  const handleSOS = () => {
    if (!user?.location) return;

    const result = tauntPingService.sendSOS(user.id, user.location);

    if (result.success) {
      socketService.emit('action:sos', {
        location: result.sos.location,
        message: result.sos.message,
      });

      onAction?.('sos', result.sos);
    }
  };

  if (!statuses) return null;

  const actions = [
    {
      id: 'taunt',
      icon: MessageCircle,
      label: 'Taunt',
      description: 'Send buzz to player',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
    },
    {
      id: 'poke',
      icon: Hand,
      label: 'Poke',
      description: 'Friendly nudge',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    {
      id: 'decoy',
      icon: MapPin,
      label: 'Decoy',
      description: 'Fake location ping',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
    {
      id: 'sos',
      icon: AlertCircle,
      label: 'SOS',
      description: 'Alert nearby allies',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
    },
  ];

  return (
    <div className="relative">
      {/* Action buttons */}
      <div className="flex gap-2">
        {actions.map((action) => {
          const status = statuses[action.id];
          const isOnCooldown = status?.cooldownRemaining > 0;
          const isExhausted = status?.remainingUses <= 0;
          const isDisabled = isOnCooldown || isExhausted;

          return (
            <button
              key={action.id}
              onClick={() => handleActionSelect(action.id)}
              disabled={isDisabled}
              className={`
                relative flex flex-col items-center p-2 rounded-lg
                ${action.bgColor} ${action.color}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                transition-all duration-200
              `}
            >
              <action.icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{action.label}</span>

              {/* Cooldown overlay */}
              {isOnCooldown && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <span className="text-xs font-bold">
                    {formatCooldown(status.cooldownRemaining)}
                  </span>
                </div>
              )}

              {/* Uses remaining badge */}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold">{status?.remainingUses || 0}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Player selection modal */}
      {showPlayerSelect && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-900 rounded-lg p-3 shadow-xl border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">
              Select player to {selectedAction}
            </span>
            <button
              onClick={() => setShowPlayerSelect(false)}
              className="p-1 hover:bg-gray-800 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {players
              .filter((p) => p.id !== user.id)
              .map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleTaunt(player.id)}
                  className="w-full flex items-center gap-2 p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span className="text-lg">{player.avatar || '👤'}</span>
                  <span className="text-sm text-gray-300">{player.name}</span>
                  {player.isIt && (
                    <span className="ml-auto text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded">
                      IT
                    </span>
                  )}
                </button>
              ))}

            {players.filter((p) => p.id !== user.id).length === 0 && (
              <div className="text-center text-gray-500 text-sm py-4">No other players</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * TauntReceiver - Shows received taunts/pokes
 */
export function TauntReceiver({ onTauntReceived }) {
  const [receivedTaunt, setReceivedTaunt] = useState(null);

  useEffect(() => {
    const handleTaunt = (taunt) => {
      setReceivedTaunt(taunt);

      // Vibrate
      if ('vibrate' in navigator) {
        navigator.vibrate(taunt.vibrationPattern || [100, 50, 100]);
      }

      // Clear after animation
      setTimeout(() => setReceivedTaunt(null), 3000);

      onTauntReceived?.(taunt);
    };

    tauntPingService.on('tauntSent', handleTaunt);

    return () => {
      tauntPingService.off('tauntSent', handleTaunt);
    };
  }, [onTauntReceived]);

  if (!receivedTaunt) return null;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
      <div className="bg-red-500/90 text-white px-6 py-4 rounded-xl animate-bounce shadow-2xl">
        <div className="text-center">
          <div className="text-2xl mb-1">
            {receivedTaunt.type === 'poke' ? '👆' : '😈'}
          </div>
          <div className="font-bold">
            {receivedTaunt.type === 'poke' ? 'Poked!' : 'Taunted!'}
          </div>
          {receivedTaunt.message && (
            <div className="text-sm opacity-80 mt-1">{receivedTaunt.message}</div>
          )}
        </div>
      </div>
    </div>
  );
}

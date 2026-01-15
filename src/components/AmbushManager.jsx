import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Bell, Clock, AlertTriangle, Edit2, X } from 'lucide-react';
import { ambushService } from '../services/ambushService';
import { useStore } from '../store';

/**
 * AmbushManager Component
 *
 * UI for placing and managing ambush points.
 * Limited invisible traps that alert when IT crosses them.
 */
export default function AmbushManager({ onPlaceAmbush, onTrigger }) {
  const user = useStore((state) => state.user);
  const [ambushPoints, setAmbushPoints] = useState([]);
  const [triggerHistory, setTriggerHistory] = useState([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [placeName, setPlaceName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🎯');
  const [showHistory, setShowHistory] = useState(false);

  const icons = ['🎯', '⚠️', '👁️', '📍', '🚩', '🏠', '🏢', '🚗'];

  // Load ambush points
  useEffect(() => {
    if (!user?.id) return;

    const updatePoints = () => {
      setAmbushPoints(ambushService.getPlayerAmbushPoints(user.id));
      setTriggerHistory(ambushService.getTriggerHistory(user.id, 10));
    };

    updatePoints();

    // Subscribe to events
    const handlePlaced = (data) => {
      if (data.playerId === user.id) updatePoints();
    };

    const handleRemoved = (data) => {
      if (data.playerId === user.id) updatePoints();
    };

    const handleTriggered = (data) => {
      if (data.playerId === user.id) {
        updatePoints();
        setTriggerHistory(ambushService.getTriggerHistory(user.id, 10));
        onTrigger?.(data);
      }
    };

    ambushService.on('ambushPlaced', handlePlaced);
    ambushService.on('ambushRemoved', handleRemoved);
    ambushService.on('ambushTriggered', handleTriggered);

    return () => {
      ambushService.off('ambushPlaced', handlePlaced);
      ambushService.off('ambushRemoved', handleRemoved);
      ambushService.off('ambushTriggered', handleTriggered);
    };
  }, [user?.id, onTrigger]);

  // Place new ambush at current location
  const handlePlaceAmbush = () => {
    if (!user?.location) return;

    const result = ambushService.placeAmbush(user.id, user.location, {
      name: placeName || undefined,
      icon: selectedIcon,
    });

    if (result.success) {
      setAmbushPoints(ambushService.getPlayerAmbushPoints(user.id));
      onPlaceAmbush?.(result.ambushPoint);
      setIsPlacing(false);
      setPlaceName('');
    } else {
      alert(result.error);
    }
  };

  // Remove an ambush point
  const handleRemoveAmbush = (ambushId) => {
    const result = ambushService.removeAmbush(user.id, ambushId);
    if (result.success) {
      setAmbushPoints(ambushService.getPlayerAmbushPoints(user.id));
    }
  };

  // Format time remaining
  const formatTimeRemaining = (expiresAt) => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return 'Expired';

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Format trigger time
  const formatTriggerTime = (timestamp) => {
    const ago = Date.now() - timestamp;
    if (ago < 60000) return 'Just now';
    if (ago < 3600000) return `${Math.floor(ago / 60000)}m ago`;
    return `${Math.floor(ago / 3600000)}h ago`;
  };

  const remainingSlots = ambushService.config.maxPointsPerPlayer - ambushPoints.length;

  return (
    <div className="bg-gray-800/90 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-purple-400" />
          <span className="font-medium text-gray-200">Ambush Points</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-lg transition-colors ${
              showHistory ? 'bg-purple-500/30 text-purple-400' : 'bg-gray-700 text-gray-400'
            }`}
          >
            <Bell className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-400">
            {remainingSlots}/{ambushService.config.maxPointsPerPlayer} available
          </span>
        </div>
      </div>

      {/* Trigger History */}
      {showHistory && triggerHistory.length > 0 && (
        <div className="mb-4 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">Recent Triggers</span>
          </div>
          <div className="space-y-1">
            {triggerHistory.map((trigger) => (
              <div
                key={trigger.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-300">
                  IT crossed <span className="text-red-300">{trigger.ambushPoint.name}</span>
                </span>
                <span className="text-gray-500">{formatTriggerTime(trigger.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Placement UI */}
      {isPlacing ? (
        <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-300">New Ambush Point</span>
            <button onClick={() => setIsPlacing(false)} className="p-1">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <input
            type="text"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="Name (optional)"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm mb-2"
          />

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-400">Icon:</span>
            <div className="flex gap-1">
              {icons.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-8 h-8 rounded ${
                    selectedIcon === icon ? 'bg-purple-500/30 ring-2 ring-purple-500' : 'bg-gray-700'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handlePlaceAmbush}
            disabled={!user?.location}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            Place at Current Location
          </button>
        </div>
      ) : (
        remainingSlots > 0 && (
          <button
            onClick={() => setIsPlacing(true)}
            className="w-full mb-4 py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Place Ambush Point</span>
          </button>
        )
      )}

      {/* Active Ambush Points */}
      <div className="space-y-2">
        {ambushPoints.map((point) => (
          <div
            key={point.id}
            className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{point.icon}</span>
              <div>
                <div className="font-medium text-gray-200">{point.name}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeRemaining(point.expiresAt)}</span>
                  {point.triggerCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-red-400">
                        {point.triggerCount} trigger{point.triggerCount !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleRemoveAmbush(point.id)}
              className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {ambushPoints.length === 0 && !isPlacing && (
          <div className="text-center text-gray-500 py-4">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No ambush points set</p>
            <p className="text-xs mt-1">Place traps to get alerts when IT crosses them</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AmbushAlert - Toast notification when ambush is triggered
 */
export function AmbushAlert({ trigger, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible || !trigger) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-50 animate-slide-down">
      <div className="bg-red-600 text-white rounded-lg p-4 shadow-lg max-w-sm mx-auto">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <div>
            <div className="font-bold">Ambush Triggered!</div>
            <div className="text-sm opacity-90">
              IT crossed <span className="font-semibold">{trigger.ambushPoint.name}</span>
            </div>
            <div className="text-xs opacity-75 mt-1">
              {Math.round(trigger.distance)}m from trap location
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

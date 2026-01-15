import React, { useState, useEffect } from 'react';
import { Flag, Plus, Trash2, Shield, Map, Edit2, Clock, AlertCircle } from 'lucide-react';
import { territoryService } from '../services/territoryService';
import { useStore } from '../store';

/**
 * TerritoryManager Component
 *
 * UI for claiming and managing territories.
 * Claimed zones give early warning when IT enters.
 */
export default function TerritoryManager({ itLocation, onWarning }) {
  const user = useStore((state) => state.user);
  const [territories, setTerritories] = useState([]);
  const [activeClaim, setActiveClaim] = useState(null);
  const [claimProgress, setClaimProgress] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');

  const icons = ['🏠', '🏢', '🏫', '🏪', '🏋️', '⛪', '🏥', '🌳'];

  // Load territories and check for warnings
  useEffect(() => {
    if (!user?.id) return;

    const updateTerritories = () => {
      setTerritories(territoryService.getPlayerTerritories(user.id));
    };

    updateTerritories();

    // Subscribe to events
    const handleClaimed = (data) => {
      if (data.playerId === user.id) updateTerritories();
    };

    const handleRemoved = (data) => {
      if (data.playerId === user.id) updateTerritories();
    };

    territoryService.on('territoryClaimed', handleClaimed);
    territoryService.on('territoryRemoved', handleRemoved);

    return () => {
      territoryService.off('territoryClaimed', handleClaimed);
      territoryService.off('territoryRemoved', handleRemoved);
    };
  }, [user?.id]);

  // Check for IT warnings
  useEffect(() => {
    if (!user?.id || !itLocation) return;

    const newWarnings = territoryService.checkTerritoryWarnings(user.id, itLocation);
    setWarnings(newWarnings);

    if (newWarnings.length > 0) {
      onWarning?.(newWarnings);
    }
  }, [user?.id, itLocation, onWarning]);

  // Update claim progress
  useEffect(() => {
    if (!activeClaim || !user?.location) return;

    const interval = setInterval(() => {
      const progress = territoryService.updateClaimProgress(activeClaim, user.location);
      setClaimProgress(progress);

      if (progress?.status === 'complete') {
        setActiveClaim(null);
        setClaimProgress(null);
        setTerritories(territoryService.getPlayerTerritories(user.id));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeClaim, user?.location, user?.id]);

  // Start claiming territory
  const handleStartClaim = (name) => {
    if (!user?.location) return;

    const result = territoryService.startClaim(user.id, user.location, name);
    if (result.claimId) {
      setActiveClaim(result.claimId);
    } else {
      alert(result.error);
    }
  };

  // Cancel claim
  const handleCancelClaim = () => {
    if (activeClaim) {
      territoryService.cancelClaim(activeClaim);
      setActiveClaim(null);
      setClaimProgress(null);
    }
  };

  // Remove territory
  const handleRemoveTerritory = (territoryId) => {
    territoryService.removeTerritory(territoryId, user.id);
    setTerritories(territoryService.getPlayerTerritories(user.id));
  };

  // Rename territory
  const handleRename = (territoryId) => {
    if (newName.trim()) {
      territoryService.renameTerritory(territoryId, user.id, newName.trim());
      setTerritories(territoryService.getPlayerTerritories(user.id));
    }
    setEditingId(null);
    setNewName('');
  };

  // Set icon
  const handleSetIcon = (territoryId, icon) => {
    territoryService.setTerritoryIcon(territoryId, user.id, icon);
    setTerritories(territoryService.getPlayerTerritories(user.id));
  };

  const remainingSlots = territoryService.config.maxTerritoriesPerPlayer - territories.length;
  const inTerritory = territoryService.isInTerritory(user.id, user?.location);

  return (
    <div className="bg-gray-800/90 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-green-400" />
          <span className="font-medium text-gray-200">My Territories</span>
        </div>
        <span className="text-sm text-gray-400">
          {remainingSlots}/{territoryService.config.maxTerritoriesPerPlayer} available
        </span>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-4 p-3 bg-red-500/20 rounded-lg border border-red-500/50 animate-pulse">
          <div className="flex items-center gap-2 text-red-400 font-medium">
            <AlertCircle className="w-5 h-5" />
            <span>IT detected in your territory!</span>
          </div>
          {warnings.map((warning, index) => (
            <div key={index} className="mt-2 text-sm text-red-300">
              <span className="font-medium">{warning.territory.name}</span>
              {' - '}
              <span>{Math.round(warning.distance)}m away</span>
              {warning.severity === 'critical' && (
                <span className="ml-2 text-xs bg-red-600 px-2 py-0.5 rounded">INSIDE!</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Current Location Status */}
      {inTerritory.inTerritory && (
        <div className="mb-4 p-3 bg-green-500/20 rounded-lg border border-green-500/30">
          <div className="flex items-center gap-2 text-green-400">
            <Shield className="w-4 h-4" />
            <span className="text-sm">
              You're in <span className="font-medium">{inTerritory.territory.name}</span>
            </span>
          </div>
        </div>
      )}

      {/* Active Claim Progress */}
      {activeClaim && claimProgress && (
        <div className="mb-4 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-400 font-medium">Claiming Territory...</span>
            <button
              onClick={handleCancelClaim}
              className="text-xs text-gray-400 hover:text-red-400"
            >
              Cancel
            </button>
          </div>

          {claimProgress.status === 'claiming' && (
            <>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-blue-500 transition-all duration-1000"
                  style={{ width: `${(claimProgress.progress * 100).toFixed(1)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{(claimProgress.progress * 100).toFixed(0)}% complete</span>
                <span>
                  {Math.ceil(claimProgress.timeRemaining / 60000)}m remaining
                </span>
              </div>
            </>
          )}

          {claimProgress.status === 'paused' && (
            <div className="text-amber-400 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              {claimProgress.reason}
            </div>
          )}
        </div>
      )}

      {/* Claim Button */}
      {!activeClaim && remainingSlots > 0 && (
        <button
          onClick={() => handleStartClaim()}
          disabled={!user?.location || inTerritory.inTerritory}
          className="w-full mb-4 py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-green-500 hover:text-green-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          <span>
            {inTerritory.inTerritory
              ? 'Already in a territory'
              : 'Claim This Location (10 min)'}
          </span>
        </button>
      )}

      {/* Territory List */}
      <div className="space-y-2">
        {territories.map((territory) => (
          <div
            key={territory.id}
            className={`p-3 rounded-lg ${
              warnings.some((w) => w.territory.id === territory.id)
                ? 'bg-red-500/20 border border-red-500/50'
                : 'bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Icon selector */}
                <div className="relative group">
                  <span className="text-2xl cursor-pointer">{territory.icon}</span>
                  <div className="hidden group-hover:flex absolute left-0 top-full mt-1 bg-gray-800 rounded-lg p-2 gap-1 z-10 shadow-xl">
                    {icons.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => handleSetIcon(territory.id, icon)}
                        className="w-8 h-8 hover:bg-gray-700 rounded"
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  {editingId === territory.id ? (
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onBlur={() => handleRename(territory.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(territory.id)}
                      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="font-medium text-gray-200 cursor-pointer hover:text-green-400"
                      onClick={() => {
                        setEditingId(territory.id);
                        setNewName(territory.name);
                      }}
                    >
                      {territory.name}
                      <Edit2 className="w-3 h-3 inline ml-1 opacity-50" />
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {territory.visitCount} visits • {territory.radius}m radius
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleRemoveTerritory(territory.id)}
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {territories.length === 0 && !activeClaim && (
          <div className="text-center text-gray-500 py-6">
            <Map className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No territories claimed</p>
            <p className="text-xs mt-1">Stay in a location for 10 minutes to claim it</p>
            <p className="text-xs mt-1 text-green-400">Claimed territories alert you when IT enters!</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * TerritoryWarningToast - Alert when IT enters territory
 */
export function TerritoryWarningToast({ warning, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!warning) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-50 animate-slide-down">
      <div className="bg-red-600 text-white rounded-lg p-4 shadow-lg max-w-sm mx-auto">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 flex-shrink-0 animate-pulse" />
          <div>
            <div className="font-bold">Territory Alert!</div>
            <div className="text-sm opacity-90">
              IT entered <span className="font-semibold">{warning.territory.name}</span>
            </div>
            <div className="text-xs opacity-75 mt-1">
              {Math.round(warning.distance)}m from center
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

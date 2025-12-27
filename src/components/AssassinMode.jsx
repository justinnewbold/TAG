import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, Eye, EyeOff, Skull, Crown, AlertTriangle,
  MapPin, Navigation, Clock, Users, Trophy, Info
} from 'lucide-react';

// Assassin Mode - Each player has a secret target
export default function AssassinMode({ 
  game, 
  userId, 
  userLocation,
  onEliminateTarget,
  onEliminated 
}) {
  const [targetInfo, setTargetInfo] = useState(null);
  const [hunterInfo, setHunterInfo] = useState(null);
  const [showTargetHint, setShowTargetHint] = useState(false);
  const [eliminationCount, setEliminationCount] = useState(0);

  const settings = game?.settings || {};
  const showTargetDistance = settings.showTargetDistance ?? true;
  const revealOnProximity = settings.revealOnProximity ?? false;
  const proximityRevealDistance = settings.proximityRevealDistance || 50;

  // Get current player's target assignment
  useEffect(() => {
    if (!game?.assassinTargets || !userId) return;
    
    const myAssignment = game.assassinTargets.find(a => a.assassinId === userId);
    if (myAssignment) {
      const targetPlayer = game.players.find(p => p.id === myAssignment.targetId);
      setTargetInfo({
        id: myAssignment.targetId,
        name: targetPlayer?.name || 'Unknown',
        avatar: targetPlayer?.avatar || '👤',
        location: targetPlayer?.location,
        isEliminated: targetPlayer?.isEliminated,
      });
    }

    // Find who is hunting me
    const myHunter = game.assassinTargets.find(a => a.targetId === userId);
    if (myHunter) {
      setHunterInfo({
        id: myHunter.assassinId,
        // Don't reveal hunter's name - it's secret!
      });
    }

    // Count my eliminations
    const myEliminations = game.tags?.filter(t => t.taggerId === userId).length || 0;
    setEliminationCount(myEliminations);
  }, [game?.assassinTargets, game?.players, game?.tags, userId]);

  // Calculate distance to target
  const distanceToTarget = useMemo(() => {
    if (!userLocation || !targetInfo?.location) return null;
    
    const R = 6371000;
    const dLat = (targetInfo.location.lat - userLocation.lat) * Math.PI / 180;
    const dLon = (targetInfo.location.lng - userLocation.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(targetInfo.location.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, [userLocation, targetInfo?.location]);

  // Get direction to target
  const directionToTarget = useMemo(() => {
    if (!userLocation || !targetInfo?.location) return null;
    
    const dLon = (targetInfo.location.lng - userLocation.lng) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(targetInfo.location.lat * Math.PI / 180);
    const x = Math.cos(userLocation.lat * Math.PI / 180) * Math.sin(targetInfo.location.lat * Math.PI / 180) -
              Math.sin(userLocation.lat * Math.PI / 180) * Math.cos(targetInfo.location.lat * Math.PI / 180) * Math.cos(dLon);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }, [userLocation, targetInfo?.location]);

  // Get cardinal direction
  const getCardinalDirection = (degrees) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  // Get distance color based on proximity
  const getDistanceColor = (distance) => {
    if (distance === null) return 'text-gray-400';
    if (distance < 20) return 'text-red-400';
    if (distance < 50) return 'text-orange-400';
    if (distance < 100) return 'text-yellow-400';
    return 'text-green-400';
  };

  // Check if should reveal target on proximity
  const shouldRevealTarget = revealOnProximity && distanceToTarget && distanceToTarget < proximityRevealDistance;

  // Remaining players
  const remainingPlayers = game?.players?.filter(p => !p.isEliminated).length || 0;

  if (!targetInfo) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-40">
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-800 p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-red-400 animate-pulse" />
            <span className="text-white">Waiting for target assignment...</span>
          </div>
        </div>
      </div>
    );
  }

  // If eliminated, show spectator info
  if (game?.players?.find(p => p.id === userId)?.isEliminated) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-40">
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-red-800 p-4 shadow-xl">
          <div className="flex items-center justify-center gap-3">
            <Skull className="w-6 h-6 text-red-400" />
            <div className="text-center">
              <div className="text-lg font-bold text-white">Eliminated!</div>
              <div className="text-sm text-gray-400">You got {eliminationCount} elimination(s)</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 space-y-3">
      {/* Target Card */}
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-red-800/50 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-red-900/30 border-b border-red-800/30">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-red-400" />
            <span className="font-semibold text-white">Your Target</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{remainingPlayers} remaining</span>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 rounded-full">
              <Skull className="w-3 h-3 text-red-400" />
              <span className="text-xs text-red-400">{eliminationCount}</span>
            </div>
          </div>
        </div>

        {/* Target Info */}
        <div className="p-4">
          {targetInfo.isEliminated ? (
            <div className="text-center py-4">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2" />
              <p className="text-white font-medium">Target Eliminated!</p>
              <p className="text-sm text-gray-400">Waiting for new target...</p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Target Avatar/Identity */}
                <div className="relative">
                  {showTargetHint || shouldRevealTarget ? (
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-800 rounded-full text-3xl border-2 border-red-500">
                      {targetInfo.avatar}
                    </div>
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-800 rounded-full border-2 border-red-500/50">
                      <EyeOff className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  <button
                    onClick={() => setShowTargetHint(!showTargetHint)}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-gray-800 rounded-full border border-gray-700"
                  >
                    {showTargetHint ? (
                      <EyeOff className="w-3 h-3 text-gray-400" />
                    ) : (
                      <Eye className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Target Name */}
                <div>
                  <div className="text-lg font-bold text-white">
                    {showTargetHint || shouldRevealTarget ? targetInfo.name : '???'}
                  </div>
                  <div className="text-sm text-gray-400">
                    {showTargetHint ? 'Identity revealed' : 'Tap eye to reveal'}
                  </div>
                </div>
              </div>

              {/* Distance & Direction */}
              {showTargetDistance && distanceToTarget !== null && (
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getDistanceColor(distanceToTarget)}`}>
                    {distanceToTarget < 1000 
                      ? `${Math.round(distanceToTarget)}m` 
                      : `${(distanceToTarget/1000).toFixed(1)}km`
                    }
                  </div>
                  {directionToTarget !== null && (
                    <div className="flex items-center justify-end gap-1 text-gray-400">
                      <Navigation 
                        className="w-4 h-4" 
                        style={{ transform: `rotate(${directionToTarget}deg)` }}
                      />
                      <span className="text-sm">{getCardinalDirection(directionToTarget)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        {!targetInfo.isEliminated && distanceToTarget && distanceToTarget < (game?.settings?.tagRadius || 20) && (
          <div className="p-3 border-t border-red-800/30">
            <button
              onClick={() => onEliminateTarget && onEliminateTarget(targetInfo.id)}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-xl
                         shadow-lg shadow-red-500/30 active:scale-95 transition-transform"
            >
              <div className="flex items-center justify-center gap-2">
                <Target className="w-5 h-5" />
                ELIMINATE TARGET
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Hunter Warning */}
      {hunterInfo && (
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl border border-amber-800/50 p-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-sm font-medium text-white">Someone is hunting you!</div>
              <div className="text-xs text-gray-400">Stay alert and watch your back</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Settings component for Assassin mode
export function AssassinSettings({ settings = {}, onChange, isHost = false }) {
  const assassinSettings = {
    showTargetDistance: settings.showTargetDistance ?? true,
    revealOnProximity: settings.revealOnProximity ?? false,
    proximityRevealDistance: settings.proximityRevealDistance || 50,
    allowTargetHint: settings.allowTargetHint ?? true,
    chainElimination: settings.chainElimination ?? true, // Inherit victim's target
    ...settings,
  };

  const updateSetting = (key, value) => {
    if (onChange) onChange({ ...assassinSettings, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <Info className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-red-300">
          Each player is secretly assigned one target. Eliminate only your target to advance. 
          When you eliminate someone, you inherit their target!
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            <div>
              <div className="font-medium text-white text-sm">Show Target Distance</div>
              <div className="text-xs text-gray-400">Display how far away your target is</div>
            </div>
          </div>
          <button onClick={() => isHost && updateSetting('showTargetDistance', !assassinSettings.showTargetDistance)}
            disabled={!isHost}
            className={`relative w-12 h-6 rounded-full transition-colors ${assassinSettings.showTargetDistance ? 'bg-red-500' : 'bg-gray-600'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${assassinSettings.showTargetDistance ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-gray-400" />
            <div>
              <div className="font-medium text-white text-sm">Proximity Reveal</div>
              <div className="text-xs text-gray-400">Auto-reveal target when close</div>
            </div>
          </div>
          <button onClick={() => isHost && updateSetting('revealOnProximity', !assassinSettings.revealOnProximity)}
            disabled={!isHost}
            className={`relative w-12 h-6 rounded-full transition-colors ${assassinSettings.revealOnProximity ? 'bg-red-500' : 'bg-gray-600'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${assassinSettings.revealOnProximity ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        {assassinSettings.revealOnProximity && (
          <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg ml-4">
            <div>
              <div className="font-medium text-white text-sm">Reveal Distance</div>
              <div className="text-xs text-gray-400">How close before identity shown</div>
            </div>
            <select value={assassinSettings.proximityRevealDistance} onChange={(e) => updateSetting('proximityRevealDistance', parseInt(e.target.value))}
              disabled={!isHost} className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
              <option value={25}>25m</option>
              <option value={50}>50m</option>
              <option value={100}>100m</option>
            </select>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-gray-400" />
            <div>
              <div className="font-medium text-white text-sm">Chain Elimination</div>
              <div className="text-xs text-gray-400">Inherit victim's target on kill</div>
            </div>
          </div>
          <button onClick={() => isHost && updateSetting('chainElimination', !assassinSettings.chainElimination)}
            disabled={!isHost}
            className={`relative w-12 h-6 rounded-full transition-colors ${assassinSettings.chainElimination ? 'bg-red-500' : 'bg-gray-600'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${assassinSettings.chainElimination ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Function to generate assassin target assignments
export function generateAssassinTargets(players) {
  if (!players || players.length < 3) return [];
  
  // Shuffle players
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  
  // Create circular assignment: each player targets the next in the shuffled list
  const targets = shuffled.map((player, index) => ({
    assassinId: player.id,
    targetId: shuffled[(index + 1) % shuffled.length].id,
    assignedAt: Date.now(),
  }));
  
  return targets;
}

// Leaderboard for Assassin mode
export function AssassinLeaderboard({ players = [], tags = [] }) {
  const sortedPlayers = useMemo(() => {
    return [...players]
      .map(player => ({
        ...player,
        eliminations: tags.filter(t => t.taggerId === player.id).length,
      }))
      .sort((a, b) => {
        // Active players first, then by eliminations
        if (a.isEliminated !== b.isEliminated) return a.isEliminated ? 1 : -1;
        return b.eliminations - a.eliminations;
      });
  }, [players, tags]);

  return (
    <div className="space-y-2">
      {sortedPlayers.map((player, index) => (
        <div
          key={player.id}
          className={`flex items-center justify-between p-3 rounded-lg ${
            player.isEliminated 
              ? 'bg-gray-800/30 border border-gray-800 opacity-50' 
              : 'bg-gray-800/50 border border-gray-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`w-6 h-6 flex items-center justify-center text-sm font-bold ${
              index === 0 && !player.isEliminated ? 'text-amber-400' : 'text-gray-500'
            }`}>
              {index === 0 && !player.isEliminated ? <Crown className="w-5 h-5" /> : index + 1}
            </span>
            <span className={`text-2xl ${player.isEliminated ? 'grayscale' : ''}`}>
              {player.avatar || '👤'}
            </span>
            <div>
              <span className={`font-medium ${player.isEliminated ? 'text-gray-500 line-through' : 'text-white'}`}>
                {player.name}
              </span>
              {player.isEliminated && (
                <span className="ml-2 text-xs text-red-400">Eliminated</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skull className="w-4 h-4 text-red-400" />
            <span className="font-bold text-white">{player.eliminations}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

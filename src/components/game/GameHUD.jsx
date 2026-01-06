import React, { memo } from 'react';
import { Clock, Users, Shield, Calendar, Signal, ChevronUp, ChevronDown, Menu, Snowflake } from 'lucide-react';

/**
 * GameHUD - Heads-up display for active game
 * Shows timer, player count, GPS quality, game mode info, and status banners
 */
const GameHUD = memo(function GameHUD({
  gameTime,
  playerCount,
  gpsAccuracy,
  hudExpanded,
  setHudExpanded,
  showQuickMenu,
  setShowQuickMenu,
  noTagStatus,
  showCountdownWarning,
  timeRemaining,
  gameMode,
  modeConfig,
  frozenCount,
  infectedCount,
  survivorCount,
  redTeamAlive,
  blueTeamAlive,
  formatTime,
  getGpsQuality,
}) {
  const quality = getGpsQuality(gpsAccuracy);

  return (
    <div className={`relative z-10 bg-dark-900/95 backdrop-blur-md transition-all duration-300 ${hudExpanded ? '' : ''}`}>
      {/* Minimal Header - Always visible */}
      <div className="p-3 flex items-center justify-between">
        {/* Left: Essential info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
            <Clock className="w-4 h-4 text-white/60" />
            <span className="font-mono text-base font-bold">{formatTime(gameTime)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-white/60">
            <Users className="w-4 h-4" />
            <span>{playerCount}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* GPS indicator - compact */}
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${quality.level === 'poor' ? 'bg-red-500/20' : 'bg-white/10'} ${quality.color}`}>
            <Signal className="w-3 h-3" />
          </div>

          {/* Expand/Collapse HUD */}
          <button
            onClick={() => setHudExpanded(!hudExpanded)}
            className="btn-icon w-10 h-10"
          >
            {hudExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {/* Quick Menu */}
          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="btn-icon w-10 h-10 bg-neon-purple/20"
          >
            <Menu className="w-5 h-5 text-neon-purple" />
          </button>
        </div>
      </div>

      {/* Expanded HUD Content */}
      {hudExpanded && (
        <div className="px-3 pb-3 space-y-2 animate-slide-down">
          {/* No-Tag Status Banners */}
          {(noTagStatus.inTime || noTagStatus.inZone) && (
            <div className="flex gap-2">
              {noTagStatus.inTime && (
                <div className="flex-1 flex items-center gap-2 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-blue-400">No-Tag Time</span>
                </div>
              )}
              {noTagStatus.inZone && (
                <div className="flex-1 flex items-center gap-2 p-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400">Safe Zone</span>
                </div>
              )}
            </div>
          )}

          {/* Countdown Warning */}
          {showCountdownWarning && timeRemaining > 0 && (
            <div className={`flex items-center justify-center gap-2 p-2 rounded-lg ${
              timeRemaining <= 10000
                ? 'bg-red-500/30 border border-red-500/50 animate-pulse'
                : 'bg-amber-500/20 border border-amber-500/30'
            }`}>
              <Clock className={`w-4 h-4 ${timeRemaining <= 10000 ? 'text-red-400' : 'text-amber-400'}`} />
              <span className={`font-mono font-bold ${timeRemaining <= 10000 ? 'text-red-400' : 'text-amber-400'}`}>
                {Math.ceil(timeRemaining / 1000)}s
              </span>
            </div>
          )}

          {/* Game Mode Badge */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">{modeConfig.icon}</span>
            <span className="text-white/70">{modeConfig.name}</span>

            {/* Mode-specific stats */}
            {gameMode === 'freezeTag' && (
              <span className="text-xs text-blue-400 ml-auto">
                <Snowflake className="w-3 h-3 inline mr-1" />
                {frozenCount} frozen
              </span>
            )}
            {gameMode === 'infection' && (
              <span className="text-xs text-green-400 ml-auto">
                🧟 {infectedCount} / {survivorCount}
              </span>
            )}
            {gameMode === 'teamTag' && (
              <span className="text-xs ml-auto">
                <span className="text-red-400">🔴 {redTeamAlive}</span>
                <span className="mx-1 text-white/40">vs</span>
                <span className="text-blue-400">🔵 {blueTeamAlive}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Always show critical status when not expanded */}
      {!hudExpanded && (noTagStatus.inTime || noTagStatus.inZone || (showCountdownWarning && timeRemaining > 0)) && (
        <div className="px-3 pb-2 flex gap-2">
          {noTagStatus.inZone && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Safe
            </span>
          )}
          {noTagStatus.inTime && (
            <span className="text-xs text-blue-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> No-Tag
            </span>
          )}
          {showCountdownWarning && timeRemaining > 0 && (
            <span className={`text-xs font-mono font-bold ml-auto ${timeRemaining <= 10000 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
              {Math.ceil(timeRemaining / 1000)}s
            </span>
          )}
        </div>
      )}
    </div>
  );
});

export default GameHUD;

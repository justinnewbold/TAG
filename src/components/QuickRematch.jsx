/**
 * Quick Rematch Component
 * Allows instant rematches and continuous play modes after game ends
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Play,
  Users,
  Clock,
  Shuffle,
  Crown,
  ChevronRight,
  Check,
  X,
  Zap
} from 'lucide-react';

// Rematch modes
const REMATCH_MODES = {
  SAME_IT: {
    id: 'same_it',
    name: 'Same IT',
    description: 'Winner stays IT',
    icon: Crown,
  },
  ROTATE_IT: {
    id: 'rotate_it',
    name: 'Rotate IT',
    description: 'IT rotates to next player',
    icon: RefreshCw,
  },
  RANDOM_IT: {
    id: 'random_it',
    name: 'Random IT',
    description: 'IT chosen randomly',
    icon: Shuffle,
  },
  LOSER_IT: {
    id: 'loser_it',
    name: 'Loser is IT',
    description: 'Last tagged becomes IT',
    icon: Zap,
  },
};

// Vote status component
function VoteStatus({ votes, totalPlayers, threshold }) {
  const percentage = totalPlayers > 0 ? (votes / totalPlayers) * 100 : 0;
  const needed = Math.ceil(totalPlayers * threshold);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{votes} / {totalPlayers} votes</span>
        <span>{needed} needed</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Countdown timer
function CountdownTimer({ seconds, onComplete, isPaused }) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isPaused, onComplete]);

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-cyan-400" />
      <span className={`font-mono ${timeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>
        {timeLeft}s
      </span>
    </div>
  );
}

// Player ready status
function PlayerReadyList({ players, readyPlayers }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400 uppercase tracking-wide">Players</div>
      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
        {players.map((player) => {
          const isReady = readyPlayers.includes(player.id);
          return (
            <div
              key={player.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
                isReady ? 'bg-green-500/20 border border-green-500/50' : 'bg-gray-700/50'
              }`}
            >
              <span className="text-lg">{player.avatar || '👤'}</span>
              <span className="text-sm text-white truncate flex-1">{player.name}</span>
              {isReady ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Clock className="w-4 h-4 text-gray-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function QuickRematch({
  isHost,
  players = [],
  lastItPlayerId,
  lastWinnerId,
  gameSettings = {},
  onStartRematch,
  onVote,
  onCancel,
  currentVotes = [],
  autoStartSeconds = 30,
  voteThreshold = 0.5, // 50% of players needed
  className = '',
}) {
  const [selectedMode, setSelectedMode] = useState('random_it');
  const [hasVoted, setHasVoted] = useState(false);
  const [isAutoStarting, setIsAutoStarting] = useState(false);
  const [showModeSelect, setShowModeSelect] = useState(false);

  const totalPlayers = players.length;
  const votesNeeded = Math.ceil(totalPlayers * voteThreshold);
  const hasEnoughVotes = currentVotes.length >= votesNeeded;

  // Determine next IT based on selected mode
  const getNextIt = useCallback(() => {
    switch (selectedMode) {
      case 'same_it':
        return lastItPlayerId;
      case 'rotate_it': {
        const currentIndex = players.findIndex(p => p.id === lastItPlayerId);
        const nextIndex = (currentIndex + 1) % players.length;
        return players[nextIndex]?.id;
      }
      case 'loser_it':
        return lastWinnerId; // Last person tagged becomes IT
      case 'random_it':
      default:
        const randomIndex = Math.floor(Math.random() * players.length);
        return players[randomIndex]?.id;
    }
  }, [selectedMode, lastItPlayerId, lastWinnerId, players]);

  // Handle vote
  const handleVote = useCallback(() => {
    if (hasVoted) return;
    setHasVoted(true);
    onVote?.({ mode: selectedMode });
  }, [hasVoted, selectedMode, onVote]);

  // Handle quick start (host only)
  const handleQuickStart = useCallback(() => {
    const nextItId = getNextIt();
    onStartRematch?.({
      mode: selectedMode,
      nextItId,
      settings: gameSettings,
    });
  }, [selectedMode, getNextIt, gameSettings, onStartRematch]);

  // Auto-start when threshold reached
  useEffect(() => {
    if (hasEnoughVotes && !isAutoStarting) {
      setIsAutoStarting(true);
    }
  }, [hasEnoughVotes, isAutoStarting]);

  // Handle auto-start completion
  const handleAutoStartComplete = useCallback(() => {
    if (isHost || hasEnoughVotes) {
      handleQuickStart();
    }
  }, [isHost, hasEnoughVotes, handleQuickStart]);

  return (
    <div className={`bg-gray-800/95 backdrop-blur-sm rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white">Quick Rematch</h3>
          </div>
          {isAutoStarting && (
            <CountdownTimer
              seconds={autoStartSeconds}
              onComplete={handleAutoStartComplete}
              isPaused={!hasEnoughVotes}
            />
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Mode selector */}
        <div>
          <button
            onClick={() => setShowModeSelect(!showModeSelect)}
            className="w-full flex items-center justify-between p-3 bg-gray-700/50 rounded-xl hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              {React.createElement(REMATCH_MODES[selectedMode.toUpperCase()]?.icon || Shuffle, {
                className: 'w-5 h-5 text-cyan-400',
              })}
              <div className="text-left">
                <div className="font-medium text-white">
                  {REMATCH_MODES[selectedMode.toUpperCase()]?.name || 'Select Mode'}
                </div>
                <div className="text-xs text-gray-400">
                  {REMATCH_MODES[selectedMode.toUpperCase()]?.description}
                </div>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showModeSelect ? 'rotate-90' : ''}`} />
          </button>

          {/* Mode options */}
          {showModeSelect && (
            <div className="mt-2 space-y-1">
              {Object.values(REMATCH_MODES).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setSelectedMode(mode.id);
                    setShowModeSelect(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedMode === mode.id
                      ? 'bg-cyan-500/20 border border-cyan-500/50'
                      : 'bg-gray-700/30 hover:bg-gray-700/50'
                  }`}
                >
                  <mode.icon className={`w-5 h-5 ${selectedMode === mode.id ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className={`font-medium ${selectedMode === mode.id ? 'text-white' : 'text-gray-300'}`}>
                      {mode.name}
                    </div>
                    <div className="text-xs text-gray-500">{mode.description}</div>
                  </div>
                  {selectedMode === mode.id && (
                    <Check className="w-4 h-4 text-cyan-400 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Vote status */}
        <VoteStatus
          votes={currentVotes.length}
          totalPlayers={totalPlayers}
          threshold={voteThreshold}
        />

        {/* Player ready status */}
        <PlayerReadyList
          players={players}
          readyPlayers={currentVotes}
        />

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
            <span>Leave</span>
          </button>

          {isHost ? (
            <button
              onClick={handleQuickStart}
              className="flex-[2] flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold rounded-xl transition-colors"
            >
              <Play className="w-5 h-5" />
              <span>Start Now</span>
            </button>
          ) : (
            <button
              onClick={handleVote}
              disabled={hasVoted}
              className={`flex-[2] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-colors ${
                hasVoted
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white'
              }`}
            >
              {hasVoted ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Ready!</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Vote Rematch</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Auto-start notice */}
        {hasEnoughVotes && (
          <div className="text-center text-sm text-cyan-400">
            Starting automatically when countdown ends...
          </div>
        )}

        {/* Continuous play option */}
        <div className="pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Zap className="w-4 h-4" />
              <span>Continuous Play Mode</span>
            </div>
            <button className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Enable
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Games auto-restart with rotating IT. Perfect for extended play sessions.
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook for managing rematch state
export function useRematchState(socket, gameId) {
  const [rematchState, setRematchState] = useState({
    isActive: false,
    votes: [],
    selectedMode: 'random_it',
  });

  useEffect(() => {
    if (!socket) return;

    const handleRematchVote = (data) => {
      setRematchState((prev) => ({
        ...prev,
        votes: [...prev.votes, data.playerId],
      }));
    };

    const handleRematchStart = () => {
      setRematchState({
        isActive: false,
        votes: [],
        selectedMode: 'random_it',
      });
    };

    const handleRematchCancel = () => {
      setRematchState({
        isActive: false,
        votes: [],
        selectedMode: 'random_it',
      });
    };

    socket.on('rematch:vote', handleRematchVote);
    socket.on('rematch:start', handleRematchStart);
    socket.on('rematch:cancel', handleRematchCancel);

    return () => {
      socket.off('rematch:vote', handleRematchVote);
      socket.off('rematch:start', handleRematchStart);
      socket.off('rematch:cancel', handleRematchCancel);
    };
  }, [socket, gameId]);

  const startRematchVoting = useCallback(() => {
    setRematchState((prev) => ({ ...prev, isActive: true }));
    socket?.emit('rematch:initiate', { gameId });
  }, [socket, gameId]);

  const voteForRematch = useCallback((data) => {
    socket?.emit('rematch:vote', { gameId, ...data });
  }, [socket, gameId]);

  const cancelRematch = useCallback(() => {
    setRematchState({ isActive: false, votes: [], selectedMode: 'random_it' });
    socket?.emit('rematch:cancel', { gameId });
  }, [socket, gameId]);

  return {
    rematchState,
    startRematchVoting,
    voteForRematch,
    cancelRematch,
  };
}

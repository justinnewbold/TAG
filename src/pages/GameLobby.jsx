import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Copy, Check, Play, UserPlus, Clock, Target, MapPin, Shield, Calendar, Share2, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useStore, useSounds } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import InviteModal from '../components/InviteModal';

function GameLobby() {
  const navigate = useNavigate();
  const { currentGame, user, startGame, leaveGame, syncGameState } = useStore();
  const { playSound, vibrate } = useSounds();
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState('');

  // Refs for cleanup
  const countdownIntervalRef = useRef(null);
  const gameStartedRef = useRef(false);

  const isHost = currentGame?.host === user?.id;
  const playerCount = currentGame?.players?.length || 0;
  const canStart = playerCount >= 2;

  // Clean up countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Listen for game started event (for non-host players)
  useEffect(() => {
    const handleGameStarted = ({ game }) => {
      playSound('gameStart');
      vibrate([100, 100, 100, 100, 100, 100, 300]);
      syncGameState(game);
      navigate('/game');
    };

    socketService.on('game:started', handleGameStarted);

    return () => {
      socketService.off('game:started', handleGameStarted);
    };
  }, [navigate, playSound, vibrate, syncGameState]);

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentGame?.code || '');
      } else {
        // Fallback for non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = currentGame?.code || '';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      vibrate([50]);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Copy failed:', err);
    }
  };

  const handleStartGame = async () => {
    if (!canStart || isStarting || gameStartedRef.current) return;

    setIsStarting(true);
    setError('');
    setCountdown(3);
    playSound('gameStart');
    vibrate([100, 100, 100, 100, 100, 100, 300]);

    // Countdown animation
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          // Actually start the game after countdown (only once)
          if (!gameStartedRef.current) {
            gameStartedRef.current = true;
            doStartGame();
          }
          return null;
        }
        playSound('tag');
        return prev - 1;
      });
    }, 1000);
  };

  const doStartGame = async () => {
    try {
      // Try to start via API
      const { game } = await api.startGame(currentGame.id);
      syncGameState(game);
      navigate('/game');
    } catch (err) {
      if (import.meta.env.DEV) console.error('Start game error:', err);

      // Fallback to local-only mode
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        startGame();
        navigate('/game');
      } else {
        // Reset flag so user can retry
        gameStartedRef.current = false;
        setError(err.message || 'Failed to start game');
        setCountdown(null);
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleLeave = async () => {
    if (isLeaving) return;

    setIsLeaving(true);

    try {
      // Try to leave via API
      await api.leaveGame();
      socketService.leaveGameRoom(currentGame.id);
    } catch (err) {
      console.error('Leave game error:', err);
      // Continue with local leave even if API fails
    }

    leaveGame();
    navigate('/');
  };
  
  if (!currentGame) {
    navigate('/');
    return null;
  }
  
  const formatInterval = (ms) => {
    if (ms < 60 * 60 * 1000) return `${Math.floor(ms / (60 * 1000))} min`;
    if (ms < 24 * 60 * 60 * 1000) return `${Math.floor(ms / (60 * 60 * 1000))} hour${ms >= 2 * 60 * 60 * 1000 ? 's' : ''}`;
    return `${Math.floor(ms / (24 * 60 * 60 * 1000))} day${ms >= 2 * 24 * 60 * 60 * 1000 ? 's' : ''}`;
  };
  
  const formatDuration = (ms) => {
    if (!ms) return 'Unlimited';
    if (ms < 24 * 60 * 60 * 1000) return `${Math.floor(ms / (60 * 60 * 1000))} hours`;
    if (ms < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(ms / (24 * 60 * 60 * 1000))} days`;
    return `${Math.floor(ms / (7 * 24 * 60 * 60 * 1000))} week${ms >= 2 * 7 * 24 * 60 * 60 * 1000 ? 's' : ''}`;
  };
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="min-h-screen p-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={handleLeave} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-gray-900">
              {currentGame.settings?.gameName || 'Game Lobby'}
            </h1>
            <p className="text-sm text-gray-500">Waiting for players...</p>
          </div>
        </div>
      </div>

      {/* Game Code Card */}
      <div className="card p-6 mb-6 text-center bg-gradient-to-b from-indigo-50 to-white shadow-lg">
        <p className="text-sm text-gray-500 mb-2">Game Code</p>
        <div className="flex items-center justify-center gap-4">
          <span className="text-4xl font-display font-bold tracking-widest text-indigo-600">
            {currentGame.code}
          </span>
          <button
            onClick={handleCopyCode}
            className={`p-3 rounded-xl transition-all ${
              copied ? 'bg-green-100 text-green-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="mt-4 text-sm text-indigo-600 hover:underline flex items-center justify-center gap-2 mx-auto"
        >
          <Share2 className="w-4 h-4" />
          Share invite link
        </button>
      </div>

      {/* Game Settings */}
      <div className="card p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Game Settings</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span className="text-xs text-gray-500">GPS Update</span>
            </div>
            <p className="font-medium text-gray-900">{formatInterval(currentGame.settings?.gpsInterval)}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500">Tag Radius</span>
            </div>
            <p className="font-medium text-gray-900">{currentGame.settings?.tagRadius}m</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-500">Max Players</span>
            </div>
            <p className="font-medium text-gray-900">{currentGame.settings?.maxPlayers}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-gray-500">Duration</span>
            </div>
            <p className="font-medium text-gray-900">{formatDuration(currentGame.settings?.duration)}</p>
          </div>
        </div>
        
        {/* No-Tag Zones */}
        {currentGame.settings?.noTagZones?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">Safe Zones ({currentGame.settings.noTagZones.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentGame.settings.noTagZones.map((zone) => (
                <span key={zone.id} className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full border border-green-200">
                  {zone.name} ({zone.radius}m)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* No-Tag Times */}
        {currentGame.settings?.noTagTimes?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-600">Protected Times ({currentGame.settings.noTagTimes.length})</span>
            </div>
            <div className="space-y-1">
              {currentGame.settings.noTagTimes.map((time) => (
                <div key={time.id} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg border border-blue-200">
                  <span className="font-medium">{time.name}:</span> {time.startTime} - {time.endTime}
                  <span className="text-blue-400 ml-1">
                    ({time.days.length === 7 ? 'Daily' : time.days.map(d => daysOfWeek[d]).join(', ')})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Players List */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Players ({playerCount}/{currentGame.settings?.maxPlayers})
          </h3>
          <button
            onClick={() => setShowInvite(true)}
            className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
          >
            <UserPlus className="w-4 h-4" />
            Invite
          </button>
        </div>

        <div className="space-y-3">
          {currentGame.players?.map((player) => (
            <div
              key={player.id}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                player.id === user?.id
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'bg-gray-50'
              }`}
            >
              <div className="text-2xl">{player.avatar || '👤'}</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {player.name}
                  {player.id === user?.id && <span className="text-indigo-600 ml-2">(You)</span>}
                </p>
                <p className="text-xs text-gray-400">
                  {player.id === currentGame.host ? '👑 Host' : 'Player'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {player.location && (
                  <div className="flex items-center gap-1 text-green-500">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs">Ready</span>
                  </div>
                )}
                {player.isOnline !== false ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-gray-300" />
                )}
              </div>
            </div>
          ))}
        </div>

        {playerCount < 2 && (
          <p className="text-center text-sm text-gray-400 mt-4 py-4 border-t border-gray-100">
            Need at least 2 players to start
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Start Button */}
      {isHost && (
        <button
          onClick={handleStartGame}
          disabled={!canStart || isStarting}
          className={`w-full p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
            canStart && !isStarting
              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isStarting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="w-6 h-6" />
              {canStart ? 'Start Game' : `Waiting for ${2 - playerCount} more player${2 - playerCount > 1 ? 's' : ''}`}
            </>
          )}
        </button>
      )}

      {!isHost && (
        <div className="text-center p-4 card">
          <p className="text-gray-500">Waiting for host to start the game...</p>
        </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-gray-900/90 flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="text-9xl font-display font-bold text-indigo-500 mb-4">{countdown}</div>
            <p className="text-2xl text-gray-300">Get Ready!</p>
          </div>
        </div>
      )}
      
      {/* Invite Modal */}
      {showInvite && (
        <InviteModal gameCode={currentGame.code} onClose={() => setShowInvite(false)} />
      )}
    </div>
  );
}

export default GameLobby;

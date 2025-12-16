import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Copy, Check, Play, UserPlus, Clock, Target, MapPin, Shield, Calendar, Share2 } from 'lucide-react';
import { useStore, useSounds } from '../store';
import InviteModal from '../components/InviteModal';

function GameLobby() {
  const navigate = useNavigate();
  const { currentGame, user, startGame, leaveGame, addDemoPlayers } = useStore();
  const { playSound, vibrate } = useSounds();
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [countdown, setCountdown] = useState(null);
  
  const isHost = currentGame?.host === user?.id;
  const playerCount = currentGame?.players?.length || 0;
  const canStart = playerCount >= 2;
  
  // Auto-add demo players for testing
  useEffect(() => {
    if (isHost && playerCount === 1 && user?.location) {
      const timer = setTimeout(() => {
        addDemoPlayers();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isHost, playerCount, user?.location]);
  
  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(currentGame?.code || '');
    setCopied(true);
    vibrate([50]);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleStartGame = () => {
    if (!canStart) return;
    
    setCountdown(3);
    playSound('gameStart');
    vibrate([100, 100, 100, 100, 100, 100, 300]);
    
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          startGame();
          navigate('/game');
          return null;
        }
        playSound('tag');
        return prev - 1;
      });
    }, 1000);
  };
  
  const handleLeave = () => {
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
          <button onClick={handleLeave} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold">
              {currentGame.settings?.gameName || 'Game Lobby'}
            </h1>
            <p className="text-sm text-white/50">Waiting for players...</p>
          </div>
        </div>
      </div>
      
      {/* Game Code Card */}
      <div className="card-glow p-6 mb-6 text-center bg-gradient-to-b from-neon-cyan/10 to-transparent">
        <p className="text-sm text-white/50 mb-2">Game Code</p>
        <div className="flex items-center justify-center gap-4">
          <span className="text-4xl font-display font-bold tracking-widest text-neon-cyan">
            {currentGame.code}
          </span>
          <button
            onClick={handleCopyCode}
            className={`p-3 rounded-xl transition-all ${
              copied ? 'bg-green-500/20 text-green-400' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="mt-4 text-sm text-neon-cyan hover:underline flex items-center justify-center gap-2 mx-auto"
        >
          <Share2 className="w-4 h-4" />
          Share invite link
        </button>
      </div>
      
      {/* Game Settings */}
      <div className="card p-4 mb-6">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Game Settings</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-neon-cyan" />
              <span className="text-xs text-white/50">GPS Update</span>
            </div>
            <p className="font-medium">{formatInterval(currentGame.settings?.gpsInterval)}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-neon-purple" />
              <span className="text-xs text-white/50">Tag Radius</span>
            </div>
            <p className="font-medium">{currentGame.settings?.tagRadius}m</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-neon-orange" />
              <span className="text-xs text-white/50">Max Players</span>
            </div>
            <p className="font-medium">{currentGame.settings?.maxPlayers}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-white/50">Duration</span>
            </div>
            <p className="font-medium">{formatDuration(currentGame.settings?.duration)}</p>
          </div>
        </div>
        
        {/* No-Tag Zones */}
        {currentGame.settings?.noTagZones?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">Safe Zones ({currentGame.settings.noTagZones.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentGame.settings.noTagZones.map((zone) => (
                <span key={zone.id} className="text-xs bg-green-400/10 text-green-400 px-2 py-1 rounded-full">
                  {zone.name} ({zone.radius}m)
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* No-Tag Times */}
        {currentGame.settings?.noTagTimes?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">Protected Times ({currentGame.settings.noTagTimes.length})</span>
            </div>
            <div className="space-y-1">
              {currentGame.settings.noTagTimes.map((time) => (
                <div key={time.id} className="text-xs bg-blue-400/10 text-blue-400 px-2 py-1 rounded-lg">
                  <span className="font-medium">{time.name}:</span> {time.startTime} - {time.endTime}
                  <span className="text-blue-400/60 ml-1">
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
          <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
            Players ({playerCount}/{currentGame.settings?.maxPlayers})
          </h3>
          <button
            onClick={() => setShowInvite(true)}
            className="text-sm text-neon-cyan hover:underline flex items-center gap-1"
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
                  ? 'bg-neon-cyan/10 border border-neon-cyan/30' 
                  : 'bg-white/5'
              }`}
            >
              <div className="text-2xl">{player.avatar || '👤'}</div>
              <div className="flex-1">
                <p className="font-medium">
                  {player.name}
                  {player.id === user?.id && <span className="text-neon-cyan ml-2">(You)</span>}
                </p>
                <p className="text-xs text-white/40">
                  {player.id === currentGame.host ? '👑 Host' : 'Player'}
                </p>
              </div>
              {player.location && (
                <div className="flex items-center gap-1 text-green-400">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs">Ready</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {playerCount < 2 && (
          <p className="text-center text-sm text-white/40 mt-4 py-4 border-t border-white/10">
            Need at least 2 players to start
          </p>
        )}
      </div>
      
      {/* Start Button */}
      {isHost && (
        <button
          onClick={handleStartGame}
          disabled={!canStart}
          className={`w-full p-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
            canStart
              ? 'bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90'
              : 'bg-white/10 text-white/40 cursor-not-allowed'
          }`}
        >
          <Play className="w-6 h-6" />
          {canStart ? 'Start Game' : `Waiting for ${2 - playerCount} more player${2 - playerCount > 1 ? 's' : ''}`}
        </button>
      )}
      
      {!isHost && (
        <div className="text-center p-4 card">
          <p className="text-white/60">Waiting for host to start the game...</p>
        </div>
      )}
      
      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 bg-dark-900/95 flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="text-9xl font-display font-bold text-neon-cyan mb-4">{countdown}</div>
            <p className="text-2xl text-white/60">Get Ready!</p>
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

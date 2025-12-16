import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Share2, Mail, MessageSquare, Users, Play, UserPlus, X } from 'lucide-react';
import { useStore } from '../store';

function GameLobby() {
  const navigate = useNavigate();
  const { currentGame, user, startGame, leaveGame, addDemoPlayers } = useStore();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [copied, setCopied] = useState(false);
  
  if (!currentGame) {
    navigate('/');
    return null;
  }
  
  const isHost = currentGame.host === user?.id;
  const canStart = currentGame.players.length >= 2;
  
  const copyCode = async () => {
    await navigator.clipboard.writeText(currentGame.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const shareGame = async () => {
    const shareData = {
      title: 'Join my TAG! game',
      text: `Join my game of TAG! Use code: ${currentGame.code}`,
      url: `${window.location.origin}/join?code=${currentGame.code}`,
    };
    
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      copyCode();
    }
  };
  
  const sendInvite = (type) => {
    const message = `Join my game of TAG! Use code: ${currentGame.code} - ${window.location.origin}/join`;
    
    if (type === 'email' && inviteEmail) {
      window.open(`mailto:${inviteEmail}?subject=Join my TAG! game&body=${encodeURIComponent(message)}`);
      setInviteEmail('');
    } else if (type === 'sms' && invitePhone) {
      window.open(`sms:${invitePhone}?body=${encodeURIComponent(message)}`);
      setInvitePhone('');
    }
    
    setShowInvite(false);
  };
  
  const handleStart = () => {
    startGame();
    navigate('/game');
  };
  
  const handleLeave = () => {
    leaveGame();
    navigate('/');
  };
  
  // For demo: add some fake players
  const handleAddDemo = () => {
    addDemoPlayers();
  };
  
  return (
    <div className="p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={handleLeave} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Game Lobby</h1>
            <p className="text-white/50 text-sm">Waiting for players...</p>
          </div>
        </div>
      </div>
      
      {/* Game Code */}
      <div className="card-glow p-6 mb-6 text-center">
        <p className="text-sm text-white/50 mb-2">Game Code</p>
        <div className="flex items-center justify-center gap-4">
          <span className="text-4xl font-bold tracking-[0.3em] text-neon-cyan">
            {currentGame.code}
          </span>
          <button
            onClick={copyCode}
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <Copy className={`w-5 h-5 ${copied ? 'text-neon-green' : ''}`} />
          </button>
        </div>
        {copied && <p className="text-neon-green text-sm mt-2">Copied!</p>}
        
        <div className="flex gap-2 mt-4 justify-center">
          <button onClick={shareGame} className="btn-secondary flex items-center gap-2 text-sm">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button onClick={() => setShowInvite(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4" />
            Invite
          </button>
        </div>
      </div>
      
      {/* Game Settings */}
      <div className="card p-4 mb-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span className="text-white/50">⚙️</span> Game Settings
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-white/50">GPS Interval</p>
            <p className="font-medium">{currentGame.settings.gpsInterval / 1000}s</p>
          </div>
          <div>
            <p className="text-white/50">Tag Radius</p>
            <p className="font-medium">{currentGame.settings.tagRadius}m</p>
          </div>
          <div>
            <p className="text-white/50">Duration</p>
            <p className="font-medium">
              {currentGame.settings.duration
                ? `${currentGame.settings.duration / 60000} min`
                : 'Unlimited'}
            </p>
          </div>
          <div>
            <p className="text-white/50">Max Players</p>
            <p className="font-medium">{currentGame.settings.maxPlayers}</p>
          </div>
        </div>
      </div>
      
      {/* Players */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-neon-cyan" />
            Players ({currentGame.players.length})
          </h3>
          {/* Demo button for testing */}
          <button
            onClick={handleAddDemo}
            className="text-xs text-white/40 hover:text-white/60"
          >
            + Add Demo Players
          </button>
        </div>
        
        <div className="space-y-2">
          {currentGame.players.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-xl"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple flex items-center justify-center text-lg">
                {player.avatar || '😎'}
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {player.name}
                  {player.id === user?.id && <span className="text-neon-cyan text-sm ml-2">(You)</span>}
                  {player.id === currentGame.host && <span className="text-neon-orange text-sm ml-2">👑</span>}
                </p>
                <p className="text-xs text-white/40">
                  {player.location ? '📍 Location ready' : '⏳ Getting location...'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Actions */}
      {isHost ? (
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          {canStart ? 'Start Game' : 'Need at least 2 players'}
        </button>
      ) : (
        <div className="text-center text-white/50">
          Waiting for host to start the game...
        </div>
      )}
      
      <button onClick={handleLeave} className="btn-danger w-full mt-3">
        Leave Game
      </button>
      
      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="card-glow p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Invite Friends</h2>
              <button onClick={() => setShowInvite(false)} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Email invite */}
              <div>
                <label className="label flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Invite
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="friend@email.com"
                    className="input-field flex-1"
                  />
                  <button
                    onClick={() => sendInvite('email')}
                    disabled={!inviteEmail}
                    className="btn-primary"
                  >
                    Send
                  </button>
                </div>
              </div>
              
              {/* SMS invite */}
              <div>
                <label className="label flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  SMS Invite
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="input-field flex-1"
                  />
                  <button
                    onClick={() => sendInvite('sms')}
                    disabled={!invitePhone}
                    className="btn-primary"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameLobby;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Clock, Users, Share2, Home, RotateCcw, Play } from 'lucide-react';
import { useStore, useSounds } from '../store';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import confetti from 'canvas-confetti';

function GameEndSummary({ game, onClose }) {
  const navigate = useNavigate();
  const { user, syncGameState } = useStore();
  const { playSound, vibrate } = useSounds();
  const [rematchStatus, setRematchStatus] = useState('idle'); // idle, creating, waiting, ready
  const [rematchVotes, setRematchVotes] = useState([]);
  const [rematchGame, setRematchGame] = useState(null);
  
  const isWinner = game?.winnerId === user?.id;
  const winner = game?.players?.find(p => p.id === game?.winnerId);
  const userPlayer = game?.players?.find(p => p.id === user?.id);
  
  const userTags = game?.tags?.filter(t => t.taggerId === user?.id).length || 0;
  const userTagged = game?.tags?.filter(t => t.taggedId === user?.id).length || 0;
  
  const gameDuration = game?.startedAt && game?.endedAt 
    ? Math.floor((game.endedAt - game.startedAt) / 1000)
    : 0;
  
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Sort players by performance
  const sortedPlayers = [...(game?.players || [])].sort((a, b) => {
    if (a.id === game?.winnerId) return -1;
    if (b.id === game?.winnerId) return 1;
    return (b.tagCount || 0) - (a.tagCount || 0);
  });
  
  useEffect(() => {
    if (isWinner) {
      playSound('gameStart');
      vibrate([200, 100, 200, 100, 400]);
      
      // Winner confetti
      const duration = 3000;
      const end = Date.now() + duration;
      
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#00f5ff', '#a855f7', '#fbbf24'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#00f5ff', '#a855f7', '#fbbf24'],
        });
        
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } else {
      vibrate([300]);
    }
  }, [isWinner]);
  
  const handleShare = async () => {
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const text = `I just ${isWinner ? 'won' : 'played'} TAG! 🏃‍♂️\n` +
      `Tags: ${userTags} | Duration: ${formatDuration(gameDuration)}\n` +
      `Play with me: ${appUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (e) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  };

  // Listen for rematch events
  useEffect(() => {
    const handleRematchRequest = (data) => {
      if (data.gameCode === game?.code) {
        setRematchVotes(data.votes || []);
        if (data.status === 'ready') {
          setRematchStatus('ready');
          setRematchGame(data.newGame);
        }
      }
    };

    const handleRematchCreated = (data) => {
      if (data.originalCode === game?.code) {
        setRematchGame(data.game);
        setRematchStatus('ready');
        playSound('notification');
        vibrate([100, 50, 100]);
      }
    };

    socketService.on('rematch:requested', handleRematchRequest);
    socketService.on('rematch:created', handleRematchCreated);

    return () => {
      socketService.off('rematch:requested', handleRematchRequest);
      socketService.off('rematch:created', handleRematchCreated);
    };
  }, [game?.code, playSound, vibrate]);

  const handleRematch = async () => {
    if (rematchStatus === 'ready' && rematchGame) {
      // Join the rematch game
      try {
        const { game: joinedGame } = await api.joinGame(rematchGame.code);
        syncGameState(joinedGame);
        socketService.emit('game:join', { gameId: rematchGame.id });
        onClose?.();
        navigate('/lobby');
      } catch (err) {
        console.error('Failed to join rematch:', err);
        alert(err.message);
      }
      return;
    }

    // Request/vote for rematch
    setRematchStatus('waiting');
    socketService.emit('rematch:request', { 
      gameCode: game?.code,
      userId: user?.id 
    });
  };

  const handleQuickRestart = async () => {
    // Only host can quick restart
    if (game?.hostId !== user?.id) return;

    setRematchStatus('creating');
    try {
      const { game: newGame } = await api.request('/games/rematch', {
        method: 'POST',
        body: JSON.stringify({ 
          originalCode: game?.code,
          settings: {
            mode: game?.mode,
            tagRadius: game?.tagRadius,
            gameDuration: game?.gameDuration,
            isPublic: game?.isPublic
          }
        })
      });
      
      syncGameState(newGame);
      socketService.emit('game:join', { gameId: newGame.id });
      
      // Notify other players
      socketService.emit('rematch:created', {
        originalCode: game?.code,
        game: newGame
      });

      onClose?.();
      navigate('/lobby');
    } catch (err) {
      console.error('Failed to create rematch:', err);
      setRematchStatus('idle');
      alert(err.message);
    }
  };
  
  const isHost = game?.hostId === user?.id;
  const hasVotedForRematch = rematchVotes.includes(user?.id);
  const rematchVoteCount = rematchVotes.length;
  const totalPlayers = game?.players?.length || 0;
  
  return (
    <div className="fixed inset-0 z-50 bg-dark-900/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="card-glow w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className={`p-6 text-center ${
          isWinner 
            ? 'bg-gradient-to-b from-neon-cyan/20 to-transparent' 
            : 'bg-gradient-to-b from-neon-orange/20 to-transparent'
        }`}>
          <div className="text-6xl mb-4">
            {isWinner ? '🏆' : userPlayer?.isIt ? '💀' : '🎮'}
          </div>
          <h2 className="text-3xl font-display font-bold mb-2">
            {isWinner ? 'Victory!' : userPlayer?.isIt ? 'Tagged Out!' : 'Game Over!'}
          </h2>
          <p className="text-white/60">
            {isWinner 
              ? 'You outlasted everyone!' 
              : `${winner?.name || 'Someone'} won this round`}
          </p>
        </div>
        
        {/* Your Stats */}
        <div className="p-6 border-t border-white/10">
          <h3 className="text-sm text-white/40 uppercase tracking-wider mb-4">Your Performance</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <Target className="w-5 h-5 mx-auto text-neon-cyan mb-2" />
              <p className="text-2xl font-bold">{userTags}</p>
              <p className="text-xs text-white/40">Tags</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <Clock className="w-5 h-5 mx-auto text-neon-purple mb-2" />
              <p className="text-2xl font-bold">{formatDuration(gameDuration)}</p>
              <p className="text-xs text-white/40">Duration</p>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-xl">
              <Users className="w-5 h-5 mx-auto text-neon-orange mb-2" />
              <p className="text-2xl font-bold">{game?.players?.length || 0}</p>
              <p className="text-xs text-white/40">Players</p>
            </div>
          </div>
        </div>
        
        {/* Leaderboard */}
        <div className="px-6 pb-4">
          <h3 className="text-sm text-white/40 uppercase tracking-wider mb-3">Final Standings</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sortedPlayers.slice(0, 5).map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  player.id === user?.id ? 'bg-neon-cyan/10 border border-neon-cyan/30' : 'bg-white/5'
                } ${player.id === game?.winnerId ? 'ring-2 ring-neon-cyan/50' : ''}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-amber-500 text-black' :
                  index === 1 ? 'bg-gray-400 text-black' :
                  index === 2 ? 'bg-amber-700 text-white' :
                  'bg-white/10'
                }`}>
                  {index + 1}
                </div>
                <span className="text-xl">{player.avatar || '👤'}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {player.name}
                    {player.id === user?.id && ' (You)'}
                  </p>
                  <p className="text-xs text-white/40">
                    {player.tagCount || 0} tags
                  </p>
                </div>
                {player.id === game?.winnerId && (
                  <Trophy className="w-4 h-4 text-neon-cyan" />
                )}
                {player.isIt && (
                  <span className="text-xs bg-neon-orange/20 text-neon-orange px-2 py-0.5 rounded">IT</span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-6 pt-2 space-y-3">
          {/* Rematch/Quick Restart */}
          <div className="grid grid-cols-2 gap-3">
            {isHost ? (
              <button
                onClick={handleQuickRestart}
                disabled={rematchStatus === 'creating'}
                className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className={`w-4 h-4 ${rematchStatus === 'creating' ? 'animate-spin' : ''}`} />
                {rematchStatus === 'creating' ? 'Creating...' : 'Rematch'}
              </button>
            ) : (
              <button
                onClick={handleRematch}
                disabled={rematchStatus === 'waiting' && hasVotedForRematch}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors ${
                  rematchStatus === 'ready'
                    ? 'bg-green-500 text-white animate-pulse'
                    : hasVotedForRematch
                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                    : 'btn-secondary'
                }`}
              >
                {rematchStatus === 'ready' ? (
                  <>
                    <Play className="w-4 h-4" />
                    Join Rematch!
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    {hasVotedForRematch 
                      ? `Voted (${rematchVoteCount}/${totalPlayers})`
                      : 'Vote Rematch'}
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleShare}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
          
          {/* Home button */}
          <button
            onClick={() => {
              onClose?.();
              navigate('/');
            }}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameEndSummary;

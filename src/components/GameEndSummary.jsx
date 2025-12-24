import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Clock, Users, Share2, Home, RotateCcw } from 'lucide-react';
import { useStore, useSounds } from '../store';
import confetti from 'canvas-confetti';

function GameEndSummary({ game, onClose }) {
  const navigate = useNavigate();
  const { user } = useStore();
  const { playSound, vibrate } = useSounds();
  
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
  
  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="card w-full max-w-md animate-slide-up shadow-xl">
        {/* Header */}
        <div className={`p-6 text-center rounded-t-2xl ${
          isWinner
            ? 'bg-gradient-to-b from-indigo-100 to-white'
            : 'bg-gradient-to-b from-orange-100 to-white'
        }`}>
          <div className="text-6xl mb-4">
            {isWinner ? '🏆' : userPlayer?.isIt ? '💀' : '🎮'}
          </div>
          <h2 className="text-3xl font-display font-bold mb-2 text-gray-900">
            {isWinner ? 'Victory!' : userPlayer?.isIt ? 'Tagged Out!' : 'Game Over!'}
          </h2>
          <p className="text-gray-500">
            {isWinner
              ? 'You outlasted everyone!'
              : `${winner?.name || 'Someone'} won this round`}
          </p>
        </div>

        {/* Your Stats */}
        <div className="p-6 border-t border-gray-100">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Your Performance</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <Target className="w-5 h-5 mx-auto text-indigo-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{userTags}</p>
              <p className="text-xs text-gray-400">Tags</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <Clock className="w-5 h-5 mx-auto text-purple-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{formatDuration(gameDuration)}</p>
              <p className="text-xs text-gray-400">Duration</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <Users className="w-5 h-5 mx-auto text-orange-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{game?.players?.length || 0}</p>
              <p className="text-xs text-gray-400">Players</p>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="px-6 pb-4">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-3">Final Standings</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sortedPlayers.slice(0, 5).map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  player.id === user?.id ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'
                } ${player.id === game?.winnerId ? 'ring-2 ring-indigo-300' : ''}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-amber-500 text-white' :
                  index === 1 ? 'bg-gray-400 text-white' :
                  index === 2 ? 'bg-amber-700 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <span className="text-xl">{player.avatar || '👤'}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">
                    {player.name}
                    {player.id === user?.id && ' (You)'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {player.tagCount || 0} tags
                  </p>
                </div>
                {player.id === game?.winnerId && (
                  <Trophy className="w-4 h-4 text-indigo-500" />
                )}
                {player.isIt && (
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">IT</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2 grid grid-cols-2 gap-3">
          <button
            onClick={handleShare}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={() => {
              onClose?.();
              navigate('/');
            }}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameEndSummary;

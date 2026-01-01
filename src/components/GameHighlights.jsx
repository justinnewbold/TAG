import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Share2, Download, Trophy, Target, Timer, Users } from 'lucide-react';

export default function GameHighlights({ gameData, highlights = [] }) {
  const navigate = useNavigate();
  const [currentHighlight, setCurrentHighlight] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const {
    gameId,
    gameName,
    gameMode,
    duration,
    winner,
    players = [],
    tags = [],
    stats = {},
  } = gameData || {};

  // Auto-advance highlights
  useEffect(() => {
    if (!isPlaying || highlights.length === 0) return;

    const timer = setTimeout(() => {
      if (currentHighlight < highlights.length - 1) {
        setCurrentHighlight(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPlaying, currentHighlight, highlights.length]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const shareHighlights = async () => {
    const text = `🏷️ Just played ${gameName || 'TAG!'}\n` +
      `🏆 Winner: ${winner?.username || 'Unknown'}\n` +
      `⏱️ Duration: ${formatDuration(duration)}\n` +
      `👥 Players: ${players.length}\n` +
      `🎯 Total Tags: ${tags.length}\n\n` +
      `Play TAG! at tag.newbold.cloud`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'TAG! Game Results', text });
      } catch (e) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const highlight = highlights[currentHighlight];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="text-slate-400 hover:text-white">
            ← Back
          </button>
          <h1 className="font-bold text-lg">Game Highlights</h1>
          <button onClick={shareHighlights} className="p-2 hover:bg-slate-800 rounded-lg">
            <Share2 size={20} />
          </button>
        </div>
      </div>

      {/* Winner Banner */}
      {winner && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-6 text-center">
          <div className="text-5xl mb-2">🏆</div>
          <h2 className="text-2xl font-bold text-yellow-400">{winner.username} Wins!</h2>
          <p className="text-slate-400 mt-1">{gameName || `${gameMode} Game`}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-4 gap-3">
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <Timer className="w-5 h-5 mx-auto mb-1 text-blue-400" />
          <p className="text-lg font-bold">{formatDuration(duration || 0)}</p>
          <p className="text-xs text-slate-500">Duration</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-green-400" />
          <p className="text-lg font-bold">{players.length}</p>
          <p className="text-xs text-slate-500">Players</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <Target className="w-5 h-5 mx-auto mb-1 text-red-400" />
          <p className="text-lg font-bold">{tags.length}</p>
          <p className="text-xs text-slate-500">Tags</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
          <p className="text-lg font-bold">{stats.longestStreak || 0}</p>
          <p className="text-xs text-slate-500">Best Streak</p>
        </div>
      </div>

      {/* Highlights Player */}
      {highlights.length > 0 && (
        <div className="p-4">
          <h3 className="font-bold mb-3">Key Moments</h3>
          
          {/* Current Highlight */}
          <div className="bg-slate-800 rounded-xl p-6 mb-4">
            {highlight && (
              <div className="text-center">
                <span className="text-5xl block mb-3">{highlight.emoji || '🎮'}</span>
                <h4 className="text-xl font-bold mb-2">{highlight.title}</h4>
                <p className="text-slate-400">{highlight.description}</p>
                <p className="text-sm text-slate-500 mt-2">
                  {highlight.timestamp && formatDuration(Math.floor(highlight.timestamp / 1000))}
                </p>
              </div>
            )}
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentHighlight(prev => Math.max(0, prev - 1))}
              className="p-3 bg-slate-800 rounded-full hover:bg-slate-700"
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            <button
              onClick={() => setCurrentHighlight(prev => Math.min(highlights.length - 1, prev + 1))}
              className="p-3 bg-slate-800 rounded-full hover:bg-slate-700"
            >
              <SkipForward size={20} />
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-4">
            {highlights.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentHighlight(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentHighlight ? 'bg-purple-500 w-4' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="p-4">
        <h3 className="font-bold mb-3">Final Standings</h3>
        <div className="space-y-2">
          {players
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  index === 0 ? 'bg-yellow-500/20' : 'bg-slate-800'
                }`}
              >
                <span className="text-2xl w-8">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{player.username}</p>
                  <p className="text-sm text-slate-400">
                    {player.tags || 0} tags · {player.escapes || 0} escapes
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{player.score || 0}</p>
                  <p className="text-xs text-slate-500">points</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pb-8 space-y-3">
        <button
          onClick={() => navigate('/create')}
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl"
        >
          Play Again
        </button>
        <button
          onClick={() => navigate('/home')}
          className="w-full py-4 bg-slate-800 text-white font-semibold rounded-xl"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

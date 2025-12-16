import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock, Users, Target, Calendar, MapPin } from 'lucide-react';
import { useStore } from '../store';
import { formatDistanceToNow, format } from 'date-fns';

function GameHistory() {
  const navigate = useNavigate();
  const { games, user } = useStore();
  
  // Filter only ended games and sort by date
  const completedGames = games
    .filter(g => g.status === 'ended')
    .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
  
  const formatDuration = (start, end) => {
    if (!start || !end) return '0:00';
    const seconds = Math.floor((end - start) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getUserResult = (game) => {
    if (game.winnerId === user?.id) return 'won';
    const userPlayer = game.players?.find(p => p.id === user?.id);
    if (userPlayer?.isIt) return 'lost';
    return 'played';
  };
  
  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold">Game History</h1>
          <p className="text-sm text-white/50">{completedGames.length} games played</p>
        </div>
      </div>
      
      {/* Games List */}
      {completedGames.length > 0 ? (
        <div className="space-y-4">
          {completedGames.map((game) => {
            const result = getUserResult(game);
            const duration = formatDuration(game.startedAt, game.endedAt);
            const winner = game.players?.find(p => p.id === game.winnerId);
            const userPlayer = game.players?.find(p => p.id === user?.id);
            const userTags = game.tags?.filter(t => t.taggerId === user?.id).length || 0;
            
            return (
              <div
                key={game.id}
                className={`card p-4 border-l-4 ${
                  result === 'won' 
                    ? 'border-l-neon-cyan bg-neon-cyan/5' 
                    : result === 'lost'
                    ? 'border-l-neon-orange bg-neon-orange/5'
                    : 'border-l-white/20'
                }`}
              >
                {/* Game Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      result === 'won' ? 'bg-neon-cyan/20' : 'bg-white/10'
                    }`}>
                      {result === 'won' ? (
                        <Trophy className="w-5 h-5 text-neon-cyan" />
                      ) : (
                        <Target className="w-5 h-5 text-white/50" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {game.settings?.gameName || `Game ${game.code}`}
                      </h3>
                      <p className="text-xs text-white/50">
                        Code: {game.code}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium px-2 py-1 rounded ${
                    result === 'won' 
                      ? 'bg-neon-cyan/20 text-neon-cyan' 
                      : result === 'lost'
                      ? 'bg-neon-orange/20 text-neon-orange'
                      : 'bg-white/10 text-white/50'
                  }`}>
                    {result === 'won' ? '🏆 Victory' : result === 'lost' ? '💀 Tagged Out' : 'Played'}
                  </span>
                </div>
                
                {/* Game Stats */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <Users className="w-4 h-4 mx-auto text-white/40 mb-1" />
                    <p className="text-sm font-medium">{game.players?.length || 0}</p>
                    <p className="text-xs text-white/40">Players</p>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <Clock className="w-4 h-4 mx-auto text-white/40 mb-1" />
                    <p className="text-sm font-medium">{duration}</p>
                    <p className="text-xs text-white/40">Duration</p>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <Target className="w-4 h-4 mx-auto text-white/40 mb-1" />
                    <p className="text-sm font-medium">{userTags}</p>
                    <p className="text-xs text-white/40">Your Tags</p>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <MapPin className="w-4 h-4 mx-auto text-white/40 mb-1" />
                    <p className="text-sm font-medium">{game.settings?.tagRadius || 20}m</p>
                    <p className="text-xs text-white/40">Radius</p>
                  </div>
                </div>
                
                {/* Winner & Date */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-white/60">
                    <Trophy className="w-4 h-4" />
                    <span>Winner: {winner?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {game.endedAt 
                        ? formatDistanceToNow(game.endedAt, { addSuffix: true })
                        : 'Unknown'}
                    </span>
                  </div>
                </div>
                
                {/* Players */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-white/40 mb-2">Players</p>
                  <div className="flex flex-wrap gap-2">
                    {game.players?.map((player) => (
                      <span
                        key={player.id}
                        className={`text-xs px-2 py-1 rounded-full ${
                          player.id === game.winnerId
                            ? 'bg-neon-cyan/20 text-neon-cyan'
                            : player.isIt
                            ? 'bg-neon-orange/20 text-neon-orange'
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {player.avatar || '👤'} {player.name}
                        {player.id === game.winnerId && ' 🏆'}
                        {player.isIt && ' (IT)'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-lg font-medium text-white/60 mb-2">No Games Yet</h3>
          <p className="text-sm text-white/40 mb-6">
            Play your first game to see your history here!
          </p>
          <button
            onClick={() => navigate('/create')}
            className="btn-primary"
          >
            Create a Game
          </button>
        </div>
      )}
    </div>
  );
}

export default GameHistory;

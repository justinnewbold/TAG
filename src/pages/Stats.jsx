import React from 'react';
import { Trophy, Target, Zap, Shield, Clock, Gamepad2 } from 'lucide-react';
import { useStore } from '../store';

function Stats() {
  const { stats, games, user } = useStore();
  
  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;
  
  const tagRatio = stats.timesTagged > 0
    ? (stats.totalTags / stats.timesTagged).toFixed(1)
    : stats.totalTags;
  
  const statCards = [
    { icon: Gamepad2, label: 'Games Played', value: stats.gamesPlayed, color: 'neon-cyan' },
    { icon: Trophy, label: 'Games Won', value: stats.gamesWon, color: 'neon-purple' },
    { icon: Target, label: 'Win Rate', value: `${winRate}%`, color: 'neon-pink' },
    { icon: Zap, label: 'Total Tags', value: stats.totalTags, color: 'neon-orange' },
    { icon: Shield, label: 'Times Tagged', value: stats.timesTagged, color: 'red-500' },
    { icon: Clock, label: 'Tag Ratio', value: tagRatio, color: 'neon-green' },
  ];
  
  const recentGames = games
    .filter(g => g.status === 'ended')
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, 5);
  
  return (
    <div className="p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Your Stats</h1>
        <p className="text-white/50 text-sm">Track your performance</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {statCards.map((stat, i) => (
          <div key={i} className="card p-4">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}/10 flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}`} />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-white/50">{stat.label}</p>
          </div>
        ))}
      </div>
      
      {/* Recent Games */}
      <div>
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-neon-cyan" />
          Recent Games
        </h2>
        
        {recentGames.length > 0 ? (
          <div className="space-y-2">
            {recentGames.map((game) => {
              const isWin = game.winnerId === user?.id;
              const duration = game.endedAt && game.startedAt
                ? Math.round((game.endedAt - game.startedAt) / 60000)
                : 0;
              
              return (
                <div key={game.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={isWin ? 'text-neon-green' : 'text-white/50'}>
                        {isWin ? '🏆' : '💀'}
                      </span>
                      <span className="font-medium">
                        {isWin ? 'Victory' : 'Defeat'}
                      </span>
                    </div>
                    <p className="text-sm text-white/40">
                      {game.players.length} players • {duration} min
                    </p>
                  </div>
                  <div className="text-right text-sm text-white/40">
                    {new Date(game.endedAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <Gamepad2 className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No games played yet</p>
            <p className="text-sm text-white/30">Start a game to track your stats!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Stats;

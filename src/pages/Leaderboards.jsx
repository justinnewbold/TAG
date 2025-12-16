import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Target, Shield, Clock, Medal, Crown, Users } from 'lucide-react';
import { useStore } from '../store';

function Leaderboards() {
  const navigate = useNavigate();
  const { games, user, friends } = useStore();
  const [activeTab, setActiveTab] = useState('allTime');
  
  // Calculate player stats from all games
  const calculatePlayerStats = () => {
    const playerStats = {};
    
    games.filter(g => g.status === 'ended').forEach((game) => {
      game.players?.forEach((player) => {
        if (!playerStats[player.id]) {
          playerStats[player.id] = {
            id: player.id,
            name: player.name,
            avatar: player.avatar || '👤',
            gamesPlayed: 0,
            wins: 0,
            tags: 0,
            timesTagged: 0,
            totalSurvivalTime: 0,
          };
        }
        
        playerStats[player.id].gamesPlayed += 1;
        
        if (game.winnerId === player.id) {
          playerStats[player.id].wins += 1;
        }
        
        // Count tags
        const playerTags = game.tags?.filter(t => t.taggerId === player.id).length || 0;
        const playerTagged = game.tags?.filter(t => t.taggedId === player.id).length || 0;
        playerStats[player.id].tags += playerTags;
        playerStats[player.id].timesTagged += playerTagged;
        
        // Survival time
        if (player.finalSurvivalTime) {
          playerStats[player.id].totalSurvivalTime += player.finalSurvivalTime;
        }
      });
    });
    
    return Object.values(playerStats);
  };
  
  const allPlayerStats = calculatePlayerStats();
  
  // Sort for different leaderboards
  const leaderboards = {
    wins: [...allPlayerStats].sort((a, b) => b.wins - a.wins),
    tags: [...allPlayerStats].sort((a, b) => b.tags - a.tags),
    survival: [...allPlayerStats].sort((a, b) => b.totalSurvivalTime - a.totalSurvivalTime),
    games: [...allPlayerStats].sort((a, b) => b.gamesPlayed - a.gamesPlayed),
  };
  
  const [activeBoard, setActiveBoard] = useState('wins');
  
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };
  
  const getStatValue = (player) => {
    switch (activeBoard) {
      case 'wins': return player.wins;
      case 'tags': return player.tags;
      case 'survival': return formatTime(player.totalSurvivalTime);
      case 'games': return player.gamesPlayed;
      default: return 0;
    }
  };
  
  const getStatLabel = () => {
    switch (activeBoard) {
      case 'wins': return 'Wins';
      case 'tags': return 'Tags';
      case 'survival': return 'Survived';
      case 'games': return 'Games';
      default: return '';
    }
  };
  
  const boardIcons = {
    wins: Trophy,
    tags: Target,
    survival: Shield,
    games: Users,
  };
  
  const BoardIcon = boardIcons[activeBoard];
  
  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold">Leaderboards</h1>
          <p className="text-sm text-white/50">See who's on top</p>
        </div>
      </div>
      
      {/* Board Type Tabs */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { key: 'wins', icon: Trophy, label: 'Wins' },
          { key: 'tags', icon: Target, label: 'Tags' },
          { key: 'survival', icon: Shield, label: 'Survival' },
          { key: 'games', icon: Users, label: 'Games' },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveBoard(key)}
            className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
              activeBoard === key
                ? 'bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
      
      {/* Leaderboard */}
      {leaderboards[activeBoard].length > 0 ? (
        <div className="space-y-3">
          {/* Top 3 */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {leaderboards[activeBoard].slice(0, 3).map((player, index) => {
              const positions = [
                { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400', crown: '👑' },
                { bg: 'bg-gray-400/20', border: 'border-gray-400/50', text: 'text-gray-300', crown: '🥈' },
                { bg: 'bg-amber-700/20', border: 'border-amber-700/50', text: 'text-amber-600', crown: '🥉' },
              ];
              const pos = positions[index];
              const isUser = player.id === user?.id;
              
              return (
                <div
                  key={player.id}
                  className={`${pos.bg} border ${pos.border} rounded-xl p-4 text-center ${
                    index === 0 ? 'col-span-3 sm:col-span-1 sm:order-2' : ''
                  } ${index === 1 ? 'sm:order-1' : ''} ${index === 2 ? 'sm:order-3' : ''}`}
                >
                  <div className="text-3xl mb-2">{pos.crown}</div>
                  <div className={`text-2xl mb-1 ${isUser ? 'ring-2 ring-neon-cyan rounded-full inline-block p-1' : ''}`}>
                    {player.avatar}
                  </div>
                  <h3 className={`font-semibold ${pos.text} truncate`}>
                    {player.name}
                    {isUser && ' (You)'}
                  </h3>
                  <div className="mt-2 text-2xl font-bold">
                    {getStatValue(player)}
                  </div>
                  <p className="text-xs text-white/40">{getStatLabel()}</p>
                </div>
              );
            })}
          </div>
          
          {/* Rest of Leaderboard */}
          {leaderboards[activeBoard].slice(3).map((player, index) => {
            const isUser = player.id === user?.id;
            
            return (
              <div
                key={player.id}
                className={`card p-4 flex items-center gap-4 ${
                  isUser ? 'border border-neon-cyan/30 bg-neon-cyan/5' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                  {index + 4}
                </div>
                <div className="text-2xl">{player.avatar}</div>
                <div className="flex-1">
                  <h3 className="font-medium">
                    {player.name}
                    {isUser && <span className="text-neon-cyan ml-2">(You)</span>}
                  </h3>
                  <p className="text-xs text-white/40">
                    {player.gamesPlayed} games • {player.wins} wins
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{getStatValue(player)}</p>
                  <p className="text-xs text-white/40">{getStatLabel()}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <BoardIcon className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-lg font-medium text-white/60 mb-2">No Data Yet</h3>
          <p className="text-sm text-white/40 mb-6">
            Play games to see leaderboard rankings!
          </p>
          <button
            onClick={() => navigate('/create')}
            className="btn-primary"
          >
            Start Playing
          </button>
        </div>
      )}
      
      {/* Your Rank Card */}
      {user && allPlayerStats.length > 0 && (
        <div className="mt-8 card-glow p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Medal className="w-5 h-5 text-neon-cyan" />
            Your Rankings
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {['wins', 'tags', 'survival', 'games'].map((board) => {
              const sorted = leaderboards[board];
              const userRank = sorted.findIndex(p => p.id === user.id) + 1;
              const Icon = boardIcons[board];
              
              return (
                <div key={board} className="text-center p-2 bg-white/5 rounded-lg">
                  <Icon className="w-4 h-4 mx-auto text-white/40 mb-1" />
                  <p className="text-lg font-bold">
                    {userRank > 0 ? `#${userRank}` : '-'}
                  </p>
                  <p className="text-xs text-white/40 capitalize">{board}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Leaderboards;

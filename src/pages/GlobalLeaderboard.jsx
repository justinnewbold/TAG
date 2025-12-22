import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Target, Clock, Zap, Crown, ChevronDown, User, Users } from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store';

const LEADERBOARD_TYPES = [
  { id: 'wins', label: 'Wins', icon: Trophy },
  { id: 'tags', label: 'Tags', icon: Target },
  { id: 'xp', label: 'XP', icon: Zap },
  { id: 'level', label: 'Level', icon: Crown },
  { id: 'survival', label: 'Survival', icon: Clock },
  { id: 'streak', label: 'Win Streak', icon: Medal }
];

function GlobalLeaderboard() {
  const { user } = useStore();
  const [selectedType, setSelectedType] = useState('wins');
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedType]);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await api.request(`/social/leaderboard/${selectedType}?limit=100`);
      setLeaderboard(data.leaderboard || []);
      setUserRank(data.userRank);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const data = await api.request('/social/rank');
      setUserStats(data);
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  const formatValue = (entry, type) => {
    switch (type) {
      case 'wins':
        return entry.total_wins;
      case 'tags':
        return entry.total_tags;
      case 'xp':
        return entry.xp?.toLocaleString();
      case 'level':
        return `Lv.${entry.level}`;
      case 'survival':
        return formatDuration(entry.total_survival_time);
      case 'streak':
        return entry.best_win_streak;
      default:
        return entry.total_wins;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getRankStyle = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/50';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/50';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/50';
      default:
        return 'bg-dark-800/50 border-white/5';
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center text-white/40 font-mono">{rank}</span>;
    }
  };

  const selectedTypeConfig = LEADERBOARD_TYPES.find(t => t.id === selectedType);
  const TypeIcon = selectedTypeConfig?.icon || Trophy;

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-dark-800 to-dark-900 p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-white mb-2">Global Leaderboards</h1>
        <p className="text-white/60 text-sm">Compete with players worldwide</p>
      </div>

      {/* Type Selector */}
      <div className="p-4">
        <button
          onClick={() => setShowTypeSelector(!showTypeSelector)}
          className="w-full flex items-center justify-between p-4 bg-dark-800 rounded-xl border border-white/10"
        >
          <div className="flex items-center gap-3">
            <TypeIcon className="w-5 h-5 text-neon-cyan" />
            <span className="font-medium text-white">{selectedTypeConfig?.label}</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${showTypeSelector ? 'rotate-180' : ''}`} />
        </button>

        {showTypeSelector && (
          <div className="mt-2 bg-dark-800 rounded-xl border border-white/10 overflow-hidden">
            {LEADERBOARD_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedType(type.id);
                    setShowTypeSelector(false);
                  }}
                  className={`w-full flex items-center gap-3 p-4 transition-colors ${
                    selectedType === type.id
                      ? 'bg-neon-cyan/10 text-neon-cyan'
                      : 'text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* User's Rank Card */}
      {user && userStats && (
        <div className="px-4 mb-4">
          <div className="bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 rounded-xl p-4 border border-neon-cyan/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-neon-cyan/20 rounded-full flex items-center justify-center text-2xl">
                  {user.avatar || '😀'}
                </div>
                <div>
                  <p className="font-bold text-white">{user.name}</p>
                  <p className="text-sm text-white/60">Level {userStats.stats?.level || 1}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/60">Your Rank</p>
                <p className="text-2xl font-bold text-neon-cyan">
                  #{userRank || userStats.ranks?.[selectedType] || '—'}
                </p>
              </div>
            </div>
            
            {/* XP Progress */}
            {userStats.stats && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>XP Progress</span>
                  <span>{userStats.stats.xp % 1000} / {userStats.stats.level * 1000}</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full"
                    style={{ width: `${((userStats.stats.xp % 1000) / (userStats.stats.level * 1000)) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="px-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-dark-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser = entry.user_id === user?.id;
              
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    isCurrentUser
                      ? 'bg-neon-cyan/10 border-neon-cyan/30'
                      : getRankStyle(rank)
                  }`}
                >
                  <div className="w-8 flex justify-center">
                    {getRankIcon(rank)}
                  </div>
                  
                  <div className="w-10 h-10 bg-dark-700 rounded-full flex items-center justify-center text-xl">
                    {entry.avatar || '😀'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${isCurrentUser ? 'text-neon-cyan' : 'text-white'}`}>
                      {entry.name}
                      {isCurrentUser && <span className="ml-2 text-xs">(You)</span>}
                    </p>
                    <p className="text-xs text-white/40">Level {entry.level || 1}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-bold ${rank <= 3 ? 'text-lg' : ''} ${
                      rank === 1 ? 'text-yellow-400' :
                      rank === 2 ? 'text-gray-300' :
                      rank === 3 ? 'text-amber-500' :
                      'text-white'
                    }`}>
                      {formatValue(entry, selectedType)}
                    </p>
                    <p className="text-xs text-white/40">{selectedTypeConfig?.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No players on leaderboard yet</p>
            <p className="text-white/20 text-sm">Play games to appear here!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GlobalLeaderboard;

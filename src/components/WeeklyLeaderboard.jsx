import { useState, useEffect } from 'react';
import { Trophy, Medal, TrendingUp, TrendingDown, Minus, Crown, Star } from 'lucide-react';
import Avatar from './Avatar';

const TIER_COLORS = {
  bronze: 'from-amber-600 to-amber-800',
  silver: 'from-slate-400 to-slate-600',
  gold: 'from-yellow-400 to-amber-500',
  platinum: 'from-cyan-400 to-blue-500',
  diamond: 'from-purple-400 to-pink-500',
};

const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 1500,
  platinum: 3000,
  diamond: 5000,
};

export default function WeeklyLeaderboard({ players = [], currentUserId, onViewProfile }) {
  const [selectedTab, setSelectedTab] = useState('weekly');
  const [animateRank, setAnimateRank] = useState(null);

  const getTier = (xp) => {
    if (xp >= TIER_THRESHOLDS.diamond) return 'diamond';
    if (xp >= TIER_THRESHOLDS.platinum) return 'platinum';
    if (xp >= TIER_THRESHOLDS.gold) return 'gold';
    if (xp >= TIER_THRESHOLDS.silver) return 'silver';
    return 'bronze';
  };

  const getRankChange = (player) => {
    if (!player.previousRank) return null;
    const change = player.previousRank - player.rank;
    if (change > 0) return { direction: 'up', amount: change };
    if (change < 0) return { direction: 'down', amount: Math.abs(change) };
    return { direction: 'same', amount: 0 };
  };

  const currentUser = players.find(p => p.id === currentUserId);
  const topThree = players.slice(0, 3);
  const restOfPlayers = players.slice(3);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white">
            <Trophy className="w-6 h-6" />
            <h2 className="font-bold text-lg">Leaderboard</h2>
          </div>
          <div className="text-white/80 text-sm">
            Season 1 • Week 4
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2">
          {['weekly', 'season', 'alltime'].map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                selectedTab === tab 
                  ? 'bg-white text-purple-600' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {tab === 'weekly' ? 'This Week' : tab === 'season' ? 'Season' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="p-4 bg-gradient-to-b from-purple-600/10 to-transparent">
        <div className="flex items-end justify-center gap-4 mb-4">
          {/* 2nd Place */}
          {topThree[1] && (
            <div className="flex flex-col items-center">
              <div className="relative">
                <Avatar user={topThree[1]} size="lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  2
                </div>
              </div>
              <p className="mt-2 font-semibold text-sm text-slate-700 dark:text-slate-300 truncate max-w-[80px]">
                {topThree[1].username}
              </p>
              <p className="text-xs text-slate-500">{topThree[1].xp?.toLocaleString()} XP</p>
              <div className="h-16 w-20 bg-slate-300 dark:bg-slate-600 rounded-t-lg mt-2" />
            </div>
          )}

          {/* 1st Place */}
          {topThree[0] && (
            <div className="flex flex-col items-center -mb-4">
              <Crown className="w-8 h-8 text-yellow-500 mb-1" />
              <div className="relative">
                <div className="ring-4 ring-yellow-400 rounded-full">
                  <Avatar user={topThree[0]} size="xl" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  1
                </div>
              </div>
              <p className="mt-2 font-bold text-slate-800 dark:text-white truncate max-w-[90px]">
                {topThree[0].username}
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold">
                {topThree[0].xp?.toLocaleString()} XP
              </p>
              <div className="h-24 w-24 bg-yellow-400 dark:bg-yellow-500 rounded-t-lg mt-2" />
            </div>
          )}

          {/* 3rd Place */}
          {topThree[2] && (
            <div className="flex flex-col items-center">
              <div className="relative">
                <Avatar user={topThree[2]} size="lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  3
                </div>
              </div>
              <p className="mt-2 font-semibold text-sm text-slate-700 dark:text-slate-300 truncate max-w-[80px]">
                {topThree[2].username}
              </p>
              <p className="text-xs text-slate-500">{topThree[2].xp?.toLocaleString()} XP</p>
              <div className="h-12 w-20 bg-amber-600 rounded-t-lg mt-2" />
            </div>
          )}
        </div>
      </div>

      {/* Rest of Leaderboard */}
      <div className="px-4 pb-4 max-h-[300px] overflow-y-auto">
        {restOfPlayers.map((player, index) => {
          const rank = index + 4;
          const isCurrentUser = player.id === currentUserId;
          const rankChange = getRankChange(player);
          const tier = getTier(player.xp || 0);

          return (
            <button
              key={player.id}
              onClick={() => onViewProfile?.(player.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl mb-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 ${
                isCurrentUser ? 'bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-400' : ''
              }`}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                <span className={`font-bold ${isCurrentUser ? 'text-purple-600' : 'text-slate-500'}`}>
                  {rank}
                </span>
              </div>

              {/* Rank Change */}
              <div className="w-6">
                {rankChange && (
                  rankChange.direction === 'up' ? (
                    <div className="flex items-center text-green-500 text-xs">
                      <TrendingUp size={14} />
                    </div>
                  ) : rankChange.direction === 'down' ? (
                    <div className="flex items-center text-red-500 text-xs">
                      <TrendingDown size={14} />
                    </div>
                  ) : (
                    <Minus size={14} className="text-slate-400" />
                  )
                )}
              </div>

              {/* Avatar */}
              <Avatar user={player} size="sm" />

              {/* Name & Tier */}
              <div className="flex-1 text-left">
                <p className={`font-semibold text-sm ${isCurrentUser ? 'text-purple-600' : 'text-slate-800 dark:text-white'}`}>
                  {player.username}
                  {isCurrentUser && <span className="ml-1 text-xs">(You)</span>}
                </p>
                <div className={`inline-block px-2 py-0.5 rounded-full text-xs text-white bg-gradient-to-r ${TIER_COLORS[tier]}`}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </div>
              </div>

              {/* XP */}
              <div className="text-right">
                <p className="font-bold text-slate-800 dark:text-white">{player.xp?.toLocaleString()}</p>
                <p className="text-xs text-slate-500">XP</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current User Position (if not in top visible) */}
      {currentUser && currentUser.rank > 10 && (
        <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <span className="font-bold text-purple-600 w-8 text-center">#{currentUser.rank}</span>
            <Avatar user={currentUser} size="sm" />
            <div className="flex-1">
              <p className="font-semibold text-purple-600">Your Position</p>
            </div>
            <p className="font-bold">{currentUser.xp?.toLocaleString()} XP</p>
          </div>
        </div>
      )}
    </div>
  );
}

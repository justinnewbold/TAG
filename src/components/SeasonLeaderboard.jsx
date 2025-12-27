// SeasonLeaderboard Component - Competitive ranked leaderboard with seasons
import React, { useState, useEffect } from 'react';
import { useSeason } from '../hooks/useSeason';
import { useStore } from '../store';
import { Trophy, Crown, Medal, Star, Clock, TrendingUp, Award, ChevronRight, Sparkles, Users, Target, Flame, RefreshCw } from 'lucide-react';

const TIER_COLORS = {
  BRONZE: { bg: 'bg-amber-900/20', border: 'border-amber-700', text: 'text-amber-500', glow: 'shadow-amber-500/20' },
  SILVER: { bg: 'bg-gray-300/20', border: 'border-gray-400', text: 'text-gray-300', glow: 'shadow-gray-400/20' },
  GOLD: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/30' },
  PLATINUM: { bg: 'bg-cyan-500/20', border: 'border-cyan-400', text: 'text-cyan-300', glow: 'shadow-cyan-400/30' },
  DIAMOND: { bg: 'bg-blue-400/20', border: 'border-blue-400', text: 'text-blue-300', glow: 'shadow-blue-400/30' },
  MASTER: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400', glow: 'shadow-purple-500/30' },
  GRANDMASTER: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400', glow: 'shadow-orange-500/40' },
};

const RankBadge = ({ tier, size = 'md' }) => {
  const colors = TIER_COLORS[tier?.tier] || TIER_COLORS.BRONZE;
  const sizes = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-10 h-10 text-lg',
    lg: 'w-14 h-14 text-2xl',
  };

  return (
    <div className={`${sizes[size]} ${colors.bg} ${colors.border} ${colors.glow} border-2 rounded-full flex items-center justify-center shadow-lg`}>
      <span>{tier?.icon}</span>
    </div>
  );
};

const LeaderboardEntry = ({ entry, isCurrentPlayer, onViewProfile }) => {
  const colors = TIER_COLORS[entry.tier?.tier] || TIER_COLORS.BRONZE;
  
  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-gray-400 font-medium">#{rank}</span>;
  };

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer
        ${isCurrentPlayer 
          ? `${colors.bg} ${colors.border} border-2 ${colors.glow} shadow-lg` 
          : 'bg-white/5 hover:bg-white/10 border border-white/10'
        }`}
      onClick={() => onViewProfile?.(entry.playerId)}
    >
      <div className="w-10 flex justify-center">
        {getRankIcon(entry.rank)}
      </div>

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold">
            {entry.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="absolute -bottom-1 -right-1">
            <RankBadge tier={entry.tier} size="sm" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold truncate ${isCurrentPlayer ? colors.text : 'text-white'}`}>
            {entry.displayName || entry.username}
          </p>
          <p className="text-xs text-gray-400">{entry.tier?.name}</p>
        </div>
      </div>

      <div className="text-right">
        <p className={`font-bold ${colors.text}`}>{entry.points.toLocaleString()}</p>
        <p className="text-xs text-gray-400">{entry.stats?.gamesPlayed || 0} games</p>
      </div>

      <ChevronRight className="w-4 h-4 text-gray-500" />
    </div>
  );
};

const SeasonBanner = ({ season, timeRemaining, formatTimeRemaining }) => {
  if (!season) return null;

  return (
    <div 
      className="relative overflow-hidden rounded-2xl p-6 mb-6"
      style={{ 
        background: `linear-gradient(135deg, ${season.theme?.color}20, ${season.theme?.color}10)`,
        borderColor: season.theme?.color,
      }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{season.theme?.emoji}</span>
            <div>
              <h2 className="text-xl font-bold text-white">{season.name}</h2>
              <p className="text-sm text-gray-300">{season.theme?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-full">
            <Clock className="w-4 h-4 text-white/70" />
            <span className="text-sm font-medium text-white">{formatTimeRemaining()}</span>
          </div>
        </div>
        
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-300">XP Rewards</span>
          </div>
          <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg">
            <Award className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-300">Exclusive Titles</span>
          </div>
          <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg">
            <Trophy className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-gray-300">Season Badges</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const PlayerRankCard = ({ playerRank, getPromotionProgress, RANK_TIERS }) => {
  const progress = getPromotionProgress();
  const colors = TIER_COLORS[playerRank?.tier?.tier] || TIER_COLORS.BRONZE;

  return (
    <div className={`${colors.bg} ${colors.border} border-2 rounded-2xl p-5 mb-6 ${colors.glow} shadow-xl`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <RankBadge tier={playerRank?.tier} size="lg" />
          <div>
            <p className="text-sm text-gray-400">Your Rank</p>
            <p className={`text-2xl font-bold ${colors.text}`}>
              {playerRank?.tier?.name || 'Unranked'}
            </p>
            {playerRank?.rank && (
              <p className="text-sm text-gray-400">#{playerRank.rank} Overall</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Season Points</p>
          <p className={`text-3xl font-bold ${colors.text}`}>
            {(playerRank?.points || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {progress && !progress.atMax && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress to {progress.nextTier?.name}</span>
            <span className={colors.text}>{progress.pointsToNext?.toLocaleString()} pts needed</span>
          </div>
          <div className="h-2 bg-black/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-current to-current/70 rounded-full transition-all duration-500"
              style={{ 
                width: `${progress.progress}%`,
                backgroundColor: progress.currentTier?.color,
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10">
        <div className="text-center">
          <p className="text-lg font-bold text-white">{playerRank?.stats?.gamesPlayed || 0}</p>
          <p className="text-xs text-gray-400">Games</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-400">{playerRank?.stats?.wins || 0}</p>
          <p className="text-xs text-gray-400">Wins</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-orange-400">{playerRank?.stats?.tags || 0}</p>
          <p className="text-xs text-gray-400">Tags</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-purple-400">{playerRank?.stats?.bestStreak || 0}</p>
          <p className="text-xs text-gray-400">Best Streak</p>
        </div>
      </div>
    </div>
  );
};

const TierRewardsPreview = ({ RANK_TIERS, SEASON_REWARDS, currentTier }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span className="font-semibold text-white">Season Rewards</span>
        </div>
        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {Object.entries(RANK_TIERS).map(([tier, config]) => {
            const rewards = SEASON_REWARDS[tier];
            const colors = TIER_COLORS[tier];
            const isCurrent = tier === currentTier;
            
            return (
              <div 
                key={tier}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  isCurrent ? `${colors.bg} ${colors.border} border` : 'bg-black/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{config.icon}</span>
                  <div>
                    <p className={`font-medium ${isCurrent ? colors.text : 'text-white'}`}>{config.name}</p>
                    <p className="text-xs text-gray-400">{config.min.toLocaleString()}+ pts</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="text-yellow-400">{rewards.xp} XP</p>
                  <p className="text-green-400">{rewards.coins} coins</p>
                  {rewards.title && <p className="text-purple-400 text-xs">{rewards.title}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export function SeasonLeaderboard({ onViewProfile, onClose }) {
  const { user } = useStore();
  const [viewMode, setViewMode] = useState('top50');
  
  const {
    season,
    leaderboard,
    playerRank,
    loading,
    error,
    loadLeaderboard,
    formatTimeRemaining,
    getPromotionProgress,
    RANK_TIERS,
    SEASON_REWARDS,
  } = useSeason(user?.id);

  const handleRefresh = () => {
    loadLeaderboard(viewMode === 'top50' ? 50 : 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-lg border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h1 className="text-xl font-bold">Season Leaderboard</h1>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Season Banner */}
        <SeasonBanner 
          season={season} 
          formatTimeRemaining={formatTimeRemaining}
        />

        {/* Player Rank Card */}
        {user && (
          <PlayerRankCard 
            playerRank={playerRank}
            getPromotionProgress={getPromotionProgress}
            RANK_TIERS={RANK_TIERS}
          />
        )}

        {/* Rewards Preview */}
        <TierRewardsPreview 
          RANK_TIERS={RANK_TIERS}
          SEASON_REWARDS={SEASON_REWARDS}
          currentTier={playerRank?.tier?.tier}
        />

        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setViewMode('top50'); loadLeaderboard(50); }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              viewMode === 'top50' 
                ? 'bg-orange-500 text-white' 
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Top 50
          </button>
          <button
            onClick={() => { setViewMode('top100'); loadLeaderboard(100); }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              viewMode === 'top100' 
                ? 'bg-orange-500 text-white' 
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Top 100
          </button>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">
              <p>Failed to load leaderboard</p>
              <button 
                onClick={handleRefresh}
                className="mt-2 text-sm text-orange-400 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No rankings yet this season</p>
              <p className="text-sm text-gray-500 mt-1">Play games to earn points!</p>
            </div>
          ) : (
            leaderboard.map((entry) => (
              <LeaderboardEntry
                key={entry.playerId}
                entry={entry}
                isCurrentPlayer={entry.playerId === user?.id}
                onViewProfile={onViewProfile}
              />
            ))
          )}
        </div>

        {/* How Points Work */}
        <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            How to Earn Points
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-gray-300">Tag someone: +10 pts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-gray-300">Win game: +50 pts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-gray-300">Survive time: +2 pts/min</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-gray-300">Play game: +5 pts</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-gray-300">Win streak bonus: 3+ wins = 1.2x, 5+ wins = 1.5x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SeasonLeaderboard;

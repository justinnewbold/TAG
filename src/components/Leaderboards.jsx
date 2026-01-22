import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Crown,
  Star,
  Users,
  Globe,
  MapPin,
  UserCheck,
  Clock,
  Calendar,
  ChevronUp,
  ChevronDown,
  Minus,
  Search,
  Filter,
  Target,
  Zap,
  Timer,
  Flame,
  Shield,
  Award,
  TrendingUp,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

// Rank tiers for seasonal rankings
const RANK_TIERS = [
  { id: 'bronze', name: 'Bronze', minPoints: 0, icon: Shield, color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/30' },
  { id: 'silver', name: 'Silver', minPoints: 1000, icon: Shield, color: 'text-gray-300', bgColor: 'bg-gray-400/20', borderColor: 'border-gray-400/30' },
  { id: 'gold', name: 'Gold', minPoints: 2500, icon: Star, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/30' },
  { id: 'platinum', name: 'Platinum', minPoints: 5000, icon: Star, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/30' },
  { id: 'diamond', name: 'Diamond', minPoints: 10000, icon: Trophy, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/30' },
  { id: 'master', name: 'Master', minPoints: 20000, icon: Trophy, color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/30' },
  { id: 'champion', name: 'Champion', minPoints: 35000, icon: Crown, color: 'text-yellow-300', bgColor: 'bg-yellow-400/20', borderColor: 'border-yellow-400/30' },
];

// Leaderboard categories
const LEADERBOARD_CATEGORIES = [
  { id: 'overall', name: 'Overall', icon: Trophy, description: 'Combined score from all activities' },
  { id: 'wins', name: 'Wins', icon: Medal, description: 'Total games won' },
  { id: 'tags', name: 'Tags', icon: Target, description: 'Total successful tags' },
  { id: 'survival', name: 'Survival', icon: Timer, description: 'Total survival time as runner' },
  { id: 'xp', name: 'XP Earned', icon: Zap, description: 'Total experience points' },
  { id: 'streak', name: 'Win Streak', icon: Flame, description: 'Current winning streak' },
];

// Time period filters
const TIME_PERIODS = [
  { id: 'daily', name: 'Today', icon: Clock },
  { id: 'weekly', name: 'This Week', icon: Calendar },
  { id: 'monthly', name: 'This Month', icon: Calendar },
  { id: 'season', name: 'Season', icon: Trophy },
  { id: 'alltime', name: 'All Time', icon: Globe },
];

// Scope filters
const SCOPE_FILTERS = [
  { id: 'global', name: 'Global', icon: Globe },
  { id: 'regional', name: 'Regional', icon: MapPin },
  { id: 'friends', name: 'Friends', icon: Users },
];

// Generate mock leaderboard data
const generateLeaderboardData = (count = 100) => {
  const names = [
    'ShadowStrike', 'NightRunner', 'SwiftHunter', 'GhostTag', 'SpeedDemon',
    'ThunderBolt', 'SilentKiller', 'FlashPoint', 'DarkPhoenix', 'StormChaser',
    'BlazeMaster', 'IceWolf', 'FireFox', 'SteelTitan', 'CyberNinja',
    'NeonRider', 'VoidWalker', 'StarBreaker', 'MoonShadow', 'SunFlare',
  ];

  return Array.from({ length: count }, (_, i) => {
    const baseScore = Math.max(50000 - (i * 450) + Math.random() * 200, 100);
    const prevRank = i + 1 + Math.floor(Math.random() * 5) - 2;

    return {
      rank: i + 1,
      prevRank: Math.max(1, prevRank),
      userId: `user_${i + 1}`,
      username: i < 20 ? names[i] : `Player${1000 + i}`,
      avatar: null,
      level: Math.floor(Math.random() * 50) + 10,
      score: Math.floor(baseScore),
      wins: Math.floor(Math.random() * 500) + 50,
      tags: Math.floor(Math.random() * 2000) + 100,
      survivalTime: Math.floor(Math.random() * 100000) + 10000,
      clan: i < 30 ? ['Shadow Hunters', 'Thunder Squad', 'Night Wolves', 'Speed Demons'][i % 4] : null,
      isOnline: Math.random() > 0.7,
      country: ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'JP', 'KR'][Math.floor(Math.random() * 8)],
    };
  });
};

// Custom hook for leaderboard data
const useLeaderboards = () => {
  const [category, setCategory] = useState('overall');
  const [timePeriod, setTimePeriod] = useState('weekly');
  const [scope, setScope] = useState('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [leaderboardData, setLeaderboardData] = useState(generateLeaderboardData(100));
  const [userRank, setUserRank] = useState({
    rank: 847,
    prevRank: 892,
    score: 12450,
    percentile: 15.3,
  });

  const [seasonInfo, setSeasonInfo] = useState({
    name: 'Season 4: Winter Championship',
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    userPoints: 8750,
    userRank: 'platinum',
  });

  const filteredData = useMemo(() => {
    if (!searchQuery) return leaderboardData;
    return leaderboardData.filter(p =>
      p.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [leaderboardData, searchQuery]);

  const refreshData = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setLeaderboardData(generateLeaderboardData(100));
      setIsLoading(false);
    }, 1000);
  }, []);

  return {
    category,
    setCategory,
    timePeriod,
    setTimePeriod,
    scope,
    setScope,
    searchQuery,
    setSearchQuery,
    leaderboardData: filteredData,
    userRank,
    seasonInfo,
    isLoading,
    refreshData,
  };
};

// Rank change indicator
const RankChange = ({ current, previous }) => {
  const diff = previous - current;

  if (diff === 0) {
    return <Minus size={14} className="text-gray-500" />;
  }

  if (diff > 0) {
    return (
      <div className="flex items-center gap-0.5 text-green-400">
        <ChevronUp size={14} />
        <span className="text-xs">{diff}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 text-red-400">
      <ChevronDown size={14} />
      <span className="text-xs">{Math.abs(diff)}</span>
    </div>
  );
};

// Top 3 podium display
const TopThreePodium = ({ players }) => {
  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd
  const heights = ['h-24', 'h-32', 'h-20'];
  const medals = [
    { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: '1st' },
    { color: 'text-gray-300', bg: 'bg-gray-400/20', label: '2nd' },
    { color: 'text-orange-400', bg: 'bg-orange-500/20', label: '3rd' },
  ];

  return (
    <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-500/30 mb-6">
      <div className="flex items-end justify-center gap-4">
        {podiumOrder.map((idx, displayIdx) => {
          const player = players[idx];
          if (!player) return null;

          const medal = medals[idx];
          const height = heights[displayIdx];

          return (
            <div key={player.rank} className="flex flex-col items-center">
              {/* Avatar and info */}
              <div className={`relative mb-2 ${idx === 0 ? 'scale-110' : ''}`}>
                {idx === 0 && (
                  <Crown size={24} className="text-yellow-400 absolute -top-6 left-1/2 -translate-x-1/2" />
                )}
                <div className={`w-16 h-16 rounded-full ${medal.bg} border-2 ${medal.color.replace('text-', 'border-')} flex items-center justify-center text-2xl font-bold`}>
                  {player.username[0]}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${medal.bg} flex items-center justify-center`}>
                  <span className={`text-xs font-bold ${medal.color}`}>{idx + 1}</span>
                </div>
              </div>
              <span className="text-white font-medium text-sm mb-1">{player.username}</span>
              <span className="text-gray-400 text-xs mb-2">{player.score.toLocaleString()} pts</span>

              {/* Podium */}
              <div className={`w-20 ${height} ${medal.bg} rounded-t-lg flex items-center justify-center border-t-2 ${medal.color.replace('text-', 'border-')}`}>
                <Trophy size={24} className={medal.color} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Player row in leaderboard
const LeaderboardRow = ({ player, isCurrentUser, onViewProfile }) => {
  const getRankStyle = (rank) => {
    if (rank === 1) return 'text-yellow-400 bg-yellow-500/20';
    if (rank === 2) return 'text-gray-300 bg-gray-400/20';
    if (rank === 3) return 'text-orange-400 bg-orange-500/20';
    if (rank <= 10) return 'text-purple-400 bg-purple-500/20';
    return 'text-gray-400 bg-gray-700/50';
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg transition-colors cursor-pointer hover:bg-gray-700/50 ${
        isCurrentUser ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-gray-800/50'
      }`}
      onClick={() => onViewProfile(player)}
    >
      {/* Rank */}
      <div className={`w-10 h-10 rounded-lg ${getRankStyle(player.rank)} flex items-center justify-center font-bold`}>
        {player.rank}
      </div>

      {/* Rank change */}
      <div className="w-8">
        <RankChange current={player.rank} previous={player.prevRank} />
      </div>

      {/* Avatar and name */}
      <div className="flex items-center gap-3 flex-1">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
            {player.username[0]}
          </div>
          {player.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isCurrentUser ? 'text-purple-400' : 'text-white'}`}>
              {player.username}
            </span>
            {isCurrentUser && (
              <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full">You</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Lvl {player.level}</span>
            {player.clan && (
              <>
                <span>•</span>
                <span className="text-purple-400">[{player.clan}]</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-6 text-sm">
        <div className="text-center">
          <div className="text-gray-500 text-xs">Wins</div>
          <div className="text-white font-medium">{player.wins}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500 text-xs">Tags</div>
          <div className="text-white font-medium">{player.tags}</div>
        </div>
      </div>

      {/* Score */}
      <div className="text-right">
        <div className="text-white font-bold">{player.score.toLocaleString()}</div>
        <div className="text-gray-500 text-xs">points</div>
      </div>

      <ChevronRight size={18} className="text-gray-600" />
    </div>
  );
};

// User rank card
const UserRankCard = ({ userRank, seasonInfo }) => {
  const currentTier = RANK_TIERS.find(t => seasonInfo.userPoints >= t.minPoints);
  const nextTier = RANK_TIERS.find(t => t.minPoints > seasonInfo.userPoints);
  const TierIcon = currentTier?.icon || Shield;

  const progressToNext = nextTier
    ? ((seasonInfo.userPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
    : 100;

  return (
    <div className={`rounded-xl p-5 border ${currentTier?.bgColor} ${currentTier?.borderColor}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${currentTier?.bgColor}`}>
            <TierIcon size={28} className={currentTier?.color} />
          </div>
          <div>
            <div className={`text-lg font-bold ${currentTier?.color}`}>{currentTier?.name}</div>
            <div className="text-gray-400 text-sm">{seasonInfo.userPoints.toLocaleString()} points</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-white font-bold text-2xl">#{userRank.rank}</div>
          <div className="flex items-center justify-end gap-1">
            <RankChange current={userRank.rank} previous={userRank.prevRank} />
            <span className="text-gray-500 text-xs">from #{userRank.prevRank}</span>
          </div>
        </div>
      </div>

      {/* Progress to next rank */}
      {nextTier && (
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Progress to {nextTier.name}</span>
            <span className="text-gray-400">{nextTier.minPoints - seasonInfo.userPoints} pts needed</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${currentTier?.color.replace('text-', 'bg-')}`}
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        </div>
      )}

      {/* Percentile */}
      <div className="mt-4 flex items-center justify-center gap-2 text-sm">
        <Award size={16} className="text-yellow-400" />
        <span className="text-gray-300">
          Top <span className="text-yellow-400 font-bold">{userRank.percentile}%</span> of all players
        </span>
      </div>
    </div>
  );
};

// Season info banner
const SeasonBanner = ({ seasonInfo }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const diff = seasonInfo.endDate - new Date();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      setTimeLeft(`${days}d ${hours}h`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [seasonInfo.endDate]);

  return (
    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-500/30 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy size={24} className="text-yellow-400" />
          <div>
            <div className="text-white font-semibold">{seasonInfo.name}</div>
            <div className="text-gray-400 text-sm">Compete for exclusive rewards!</div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-yellow-400">
            <Clock size={16} />
            <span className="font-mono">{timeLeft}</span>
          </div>
          <div className="text-gray-500 text-xs">until season ends</div>
        </div>
      </div>
    </div>
  );
};

// Category selector
const CategorySelector = ({ categories, selected, onSelect }) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
      {categories.map((cat) => {
        const Icon = cat.icon;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selected === cat.id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Icon size={16} />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
};

// Filters bar
const FiltersBar = ({ timePeriod, setTimePeriod, scope, setScope, onRefresh, isLoading }) => {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Time period */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        {TIME_PERIODS.map((period) => (
          <button
            key={period.id}
            onClick={() => setTimePeriod(period.id)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              timePeriod === period.id
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {period.name}
          </button>
        ))}
      </div>

      {/* Scope */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
        {SCOPE_FILTERS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                scope === s.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={14} />
              {s.name}
            </button>
          );
        })}
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="ml-auto p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
      >
        <RefreshCw size={18} className={`text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

// Search bar
const SearchBar = ({ value, onChange }) => {
  return (
    <div className="relative mb-4">
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        type="text"
        placeholder="Search players..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
      />
    </div>
  );
};

// Rank tiers display
const RankTiersDisplay = ({ currentRank }) => {
  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-6">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Trophy size={18} className="text-yellow-400" />
        Season Ranks
      </h3>
      <div className="flex flex-wrap gap-2">
        {RANK_TIERS.map((tier) => {
          const Icon = tier.icon;
          const isCurrentTier = tier.id === currentRank;

          return (
            <div
              key={tier.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${tier.bgColor} ${
                isCurrentTier ? `border-2 ${tier.borderColor}` : 'border border-transparent'
              }`}
            >
              <Icon size={16} className={tier.color} />
              <span className={`text-sm ${isCurrentTier ? 'text-white font-medium' : 'text-gray-400'}`}>
                {tier.name}
              </span>
              {isCurrentTier && (
                <Sparkles size={12} className={tier.color} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Main Leaderboards Component
const Leaderboards = () => {
  const {
    category,
    setCategory,
    timePeriod,
    setTimePeriod,
    scope,
    setScope,
    searchQuery,
    setSearchQuery,
    leaderboardData,
    userRank,
    seasonInfo,
    isLoading,
    refreshData,
  } = useLeaderboards();

  const [showRankTiers, setShowRankTiers] = useState(false);
  const currentUserId = 'user_847'; // Mock current user

  const handleViewProfile = (player) => {
    console.log('View profile:', player);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Trophy className="text-yellow-400" />
            Leaderboards
          </h1>
          <p className="text-gray-400 mt-1">Compete for glory and climb the ranks!</p>
        </div>

        {/* Season banner */}
        <SeasonBanner seasonInfo={seasonInfo} />

        {/* User rank card */}
        <UserRankCard userRank={userRank} seasonInfo={seasonInfo} />

        {/* Rank tiers toggle */}
        <button
          onClick={() => setShowRankTiers(!showRankTiers)}
          className="w-full mt-4 mb-2 flex items-center justify-center gap-2 text-purple-400 hover:text-purple-300 text-sm transition-colors"
        >
          <Award size={16} />
          {showRankTiers ? 'Hide' : 'Show'} All Ranks
        </button>

        {showRankTiers && <RankTiersDisplay currentRank={seasonInfo.userRank} />}

        {/* Category selector */}
        <CategorySelector
          categories={LEADERBOARD_CATEGORIES}
          selected={category}
          onSelect={setCategory}
        />

        {/* Filters */}
        <FiltersBar
          timePeriod={timePeriod}
          setTimePeriod={setTimePeriod}
          scope={scope}
          setScope={setScope}
          onRefresh={refreshData}
          isLoading={isLoading}
        />

        {/* Search */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Top 3 podium */}
        {!searchQuery && leaderboardData.length >= 3 && (
          <TopThreePodium players={leaderboardData.slice(0, 3)} />
        )}

        {/* Leaderboard list */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw size={32} className="text-purple-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Loading leaderboard...</p>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="text-center py-12">
              <Search size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No players found</p>
            </div>
          ) : (
            leaderboardData.slice(searchQuery ? 0 : 3, 50).map((player) => (
              <LeaderboardRow
                key={player.userId}
                player={player}
                isCurrentUser={player.userId === currentUserId}
                onViewProfile={handleViewProfile}
              />
            ))
          )}
        </div>

        {/* Load more */}
        {leaderboardData.length > 50 && (
          <button className="w-full mt-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors">
            Load More
          </button>
        )}

        {/* Jump to my rank */}
        <button
          className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-full shadow-lg transition-all flex items-center gap-2"
          onClick={() => {
            // Scroll to user's rank
          }}
        >
          <TrendingUp size={18} />
          My Rank: #{userRank.rank}
        </button>
      </div>
    </div>
  );
};

export default Leaderboards;

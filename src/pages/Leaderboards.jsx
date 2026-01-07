import React, { useState, useCallback, useMemo } from 'react';
import Avatar from '../components/Avatar';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Target, Shield, Clock, Medal, Crown, Users, RefreshCw, Share2, Globe, UserCheck, Route } from 'lucide-react';
import { useStore } from '../store';
import { useSwipe, usePullToRefresh } from '../hooks/useGestures';
import { formatDistance } from '../../shared/utils';

function Leaderboards() {
  const navigate = useNavigate();
  const { games, user, friends, settings } = useStore();
  const useImperial = settings?.useImperial ?? false;
  const [activeBoard, setActiveBoard] = useState('wins');
  const [showFriendsOnly, setShowFriendsOnly] = useState(false);
  const [timePeriod, setTimePeriod] = useState('allTime'); // allTime, weekly, daily
  
  // Swipe gestures
  const swipeHandlers = useSwipe({
    onSwipeRight: () => navigate(-1),
    onSwipeLeft: () => {
      const boards = ['wins', 'tags', 'survival', 'games', 'distance'];
      const currentIndex = boards.indexOf(activeBoard);
      if (currentIndex < boards.length - 1) {
        setActiveBoard(boards[currentIndex + 1]);
      }
    },
    threshold: 80,
  });

  // Get friend IDs for filtering
  const friendIds = useMemo(() => {
    const ids = new Set(friends?.map(f => f.id) || []);
    if (user?.id) ids.add(user.id); // Include self in friends view
    return ids;
  }, [friends, user?.id]);
  
  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
  }, []);
  
  const { pullHandlers, isPulling, isRefreshing, pullProgress } = usePullToRefresh(handleRefresh);
  
  // Get time filter cutoff
  const getTimeCutoff = useCallback(() => {
    const now = Date.now();
    switch (timePeriod) {
      case 'daily': return now - 24 * 60 * 60 * 1000;
      case 'weekly': return now - 7 * 24 * 60 * 60 * 1000;
      default: return 0; // allTime
    }
  }, [timePeriod]);

  // Calculate player stats from games with filters
  const allPlayerStats = useMemo(() => {
    const playerStats = {};
    const timeCutoff = getTimeCutoff();

    games
      .filter(g => g.status === 'ended')
      .filter(g => !timeCutoff || (g.endedAt || g.createdAt) >= timeCutoff)
      .forEach((game) => {
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
              totalDistance: 0,
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

          // Distance traveled (in meters)
          if (player.distanceTraveled) {
            playerStats[player.id].totalDistance += player.distanceTraveled;
          }
        });
      });

    return Object.values(playerStats);
  }, [games, getTimeCutoff]);

  // Filter for friends if enabled
  const filteredStats = useMemo(() => {
    if (!showFriendsOnly) return allPlayerStats;
    return allPlayerStats.filter(p => friendIds.has(p.id));
  }, [allPlayerStats, showFriendsOnly, friendIds]);
  
  // Sort for different leaderboards (using filtered stats)
  const leaderboards = useMemo(() => ({
    wins: [...filteredStats].sort((a, b) => b.wins - a.wins),
    tags: [...filteredStats].sort((a, b) => b.tags - a.tags),
    survival: [...filteredStats].sort((a, b) => b.totalSurvivalTime - a.totalSurvivalTime),
    games: [...filteredStats].sort((a, b) => b.gamesPlayed - a.gamesPlayed),
    distance: [...filteredStats].sort((a, b) => b.totalDistance - a.totalDistance),
  }), [filteredStats]);
  
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
      case 'distance': return formatDistance(player.totalDistance, useImperial);
      default: return 0;
    }
  };

  const getStatLabel = () => {
    switch (activeBoard) {
      case 'wins': return 'Wins';
      case 'tags': return 'Tags';
      case 'survival': return 'Survived';
      case 'games': return 'Games';
      case 'distance': return 'Distance';
      default: return '';
    }
  };

  const boardIcons = {
    wins: Trophy,
    tags: Target,
    survival: Shield,
    games: Users,
    distance: Route,
  };
  
  const BoardIcon = boardIcons[activeBoard];
  
  return (
    <div 
      className="min-h-screen pb-32 overflow-y-auto"
      {...swipeHandlers}
      {...pullHandlers}
    >
      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div 
          className="fixed top-0 left-0 right-0 flex justify-center py-4 z-50 transition-transform"
          style={{ transform: `translateY(${Math.min(pullProgress * 60, 60)}px)` }}
        >
          <div className={`p-3 rounded-full bg-dark-800 shadow-lg ${isRefreshing ? 'animate-spin' : ''}`}>
            <RefreshCw className={`w-6 h-6 ${pullProgress >= 1 ? 'text-neon-cyan' : 'text-white/40'}`} />
          </div>
        </div>
      )}
      
      {/* Header - Compact */}
      <div className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm p-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="p-3 hover:bg-white/10 rounded-xl transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Leaderboards</h1>
            <p className="text-xs text-white/50">
              {showFriendsOnly ? 'Friends only' : 'Everyone'} • {timePeriod === 'allTime' ? 'All time' : timePeriod === 'weekly' ? 'This week' : 'Today'}
            </p>
          </div>
          {isRefreshing && (
            <RefreshCw className="w-5 h-5 text-neon-cyan animate-spin" />
          )}
        </div>

        {/* Scope and Time Period Filters */}
        <div className="flex gap-2 mb-3">
          {/* Global / Friends Toggle */}
          <button
            onClick={() => setShowFriendsOnly(!showFriendsOnly)}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
              showFriendsOnly
                ? 'bg-neon-purple/20 border border-neon-purple/50 text-neon-purple'
                : 'bg-white/5 border border-white/10 text-white/60'
            }`}
          >
            {showFriendsOnly ? <UserCheck className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            {showFriendsOnly ? 'Friends' : 'Global'}
          </button>

          {/* Time Period Pills */}
          {['daily', 'weekly', 'allTime'].map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                timePeriod === period
                  ? 'bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan'
                  : 'bg-white/5 border border-white/10 text-white/60'
              }`}
            >
              {period === 'daily' ? 'Day' : period === 'weekly' ? 'Week' : 'All'}
            </button>
          ))}
        </div>

        {/* Board Type Tabs - Large touch targets, horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {[
            { key: 'wins', icon: Trophy, label: 'Wins' },
            { key: 'tags', icon: Target, label: 'Tags' },
            { key: 'survival', icon: Shield, label: 'Survival' },
            { key: 'games', icon: Users, label: 'Games' },
            { key: 'distance', icon: Route, label: 'Distance' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveBoard(key)}
              className={`flex-shrink-0 py-3 px-5 rounded-xl flex items-center gap-2 transition-all min-h-[56px] ${
                activeBoard === key
                  ? 'bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan'
                  : 'bg-white/5 border border-white/10 text-white/60'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Swipe hint */}
      <div className="px-4 py-2 text-center">
        <span className="text-xs text-white/30">← Swipe to navigate between boards →</span>
      </div>
      
      {/* Leaderboard */}
      <div className="px-4">
        {leaderboards[activeBoard].length > 0 ? (
          <div className="space-y-3">
            {/* Top 3 - Podium style, centered */}
            <div className="flex items-end justify-center gap-2 mb-6 pt-4">
              {/* 2nd Place */}
              {leaderboards[activeBoard][1] && (
                <div className="flex-1 max-w-[120px]">
                  <div className="bg-gray-400/20 border border-gray-400/50 rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">🥈</div>
                    <div className={`inline-block mb-1 ${leaderboards[activeBoard][1].id === user?.id ? 'ring-2 ring-neon-cyan rounded-full p-1' : ''}`}>
                      <Avatar user={leaderboards[activeBoard][1]} size="lg" />
                    </div>
                    <h3 className="font-medium text-gray-300 truncate text-sm">
                      {leaderboards[activeBoard][1].name}
                    </h3>
                    <div className="mt-1 text-xl font-bold">
                      {getStatValue(leaderboards[activeBoard][1])}
                    </div>
                  </div>
                </div>
              )}
              
              {/* 1st Place - Tallest */}
              {leaderboards[activeBoard][0] && (
                <div className="flex-1 max-w-[140px]">
                  <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-4 text-center -mt-6">
                    <div className="text-3xl mb-1">👑</div>
                    <div className={`inline-block mb-1 ${leaderboards[activeBoard][0].id === user?.id ? 'ring-2 ring-neon-cyan rounded-full p-1' : ''}`}>
                      <Avatar user={leaderboards[activeBoard][0]} size="xl" />
                    </div>
                    <h3 className="font-semibold text-amber-400 truncate">
                      {leaderboards[activeBoard][0].name}
                    </h3>
                    <div className="mt-2 text-2xl font-bold">
                      {getStatValue(leaderboards[activeBoard][0])}
                    </div>
                    <p className="text-xs text-white/40">{getStatLabel()}</p>
                  </div>
                </div>
              )}
              
              {/* 3rd Place */}
              {leaderboards[activeBoard][2] && (
                <div className="flex-1 max-w-[120px]">
                  <div className="bg-amber-700/20 border border-amber-700/50 rounded-xl p-3 text-center mt-4">
                    <div className="text-2xl mb-1">🥉</div>
                    <div className={`inline-block mb-1 ${leaderboards[activeBoard][2].id === user?.id ? 'ring-2 ring-neon-cyan rounded-full p-1' : ''}`}>
                      <Avatar user={leaderboards[activeBoard][2]} size="lg" />
                    </div>
                    <h3 className="font-medium text-amber-600 truncate text-sm">
                      {leaderboards[activeBoard][2].name}
                    </h3>
                    <div className="mt-1 text-xl font-bold">
                      {getStatValue(leaderboards[activeBoard][2])}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Rest of Leaderboard - Large touch targets */}
            {leaderboards[activeBoard].slice(3).map((player, index) => {
              const isUser = player.id === user?.id;
              
              return (
                <div
                  key={player.id}
                  className={`card p-4 flex items-center gap-4 min-h-[72px] ${
                    isUser ? 'border border-neon-cyan/30 bg-neon-cyan/5' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold">
                    {index + 4}
                  </div>
                  <Avatar user={player} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {player.name}
                      {isUser && <span className="text-neon-cyan ml-2">(You)</span>}
                    </h3>
                    <p className="text-xs text-white/40">
                      {player.gamesPlayed} games • {player.wins} wins
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{getStatValue(player)}</p>
                    <p className="text-xs text-white/40">{getStatLabel()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <BoardIcon className="w-12 h-12 text-white/20" />
            </div>
            <h3 className="text-lg font-medium text-white/60 mb-2">No Data Yet</h3>
            <p className="text-sm text-white/40 mb-6">
              Play games to see leaderboard rankings!
            </p>
          </div>
        )}
      </div>
      
      {/* Your Rank Card - Fixed at bottom for easy access */}
      {user && filteredStats.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40">
          <div className="card-glow p-4 bg-dark-800/95 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-3">
              <Medal className="w-5 h-5 text-neon-cyan" />
              <span className="font-semibold">Your Rankings</span>
              {showFriendsOnly && <span className="text-xs text-neon-purple bg-neon-purple/20 px-2 py-0.5 rounded-full">Friends</span>}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {['wins', 'tags', 'survival', 'games', 'distance'].map((board) => {
                const sorted = leaderboards[board];
                const userRank = sorted.findIndex(p => p.id === user.id) + 1;
                const Icon = boardIcons[board];

                return (
                  <button
                    key={board}
                    onClick={() => setActiveBoard(board)}
                    className={`text-center p-2 rounded-xl min-h-[60px] transition-all ${
                      activeBoard === board
                        ? 'bg-neon-cyan/20 border border-neon-cyan/50'
                        : 'bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${activeBoard === board ? 'text-neon-cyan' : 'text-white/40'}`} />
                    <p className={`text-base font-bold ${activeBoard === board ? 'text-neon-cyan' : ''}`}>
                      {userRank > 0 ? `#${userRank}` : '-'}
                    </p>
                    <p className="text-[10px] text-white/40 capitalize truncate">{board === 'distance' ? 'Dist' : board}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom FAB - Share */}
      <div className="fixed bottom-24 right-4 z-50">
        <button
          onClick={() => {
            // Share leaderboard
            if (navigator.share) {
              navigator.share({
                title: 'TAG Leaderboards',
                text: `Check out the ${activeBoard} leaderboard on TAG!`,
              });
            }
          }}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan shadow-lg shadow-neon-purple/30 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Share leaderboard"
        >
          <Share2 className="w-6 h-6 text-dark-900" />
        </button>
      </div>
    </div>
  );
}

export default Leaderboards;

import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock, Users, Target, Calendar, MapPin, RefreshCw, ChevronDown, ChevronUp, Filter, Plus } from 'lucide-react';
import { useStore } from '../store';
import { formatDistanceToNow, format } from 'date-fns';
import { usePullToRefresh } from '../hooks/useGestures';
import { useSwipe } from '../hooks/useGestures';

function GameHistory() {
  const navigate = useNavigate();
  const { games, user } = useStore();
  const [expandedGame, setExpandedGame] = useState(null);
  const [filter, setFilter] = useState('all'); // all, won, lost
  
  // Swipe gestures for navigation
  const swipeHandlers = useSwipe({
    onSwipeRight: () => navigate(-1),
    threshold: 80,
  });
  
  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
  }, []);
  
  const { pullHandlers, isPulling, isRefreshing, pullProgress } = usePullToRefresh(handleRefresh);
  
  // Filter only ended games and sort by date
  const completedGames = games
    .filter(g => g.status === 'ended')
    .filter(g => {
      if (filter === 'all') return true;
      if (filter === 'won') return g.winnerId === user?.id;
      if (filter === 'lost') {
        const userPlayer = g.players?.find(p => p.id === user?.id);
        return userPlayer?.isIt;
      }
      return true;
    })
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
      
      {/* Header - Compact for thumb reach */}
      <div className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-3 hover:bg-white/10 rounded-xl transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Game History</h1>
            <p className="text-xs text-white/50">{completedGames.length} games</p>
          </div>
          {isRefreshing && (
            <RefreshCw className="w-5 h-5 text-neon-cyan animate-spin" />
          )}
        </div>
        
        {/* Filter Tabs - Large touch targets */}
        <div className="flex gap-2 mt-3">
          {[
            { key: 'all', label: 'All' },
            { key: 'won', label: '🏆 Wins' },
            { key: 'lost', label: '💀 Losses' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all min-h-[48px] ${
                filter === key
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Swipe hint */}
      <div className="px-4 py-2 text-center">
        <span className="text-xs text-white/30">← Swipe right to go back</span>
      </div>
      
      {/* Games List - Collapsible cards */}
      {completedGames.length > 0 ? (
        <div className="space-y-3 px-4">
          {completedGames.map((game) => {
            const result = getUserResult(game);
            const duration = formatDuration(game.startedAt, game.endedAt);
            const winner = game.players?.find(p => p.id === game.winnerId);
            const userPlayer = game.players?.find(p => p.id === user?.id);
            const userTags = game.tags?.filter(t => t.taggerId === user?.id).length || 0;
            const isExpanded = expandedGame === game.id;
            
            return (
              <div
                key={game.id}
                className={`card border-l-4 overflow-hidden ${
                  result === 'won' 
                    ? 'border-l-neon-cyan bg-neon-cyan/5' 
                    : result === 'lost'
                    ? 'border-l-neon-orange bg-neon-orange/5'
                    : 'border-l-white/20'
                }`}
              >
                {/* Tappable Header - Large touch target */}
                <button
                  onClick={() => setExpandedGame(isExpanded ? null : game.id)}
                  className="w-full p-4 flex items-center gap-3 min-h-[72px] text-left"
                >
                  <div className={`p-3 rounded-xl ${
                    result === 'won' ? 'bg-neon-cyan/20' : 'bg-white/10'
                  }`}>
                    {result === 'won' ? (
                      <Trophy className="w-6 h-6 text-neon-cyan" />
                    ) : (
                      <Target className="w-6 h-6 text-white/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {game.settings?.gameName || `Game ${game.code}`}
                    </h3>
                    <p className="text-xs text-white/50">
                      {game.endedAt 
                        ? formatDistanceToNow(game.endedAt, { addSuffix: true })
                        : 'Unknown'}
                    </p>
                  </div>
                  <span className={`text-sm font-medium px-3 py-1.5 rounded-lg ${
                    result === 'won' 
                      ? 'bg-neon-cyan/20 text-neon-cyan' 
                      : result === 'lost'
                      ? 'bg-neon-orange/20 text-neon-orange'
                      : 'bg-white/10 text-white/50'
                  }`}>
                    {result === 'won' ? '🏆' : result === 'lost' ? '💀' : '🎮'}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-white/40" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  )}
                </button>
                
                {/* Expandable Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2">
                    {/* Game Stats - 2x2 grid for thumb reach */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        <Users className="w-5 h-5 text-white/40" />
                        <div>
                          <p className="text-lg font-medium">{game.players?.length || 0}</p>
                          <p className="text-xs text-white/40">Players</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        <Clock className="w-5 h-5 text-white/40" />
                        <div>
                          <p className="text-lg font-medium">{duration}</p>
                          <p className="text-xs text-white/40">Duration</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        <Target className="w-5 h-5 text-white/40" />
                        <div>
                          <p className="text-lg font-medium">{userTags}</p>
                          <p className="text-xs text-white/40">Your Tags</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        <MapPin className="w-5 h-5 text-white/40" />
                        <div>
                          <p className="text-lg font-medium">{game.settings?.tagRadius || 20}m</p>
                          <p className="text-xs text-white/40">Radius</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Winner */}
                    <div className="flex items-center gap-3 p-3 bg-neon-cyan/10 rounded-xl">
                      <Trophy className="w-5 h-5 text-neon-cyan" />
                      <span className="text-white/80">Winner: <span className="font-medium text-neon-cyan">{winner?.name || 'Unknown'}</span></span>
                    </div>
                    
                    {/* Players - Horizontal scroll */}
                    <div>
                      <p className="text-xs text-white/40 mb-2">Players</p>
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                        {game.players?.map((player) => (
                          <span
                            key={player.id}
                            className={`flex-shrink-0 text-sm px-3 py-2 rounded-xl min-h-[44px] flex items-center gap-2 ${
                              player.id === game.winnerId
                                ? 'bg-neon-cyan/20 text-neon-cyan'
                                : player.isIt
                                ? 'bg-neon-orange/20 text-neon-orange'
                                : 'bg-white/10 text-white/60'
                            }`}
                          >
                            <span className="text-lg">{player.avatar || '👤'}</span>
                            <span>{player.name}</span>
                            {player.id === game.winnerId && <span>🏆</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 px-4">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <Trophy className="w-12 h-12 text-white/20" />
          </div>
          <h3 className="text-lg font-medium text-white/60 mb-2">No Games Yet</h3>
          <p className="text-sm text-white/40 mb-6">
            Play your first game to see your history here!
          </p>
        </div>
      )}
      
      {/* Bottom FAB - Create New Game */}
      <div className="fixed bottom-24 right-4 z-50">
        <button
          onClick={() => navigate('/create')}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple shadow-lg shadow-neon-cyan/30 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Create new game"
        >
          <Plus className="w-7 h-7 text-dark-900" />
        </button>
      </div>
    </div>
  );
}

export default GameHistory;

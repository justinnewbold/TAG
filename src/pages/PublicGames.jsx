import React, { useState, useEffect } from 'react';
import { 
  Search, Globe, MapPin, Users, Clock, ChevronRight, 
  Gamepad2, Filter, Lock, Eye, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { useStore, GAME_MODES } from '../store';
import { useNavigate } from 'react-router-dom';

function PublicGames() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPublicGames();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPublicGames, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPublicGames = async () => {
    try {
      setLoading(games.length === 0);
      const data = await api.request('/games/public');
      setGames(data.games || []);
    } catch (err) {
      console.error('Failed to fetch public games:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPublicGames();
  };

  const joinGame = async (gameCode) => {
    try {
      await api.request('/games/join', {
        method: 'POST',
        body: JSON.stringify({ code: gameCode })
      });
      navigate(`/lobby/${gameCode}`);
    } catch (err) {
      console.error('Failed to join game:', err);
      alert(err.message);
    }
  };

  const spectateGame = async (gameCode) => {
    try {
      await api.request('/games/spectate', {
        method: 'POST',
        body: JSON.stringify({ code: gameCode })
      });
      navigate(`/game/${gameCode}?spectate=true`);
    } catch (err) {
      console.error('Failed to spectate game:', err);
      alert(err.message);
    }
  };

  const getGameModeConfig = (modeId) => {
    return GAME_MODES.find(m => m.id === modeId) || GAME_MODES[0];
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diff = Math.floor((now - created) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const filteredGames = games.filter(game => {
    const matchesSearch = game.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.host_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = selectedMode === 'all' || game.mode === selectedMode;
    return matchesSearch && matchesMode;
  });

  const waitingGames = filteredGames.filter(g => g.status === 'waiting');
  const activeGames = filteredGames.filter(g => g.status === 'active');

  return (
    <div className="min-h-screen bg-dark-900 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-dark-800 to-dark-900 p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Public Games</h1>
            <p className="text-white/60 text-sm">Find and join games nearby</p>
          </div>
          <button
            onClick={handleRefresh}
            className={`p-3 bg-dark-700 rounded-xl ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Search games or hosts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder:text-white/40"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg ${
              showFilters ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-white/40'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedMode('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedMode === 'all'
                  ? 'bg-neon-cyan text-dark-900'
                  : 'bg-dark-700 text-white/60 hover:text-white'
              }`}
            >
              All Modes
            </button>
            {GAME_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedMode === mode.id
                    ? 'bg-neon-cyan text-dark-900'
                    : 'bg-dark-700 text-white/60 hover:text-white'
                }`}
              >
                {mode.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-center gap-8 py-4 bg-dark-800/50 border-b border-white/5">
        <div className="text-center">
          <p className="text-2xl font-bold text-neon-cyan">{waitingGames.length}</p>
          <p className="text-xs text-white/40">Waiting</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <p className="text-2xl font-bold text-neon-purple">{activeGames.length}</p>
          <p className="text-xs text-white/40">In Progress</p>
        </div>
        <div className="w-px h-8 bg-white/10" />
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {games.reduce((acc, g) => acc + (g.player_count || 0), 0)}
          </p>
          <p className="text-xs text-white/40">Players Online</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-dark-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredGames.length > 0 ? (
          <>
            {/* Waiting Games */}
            {waitingGames.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Waiting for Players
                </h2>
                <div className="space-y-3">
                  {waitingGames.map(game => {
                    const modeConfig = getGameModeConfig(game.mode);
                    return (
                      <div
                        key={game.code}
                        className="bg-dark-800 border border-white/10 rounded-xl overflow-hidden hover:border-neon-cyan/30 transition-colors"
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-bold text-white">{game.name || 'Unnamed Game'}</h3>
                              <p className="text-sm text-white/40">Hosted by {game.host_name}</p>
                            </div>
                            <span className="px-2 py-1 bg-neon-cyan/10 text-neon-cyan text-xs rounded-full">
                              {modeConfig.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-white/60">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {game.player_count || 0}/{game.max_players || 10}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatTimeAgo(game.created_at)}
                            </span>
                            {game.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {game.distance ? `${game.distance.toFixed(1)} km` : 'Nearby'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="border-t border-white/10 p-2">
                          <button
                            onClick={() => joinGame(game.code)}
                            className="w-full py-2 bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-bold rounded-lg"
                          >
                            Join Game
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Games */}
            {activeGames.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" />
                  Games in Progress
                </h2>
                <div className="space-y-3">
                  {activeGames.map(game => {
                    const modeConfig = getGameModeConfig(game.mode);
                    return (
                      <div
                        key={game.code}
                        className="bg-dark-800 border border-white/10 rounded-xl overflow-hidden"
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-white">{game.name || 'Unnamed Game'}</h3>
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                              </div>
                              <p className="text-sm text-white/40">Hosted by {game.host_name}</p>
                            </div>
                            <span className="px-2 py-1 bg-neon-purple/10 text-neon-purple text-xs rounded-full">
                              {modeConfig.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-white/60">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {game.player_count || 0} playing
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {game.elapsed_time ? `${Math.floor(game.elapsed_time / 60)}m` : 'In progress'}
                            </span>
                          </div>
                        </div>
                        {game.allow_spectators && (
                          <div className="border-t border-white/10 p-2">
                            <button
                              onClick={() => spectateGame(game.code)}
                              className="w-full py-2 flex items-center justify-center gap-2 bg-dark-700 text-white font-medium rounded-lg hover:bg-dark-600 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              Spectate
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Globe className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 text-lg">No public games found</p>
            <p className="text-white/20 text-sm mt-2">
              {searchQuery || selectedMode !== 'all' 
                ? 'Try adjusting your filters'
                : 'Be the first to create one!'}
            </p>
            <button
              onClick={() => navigate('/create')}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-bold rounded-xl"
            >
              Create a Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicGames;

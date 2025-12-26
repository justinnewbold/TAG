import React, { useState, useEffect } from 'react';
import { Eye, Users, Clock, MapPin, Play, Search, Filter, Star } from 'lucide-react';
import { useStore } from '../store';

/**
 * Browse and join live games as a spectator
 */
export default function SpectatorBrowser({ onJoinSpectate }) {
  const { user } = useStore();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLiveGames();
    const interval = setInterval(fetchLiveGames, 10000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchLiveGames = async () => {
    try {
      const res = await fetch(`/api/games/live?filter=${filter}`);
      const data = await res.json();
      setGames(data.games || []);
    } catch (err) {
      console.error('Failed to fetch live games:', err);
      // Demo data
      setGames([
        {
          id: 'demo1',
          name: 'Downtown Chase',
          mode: 'Classic Tag',
          players: 6,
          maxPlayers: 8,
          spectators: 12,
          timeRemaining: '14:32',
          location: 'New York, NY',
          isPublic: true,
          hostAvatar: '🎮',
          hostName: 'SpeedRunner',
          featured: true,
        },
        {
          id: 'demo2',
          name: 'Park Hunters',
          mode: 'Manhunt',
          players: 4,
          maxPlayers: 10,
          spectators: 5,
          timeRemaining: '22:15',
          location: 'Los Angeles, CA',
          isPublic: true,
          hostAvatar: '🏃',
          hostName: 'TagMaster',
          featured: false,
        },
        {
          id: 'demo3',
          name: 'Team Battle',
          mode: 'Team Tag',
          players: 8,
          maxPlayers: 8,
          spectators: 28,
          timeRemaining: '05:44',
          location: 'Chicago, IL',
          isPublic: true,
          hostAvatar: '⚡',
          hostName: 'LightningBolt',
          featured: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredGames = games.filter(game => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        game.name.toLowerCase().includes(query) ||
        game.hostName.toLowerCase().includes(query) ||
        game.location.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getModeColor = (mode) => {
    const colors = {
      'Classic Tag': 'bg-blue-500',
      'Freeze Tag': 'bg-cyan-500',
      'Infection': 'bg-green-500',
      'Team Tag': 'bg-purple-500',
      'Manhunt': 'bg-red-500',
      'Hot Potato': 'bg-orange-500',
      'Hide & Seek': 'bg-yellow-500',
    };
    return colors[mode] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Eye className="w-7 h-7 text-primary-400" />
            Watch Live Games
          </h1>
          <p className="text-gray-400 mt-1">
            Spectate games in real-time
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-full">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-400 font-medium">{games.length} Live</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search games, hosts, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-white focus:outline-none focus:border-primary-500"
        >
          <option value="all">All Games</option>
          <option value="friends">Friends Playing</option>
          <option value="featured">Featured</option>
          <option value="nearby">Nearby</option>
        </select>
      </div>

      {/* Games List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="text-center py-12">
          <Eye className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No live games found</p>
          <p className="text-gray-500 text-sm">Check back later or start your own game!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGames.map(game => (
            <div
              key={game.id}
              className={`
                bg-dark-800 rounded-xl border overflow-hidden transition-all hover:border-primary-500/50
                ${game.featured ? 'border-yellow-500/50' : 'border-dark-700'}
              `}
            >
              {game.featured && (
                <div className="px-4 py-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-medium">Featured Game</span>
                </div>
              )}
              
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-dark-700 rounded-xl flex items-center justify-center text-2xl">
                      {game.hostAvatar}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{game.name}</h3>
                      <p className="text-gray-400 text-sm">Hosted by {game.hostName}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs font-medium text-white ${getModeColor(game.mode)}`}>
                    {game.mode}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{game.players}/{game.maxPlayers}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Eye className="w-4 h-4" />
                    <span>{game.spectators} watching</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{game.timeRemaining}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span>{game.location}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[...Array(Math.min(game.players, 5))].map((_, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-dark-600 border-2 border-dark-800 flex items-center justify-center text-sm"
                      >
                        👤
                      </div>
                    ))}
                    {game.players > 5 && (
                      <div className="w-8 h-8 rounded-full bg-dark-600 border-2 border-dark-800 flex items-center justify-center text-xs text-gray-400">
                        +{game.players - 5}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onJoinSpectate(game.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Watch
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock, Users, Target, Calendar, MapPin, ChevronRight, X, Zap } from 'lucide-react';
import { useStore } from '../store';
import { formatDistanceToNow, format } from 'date-fns';

function GameHistory() {
  const navigate = useNavigate();
  const { games, user } = useStore();
  const [selectedGame, setSelectedGame] = useState(null);
  
  // Filter only ended games and sort by date
  const completedGames = games
    .filter(g => g.status === 'ended')
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
  
  // Get tag timeline for a game
  const getTagTimeline = (game) => {
    if (!game.tags || game.tags.length === 0) return [];
    return [...game.tags]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(tag => {
        const tagger = game.players?.find(p => p.id === tag.taggerId);
        const tagged = game.players?.find(p => p.id === tag.taggedId);
        return {
          ...tag,
          taggerName: tagger?.name || 'Unknown',
          taggedName: tagged?.name || 'Unknown',
          taggerAvatar: tagger?.avatar || '👤',
          taggedAvatar: tagged?.avatar || '👤',
        };
      });
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Game History</h1>
          <p className="text-sm text-gray-500">{completedGames.length} games played</p>
        </div>
      </div>
      
      {/* Games List */}
      {completedGames.length > 0 ? (
        <div className="space-y-4">
          {completedGames.map((game) => {
            const result = getUserResult(game);
            const duration = formatDuration(game.startedAt, game.endedAt);
            const winner = game.players?.find(p => p.id === game.winnerId);
            const userTags = game.tags?.filter(t => t.taggerId === user?.id).length || 0;

            return (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game)}
                className={`card p-4 border-l-4 w-full text-left hover:shadow-md transition-shadow ${
                  result === 'won'
                    ? 'border-l-green-500 bg-green-50'
                    : result === 'lost'
                    ? 'border-l-orange-500 bg-orange-50'
                    : 'border-l-gray-300'
                }`}
              >
                {/* Game Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      result === 'won' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {result === 'won' ? (
                        <Trophy className="w-5 h-5 text-green-600" />
                      ) : (
                        <Target className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {game.settings?.gameName || `Game ${game.code}`}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Code: {game.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium px-2 py-1 rounded ${
                      result === 'won'
                        ? 'bg-green-100 text-green-700'
                        : result === 'lost'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {result === 'won' ? '🏆 Victory' : result === 'lost' ? '💀 Tagged Out' : 'Played'}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>

                {/* Game Stats */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Users className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm font-medium text-gray-900">{game.players?.length || 0}</p>
                    <p className="text-xs text-gray-400">Players</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Clock className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm font-medium text-gray-900">{duration}</p>
                    <p className="text-xs text-gray-400">Duration</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Target className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm font-medium text-gray-900">{userTags}</p>
                    <p className="text-xs text-gray-400">Your Tags</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <MapPin className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm font-medium text-gray-900">{game.settings?.tagRadius || 20}m</p>
                    <p className="text-xs text-gray-400">Radius</p>
                  </div>
                </div>

                {/* Winner & Date */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Trophy className="w-4 h-4" />
                    <span>Winner: {winner?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {game.endedAt
                        ? formatDistanceToNow(game.endedAt, { addSuffix: true })
                        : 'Unknown'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Games Yet</h3>
          <p className="text-sm text-gray-400 mb-6">
            Play your first game to see your history here!
          </p>
          <button
            onClick={() => navigate('/create')}
            className="btn-primary"
          >
            Create a Game
          </button>
        </div>
      )}

      {/* Game Detail Modal */}
      {selectedGame && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up shadow-xl sm:rounded-2xl rounded-t-2xl rounded-b-none sm:m-4">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedGame.settings?.gameName || `Game ${selectedGame.code}`}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedGame.endedAt && format(selectedGame.endedAt, 'PPp')}
                </p>
              </div>
              <button
                onClick={() => setSelectedGame(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Players Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Players</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedGame.players?.map((player) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded-xl flex items-center gap-3 ${
                        player.id === selectedGame.winnerId
                          ? 'bg-green-50 border border-green-200'
                          : player.isIt
                          ? 'bg-orange-50 border border-orange-200'
                          : 'bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl">{player.avatar || '👤'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{player.name}</p>
                        <p className="text-xs text-gray-500">
                          {player.tagCount || 0} tags
                        </p>
                      </div>
                      {player.id === selectedGame.winnerId && (
                        <span className="text-lg">🏆</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tag Timeline */}
              {getTagTimeline(selectedGame).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Tag Timeline
                  </h3>
                  <div className="space-y-3">
                    {getTagTimeline(selectedGame).map((tag, index) => (
                      <div key={tag.id || index} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{tag.taggerName}</span>
                            {' tagged '}
                            <span className="font-medium">{tag.taggedName}</span>
                          </p>
                          <p className="text-xs text-gray-400">
                            {tag.timestamp && format(tag.timestamp, 'p')}
                            {tag.distance && ` • ${Math.round(tag.distance)}m away`}
                          </p>
                        </div>
                        <div className="text-2xl">
                          {tag.taggerAvatar} → {tag.taggedAvatar}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Game Settings */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Game Settings</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500">Tag Radius</p>
                    <p className="font-medium text-gray-900">{selectedGame.settings?.tagRadius || 20}m</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500">GPS Interval</p>
                    <p className="font-medium text-gray-900">
                      {Math.round((selectedGame.settings?.gpsInterval || 300000) / 60000)} min
                    </p>
                  </div>
                  {selectedGame.settings?.noTagZones?.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500">Safe Zones</p>
                      <p className="font-medium text-gray-900">{selectedGame.settings.noTagZones.length}</p>
                    </div>
                  )}
                  {selectedGame.settings?.noTagTimes?.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500">Time Rules</p>
                      <p className="font-medium text-gray-900">{selectedGame.settings.noTagTimes.length}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameHistory;

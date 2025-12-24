import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, MapPin, Timer, Target, Trophy, Award, History, Crown } from 'lucide-react';
import { useStore, ACHIEVEMENTS } from '../store';

function Home() {
  const navigate = useNavigate();
  const { user, currentGame, stats, achievements, games } = useStore();

  const completedGames = games.filter(g => g.status === 'ended').length;
  const unlockedAchievements = achievements.length;
  const totalAchievements = Object.keys(ACHIEVEMENTS).length;

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">
            <span className="text-indigo-600">TAG</span>
            <span className="text-purple-500">!</span>
          </h1>
          <p className="text-gray-500 text-sm">Hunt your friends</p>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{stats.gamesWon} wins</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl shadow-lg">
              {user.avatar || '👤'}
            </div>
          </div>
        )}
      </div>

      {/* Active Game Banner */}
      {currentGame && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-600 font-medium">
                {currentGame.status === 'active' ? '🎮 Game in Progress' : '⏳ Waiting in Lobby'}
              </p>
              <p className="text-lg font-bold text-gray-900">{currentGame.settings?.gameName || `Game ${currentGame.code}`}</p>
              <p className="text-sm text-gray-500">
                {currentGame.players?.length || 0} player{currentGame.players?.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => navigate(currentGame.status === 'active' ? '/game' : '/lobby')}
              className="btn-primary"
            >
              {currentGame.status === 'active' ? 'Play' : 'Lobby'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="card p-3 text-center">
          <Trophy className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
          <p className="text-xl font-bold text-gray-900">{stats.gamesWon}</p>
          <p className="text-xs text-gray-400">Wins</p>
        </div>
        <div className="card p-3 text-center">
          <Target className="w-5 h-5 mx-auto text-purple-500 mb-1" />
          <p className="text-xl font-bold text-gray-900">{stats.totalTags}</p>
          <p className="text-xs text-gray-400">Tags</p>
        </div>
        <div className="card p-3 text-center">
          <History className="w-5 h-5 mx-auto text-orange-500 mb-1" />
          <p className="text-xl font-bold text-gray-900">{completedGames}</p>
          <p className="text-xs text-gray-400">Games</p>
        </div>
        <div className="card p-3 text-center">
          <Award className="w-5 h-5 mx-auto text-amber-500 mb-1" />
          <p className="text-xl font-bold text-gray-900">{unlockedAchievements}/{totalAchievements}</p>
          <p className="text-xs text-gray-400">Badges</p>
        </div>
      </div>

      {/* Main Actions */}
      {!currentGame && (
        <div className="space-y-4 mb-8">
          <button
            onClick={() => navigate('/create')}
            className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6 flex items-center gap-4 hover:from-indigo-100 hover:to-purple-100 transition-all group"
          >
            <div className="p-4 rounded-2xl bg-indigo-100 group-hover:bg-indigo-200 transition-all">
              <Plus className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-lg text-gray-900">Create Game</p>
              <p className="text-sm text-gray-500">Start a new hunt with friends</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/join')}
            className="w-full card p-6 flex items-center gap-4 hover:bg-gray-50 transition-all group"
          >
            <div className="p-4 rounded-2xl bg-purple-50 group-hover:bg-purple-100 transition-all">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-lg text-gray-900">Join Game</p>
              <p className="text-sm text-gray-500">Enter a game code to join</p>
            </div>
          </button>
        </div>
      )}

      {/* Feature Cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => navigate('/leaderboards')}
          className="card p-4 text-left hover:bg-gray-50 transition-all"
        >
          <Crown className="w-6 h-6 text-amber-500 mb-2" />
          <p className="font-medium text-gray-900">Leaderboards</p>
          <p className="text-xs text-gray-400">See top players</p>
        </button>

        <button
          onClick={() => navigate('/achievements')}
          className="card p-4 text-left hover:bg-gray-50 transition-all"
        >
          <Award className="w-6 h-6 text-purple-500 mb-2" />
          <p className="font-medium text-gray-900">Achievements</p>
          <p className="text-xs text-gray-400">{unlockedAchievements} unlocked</p>
        </button>

        <button
          onClick={() => navigate('/history')}
          className="card p-4 text-left hover:bg-gray-50 transition-all"
        >
          <History className="w-6 h-6 text-indigo-500 mb-2" />
          <p className="font-medium text-gray-900">Game History</p>
          <p className="text-xs text-gray-400">{completedGames} games</p>
        </button>

        <button
          onClick={() => navigate('/friends')}
          className="card p-4 text-left hover:bg-gray-50 transition-all"
        >
          <Users className="w-6 h-6 text-orange-500 mb-2" />
          <p className="font-medium text-gray-900">Friends</p>
          <p className="text-xs text-gray-400">Invite & manage</p>
        </button>
      </div>

      {/* How it Works */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">How it works</h3>

        {[
          { icon: MapPin, title: 'GPS Tracking', desc: 'Real-time location updates', color: 'text-indigo-500' },
          { icon: Timer, title: 'Custom Intervals', desc: 'Set GPS update frequency', color: 'text-purple-500' },
          { icon: Target, title: 'Tag Radius', desc: 'Get close to tag others', color: 'text-orange-500' },
          { icon: Trophy, title: 'Win & Earn', desc: 'Collect achievements', color: 'text-amber-500' },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="flex items-center gap-4 p-3 card">
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <p className="font-medium text-sm text-gray-900">{title}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;

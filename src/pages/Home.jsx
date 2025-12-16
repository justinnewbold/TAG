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
            <span className="text-neon-cyan">TAG</span>
            <span className="text-neon-purple">!</span>
          </h1>
          <p className="text-white/50 text-sm">Hunt your friends</p>
        </div>
        
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-white/50">{stats.gamesWon} wins</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-2xl">
              {user.avatar || '👤'}
            </div>
          </div>
        )}
      </div>
      
      {/* Active Game Banner */}
      {currentGame && (
        <div className="card-glow p-4 mb-6 bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neon-cyan font-medium">
                {currentGame.status === 'active' ? '🎮 Game in Progress' : '⏳ Waiting in Lobby'}
              </p>
              <p className="text-lg font-bold">{currentGame.settings?.gameName || `Game ${currentGame.code}`}</p>
              <p className="text-sm text-white/50">
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
          <Trophy className="w-5 h-5 mx-auto text-neon-cyan mb-1" />
          <p className="text-xl font-bold">{stats.gamesWon}</p>
          <p className="text-xs text-white/40">Wins</p>
        </div>
        <div className="card p-3 text-center">
          <Target className="w-5 h-5 mx-auto text-neon-purple mb-1" />
          <p className="text-xl font-bold">{stats.totalTags}</p>
          <p className="text-xs text-white/40">Tags</p>
        </div>
        <div className="card p-3 text-center">
          <History className="w-5 h-5 mx-auto text-neon-orange mb-1" />
          <p className="text-xl font-bold">{completedGames}</p>
          <p className="text-xs text-white/40">Games</p>
        </div>
        <div className="card p-3 text-center">
          <Award className="w-5 h-5 mx-auto text-amber-400 mb-1" />
          <p className="text-xl font-bold">{unlockedAchievements}/{totalAchievements}</p>
          <p className="text-xs text-white/40">Badges</p>
        </div>
      </div>
      
      {/* Main Actions */}
      {!currentGame && (
        <div className="space-y-4 mb-8">
          <button
            onClick={() => navigate('/create')}
            className="w-full card-glow p-6 flex items-center gap-4 hover:bg-dark-700/50 transition-all group"
          >
            <div className="p-4 rounded-2xl bg-neon-cyan/10 group-hover:bg-neon-cyan/20 transition-all">
              <Plus className="w-8 h-8 text-neon-cyan" />
            </div>
            <div className="text-left">
              <p className="font-bold text-lg">Create Game</p>
              <p className="text-sm text-white/50">Start a new hunt with friends</p>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/join')}
            className="w-full card p-6 flex items-center gap-4 hover:bg-dark-700/50 transition-all group"
          >
            <div className="p-4 rounded-2xl bg-neon-purple/10 group-hover:bg-neon-purple/20 transition-all">
              <Users className="w-8 h-8 text-neon-purple" />
            </div>
            <div className="text-left">
              <p className="font-bold text-lg">Join Game</p>
              <p className="text-sm text-white/50">Enter a game code to join</p>
            </div>
          </button>
        </div>
      )}
      
      {/* Feature Cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => navigate('/leaderboards')}
          className="card p-4 text-left hover:bg-white/5 transition-all"
        >
          <Crown className="w-6 h-6 text-amber-400 mb-2" />
          <p className="font-medium">Leaderboards</p>
          <p className="text-xs text-white/40">See top players</p>
        </button>
        
        <button
          onClick={() => navigate('/achievements')}
          className="card p-4 text-left hover:bg-white/5 transition-all"
        >
          <Award className="w-6 h-6 text-neon-purple mb-2" />
          <p className="font-medium">Achievements</p>
          <p className="text-xs text-white/40">{unlockedAchievements} unlocked</p>
        </button>
        
        <button
          onClick={() => navigate('/history')}
          className="card p-4 text-left hover:bg-white/5 transition-all"
        >
          <History className="w-6 h-6 text-neon-cyan mb-2" />
          <p className="font-medium">Game History</p>
          <p className="text-xs text-white/40">{completedGames} games</p>
        </button>
        
        <button
          onClick={() => navigate('/friends')}
          className="card p-4 text-left hover:bg-white/5 transition-all"
        >
          <Users className="w-6 h-6 text-neon-orange mb-2" />
          <p className="font-medium">Friends</p>
          <p className="text-xs text-white/40">Invite & manage</p>
        </button>
      </div>
      
      {/* How it Works */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">How it works</h3>
        
        {[
          { icon: MapPin, title: 'GPS Tracking', desc: 'Real-time location updates', color: 'text-neon-cyan' },
          { icon: Timer, title: 'Custom Intervals', desc: 'Set GPS update frequency', color: 'text-neon-purple' },
          { icon: Target, title: 'Tag Radius', desc: 'Get close to tag others', color: 'text-neon-orange' },
          { icon: Trophy, title: 'Win & Earn', desc: 'Collect achievements', color: 'text-amber-400' },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="flex items-center gap-4 p-3 card">
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <p className="font-medium text-sm">{title}</p>
              <p className="text-xs text-white/40">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;

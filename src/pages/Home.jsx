import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, MapPin, Timer, Target, Zap, Trophy } from 'lucide-react';
import { useStore } from '../store';

function Home() {
  const navigate = useNavigate();
  const { user, currentGame, stats } = useStore();
  
  return (
    <div className="p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple mb-4 animate-pulse-glow">
          <Zap className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
          TAG!
        </h1>
        <p className="text-white/60 mt-2">Hunt your friends in the real world</p>
      </div>
      
      {/* User greeting */}
      {user && (
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple flex items-center justify-center text-2xl">
              {user.avatar}
            </div>
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-white/50">
                {stats.gamesPlayed} games • {stats.totalTags} tags
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Current game status */}
      {currentGame && (
        <div className="card-glow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neon-cyan">Active Game</p>
              <p className="font-bold text-lg">Code: {currentGame.code}</p>
              <p className="text-sm text-white/50">
                {currentGame.players.length} player{currentGame.players.length !== 1 ? 's' : ''}
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
      
      {/* Main actions */}
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
      
      {/* Features */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">How it works</h3>
        
        {[
          { icon: MapPin, title: 'GPS Tracking', desc: 'Real-time location updates', color: 'neon-cyan' },
          { icon: Timer, title: 'Custom Intervals', desc: 'Set GPS update frequency', color: 'neon-purple' },
          { icon: Target, title: 'Tag Radius', desc: 'Get close enough to tag', color: 'neon-pink' },
          { icon: Trophy, title: 'Track Stats', desc: 'Wins, tags, and more', color: 'neon-orange' },
        ].map((feature, i) => (
          <div key={i} className="card p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-${feature.color}/10`}>
              <feature.icon className={`w-5 h-5 text-${feature.color}`} />
            </div>
            <div>
              <p className="font-medium">{feature.title}</p>
              <p className="text-sm text-white/50">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;

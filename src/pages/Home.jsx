import React, { useState } from 'react';
import Avatar from '../components/Avatar';
import UpgradeBanner from '../components/UpgradeBanner';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, MapPin, Timer, Target, Trophy, Award, History, Crown, Gamepad2, ChevronUp } from 'lucide-react';
import { useStore, useSounds, ACHIEVEMENTS } from '../store';

function Home() {
  const navigate = useNavigate();
  const { user, currentGame, stats, achievements, games, settings } = useStore();
  const { vibrate } = useSounds();
  const [showQuickInfo, setShowQuickInfo] = useState(false);
  
  const completedGames = games.filter(g => g.status === 'ended').length;
  const unlockedAchievements = achievements.length;
  const totalAchievements = Object.keys(ACHIEVEMENTS).length;
  
  // Haptic feedback helper
  const handlePress = (callback) => {
    if (settings?.vibration !== false) {
      vibrate([15]);
    }
    callback();
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Section - Minimal header */}
      <div className="p-4 pt-safe">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">
            <span className="text-neon-cyan">TAG</span>
            <span className="text-neon-purple">!</span>
          </h1>
          
          {user && (
            <button 
              onClick={() => handlePress(() => navigate('/settings'))}
              className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
            >
              <div className="text-right">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-white/40">{stats.gamesWon} wins</p>
              </div>
              <Avatar user={user} size="md" />
            </button>
          )}
        </div>
      </div>
      
      {/* Middle Section - Scrollable content */}
        {/* Upgrade Banner for anonymous users */}
        <UpgradeBanner />
      <div className="flex-1 overflow-y-auto px-4 pb-48">
        {/* Active Game Banner */}
        {currentGame && (
          <button
            onClick={() => handlePress(() => navigate(currentGame.status === 'active' ? '/game' : '/lobby'))}
            className="w-full card-glow p-5 mb-4 bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neon-cyan font-medium mb-1">
                  {currentGame.status === 'active' ? '🎮 Game in Progress' : '⏳ Waiting in Lobby'}
                </p>
                <p className="text-lg font-bold">{currentGame.settings?.gameName || `Game ${currentGame.code}`}</p>
                <p className="text-sm text-white/50">
                  {currentGame.players?.length || 0} player{currentGame.players?.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-4xl">
                {currentGame.status === 'active' ? '▶️' : '⏸️'}
              </div>
            </div>
          </button>
        )}
        
        {/* Quick Stats - Tappable for details */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { icon: Trophy, value: stats.gamesWon, label: 'Wins', color: 'text-neon-cyan', path: '/stats' },
            { icon: Target, value: stats.totalTags, label: 'Tags', color: 'text-neon-purple', path: '/stats' },
            { icon: History, value: completedGames, label: 'Games', color: 'text-neon-orange', path: '/history' },
            { icon: Award, value: `${unlockedAchievements}`, label: 'Badges', color: 'text-amber-400', path: '/achievements' },
          ].map(({ icon: Icon, value, label, color, path }) => (
            <button
              key={label}
              onClick={() => handlePress(() => navigate(path))}
              className="card p-3 text-center active:scale-95 transition-transform min-h-[76px]"
            >
              <Icon className={`w-5 h-5 mx-auto ${color} mb-1`} />
              <p className="text-lg font-bold">{value}</p>
              <p className="text-[10px] text-white/40">{label}</p>
            </button>
          ))}
        </div>
        
        {/* Quick Links - Feature Cards */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => handlePress(() => navigate('/leaderboards'))}
            className="card p-4 text-left active:scale-95 transition-transform min-h-[80px]"
          >
            <Crown className="w-6 h-6 text-amber-400 mb-2" />
            <p className="font-medium">Leaderboards</p>
            <p className="text-xs text-white/40">See top players</p>
          </button>
          
          <button
            onClick={() => handlePress(() => navigate('/friends'))}
            className="card p-4 text-left active:scale-95 transition-transform min-h-[80px]"
          >
            <Users className="w-6 h-6 text-neon-orange mb-2" />
            <p className="font-medium">Friends</p>
            <p className="text-xs text-white/40">Invite & manage</p>
          </button>
        </div>
        
        {/* How it Works - Collapsible */}
        <button 
          onClick={() => setShowQuickInfo(!showQuickInfo)}
          className="w-full flex items-center justify-between py-3 text-white/40"
        >
          <span className="text-sm font-semibold uppercase tracking-wider">How it works</span>
          <ChevronUp className={`w-4 h-4 transition-transform ${showQuickInfo ? 'rotate-180' : ''}`} />
        </button>
        
        {showQuickInfo && (
          <div className="space-y-2 animate-slide-up">
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
        )}
      </div>
      
      {/* Bottom Section - Primary Actions (Thumb Zone) */}
      {!currentGame && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-dark-900 via-dark-900/95 to-transparent pt-12">
          <div className="flex gap-3">
            <button
              onClick={() => handlePress(() => navigate('/join'))}
              className="flex-1 btn-secondary flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              <span className="font-bold">Join</span>
            </button>
            
            <button
              onClick={() => handlePress(() => navigate('/create'))}
              className="flex-[2] btn-action"
            >
              <Gamepad2 className="w-6 h-6" />
              <span>Create Game</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;

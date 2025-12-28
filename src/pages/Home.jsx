import React, { useState } from 'react';
import Avatar from '../components/Avatar';
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
            <span style={{ color: 'var(--accent-primary)' }}>TAG</span>
            <span style={{ color: 'var(--accent-secondary)' }}>!</span>
          </h1>

          {user && (
            <button
              onClick={() => handlePress(() => navigate('/settings'))}
              className="flex items-center gap-2 p-2 rounded-xl active:scale-95 transition-all"
            >
              <div className="text-right">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats.gamesWon} wins</p>
              </div>
              <Avatar user={user} size="md" />
            </button>
          )}
        </div>
      </div>
      
      {/* Middle Section - Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-48">
        {/* Active Game Banner */}
        {currentGame && (
          <button
            onClick={() => handlePress(() => navigate(currentGame.status === 'active' ? '/game' : '/lobby'))}
            className="w-full card-glow p-5 mb-4 text-left active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, var(--glow-primary), var(--glow-secondary))' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--accent-primary)' }}>
                  {currentGame.status === 'active' ? '🎮 Game in Progress' : '⏳ Waiting in Lobby'}
                </p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{currentGame.settings?.gameName || `Game ${currentGame.code}`}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
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
            { icon: Trophy, value: stats.gamesWon, label: 'Wins', color: 'var(--accent-primary)', path: '/stats' },
            { icon: Target, value: stats.totalTags, label: 'Tags', color: 'var(--accent-secondary)', path: '/stats' },
            { icon: History, value: completedGames, label: 'Games', color: 'var(--accent-tertiary)', path: '/history' },
            { icon: Award, value: `${unlockedAchievements}`, label: 'Badges', color: '#fbbf24', path: '/achievements' },
          ].map(({ icon: Icon, value, label, color, path }) => (
            <button
              key={label}
              onClick={() => handlePress(() => navigate(path))}
              className="card p-3 text-center active:scale-95 transition-transform min-h-[76px]"
            >
              <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </button>
          ))}
        </div>
        
        {/* Quick Links - Feature Cards */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => handlePress(() => navigate('/leaderboards'))}
            className="card p-4 text-left active:scale-95 transition-transform min-h-[80px]"
          >
            <Crown className="w-6 h-6 mb-2" style={{ color: '#fbbf24' }} />
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Leaderboards</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>See top players</p>
          </button>

          <button
            onClick={() => handlePress(() => navigate('/friends'))}
            className="card p-4 text-left active:scale-95 transition-transform min-h-[80px]"
          >
            <Users className="w-6 h-6 mb-2" style={{ color: 'var(--accent-tertiary)' }} />
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Friends</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Invite & manage</p>
          </button>
        </div>

        {/* How it Works - Collapsible */}
        <button
          onClick={() => setShowQuickInfo(!showQuickInfo)}
          className="w-full flex items-center justify-between py-3"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="text-sm font-semibold uppercase tracking-wider">How it works</span>
          <ChevronUp className={`w-4 h-4 transition-transform ${showQuickInfo ? 'rotate-180' : ''}`} />
        </button>

        {showQuickInfo && (
          <div className="space-y-2 animate-slide-up">
            {[
              { icon: MapPin, title: 'GPS Tracking', desc: 'Real-time location updates', color: 'var(--accent-primary)' },
              { icon: Timer, title: 'Custom Intervals', desc: 'Set GPS update frequency', color: 'var(--accent-secondary)' },
              { icon: Target, title: 'Tag Radius', desc: 'Get close to tag others', color: 'var(--accent-tertiary)' },
              { icon: Trophy, title: 'Win & Earn', desc: 'Collect achievements', color: '#fbbf24' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="flex items-center gap-4 p-3 card">
                <Icon className="w-5 h-5" style={{ color }} />
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Bottom Section - Primary Actions (Thumb Zone) */}
      {!currentGame && (
        <div
          className="fixed bottom-20 left-0 right-0 p-4 pt-12"
          style={{
            background: `linear-gradient(to top, var(--bg-secondary), var(--bg-secondary), transparent)`
          }}
        >
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

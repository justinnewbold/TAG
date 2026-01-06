import React, { useState, useEffect } from 'react';
import Avatar from '../components/Avatar';
import UpgradeBanner from '../components/UpgradeBanner';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Users, MapPin, Timer, Target, Trophy, Award, History, Crown,
  Gamepad2, ChevronRight, Swords, Globe, Calendar, Star, Zap, TrendingUp
} from 'lucide-react';
import { useStore, useSounds, ACHIEVEMENTS, GAME_MODES } from '../store';

function Home() {
  const navigate = useNavigate();
  const { user, currentGame, stats, achievements, games, settings } = useStore();
  const { vibrate } = useSounds();
  const [greeting, setGreeting] = useState('');

  const completedGames = games.filter(g => g.status === 'ended').length;
  const unlockedAchievements = achievements.length;

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Haptic feedback
  const handlePress = (callback) => {
    if (settings?.vibration !== false) vibrate([15]);
    callback();
  };

  // Quick features for the carousel
  const features = [
    {
      id: 'tournaments',
      icon: '🏆',
      title: 'Tournaments',
      desc: 'Compete for prizes',
      path: '/tournaments',
      gradient: 'from-amber-500/20 to-orange-500/20',
      borderColor: 'border-amber-500/30'
    },
    {
      id: 'public',
      icon: '🌍',
      title: 'Public Games',
      desc: 'Join nearby games',
      path: '/public-games',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      borderColor: 'border-blue-500/30'
    },
    {
      id: 'clans',
      icon: '⚔️',
      title: 'Clans',
      desc: 'Team up & battle',
      path: '/clans',
      gradient: 'from-purple-500/20 to-pink-500/20',
      borderColor: 'border-purple-500/30'
    },
    {
      id: 'custom',
      icon: '🎨',
      title: 'Custom Modes',
      desc: 'Create your rules',
      path: '/custom-mode',
      gradient: 'from-green-500/20 to-emerald-500/20',
      borderColor: 'border-green-500/30'
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-dark-900">
      {/* Header - Compact */}
      <header className="px-4 pt-safe pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">
              <span className="text-neon-cyan">TAG</span>
              <span className="text-neon-purple">!</span>
            </h1>
            {user && (
              <p className="text-sm text-white/50 mt-0.5">{greeting}, {user.name?.split(' ')[0]}</p>
            )}
          </div>

          {user && (
            <button
              onClick={() => handlePress(() => navigate('/profile'))}
              className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 active:scale-95 transition-all"
            >
              <div className="text-right">
                <p className="text-sm font-medium">{stats.gamesWon} wins</p>
                <p className="text-xs text-white/40">Level {Math.floor((stats.totalXp || 0) / 1000) + 1}</p>
              </div>
              <Avatar user={user} size="md" showBorder />
            </button>
          )}
        </div>
      </header>

      {/* Upgrade Banner */}
      <UpgradeBanner />

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto px-4 pb-36">
        {/* Active Game Banner - Prominent */}
        {currentGame && (
          <button
            onClick={() => handlePress(() => navigate(currentGame.status === 'active' ? '/game' : '/lobby'))}
            className="w-full p-4 mb-4 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 border border-white/10 rounded-2xl text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-2xl">
                {currentGame.status === 'active' ? '🎮' : '⏳'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neon-cyan font-medium mb-0.5">
                  {currentGame.status === 'active' ? 'GAME IN PROGRESS' : 'WAITING IN LOBBY'}
                </p>
                <p className="text-lg font-bold truncate">
                  {currentGame.settings?.gameName || `Game ${currentGame.code}`}
                </p>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span>{currentGame.players?.length || 0} players</span>
                  <span>•</span>
                  <span>{GAME_MODES[currentGame.gameMode]?.name || 'Classic'}</span>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-white/30" />
            </div>
          </button>
        )}

        {/* Quick Stats - Horizontal scroll on small screens */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4">
          {[
            { icon: Trophy, value: stats.gamesWon, label: 'Wins', color: 'text-neon-cyan', bg: 'bg-neon-cyan/10', path: '/stats' },
            { icon: Target, value: stats.totalTags, label: 'Tags', color: 'text-neon-purple', bg: 'bg-neon-purple/10', path: '/stats' },
            { icon: History, value: completedGames, label: 'Games', color: 'text-neon-orange', bg: 'bg-neon-orange/10', path: '/history' },
            { icon: Award, value: unlockedAchievements, label: 'Badges', color: 'text-amber-400', bg: 'bg-amber-400/10', path: '/achievements' },
          ].map(({ icon: Icon, value, label, color, bg, path }) => (
            <button
              key={label}
              onClick={() => handlePress(() => navigate(path))}
              className={`flex-shrink-0 w-20 p-3 rounded-2xl ${bg} text-center active:scale-95 transition-transform`}
            >
              <Icon className={`w-5 h-5 mx-auto ${color} mb-1`} />
              <p className="text-lg font-bold">{value}</p>
              <p className="text-[10px] text-white/50">{label}</p>
            </button>
          ))}
        </div>

        {/* Features Carousel - Horizontal scroll */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Explore</h2>
            <button
              onClick={() => handlePress(() => navigate('/leaderboards'))}
              className="text-xs text-neon-cyan flex items-center gap-1"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => handlePress(() => navigate(feature.path))}
                className={`flex-shrink-0 w-32 p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} border ${feature.borderColor} text-left active:scale-95 transition-transform snap-start`}
              >
                <span className="text-2xl block mb-2">{feature.icon}</span>
                <p className="font-medium text-sm">{feature.title}</p>
                <p className="text-xs text-white/50 mt-0.5">{feature.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => handlePress(() => navigate('/leaderboards'))}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium">Leaderboards</p>
                <p className="text-xs text-white/40">Top players</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handlePress(() => navigate('/friends'))}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left active:scale-95 transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon-orange/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-neon-orange" />
              </div>
              <div>
                <p className="font-medium">Friends</p>
                <p className="text-xs text-white/40">Invite players</p>
              </div>
            </div>
          </button>
        </div>

        {/* Game Modes Preview */}
        <section className="mb-4">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Game Modes</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {Object.values(GAME_MODES).slice(0, 5).map((mode) => (
              <div
                key={mode.id}
                className="flex-shrink-0 w-24 p-3 rounded-xl bg-white/5 text-center"
              >
                <span className="text-2xl block mb-1">{mode.icon}</span>
                <p className="text-xs font-medium truncate">{mode.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to Play - Compact */}
        <section>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">How to Play</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: '📍', title: 'Track Location', desc: 'GPS updates in real-time' },
              { icon: '🎯', title: 'Get Close', desc: 'Enter tag radius to tag' },
              { icon: '🏃', title: 'Run & Hide', desc: 'Avoid being tagged' },
              { icon: '🏆', title: 'Win Games', desc: 'Earn XP & achievements' },
            ].map((item) => (
              <div
                key={item.title}
                className="p-3 rounded-xl bg-white/5 flex items-start gap-2"
              >
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className="text-xs font-medium">{item.title}</p>
                  <p className="text-[10px] text-white/40">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Fixed Bottom Actions - Main CTA */}
      {!currentGame && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-dark-900 via-dark-900/98 to-transparent pt-16 z-30">
          <div className="flex gap-3">
            <button
              onClick={() => handlePress(() => navigate('/join'))}
              className="flex-1 h-14 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-2 font-bold active:scale-95 transition-transform"
            >
              <Users className="w-5 h-5" />
              Join
            </button>

            <button
              onClick={() => handlePress(() => navigate('/create'))}
              className="flex-[2] h-14 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-2xl flex items-center justify-center gap-3 font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-neon-purple/20"
            >
              <Gamepad2 className="w-6 h-6" />
              Create Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;

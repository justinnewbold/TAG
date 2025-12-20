import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Shield, Clock, Users, Award, History, Crown, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, Zap, TrendingUp, Flame } from 'lucide-react';
import { useStore, ACHIEVEMENTS } from '../store';
import { usePullToRefresh } from '../hooks/useGestures';

function Stats() {
  const navigate = useNavigate();
  const { stats, achievements, games, user } = useStore();
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [activeSection, setActiveSection] = useState('overview'); // 'overview', 'detailed', 'achievements'
  
  const completedGames = games.filter(g => g.status === 'ended');
  const winRate = stats.gamesPlayed > 0 
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
    : 0;
  const tagRatio = stats.timesTagged > 0 
    ? (stats.totalTags / stats.timesTagged).toFixed(1) 
    : stats.totalTags;
  
  const formatTime = (ms) => {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatPlayTime = (ms) => {
    if (!ms) return '0h';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };
  
  // Recent achievements
  const recentAchievements = achievements.slice(-3).map(id => ACHIEVEMENTS[id]).filter(Boolean);
  
  // Calculate streaks and trends
  const currentStreak = stats.currentStreak || 0;
  const bestStreak = stats.bestStreak || 0;
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Compact Header */}
      <div className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="touch-target-48 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold">Your Stats</h1>
            <p className="text-xs text-white/50">{stats.gamesPlayed} games played</p>
          </div>
          {/* Quick stat badge */}
          <div className="flex items-center gap-1 bg-neon-cyan/20 px-3 py-1 rounded-full">
            <Trophy className="w-4 h-4 text-neon-cyan" />
            <span className="text-sm font-bold text-neon-cyan">{stats.gamesWon}</span>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation - Thumb zone */}
      <div className="sticky top-[60px] z-30 bg-dark-900/95 backdrop-blur-sm border-b border-white/10 px-4 py-2">
        <div className="flex gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'detailed', label: 'Detailed', icon: Target },
            { id: 'achievements', label: 'Badges', icon: Award },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex-1 touch-target-48 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${
                activeSection === tab.id
                  ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                  : 'bg-white/5 text-white/60'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-4 animate-fade-in">
            {/* Hero Stats - Large visual cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card-glow p-5 text-center bg-gradient-to-br from-neon-cyan/20 to-transparent">
                <Trophy className="w-10 h-10 mx-auto text-neon-cyan mb-2" />
                <p className="text-4xl font-bold">{stats.gamesWon}</p>
                <p className="text-sm text-white/50">Wins</p>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">{winRate}%</span>
                </div>
              </div>
              
              <div className="card-glow p-5 text-center bg-gradient-to-br from-neon-purple/20 to-transparent">
                <Target className="w-10 h-10 mx-auto text-neon-purple mb-2" />
                <p className="text-4xl font-bold">{stats.totalTags}</p>
                <p className="text-sm text-white/50">Tags</p>
                <div className="mt-2 flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-neon-purple" />
                  <span className="text-xs text-neon-purple">{tagRatio} ratio</span>
                </div>
              </div>
            </div>
            
            {/* Streak Card */}
            {currentStreak > 0 && (
              <div className="card p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🔥</div>
                  <div className="flex-1">
                    <p className="font-bold text-lg text-amber-400">{currentStreak} Day Streak!</p>
                    <p className="text-xs text-white/50">Best: {bestStreak} days</p>
                  </div>
                  <Flame className="w-8 h-8 text-amber-400 animate-pulse" />
                </div>
              </div>
            )}
            
            {/* Quick Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="card p-3 text-center">
                <p className="text-2xl font-bold">{stats.gamesPlayed}</p>
                <p className="text-xs text-white/50">Games</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-2xl font-bold">{stats.timesTagged}</p>
                <p className="text-xs text-white/50">Tagged</p>
              </div>
              <div className="card p-3 text-center">
                <p className="text-2xl font-bold">{formatPlayTime(stats.totalPlayTime)}</p>
                <p className="text-xs text-white/50">Played</p>
              </div>
            </div>
            
            {/* Quick Links - Large touch targets */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/leaderboards')}
                className="w-full card p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
              >
                <div className="touch-target-48 flex items-center justify-center">
                  <Crown className="w-7 h-7 text-amber-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-lg">Leaderboards</p>
                  <p className="text-xs text-white/40">See how you rank globally</p>
                </div>
                <ChevronRight className="w-6 h-6 text-white/40" />
              </button>
              
              <button
                onClick={() => navigate('/history')}
                className="w-full card p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
              >
                <div className="touch-target-48 flex items-center justify-center">
                  <History className="w-7 h-7 text-neon-cyan" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-lg">Game History</p>
                  <p className="text-xs text-white/40">{completedGames.length} games completed</p>
                </div>
                <ChevronRight className="w-6 h-6 text-white/40" />
              </button>
            </div>
          </div>
        )}
        
        {/* Detailed Stats Section */}
        {activeSection === 'detailed' && (
          <div className="space-y-4 animate-fade-in">
            {/* Performance Stats */}
            <div className="card overflow-hidden">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-4 pt-4 pb-2">
                Performance
              </h3>
              <div className="divide-y divide-white/5">
                <StatRow 
                  icon={Trophy} 
                  label="Win Rate" 
                  value={`${winRate}%`}
                  color="text-neon-cyan"
                />
                <StatRow 
                  icon={Target} 
                  label="Tag Ratio" 
                  value={tagRatio}
                  color="text-neon-purple"
                />
                <StatRow 
                  icon={Zap} 
                  label="Fastest Tag" 
                  value={stats.fastestTag ? `${(stats.fastestTag / 1000).toFixed(1)}s` : '-'}
                  color="text-amber-400"
                />
              </div>
            </div>
            
            {/* Time Stats */}
            <div className="card overflow-hidden">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-4 pt-4 pb-2">
                Time
              </h3>
              <div className="divide-y divide-white/5">
                <StatRow 
                  icon={Clock} 
                  label="Total Play Time" 
                  value={formatPlayTime(stats.totalPlayTime)}
                  color="text-white"
                />
                <StatRow 
                  icon={Shield} 
                  label="Longest Survival" 
                  value={formatTime(stats.longestSurvival)}
                  color="text-green-400"
                />
                <StatRow 
                  icon={Clock} 
                  label="Avg Game Length" 
                  value={stats.gamesPlayed ? formatTime(stats.totalPlayTime / stats.gamesPlayed) : '-'}
                  color="text-white/60"
                />
              </div>
            </div>
            
            {/* Game Stats */}
            <div className="card overflow-hidden">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-4 pt-4 pb-2">
                Games
              </h3>
              <div className="divide-y divide-white/5">
                <StatRow 
                  icon={Users} 
                  label="Games Played" 
                  value={stats.gamesPlayed}
                  color="text-white"
                />
                <StatRow 
                  icon={Trophy} 
                  label="Games Won" 
                  value={stats.gamesWon}
                  color="text-neon-cyan"
                />
                <StatRow 
                  icon={Target} 
                  label="Total Tags" 
                  value={stats.totalTags}
                  color="text-neon-purple"
                />
                <StatRow 
                  icon={Shield} 
                  label="Times Tagged" 
                  value={stats.timesTagged}
                  color="text-red-400"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Achievements Section */}
        {activeSection === 'achievements' && (
          <div className="space-y-4 animate-fade-in">
            {/* Progress */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white/50">Progress</span>
                <span className="font-bold text-neon-purple">
                  {achievements.length} / {Object.keys(ACHIEVEMENTS).length}
                </span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full transition-all"
                  style={{ width: `${(achievements.length / Object.keys(ACHIEVEMENTS).length) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Recent Achievements */}
            {recentAchievements.length > 0 && (
              <div className="card overflow-hidden">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-4 pt-4 pb-2">
                  Recent Unlocks
                </h3>
                <div className="divide-y divide-white/5">
                  {recentAchievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-center gap-4 p-4">
                      <span className="text-3xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium">{achievement.name}</p>
                        <p className="text-xs text-white/40">{achievement.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* View All Button */}
            <button
              onClick={() => navigate('/achievements')}
              className="w-full card p-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform bg-neon-purple/10 border-neon-purple/30"
            >
              <Award className="w-6 h-6 text-neon-purple" />
              <span className="font-bold text-neon-purple">View All Achievements</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ icon: Icon, label, value, color = 'text-white' }) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="touch-target-48 flex items-center justify-center">
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <span className="flex-1 text-white/80">{label}</span>
      <span className={`font-bold text-lg ${color}`}>{value}</span>
    </div>
  );
}

export default Stats;

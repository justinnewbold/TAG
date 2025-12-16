import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Target, Shield, Clock, Users, Award, History, Crown, ChevronRight } from 'lucide-react';
import { useStore, ACHIEVEMENTS } from '../store';

function Stats() {
  const navigate = useNavigate();
  const { stats, achievements, games, user } = useStore();
  
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
  
  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold">Your Stats</h1>
        <p className="text-sm text-white/50">Track your progress</p>
      </div>
      
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card-glow p-4 text-center bg-gradient-to-br from-neon-cyan/10 to-transparent">
          <Trophy className="w-8 h-8 mx-auto text-neon-cyan mb-2" />
          <p className="text-3xl font-bold">{stats.gamesWon}</p>
          <p className="text-sm text-white/50">Wins</p>
          <p className="text-xs text-neon-cyan mt-1">{winRate}% win rate</p>
        </div>
        
        <div className="card-glow p-4 text-center bg-gradient-to-br from-neon-purple/10 to-transparent">
          <Target className="w-8 h-8 mx-auto text-neon-purple mb-2" />
          <p className="text-3xl font-bold">{stats.totalTags}</p>
          <p className="text-sm text-white/50">Total Tags</p>
          <p className="text-xs text-neon-purple mt-1">{tagRatio} tag ratio</p>
        </div>
      </div>
      
      {/* Detailed Stats */}
      <div className="card p-4 mb-6">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">Detailed Stats</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <Users className="w-5 h-5 text-white/60" />
              </div>
              <span className="text-white/80">Games Played</span>
            </div>
            <span className="font-bold">{stats.gamesPlayed}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <Shield className="w-5 h-5 text-white/60" />
              </div>
              <span className="text-white/80">Times Tagged</span>
            </div>
            <span className="font-bold">{stats.timesTagged}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <Clock className="w-5 h-5 text-white/60" />
              </div>
              <span className="text-white/80">Longest Survival</span>
            </div>
            <span className="font-bold">{formatTime(stats.longestSurvival)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <Clock className="w-5 h-5 text-white/60" />
              </div>
              <span className="text-white/80">Total Play Time</span>
            </div>
            <span className="font-bold">{formatPlayTime(stats.totalPlayTime)}</span>
          </div>
          
          {stats.fastestTag && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg">
                  <Target className="w-5 h-5 text-white/60" />
                </div>
                <span className="text-white/80">Fastest Tag</span>
              </div>
              <span className="font-bold">{(stats.fastestTag / 1000).toFixed(1)}s</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Links */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => navigate('/leaderboards')}
          className="w-full card p-4 flex items-center justify-between hover:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-400" />
            <div className="text-left">
              <p className="font-medium">Leaderboards</p>
              <p className="text-xs text-white/40">See how you rank</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/40" />
        </button>
        
        <button
          onClick={() => navigate('/history')}
          className="w-full card p-4 flex items-center justify-between hover:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-neon-cyan" />
            <div className="text-left">
              <p className="font-medium">Game History</p>
              <p className="text-xs text-white/40">{completedGames.length} games played</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/40" />
        </button>
        
        <button
          onClick={() => navigate('/achievements')}
          className="w-full card p-4 flex items-center justify-between hover:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-neon-purple" />
            <div className="text-left">
              <p className="font-medium">Achievements</p>
              <p className="text-xs text-white/40">
                {achievements.length} of {Object.keys(ACHIEVEMENTS).length} unlocked
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/40" />
        </button>
      </div>
      
      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
              Recent Achievements
            </h3>
            <button
              onClick={() => navigate('/achievements')}
              className="text-xs text-neon-cyan hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentAchievements.map((achievement) => (
              <div key={achievement.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                <span className="text-2xl">{achievement.icon}</span>
                <div>
                  <p className="font-medium text-sm">{achievement.name}</p>
                  <p className="text-xs text-white/40">{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Stats;

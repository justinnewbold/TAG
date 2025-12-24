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
        <h1 className="text-2xl font-display font-bold text-gray-900">Your Stats</h1>
        <p className="text-sm text-gray-500">Track your progress</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 text-center bg-gradient-to-br from-indigo-50 to-white shadow-lg">
          <Trophy className="w-8 h-8 mx-auto text-indigo-500 mb-2" />
          <p className="text-3xl font-bold text-gray-900">{stats.gamesWon}</p>
          <p className="text-sm text-gray-500">Wins</p>
          <p className="text-xs text-indigo-600 mt-1">{winRate}% win rate</p>
        </div>

        <div className="card p-4 text-center bg-gradient-to-br from-purple-50 to-white shadow-lg">
          <Target className="w-8 h-8 mx-auto text-purple-500 mb-2" />
          <p className="text-3xl font-bold text-gray-900">{stats.totalTags}</p>
          <p className="text-sm text-gray-500">Total Tags</p>
          <p className="text-xs text-purple-600 mt-1">{tagRatio} tag ratio</p>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="card p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Detailed Stats</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="w-5 h-5 text-gray-500" />
              </div>
              <span className="text-gray-700">Games Played</span>
            </div>
            <span className="font-bold text-gray-900">{stats.gamesPlayed}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Shield className="w-5 h-5 text-gray-500" />
              </div>
              <span className="text-gray-700">Times Tagged</span>
            </div>
            <span className="font-bold text-gray-900">{stats.timesTagged}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-500" />
              </div>
              <span className="text-gray-700">Longest Survival</span>
            </div>
            <span className="font-bold text-gray-900">{formatTime(stats.longestSurvival)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-500" />
              </div>
              <span className="text-gray-700">Total Play Time</span>
            </div>
            <span className="font-bold text-gray-900">{formatPlayTime(stats.totalPlayTime)}</span>
          </div>

          {stats.fastestTag && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Target className="w-5 h-5 text-gray-500" />
                </div>
                <span className="text-gray-700">Fastest Tag</span>
              </div>
              <span className="font-bold text-gray-900">{(stats.fastestTag / 1000).toFixed(1)}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => navigate('/leaderboards')}
          className="w-full card p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Leaderboards</p>
              <p className="text-xs text-gray-400">See how you rank</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={() => navigate('/history')}
          className="w-full card p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-indigo-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Game History</p>
              <p className="text-xs text-gray-400">{completedGames.length} games played</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={() => navigate('/achievements')}
          className="w-full card p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-purple-500" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Achievements</p>
              <p className="text-xs text-gray-400">
                {achievements.length} of {Object.keys(ACHIEVEMENTS).length} unlocked
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Recent Achievements
            </h3>
            <button
              onClick={() => navigate('/achievements')}
              className="text-xs text-indigo-600 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentAchievements.map((achievement) => (
              <div key={achievement.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <span className="text-2xl">{achievement.icon}</span>
                <div>
                  <p className="font-medium text-sm text-gray-900">{achievement.name}</p>
                  <p className="text-xs text-gray-400">{achievement.description}</p>
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

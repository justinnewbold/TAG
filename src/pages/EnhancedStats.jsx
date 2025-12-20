import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Target, Shield, Clock, Users, Award, History, Crown, ChevronRight, 
  Flame, Zap, TrendingUp, Calendar, Map, Star, Medal
} from 'lucide-react';
import { useStore, ACHIEVEMENTS } from '../store';
import HeatMapView from '../components/HeatMapView';

function EnhancedStats() {
  const navigate = useNavigate();
  const { stats, achievements, games, user } = useStore();
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [streaks, setStreaks] = useState({ current: 0, best: 0, type: null });
  const [personalRecords, setPersonalRecords] = useState([]);

  const completedGames = games.filter(g => g.status === 'ended');
  const winRate = stats.gamesPlayed > 0 
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
    : 0;
  const tagRatio = stats.timesTagged > 0 
    ? (stats.totalTags / stats.timesTagged).toFixed(1) 
    : stats.totalTags;

  // Calculate streaks and personal records
  useEffect(() => {
    calculateStreaks();
    calculatePersonalRecords();
  }, [games, stats]);

  const calculateStreaks = () => {
    if (completedGames.length === 0) {
      setStreaks({ current: 0, best: 0, type: null });
      return;
    }

    // Sort games by end date
    const sorted = [...completedGames].sort((a, b) => b.endedAt - a.endedAt);
    
    // Calculate win streak
    let currentWinStreak = 0;
    let bestWinStreak = 0;
    let tempStreak = 0;

    for (const game of sorted) {
      if (game.winnerId === user?.id) {
        tempStreak++;
        if (tempStreak > bestWinStreak) bestWinStreak = tempStreak;
      } else {
        if (currentWinStreak === 0) currentWinStreak = tempStreak;
        tempStreak = 0;
      }
    }
    if (currentWinStreak === 0) currentWinStreak = tempStreak;

    // Calculate daily play streak
    let dailyStreak = 0;
    let bestDailyStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const gamesByDay = {};
    for (const game of sorted) {
      const day = new Date(game.endedAt);
      day.setHours(0, 0, 0, 0);
      const key = day.getTime();
      gamesByDay[key] = true;
    }

    // Check consecutive days
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    
    while (gamesByDay[checkDate.getTime()]) {
      dailyStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    setStreaks({
      currentWin: currentWinStreak,
      bestWin: bestWinStreak,
      daily: dailyStreak,
    });
  };

  const calculatePersonalRecords = () => {
    const records = [];

    // Most tags in a single game
    let maxTags = 0;
    let maxTagsGame = null;
    for (const game of completedGames) {
      const player = game.players?.find(p => p.id === user?.id);
      if (player?.tagCount > maxTags) {
        maxTags = player.tagCount;
        maxTagsGame = game;
      }
    }
    if (maxTags > 0) {
      records.push({
        id: 'mostTags',
        icon: '🎯',
        label: 'Most Tags (Single Game)',
        value: maxTags,
        date: maxTagsGame?.endedAt,
      });
    }

    // Fastest tag
    if (stats.fastestTag) {
      records.push({
        id: 'fastestTag',
        icon: '⚡',
        label: 'Fastest Tag',
        value: `${(stats.fastestTag / 1000).toFixed(1)}s`,
        isTime: true,
      });
    }

    // Longest survival
    if (stats.longestSurvival) {
      records.push({
        id: 'longestSurvival',
        icon: '🛡️',
        label: 'Longest Survival',
        value: formatTime(stats.longestSurvival),
        isTime: true,
      });
    }

    // Longest game played
    let longestGame = 0;
    for (const game of completedGames) {
      const duration = game.endedAt - game.startedAt;
      if (duration > longestGame) longestGame = duration;
    }
    if (longestGame > 0) {
      records.push({
        id: 'longestGame',
        icon: '⏱️',
        label: 'Longest Game',
        value: formatTime(longestGame),
        isTime: true,
      });
    }

    // Most players in a game
    let maxPlayers = 0;
    for (const game of completedGames) {
      if (game.players?.length > maxPlayers) {
        maxPlayers = game.players.length;
      }
    }
    if (maxPlayers > 2) {
      records.push({
        id: 'mostPlayers',
        icon: '👥',
        label: 'Largest Game',
        value: `${maxPlayers} players`,
      });
    }

    setPersonalRecords(records);
  };
  
  const formatTime = (ms) => {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hrs}h ${remainMins}m`;
    }
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
    <div className="min-h-screen p-6 pb-24">
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

      {/* Streaks */}
      <div className="card p-4 mb-6">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          Streaks
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <Flame className="w-6 h-6 mx-auto text-orange-400 mb-1" />
            <p className="text-2xl font-bold text-orange-400">{streaks.currentWin || 0}</p>
            <p className="text-xs text-white/50">Win Streak</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <Star className="w-6 h-6 mx-auto text-amber-400 mb-1" />
            <p className="text-2xl font-bold text-amber-400">{streaks.bestWin || 0}</p>
            <p className="text-xs text-white/50">Best Win Streak</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-xl">
            <Calendar className="w-6 h-6 mx-auto text-neon-cyan mb-1" />
            <p className="text-2xl font-bold text-neon-cyan">{streaks.daily || 0}</p>
            <p className="text-xs text-white/50">Day Streak</p>
          </div>
        </div>
      </div>

      {/* Personal Records */}
      {personalRecords.length > 0 && (
        <div className="card p-4 mb-6">
          <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Medal className="w-4 h-4 text-amber-400" />
            Personal Records
          </h3>
          <div className="space-y-3">
            {personalRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{record.icon}</span>
                  <span className="text-sm text-white/70">{record.label}</span>
                </div>
                <span className="font-bold text-neon-cyan">{record.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
                  <Zap className="w-5 h-5 text-white/60" />
                </div>
                <span className="text-white/80">Fastest Tag</span>
              </div>
              <span className="font-bold">{(stats.fastestTag / 1000).toFixed(1)}s</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <Users className="w-5 h-5 text-white/60" />
              </div>
              <span className="text-white/80">Unique Players Met</span>
            </div>
            <span className="font-bold">{stats.uniqueFriendsPlayed || 0}</span>
          </div>
        </div>
      </div>
      
      {/* Quick Links */}
      <div className="space-y-3 mb-6">
        {/* Heat Map */}
        <button
          onClick={() => setShowHeatMap(true)}
          className="w-full card p-4 flex items-center justify-between hover:bg-white/5 transition-all bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20"
        >
          <div className="flex items-center gap-3">
            <Map className="w-6 h-6 text-orange-400" />
            <div className="text-left">
              <p className="font-medium">Activity Heat Map</p>
              <p className="text-xs text-white/40">See where you play most</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/40" />
        </button>

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

      {/* Heat Map Modal */}
      {showHeatMap && (
        <HeatMapView onClose={() => setShowHeatMap(false)} />
      )}
    </div>
  );
}

export default EnhancedStats;

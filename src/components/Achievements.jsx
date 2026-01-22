/**
 * Achievement & Badge System
 * Track milestones, unlock badges, and display player achievements
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trophy,
  Star,
  Medal,
  Award,
  Zap,
  Shield,
  Target,
  Clock,
  Flame,
  Crown,
  Heart,
  Users,
  Map,
  Footprints,
  Eye,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Share2,
  X,
  Sparkles,
  Gift,
  Calendar,
  TrendingUp,
} from 'lucide-react';

// Achievement categories
const CATEGORIES = {
  TAGGING: { id: 'tagging', name: 'Tagging', icon: Zap, color: 'text-yellow-400' },
  SURVIVAL: { id: 'survival', name: 'Survival', icon: Shield, color: 'text-green-400' },
  SPEED: { id: 'speed', name: 'Speed', icon: Footprints, color: 'text-cyan-400' },
  SOCIAL: { id: 'social', name: 'Social', icon: Users, color: 'text-pink-400' },
  EXPLORATION: { id: 'exploration', name: 'Exploration', icon: Map, color: 'text-purple-400' },
  SPECIAL: { id: 'special', name: 'Special', icon: Star, color: 'text-orange-400' },
};

// Achievement rarity tiers
const RARITY = {
  COMMON: { name: 'Common', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500' },
  UNCOMMON: { name: 'Uncommon', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500' },
  RARE: { name: 'Rare', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500' },
  EPIC: { name: 'Epic', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500' },
  LEGENDARY: { name: 'Legendary', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500' },
};

// All achievements
const ACHIEVEMENTS = {
  // Tagging achievements
  first_tag: {
    id: 'first_tag',
    name: 'First Blood',
    description: 'Tag your first player',
    category: 'TAGGING',
    rarity: 'COMMON',
    icon: '👆',
    xp: 50,
    requirement: { type: 'tags', count: 1 },
  },
  tag_10: {
    id: 'tag_10',
    name: 'Getting Warmed Up',
    description: 'Tag 10 players total',
    category: 'TAGGING',
    rarity: 'COMMON',
    icon: '🔥',
    xp: 100,
    requirement: { type: 'tags', count: 10 },
  },
  tag_100: {
    id: 'tag_100',
    name: 'Tag Master',
    description: 'Tag 100 players total',
    category: 'TAGGING',
    rarity: 'UNCOMMON',
    icon: '⚡',
    xp: 500,
    requirement: { type: 'tags', count: 100 },
  },
  tag_1000: {
    id: 'tag_1000',
    name: 'Tag Legend',
    description: 'Tag 1,000 players total',
    category: 'TAGGING',
    rarity: 'EPIC',
    icon: '🏆',
    xp: 2000,
    requirement: { type: 'tags', count: 1000 },
  },
  streak_3: {
    id: 'streak_3',
    name: 'Hat Trick',
    description: 'Get a 3-tag streak in one game',
    category: 'TAGGING',
    rarity: 'UNCOMMON',
    icon: '🎯',
    xp: 200,
    requirement: { type: 'streak', count: 3 },
  },
  streak_5: {
    id: 'streak_5',
    name: 'On Fire',
    description: 'Get a 5-tag streak in one game',
    category: 'TAGGING',
    rarity: 'RARE',
    icon: '🔥',
    xp: 500,
    requirement: { type: 'streak', count: 5 },
  },
  streak_10: {
    id: 'streak_10',
    name: 'Unstoppable',
    description: 'Get a 10-tag streak in one game',
    category: 'TAGGING',
    rarity: 'LEGENDARY',
    icon: '💀',
    xp: 2000,
    requirement: { type: 'streak', count: 10 },
  },
  quick_tag: {
    id: 'quick_tag',
    name: 'Lightning Fast',
    description: 'Tag someone within 10 seconds of becoming IT',
    category: 'TAGGING',
    rarity: 'RARE',
    icon: '⚡',
    xp: 300,
    requirement: { type: 'quick_tag', seconds: 10 },
  },

  // Survival achievements
  survive_1min: {
    id: 'survive_1min',
    name: 'Survivor',
    description: 'Survive for 1 minute as a runner',
    category: 'SURVIVAL',
    rarity: 'COMMON',
    icon: '🏃',
    xp: 50,
    requirement: { type: 'survival_time', seconds: 60 },
  },
  survive_5min: {
    id: 'survive_5min',
    name: 'Escape Artist',
    description: 'Survive for 5 minutes as a runner',
    category: 'SURVIVAL',
    rarity: 'UNCOMMON',
    icon: '🦊',
    xp: 200,
    requirement: { type: 'survival_time', seconds: 300 },
  },
  survive_10min: {
    id: 'survive_10min',
    name: 'Ghost',
    description: 'Survive for 10 minutes as a runner',
    category: 'SURVIVAL',
    rarity: 'RARE',
    icon: '👻',
    xp: 500,
    requirement: { type: 'survival_time', seconds: 600 },
  },
  last_survivor: {
    id: 'last_survivor',
    name: 'Last One Standing',
    description: 'Be the last runner in an elimination game',
    category: 'SURVIVAL',
    rarity: 'RARE',
    icon: '🏅',
    xp: 400,
    requirement: { type: 'last_survivor', count: 1 },
  },
  narrow_escape: {
    id: 'narrow_escape',
    name: 'Close Call',
    description: 'Escape when IT is within 5 meters',
    category: 'SURVIVAL',
    rarity: 'UNCOMMON',
    icon: '😰',
    xp: 150,
    requirement: { type: 'narrow_escape', distance: 5 },
  },

  // Speed achievements
  distance_1km: {
    id: 'distance_1km',
    name: 'Getting Started',
    description: 'Run 1 kilometer total',
    category: 'SPEED',
    rarity: 'COMMON',
    icon: '🚶',
    xp: 50,
    requirement: { type: 'distance', meters: 1000 },
  },
  distance_10km: {
    id: 'distance_10km',
    name: 'Marathon Starter',
    description: 'Run 10 kilometers total',
    category: 'SPEED',
    rarity: 'UNCOMMON',
    icon: '🏃',
    xp: 300,
    requirement: { type: 'distance', meters: 10000 },
  },
  distance_100km: {
    id: 'distance_100km',
    name: 'Ultra Runner',
    description: 'Run 100 kilometers total',
    category: 'SPEED',
    rarity: 'EPIC',
    icon: '🦸',
    xp: 1500,
    requirement: { type: 'distance', meters: 100000 },
  },
  speed_demon: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Reach a speed of 20 km/h',
    category: 'SPEED',
    rarity: 'RARE',
    icon: '💨',
    xp: 300,
    requirement: { type: 'max_speed', kmh: 20 },
  },

  // Social achievements
  first_friend: {
    id: 'first_friend',
    name: 'Making Friends',
    description: 'Add your first friend',
    category: 'SOCIAL',
    rarity: 'COMMON',
    icon: '🤝',
    xp: 50,
    requirement: { type: 'friends', count: 1 },
  },
  friends_10: {
    id: 'friends_10',
    name: 'Social Butterfly',
    description: 'Have 10 friends',
    category: 'SOCIAL',
    rarity: 'UNCOMMON',
    icon: '🦋',
    xp: 200,
    requirement: { type: 'friends', count: 10 },
  },
  host_game: {
    id: 'host_game',
    name: 'Game Master',
    description: 'Host your first game',
    category: 'SOCIAL',
    rarity: 'COMMON',
    icon: '🎮',
    xp: 100,
    requirement: { type: 'games_hosted', count: 1 },
  },
  play_100_games: {
    id: 'play_100_games',
    name: 'Dedicated Player',
    description: 'Play 100 games',
    category: 'SOCIAL',
    rarity: 'RARE',
    icon: '🎯',
    xp: 1000,
    requirement: { type: 'games_played', count: 100 },
  },

  // Special achievements
  first_win: {
    id: 'first_win',
    name: 'Victory!',
    description: 'Win your first game',
    category: 'SPECIAL',
    rarity: 'COMMON',
    icon: '🏆',
    xp: 100,
    requirement: { type: 'wins', count: 1 },
  },
  win_streak_3: {
    id: 'win_streak_3',
    name: 'Winning Streak',
    description: 'Win 3 games in a row',
    category: 'SPECIAL',
    rarity: 'RARE',
    icon: '🔥',
    xp: 500,
    requirement: { type: 'win_streak', count: 3 },
  },
  perfectionist: {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Win a game without being tagged once',
    category: 'SPECIAL',
    rarity: 'EPIC',
    icon: '💎',
    xp: 1000,
    requirement: { type: 'perfect_game', count: 1 },
  },
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Play a game after midnight',
    category: 'SPECIAL',
    rarity: 'UNCOMMON',
    icon: '🦉',
    xp: 150,
    requirement: { type: 'time_of_day', hour: 0 },
  },
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Play a game before 6 AM',
    category: 'SPECIAL',
    rarity: 'UNCOMMON',
    icon: '🐦',
    xp: 150,
    requirement: { type: 'time_of_day', hour: 6 },
  },
};

// Single achievement card
function AchievementCard({ achievement, progress = 0, isUnlocked, onClick }) {
  const rarity = RARITY[achievement.rarity];
  const category = CATEGORIES[achievement.category];
  const progressPercent = Math.min(100, (progress / (achievement.requirement?.count || 1)) * 100);

  return (
    <button
      onClick={() => onClick?.(achievement)}
      className={`relative p-4 rounded-xl text-left transition-all ${
        isUnlocked
          ? `${rarity.bg} border ${rarity.border}`
          : 'bg-gray-800/50 border border-gray-700 opacity-70'
      } hover:scale-[1.02]`}
    >
      {/* Icon */}
      <div className="flex items-start justify-between mb-2">
        <div className={`text-3xl ${!isUnlocked && 'grayscale opacity-50'}`}>
          {achievement.icon}
        </div>
        {!isUnlocked && (
          <Lock className="w-4 h-4 text-gray-500" />
        )}
        {isUnlocked && (
          <div className={`flex items-center gap-1 text-xs ${rarity.color}`}>
            <Star className="w-3 h-3 fill-current" />
            {achievement.xp} XP
          </div>
        )}
      </div>

      {/* Name & description */}
      <h4 className={`font-bold ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
        {achievement.name}
      </h4>
      <p className="text-xs text-gray-400 mt-1">{achievement.description}</p>

      {/* Progress bar for locked achievements */}
      {!isUnlocked && achievement.requirement?.count && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{progress} / {achievement.requirement.count}</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${rarity.bg.replace('/20', '')} transition-all`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Rarity badge */}
      <div className={`mt-3 text-xs ${rarity.color}`}>
        {rarity.name}
      </div>
    </button>
  );
}

// Achievement detail modal
function AchievementModal({ achievement, isUnlocked, progress, onClose, onShare }) {
  const rarity = RARITY[achievement.rarity];
  const category = CATEGORIES[achievement.category];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-900 rounded-2xl max-w-md w-full overflow-hidden border ${rarity.border}`}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${
          isUnlocked ? 'from-yellow-500/20 to-orange-500/20' : 'from-gray-800 to-gray-700'
        } p-6 text-center relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          <div className={`text-6xl mb-3 ${!isUnlocked && 'grayscale opacity-50'}`}>
            {achievement.icon}
          </div>
          <h3 className="text-xl font-bold text-white">{achievement.name}</h3>
          <div className={`text-sm ${rarity.color} mt-1`}>{rarity.name}</div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-300 text-center">{achievement.description}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <category.icon className={`w-5 h-5 mx-auto mb-1 ${category.color}`} />
              <div className="text-xs text-gray-400">{category.name}</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              <Star className={`w-5 h-5 mx-auto mb-1 ${rarity.color}`} />
              <div className="text-xs text-gray-400">{achievement.xp} XP</div>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
              {isUnlocked ? (
                <>
                  <Unlock className="w-5 h-5 mx-auto mb-1 text-green-400" />
                  <div className="text-xs text-gray-400">Unlocked</div>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                  <div className="text-xs text-gray-400">Locked</div>
                </>
              )}
            </div>
          </div>

          {/* Progress */}
          {!isUnlocked && achievement.requirement?.count && (
            <div className="bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white">Progress</span>
                <span className="text-sm text-gray-400">
                  {progress} / {achievement.requirement.count}
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${rarity.bg.replace('/20', '')} transition-all`}
                  style={{ width: `${Math.min(100, (progress / achievement.requirement.count) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Share button for unlocked */}
          {isUnlocked && (
            <button
              onClick={() => onShare?.(achievement)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share Achievement
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Achievement notification popup
function AchievementNotification({ achievement, onDismiss }) {
  const rarity = RARITY[achievement.rarity];

  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down`}>
      <div className={`flex items-center gap-4 px-6 py-4 ${rarity.bg} ${rarity.border} border rounded-2xl shadow-2xl`}>
        <div className="text-4xl animate-bounce">{achievement.icon}</div>
        <div>
          <div className="flex items-center gap-2">
            <Trophy className={`w-4 h-4 ${rarity.color}`} />
            <span className="text-sm text-gray-400">Achievement Unlocked!</span>
          </div>
          <h4 className="font-bold text-white">{achievement.name}</h4>
          <div className={`text-sm ${rarity.color}`}>+{achievement.xp} XP</div>
        </div>
        <button onClick={onDismiss} className="p-2 hover:bg-white/10 rounded-lg">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

// Main Achievements component
export default function Achievements({
  userStats = {},
  unlockedAchievements = [],
  className = '',
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);

  // Filter achievements
  const filteredAchievements = useMemo(() => {
    let achievements = Object.values(ACHIEVEMENTS);

    if (selectedCategory !== 'all') {
      achievements = achievements.filter((a) => a.category === selectedCategory.toUpperCase());
    }

    if (showUnlockedOnly) {
      achievements = achievements.filter((a) => unlockedAchievements.includes(a.id));
    }

    return achievements;
  }, [selectedCategory, showUnlockedOnly, unlockedAchievements]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = Object.keys(ACHIEVEMENTS).length;
    const unlocked = unlockedAchievements.length;
    const totalXP = unlockedAchievements.reduce((sum, id) => {
      return sum + (ACHIEVEMENTS[id]?.xp || 0);
    }, 0);

    return { total, unlocked, totalXP };
  }, [unlockedAchievements]);

  // Get progress for an achievement
  const getProgress = (achievement) => {
    const req = achievement.requirement;
    if (!req) return 0;

    switch (req.type) {
      case 'tags':
        return userStats.totalTags || 0;
      case 'streak':
        return userStats.maxStreak || 0;
      case 'survival_time':
        return userStats.maxSurvivalTime || 0;
      case 'distance':
        return userStats.totalDistance || 0;
      case 'friends':
        return userStats.friendCount || 0;
      case 'games_played':
        return userStats.gamesPlayed || 0;
      case 'games_hosted':
        return userStats.gamesHosted || 0;
      case 'wins':
        return userStats.wins || 0;
      default:
        return 0;
    }
  };

  return (
    <div className={`bg-gray-900/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">Achievements</h2>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-400 font-medium">{stats.totalXP.toLocaleString()} XP</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-400">Progress</span>
            <span className="text-white font-medium">{stats.unlocked} / {stats.total}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
              style={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500'
                : 'bg-gray-800/50 text-gray-400 border border-transparent hover:border-gray-600'
            }`}
          >
            All
          </button>
          {Object.values(CATEGORIES).map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500'
                  : 'bg-gray-800/50 text-gray-400 border border-transparent hover:border-gray-600'
              }`}
            >
              <category.icon className="w-4 h-4" />
              {category.name}
            </button>
          ))}
        </div>

        {/* Toggle unlocked only */}
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showUnlockedOnly}
            onChange={(e) => setShowUnlockedOnly(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
          />
          <span className="text-sm text-gray-400">Show unlocked only</span>
        </label>
      </div>

      {/* Achievement grid */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {filteredAchievements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No achievements found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                isUnlocked={unlockedAchievements.includes(achievement.id)}
                progress={getProgress(achievement)}
                onClick={setSelectedAchievement}
              />
            ))}
          </div>
        )}
      </div>

      {/* Achievement detail modal */}
      {selectedAchievement && (
        <AchievementModal
          achievement={selectedAchievement}
          isUnlocked={unlockedAchievements.includes(selectedAchievement.id)}
          progress={getProgress(selectedAchievement)}
          onClose={() => setSelectedAchievement(null)}
          onShare={(a) => console.log('Share:', a)}
        />
      )}

      {/* CSS for animations */}
      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translate(-50%, -100%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// Hook for achievement tracking
export function useAchievements(socket, userId) {
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [recentUnlock, setRecentUnlock] = useState(null);
  const [userStats, setUserStats] = useState({});

  // Load achievements on mount
  useEffect(() => {
    if (!userId) return;

    const loadAchievements = async () => {
      try {
        const response = await fetch(`/api/users/${userId}/achievements`);
        const data = await response.json();
        setUnlockedAchievements(data.achievements || []);
        setUserStats(data.stats || {});
      } catch (err) {
        console.error('Failed to load achievements:', err);
      }
    };

    loadAchievements();
  }, [userId]);

  // Listen for new achievements
  useEffect(() => {
    if (!socket) return;

    const handleAchievementUnlocked = (data) => {
      setUnlockedAchievements((prev) => [...prev, data.achievementId]);
      setRecentUnlock(ACHIEVEMENTS[data.achievementId]);
    };

    const handleStatsUpdate = (data) => {
      setUserStats(data.stats);
    };

    socket.on('achievement:unlocked', handleAchievementUnlocked);
    socket.on('stats:update', handleStatsUpdate);

    return () => {
      socket.off('achievement:unlocked', handleAchievementUnlocked);
      socket.off('stats:update', handleStatsUpdate);
    };
  }, [socket]);

  // Dismiss recent unlock notification
  const dismissRecentUnlock = useCallback(() => {
    setRecentUnlock(null);
  }, []);

  // Check if a specific achievement is unlocked
  const isUnlocked = useCallback(
    (achievementId) => unlockedAchievements.includes(achievementId),
    [unlockedAchievements]
  );

  return {
    unlockedAchievements,
    userStats,
    recentUnlock,
    dismissRecentUnlock,
    isUnlocked,
    totalXP: unlockedAchievements.reduce((sum, id) => sum + (ACHIEVEMENTS[id]?.xp || 0), 0),
  };
}

// Export achievement notification for use elsewhere
export { AchievementNotification, ACHIEVEMENTS };

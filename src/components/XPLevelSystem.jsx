import React, { useEffect, useState } from 'react';
import { Star, TrendingUp, Award, Sparkles, X } from 'lucide-react';
import { useStore } from '../store';

// Level thresholds (XP required for each level)
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  850,    // Level 5
  1300,   // Level 6
  1900,   // Level 7
  2600,   // Level 8
  3500,   // Level 9
  4600,   // Level 10
  6000,   // Level 11
  7700,   // Level 12
  9700,   // Level 13
  12000,  // Level 14
  15000,  // Level 15
  18500,  // Level 16
  22500,  // Level 17
  27000,  // Level 18
  32000,  // Level 19
  40000,  // Level 20 (Max)
];

// Level rewards
const LEVEL_REWARDS = {
  5: { type: 'title', value: 'Rookie Runner', icon: '🏃' },
  10: { type: 'avatar', value: '🦊', icon: '🦊' },
  15: { type: 'title', value: 'Tag Veteran', icon: '⭐' },
  20: { type: 'title', value: 'Tag Master', icon: '👑' },
};

// Calculate level from XP
export const getLevel = (xp) => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
};

// Get XP progress within current level
export const getLevelProgress = (xp) => {
  const level = getLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  
  const progress = xp - currentThreshold;
  const required = nextThreshold - currentThreshold;
  
  return {
    level,
    currentXP: xp,
    progress,
    required,
    percentage: Math.min((progress / required) * 100, 100),
    isMaxLevel: level >= LEVEL_THRESHOLDS.length,
  };
};

// XP earned notification
export function XPGainNotification({ amount, reason, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`
        fixed top-20 left-1/2 -translate-x-1/2 z-50
        px-4 py-2 rounded-full
        bg-gradient-to-r from-amber-500/90 to-orange-500/90
        text-white font-bold shadow-lg
        flex items-center gap-2
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}
    >
      <Star className="w-5 h-5" />
      <span>+{amount} XP</span>
      {reason && <span className="text-white/80 text-sm">• {reason}</span>}
    </div>
  );
}

// Level up celebration modal
export function LevelUpModal({ newLevel, reward, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-amber-500/30 animate-bounce-in">
        {/* Celebration header */}
        <div className="relative p-6 bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-center">
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <Sparkles
                key={i}
                className="absolute text-amber-400 animate-twinkle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  width: `${12 + Math.random() * 12}px`,
                }}
              />
            ))}
          </div>
          
          <div className="relative">
            <div className="text-6xl mb-2">🎉</div>
            <h2 className="text-2xl font-bold text-white">Level Up!</h2>
          </div>
        </div>

        {/* Level display */}
        <div className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg mb-4">
            <span className="text-4xl font-bold text-dark-900">{newLevel}</span>
          </div>
          
          <p className="text-white/60 mb-4">
            You've reached level {newLevel}!
          </p>

          {/* Reward */}
          {reward && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-white/40 mb-2">Reward Unlocked</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">{reward.icon}</span>
                <div className="text-left">
                  <p className="font-semibold text-white">{reward.value}</p>
                  <p className="text-xs text-white/60 capitalize">{reward.type}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Close button */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-dark-900 font-bold hover:opacity-90 transition-opacity"
          >
            Awesome!
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Compact level badge component
export function LevelBadge({ xp, size = 'md' }) {
  const { level, percentage } = getLevelProgress(xp || 0);
  
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
  };

  return (
    <div className={`relative ${sizes[size]} rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-bold text-dark-900 shadow-lg`}>
      {level}
      {/* Progress ring */}
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="3"
        />
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeDasharray={`${percentage * 2.83} 283`}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// Full level progress bar
export function LevelProgressBar({ xp }) {
  const { level, progress, required, percentage, isMaxLevel } = getLevelProgress(xp || 0);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <LevelBadge xp={xp} size="sm" />
          <span className="font-semibold text-white">Level {level}</span>
        </div>
        {!isMaxLevel && (
          <span className="text-sm text-white/60">
            {progress.toLocaleString()} / {required.toLocaleString()} XP
          </span>
        )}
      </div>
      
      <div className="h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {isMaxLevel ? (
        <p className="text-xs text-amber-400 text-center">✨ Max Level Reached!</p>
      ) : (
        <p className="text-xs text-white/40 text-center">
          {(required - progress).toLocaleString()} XP to level {level + 1}
        </p>
      )}
    </div>
  );
}

// XP sources and amounts
export const XP_REWARDS = {
  TAG_PLAYER: 10,
  WIN_GAME: 50,
  COMPLETE_GAME: 15,
  DAILY_CHALLENGE: 'varies',
  DAILY_SPIN: 'varies',
  ACHIEVEMENT: 25,
  FIRST_GAME_OF_DAY: 20,
  PLAY_WITH_FRIENDS: 10,
  SURVIVAL_BONUS: 5, // per minute survived
};

export default function XPLevelSystem() {
  // This is primarily an export module for XP/Level utilities
  return null;
}

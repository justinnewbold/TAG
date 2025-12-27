// DailyRewards Component
// Beautiful daily rewards UI with streak tracking, calendar view, and mystery box

import React, { useState, useEffect } from 'react';
import { X, Gift, Flame, Star, Clock, Trophy, Sparkles, Package, Coins, Zap, ChevronRight, CheckCircle2, Lock } from 'lucide-react';
import { useDailyRewards } from '../hooks/useDailyRewards';
import { STREAK_REWARDS, BONUS_REWARDS } from '../services/dailyRewardsService';

// Confetti animation component
function Confetti({ show }) {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        >
          <div
            className="w-2 h-2 rounded-sm"
            style={{
              backgroundColor: ['#00f6ff', '#a855f7', '#f97316', '#fbbf24', '#22c55e'][Math.floor(Math.random() * 5)],
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

// Mystery Box Opening Animation
function MysteryBoxAnimation({ onComplete, result }) {
  const [stage, setStage] = useState('shaking'); // shaking, opening, reveal
  
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage('opening'), 1000),
      setTimeout(() => setStage('reveal'), 2000),
      setTimeout(onComplete, 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        {stage === 'shaking' && (
          <div className="animate-shake">
            <Package className="w-32 h-32 text-neon-purple mx-auto" />
            <p className="text-white/60 mt-4">Opening...</p>
          </div>
        )}
        
        {stage === 'opening' && (
          <div className="animate-pulse">
            <div className="relative">
              <Package className="w-32 h-32 text-neon-cyan mx-auto animate-bounce" />
              <Sparkles className="w-16 h-16 text-amber-400 absolute top-0 left-1/2 -translate-x-1/2 animate-ping" />
            </div>
          </div>
        )}
        
        {stage === 'reveal' && result && (
          <div className="animate-scale-up">
            <div className="bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 rounded-2xl p-8 border border-white/10">
              <Sparkles className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <p className="text-2xl font-bold text-white mb-2">You Won!</p>
              <p className="text-3xl font-bold text-neon-cyan">{result.label}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Daily Reward Claim Animation
function RewardClaimAnimation({ reward, onComplete }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Confetti show />
      <div className="animate-scale-up text-center">
        <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl p-8 border border-amber-500/30">
          <Gift className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-bounce" />
          <p className="text-2xl font-bold text-white mb-4">Daily Reward!</p>
          
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <Coins className="w-8 h-8 text-amber-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-amber-400">+{reward.coins}</p>
              <p className="text-xs text-white/40">Coins</p>
            </div>
            <div className="text-center">
              <Star className="w-8 h-8 text-neon-cyan mx-auto mb-1" />
              <p className="text-2xl font-bold text-neon-cyan">+{reward.xp}</p>
              <p className="text-xs text-white/40">XP</p>
            </div>
          </div>
          
          {reward.badge && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <Trophy className="w-8 h-8 text-neon-purple mx-auto mb-1" />
              <p className="text-sm text-neon-purple font-medium">Badge Unlocked!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Weekly Calendar Day Component
function CalendarDay({ day, reward, isClaimed, isToday, isLocked, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!isToday}
      className={`
        relative flex flex-col items-center p-2 rounded-xl transition-all
        ${isClaimed ? 'bg-green-500/20 border border-green-500/30' : ''}
        ${isToday ? 'bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/50 animate-pulse-slow cursor-pointer active:scale-95' : ''}
        ${isLocked ? 'bg-white/5 opacity-50' : ''}
        ${!isClaimed && !isToday && !isLocked ? 'bg-white/5' : ''}
      `}
    >
      <span className="text-xs text-white/40 mb-1">{day.dayName}</span>
      
      <div className={`
        w-10 h-10 rounded-lg flex items-center justify-center mb-1
        ${isClaimed ? 'bg-green-500/30' : 'bg-white/10'}
      `}>
        {isClaimed ? (
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        ) : isLocked ? (
          <Lock className="w-4 h-4 text-white/30" />
        ) : isToday ? (
          <Gift className="w-5 h-5 text-neon-cyan animate-bounce" />
        ) : (
          <Coins className="w-4 h-4 text-amber-400/50" />
        )}
      </div>
      
      <span className="text-xs font-medium">
        {reward?.coins || 10}
      </span>
      
      {day.day === 7 && (
        <div className="absolute -top-1 -right-1 bg-neon-purple rounded-full p-1">
          <Package className="w-3 h-3 text-white" />
        </div>
      )}
    </button>
  );
}

// Main DailyRewards Component
export function DailyRewards({ isOpen, onClose }) {
  const {
    coins,
    xp,
    currentStreak,
    longestStreak,
    canClaim,
    timeUntilNext,
    weeklyCalendar,
    mysteryBoxAvailable,
    isClaimingReward,
    isOpeningBox,
    lastClaimResult,
    mysteryBoxResult,
    claimDailyReward,
    openMysteryBox,
    clearClaimResult,
    clearMysteryBoxResult,
  } = useDailyRewards();

  const [showClaimAnimation, setShowClaimAnimation] = useState(false);
  const [showMysteryAnimation, setShowMysteryAnimation] = useState(false);
  const [claimedReward, setClaimedReward] = useState(null);
  const [boxReward, setBoxReward] = useState(null);

  // Handle claim
  const handleClaim = async () => {
    const result = await claimDailyReward();
    if (result?.success) {
      setClaimedReward(result.reward);
      setShowClaimAnimation(true);
    }
  };

  // Handle mystery box
  const handleOpenBox = async () => {
    setShowMysteryAnimation(true);
    const result = await openMysteryBox();
    if (result?.success) {
      setBoxReward(result.reward);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Animations */}
      {showClaimAnimation && claimedReward && (
        <RewardClaimAnimation
          reward={claimedReward}
          onComplete={() => {
            setShowClaimAnimation(false);
            setClaimedReward(null);
            clearClaimResult();
          }}
        />
      )}
      
      {showMysteryAnimation && (
        <MysteryBoxAnimation
          result={boxReward}
          onComplete={() => {
            setShowMysteryAnimation(false);
            setBoxReward(null);
            clearMysteryBoxResult();
          }}
        />
      )}

      {/* Main Modal */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-end sm:items-center justify-center p-4">
        <div className="bg-dark-800 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="relative p-4 bg-gradient-to-r from-neon-purple/20 to-neon-cyan/20 border-b border-white/10">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Daily Rewards</h2>
                <p className="text-sm text-white/50">Claim your daily bonus!</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
            {/* Streak Banner */}
            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-4 mb-4 border border-orange-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/30 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-400">{currentStreak} Day{currentStreak !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-white/40">Current Streak</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white/60">{longestStreak}</p>
                  <p className="text-xs text-white/40">Best Streak</p>
                </div>
              </div>
            </div>

            {/* Wallet */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="card p-3 flex items-center gap-3">
                <Coins className="w-6 h-6 text-amber-400" />
                <div>
                  <p className="text-lg font-bold">{coins}</p>
                  <p className="text-xs text-white/40">Coins</p>
                </div>
              </div>
              <div className="card p-3 flex items-center gap-3">
                <Star className="w-6 h-6 text-neon-cyan" />
                <div>
                  <p className="text-lg font-bold">{xp}</p>
                  <p className="text-xs text-white/40">XP</p>
                </div>
              </div>
            </div>

            {/* Weekly Calendar */}
            <div className="mb-4">
              <p className="text-sm font-medium text-white/60 mb-3">This Week</p>
              <div className="grid grid-cols-7 gap-1">
                {weeklyCalendar.map((day, index) => (
                  <CalendarDay
                    key={index}
                    {...day}
                    onClick={day.isToday ? handleClaim : undefined}
                  />
                ))}
              </div>
            </div>

            {/* Claim Button */}
            {canClaim ? (
              <button
                onClick={handleClaim}
                disabled={isClaimingReward}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {isClaimingReward ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5" />
                    Claim Daily Reward
                  </>
                )}
              </button>
            ) : (
              <div className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="flex items-center justify-center gap-2 text-white/40">
                  <Clock className="w-4 h-4" />
                  <span>Next reward in</span>
                </div>
                <p className="text-2xl font-mono font-bold text-neon-cyan mt-1">
                  {String(timeUntilNext.hours).padStart(2, '0')}:
                  {String(timeUntilNext.minutes).padStart(2, '0')}:
                  {String(timeUntilNext.seconds).padStart(2, '0')}
                </p>
              </div>
            )}

            {/* Mystery Box */}
            {mysteryBoxAvailable && (
              <button
                onClick={handleOpenBox}
                disabled={isOpeningBox}
                className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform animate-pulse"
              >
                <Package className="w-5 h-5" />
                Open Mystery Box!
                <Sparkles className="w-4 h-4" />
              </button>
            )}

            {/* Milestone Rewards */}
            <div className="mt-6">
              <p className="text-sm font-medium text-white/60 mb-3">Streak Milestones</p>
              <div className="space-y-2">
                {[7, 14, 30, 60, 100].map((milestone) => {
                  const reward = STREAK_REWARDS[milestone];
                  const isAchieved = currentStreak >= milestone;
                  
                  return (
                    <div
                      key={milestone}
                      className={`flex items-center justify-between p-3 rounded-xl ${
                        isAchieved ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isAchieved ? 'bg-green-500/30' : 'bg-white/10'
                        }`}>
                          {isAchieved ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <Trophy className="w-4 h-4 text-white/30" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{milestone} Day Streak</p>
                          <p className="text-xs text-white/40">
                            {reward.coins} coins + {reward.xp} XP
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DailyRewards;

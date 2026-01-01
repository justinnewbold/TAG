import { useState, useRef } from 'react';
import { Lock, Check, Gift, Star, Crown, ChevronLeft, ChevronRight } from 'lucide-react';

const BATTLE_PASS_TIERS = [
  { level: 1, freeReward: { type: 'xp', amount: 100, emoji: '✨' }, premiumReward: { type: 'avatar_frame', name: 'Bronze Frame', emoji: '🖼️' }, xpRequired: 0 },
  { level: 2, freeReward: { type: 'powerup', name: 'Speed Boost x1', emoji: '⚡' }, premiumReward: { type: 'emote', name: 'Wave', emoji: '👋' }, xpRequired: 200 },
  { level: 3, freeReward: { type: 'xp', amount: 150, emoji: '✨' }, premiumReward: { type: 'skin', name: 'Blue Trail', emoji: '💫' }, xpRequired: 450 },
  { level: 4, freeReward: { type: 'badge', name: 'Week 1', emoji: '🏅' }, premiumReward: { type: 'avatar', name: 'Cool Cat', emoji: '😎' }, xpRequired: 750 },
  { level: 5, freeReward: { type: 'xp', amount: 200, emoji: '✨' }, premiumReward: { type: 'powerup', name: 'Ghost x3', emoji: '👻' }, xpRequired: 1100 },
  { level: 6, freeReward: { type: 'powerup', name: 'Shield x1', emoji: '🛡️' }, premiumReward: { type: 'effect', name: 'Sparkle Tag', emoji: '✨' }, xpRequired: 1500 },
  { level: 7, freeReward: { type: 'xp', amount: 250, emoji: '✨' }, premiumReward: { type: 'title', name: 'Speed Demon', emoji: '🔥' }, xpRequired: 1950 },
  { level: 8, freeReward: { type: 'badge', name: 'Week 2', emoji: '🏅' }, premiumReward: { type: 'avatar_frame', name: 'Silver Frame', emoji: '🥈' }, xpRequired: 2450 },
  { level: 9, freeReward: { type: 'xp', amount: 300, emoji: '✨' }, premiumReward: { type: 'emote', name: 'Dance', emoji: '💃' }, xpRequired: 3000 },
  { level: 10, freeReward: { type: 'powerup', name: 'Radar x2', emoji: '📡' }, premiumReward: { type: 'skin', name: 'Gold Trail', emoji: '🌟' }, xpRequired: 3600 },
  { level: 11, freeReward: { type: 'xp', amount: 350, emoji: '✨' }, premiumReward: { type: 'powerup', name: 'Freeze x5', emoji: '❄️' }, xpRequired: 4250 },
  { level: 12, freeReward: { type: 'badge', name: 'Week 3', emoji: '🏅' }, premiumReward: { type: 'avatar', name: 'Champion', emoji: '🏆' }, xpRequired: 4950 },
  { level: 13, freeReward: { type: 'xp', amount: 400, emoji: '✨' }, premiumReward: { type: 'effect', name: 'Fire Trail', emoji: '🔥' }, xpRequired: 5700 },
  { level: 14, freeReward: { type: 'powerup', name: 'All x1', emoji: '🎁' }, premiumReward: { type: 'title', name: 'Legend', emoji: '⭐' }, xpRequired: 6500 },
  { level: 15, freeReward: { type: 'badge', name: 'Season 1', emoji: '👑' }, premiumReward: { type: 'avatar_frame', name: 'Diamond Frame', emoji: '💎' }, xpRequired: 7500 },
];

export default function BattlePass({ currentXP = 0, isPremium = false, claimedRewards = [], onClaim, onUpgrade }) {
  const scrollRef = useRef(null);
  const [selectedTier, setSelectedTier] = useState(null);

  const currentLevel = BATTLE_PASS_TIERS.findIndex(tier => currentXP < tier.xpRequired) || BATTLE_PASS_TIERS.length;
  const nextTier = BATTLE_PASS_TIERS[currentLevel] || BATTLE_PASS_TIERS[BATTLE_PASS_TIERS.length - 1];
  const progressToNext = currentLevel > 0 
    ? ((currentXP - BATTLE_PASS_TIERS[currentLevel - 1]?.xpRequired || 0) / (nextTier.xpRequired - (BATTLE_PASS_TIERS[currentLevel - 1]?.xpRequired || 0))) * 100
    : 0;

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction * 200, behavior: 'smooth' });
    }
  };

  const canClaimFree = (tier) => currentXP >= tier.xpRequired && !claimedRewards.includes(`free-${tier.level}`);
  const canClaimPremium = (tier) => isPremium && currentXP >= tier.xpRequired && !claimedRewards.includes(`premium-${tier.level}`);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-white">
            <Crown className="w-6 h-6" />
            <h2 className="font-bold text-lg">Season Pass</h2>
          </div>
          <div className="text-white/80 text-sm">
            Season 1
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1">
            <div className="flex justify-between text-white/80 text-xs mb-1">
              <span>Level {Math.min(currentLevel, 15)}</span>
              <span>{currentXP.toLocaleString()} / {nextTier.xpRequired.toLocaleString()} XP</span>
            </div>
            <div className="bg-white/20 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full h-3 transition-all"
                style={{ width: `${Math.min(progressToNext, 100)}%` }}
              />
            </div>
          </div>
          <div className="text-white font-bold text-2xl">
            {Math.min(currentLevel, 15)}
          </div>
        </div>

        {/* Premium Status */}
        {!isPremium && (
          <button
            onClick={onUpgrade}
            className="w-full py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
          >
            <Star size={18} />
            Upgrade to Premium
          </button>
        )}
      </div>

      {/* Tier Track */}
      <div className="relative p-4">
        {/* Scroll Buttons */}
        <button 
          onClick={() => scroll(-1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-slate-700 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        >
          <ChevronLeft size={20} />
        </button>
        <button 
          onClick={() => scroll(1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-slate-700 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        >
          <ChevronRight size={20} />
        </button>

        {/* Scrollable Track */}
        <div 
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-4 px-6 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {BATTLE_PASS_TIERS.map((tier) => {
            const isUnlocked = currentXP >= tier.xpRequired;
            const freeClaimed = claimedRewards.includes(`free-${tier.level}`);
            const premiumClaimed = claimedRewards.includes(`premium-${tier.level}`);

            return (
              <div 
                key={tier.level}
                className={`flex-shrink-0 w-24 ${selectedTier === tier.level ? 'scale-105' : ''} transition-transform`}
                onClick={() => setSelectedTier(tier.level)}
              >
                {/* Level indicator */}
                <div className={`text-center text-sm font-bold mb-2 ${isUnlocked ? 'text-purple-600' : 'text-slate-400'}`}>
                  Lv {tier.level}
                </div>

                {/* Free Reward */}
                <div className={`p-3 rounded-xl mb-2 text-center transition-all ${
                  isUnlocked 
                    ? freeClaimed 
                      ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400'
                      : 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-400 cursor-pointer hover:scale-105'
                    : 'bg-slate-100 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canClaimFree(tier)) onClaim?.(`free-${tier.level}`, tier.freeReward);
                }}
                >
                  <span className="text-2xl block mb-1">{tier.freeReward.emoji}</span>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                    {tier.freeReward.name || `${tier.freeReward.amount} XP`}
                  </p>
                  {freeClaimed && <Check size={14} className="mx-auto mt-1 text-green-500" />}
                </div>

                {/* Premium Reward */}
                <div className={`p-3 rounded-xl text-center relative transition-all ${
                  isPremium
                    ? isUnlocked
                      ? premiumClaimed
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400'
                        : 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-400 cursor-pointer hover:scale-105'
                      : 'bg-slate-100 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600'
                    : 'bg-slate-100 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 opacity-60'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canClaimPremium(tier)) onClaim?.(`premium-${tier.level}`, tier.premiumReward);
                }}
                >
                  {!isPremium && (
                    <Lock size={12} className="absolute top-1 right-1 text-slate-400" />
                  )}
                  <span className="text-2xl block mb-1">{tier.premiumReward.emoji}</span>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                    {tier.premiumReward.name}
                  </p>
                  {premiumClaimed && <Check size={14} className="mx-auto mt-1 text-yellow-600" />}
                </div>

                {/* XP Marker */}
                <div className="text-center mt-2 text-xs text-slate-400">
                  {tier.xpRequired.toLocaleString()} XP
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4 flex justify-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-purple-400 rounded" />
          <span>Free Track</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded" />
          <span>Premium Track</span>
        </div>
      </div>
    </div>
  );
}

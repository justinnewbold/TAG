/**
 * Battle Pass / Season Pass System Component
 * Progressive tiered rewards with free and premium tracks
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Trophy,
  Star,
  Lock,
  Unlock,
  Crown,
  Gift,
  Zap,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Sparkles,
  Gem,
  Coins,
  Award,
  Target,
  Flame,
  Shield,
  Palette,
  User,
  MapPin,
  Volume2,
  Package,
  ArrowRight,
  Info,
  Calendar,
  TrendingUp,
} from 'lucide-react';

// Reward types
const REWARD_TYPES = {
  AVATAR: { icon: User, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Avatar' },
  SKIN: { icon: Palette, color: 'text-pink-400', bg: 'bg-pink-500/20', label: 'Skin' },
  EMOTE: { icon: Sparkles, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Emote' },
  TRAIL: { icon: MapPin, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Trail' },
  SOUND: { icon: Volume2, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Sound' },
  XP_BOOST: { icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'XP Boost' },
  COINS: { icon: Coins, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Coins' },
  GEMS: { icon: Gem, color: 'text-cyan-400', bg: 'bg-cyan-500/20', label: 'Gems' },
  TITLE: { icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Title' },
  BADGE: { icon: Award, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Badge' },
  POWERUP: { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Power-up' },
  LOOT_BOX: { icon: Package, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Mystery Box' },
};

// Rarity colors
const RARITY = {
  COMMON: { color: 'border-gray-500', glow: '', label: 'Common' },
  UNCOMMON: { color: 'border-green-500', glow: 'shadow-green-500/30', label: 'Uncommon' },
  RARE: { color: 'border-blue-500', glow: 'shadow-blue-500/30', label: 'Rare' },
  EPIC: { color: 'border-purple-500', glow: 'shadow-purple-500/30', label: 'Epic' },
  LEGENDARY: { color: 'border-yellow-500', glow: 'shadow-yellow-500/50', label: 'Legendary' },
};

// Format time remaining
function formatTimeRemaining(endDate) {
  const diff = new Date(endDate) - new Date();
  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h remaining`;
}

// Single reward item component
function RewardItem({ reward, tier, isUnlocked, isClaimed, isPremium, onClaim, isCurrentTier }) {
  const rewardType = REWARD_TYPES[reward.type] || REWARD_TYPES.COINS;
  const rarity = RARITY[reward.rarity] || RARITY.COMMON;
  const RewardIcon = rewardType.icon;

  const canClaim = isUnlocked && !isClaimed;

  return (
    <div
      className={`relative p-3 rounded-xl transition-all ${
        isPremium ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10' : 'bg-gray-800/50'
      } ${isCurrentTier ? 'ring-2 ring-cyan-500' : ''} ${
        !isUnlocked ? 'opacity-50' : ''
      }`}
    >
      {/* Premium badge */}
      {isPremium && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
          <Crown className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Lock overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
      )}

      {/* Claimed checkmark */}
      {isClaimed && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Reward icon */}
      <div
        className={`w-12 h-12 mx-auto rounded-xl ${rewardType.bg} border-2 ${rarity.color} ${
          rarity.glow ? `shadow-lg ${rarity.glow}` : ''
        } flex items-center justify-center mb-2`}
      >
        {reward.icon ? (
          <span className="text-2xl">{reward.icon}</span>
        ) : (
          <RewardIcon className={`w-6 h-6 ${rewardType.color}`} />
        )}
      </div>

      {/* Reward info */}
      <div className="text-center">
        <div className="text-xs font-medium text-white truncate">{reward.name}</div>
        <div className="text-xs text-gray-500">{rewardType.label}</div>
        {reward.amount && (
          <div className={`text-sm font-bold ${rewardType.color}`}>x{reward.amount}</div>
        )}
      </div>

      {/* Claim button */}
      {canClaim && (
        <button
          onClick={() => onClaim(reward, tier)}
          className="absolute inset-0 bg-cyan-500/0 hover:bg-cyan-500/20 rounded-xl flex items-center justify-center transition-colors group"
        >
          <span className="px-2 py-1 bg-cyan-500 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            Claim
          </span>
        </button>
      )}
    </div>
  );
}

// Battle pass tier component
function BattlePassTier({ tier, currentXP, isPremium, onClaimReward }) {
  const isUnlocked = currentXP >= tier.requiredXP;
  const progress = Math.min(100, (currentXP / tier.requiredXP) * 100);

  return (
    <div className="flex flex-col items-center min-w-[100px]">
      {/* Tier number */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
          isUnlocked
            ? 'bg-gradient-to-br from-cyan-500 to-purple-500 text-white'
            : 'bg-gray-700 text-gray-400'
        }`}
      >
        <span className="font-bold">{tier.level}</span>
      </div>

      {/* XP requirement */}
      <div className="text-xs text-gray-500 mb-2">{tier.requiredXP} XP</div>

      {/* Free reward */}
      {tier.freeReward && (
        <RewardItem
          reward={tier.freeReward}
          tier={tier}
          isUnlocked={isUnlocked}
          isClaimed={tier.freeReward.claimed}
          isPremium={false}
          onClaim={onClaimReward}
          isCurrentTier={progress >= 0 && progress < 100}
        />
      )}

      {/* Premium reward */}
      {tier.premiumReward && (
        <div className="mt-2">
          <RewardItem
            reward={tier.premiumReward}
            tier={tier}
            isUnlocked={isUnlocked && isPremium}
            isClaimed={tier.premiumReward.claimed}
            isPremium={true}
            onClaim={onClaimReward}
            isCurrentTier={progress >= 0 && progress < 100}
          />
        </div>
      )}

      {/* Connection line */}
      <div className="w-full h-1 mt-3 bg-gray-700 relative">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-purple-500 transition-all"
          style={{ width: `${isUnlocked ? 100 : progress}%` }}
        />
      </div>
    </div>
  );
}

// Weekly challenges component
function WeeklyChallenges({ challenges, onChallengeClick }) {
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-white flex items-center gap-2">
        <Target className="w-5 h-5 text-cyan-400" />
        Weekly Challenges
      </h3>

      {challenges.map((challenge) => {
        const progress = Math.min(100, (challenge.current / challenge.target) * 100);
        const isComplete = challenge.current >= challenge.target;

        return (
          <button
            key={challenge.id}
            onClick={() => onChallengeClick?.(challenge)}
            className={`w-full p-3 rounded-xl text-left transition-colors ${
              isComplete
                ? 'bg-green-500/20 border border-green-500'
                : 'bg-gray-800/50 hover:bg-gray-800/80 border border-transparent'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {isComplete ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                )}
                <span className="font-medium text-white">{challenge.name}</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-sm font-bold">{challenge.xpReward}</span>
              </div>
            </div>

            <p className="text-sm text-gray-400 ml-7 mb-2">{challenge.description}</p>

            <div className="ml-7">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>
                  {challenge.current} / {challenge.target}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isComplete ? 'bg-green-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Premium upsell component
function PremiumUpsell({ onPurchase, price }) {
  return (
    <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 rounded-2xl p-6 border border-yellow-500/30">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
          <Crown className="w-8 h-8 text-white" />
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">Upgrade to Premium</h3>
          <p className="text-gray-400 text-sm mb-4">
            Unlock all premium rewards, bonus XP, and exclusive content!
          </p>

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Check className="w-4 h-4 text-green-400" />
              <span>70+ Premium Rewards</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Check className="w-4 h-4 text-green-400" />
              <span>+50% XP Boost</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Check className="w-4 h-4 text-green-400" />
              <span>Exclusive Skins</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Check className="w-4 h-4 text-green-400" />
              <span>1000 Bonus Coins</span>
            </div>
          </div>

          <button
            onClick={onPurchase}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
          >
            Upgrade for {price}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main BattlePass component
export default function BattlePass({
  seasonData,
  currentXP = 0,
  isPremium = false,
  onClaimReward,
  onPurchasePremium,
  className = '',
}) {
  const [selectedTier, setSelectedTier] = useState(null);
  const [showAllRewards, setShowAllRewards] = useState(false);
  const scrollContainerRef = useRef(null);

  // Calculate current level and progress
  const { currentLevel, levelProgress, nextLevelXP } = useMemo(() => {
    if (!seasonData?.tiers) return { currentLevel: 1, levelProgress: 0, nextLevelXP: 100 };

    let level = 1;
    let remainingXP = currentXP;

    for (const tier of seasonData.tiers) {
      if (remainingXP >= tier.requiredXP) {
        level = tier.level;
        remainingXP -= tier.requiredXP;
      } else {
        break;
      }
    }

    const currentTier = seasonData.tiers.find((t) => t.level === level);
    const nextTier = seasonData.tiers.find((t) => t.level === level + 1);

    return {
      currentLevel: level,
      levelProgress: nextTier
        ? (remainingXP / (nextTier.requiredXP - currentTier.requiredXP)) * 100
        : 100,
      nextLevelXP: nextTier?.requiredXP || currentTier?.requiredXP,
    };
  }, [currentXP, seasonData?.tiers]);

  // Scroll to current tier
  useEffect(() => {
    if (scrollContainerRef.current && seasonData?.tiers) {
      const tierWidth = 116; // min-w-[100px] + gap
      const scrollPosition = Math.max(0, (currentLevel - 2) * tierWidth);
      scrollContainerRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [currentLevel, seasonData?.tiers]);

  // Scroll left/right
  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 348; // 3 tiers
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Claim all available rewards
  const claimAllRewards = useCallback(() => {
    seasonData?.tiers?.forEach((tier) => {
      if (currentXP >= tier.requiredXP) {
        if (tier.freeReward && !tier.freeReward.claimed) {
          onClaimReward?.(tier.freeReward, tier);
        }
        if (isPremium && tier.premiumReward && !tier.premiumReward.claimed) {
          onClaimReward?.(tier.premiumReward, tier);
        }
      }
    });
  }, [seasonData?.tiers, currentXP, isPremium, onClaimReward]);

  // Count unclaimed rewards
  const unclaimedCount = useMemo(() => {
    let count = 0;
    seasonData?.tiers?.forEach((tier) => {
      if (currentXP >= tier.requiredXP) {
        if (tier.freeReward && !tier.freeReward.claimed) count++;
        if (isPremium && tier.premiumReward && !tier.premiumReward.claimed) count++;
      }
    });
    return count;
  }, [seasonData?.tiers, currentXP, isPremium]);

  if (!seasonData) {
    return (
      <div className={`bg-gray-900/95 rounded-2xl p-8 text-center ${className}`}>
        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <p className="text-gray-400">No active season</p>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/95 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="relative p-6 bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-pink-500/20">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-bold text-white">{seasonData.name}</h2>
              {isPremium && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-full">
                  PREMIUM
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">{seasonData.description}</p>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{formatTimeRemaining(seasonData.endDate)}</span>
            </div>
          </div>
        </div>

        {/* Level progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{currentLevel}</span>
              </div>
              <div>
                <div className="text-sm text-gray-400">Level {currentLevel}</div>
                <div className="text-white font-medium">{currentXP.toLocaleString()} XP</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-400">Next Level</div>
              <div className="text-white font-medium">{nextLevelXP.toLocaleString()} XP</div>
            </div>
          </div>

          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>

        {/* Claim all button */}
        {unclaimedCount > 0 && (
          <button
            onClick={claimAllRewards}
            className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors"
          >
            <Gift className="w-4 h-4" />
            Claim All ({unclaimedCount})
          </button>
        )}
      </div>

      {/* Rewards track */}
      <div className="relative p-4 border-b border-gray-700">
        {/* Scroll buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-gray-800/80 rounded-full hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-gray-800/80 rounded-full hover:bg-gray-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        {/* Track labels */}
        <div className="flex items-center gap-4 mb-4 ml-14">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-3 h-3 rounded-full bg-gray-600" />
            Free Track
          </div>
          <div className="flex items-center gap-2 text-sm text-yellow-400">
            <Crown className="w-4 h-4" />
            Premium Track
          </div>
        </div>

        {/* Tiers scroll container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-10 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {seasonData.tiers?.map((tier) => (
            <BattlePassTier
              key={tier.level}
              tier={tier}
              currentXP={currentXP}
              isPremium={isPremium}
              onClaimReward={onClaimReward}
            />
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="p-6 space-y-6">
        {/* Weekly challenges */}
        {seasonData.challenges && (
          <WeeklyChallenges challenges={seasonData.challenges} />
        )}

        {/* Premium upsell */}
        {!isPremium && (
          <PremiumUpsell
            onPurchase={onPurchasePremium}
            price={seasonData.premiumPrice || '$9.99'}
          />
        )}

        {/* Season rewards summary */}
        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
          <div>
            <div className="text-sm text-gray-400">Total Rewards Available</div>
            <div className="text-lg font-bold text-white">
              {seasonData.tiers?.length * 2} Items
            </div>
          </div>
          <button
            onClick={() => setShowAllRewards(!showAllRewards)}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View All Rewards
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for battle pass data
export function useBattlePass(userId) {
  const [seasonData, setSeasonData] = useState(null);
  const [currentXP, setCurrentXP] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadBattlePass = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/battlepass/current`);
      const data = await response.json();

      setSeasonData(data.season);
      setCurrentXP(data.userProgress?.xp || 0);
      setIsPremium(data.userProgress?.isPremium || false);
    } catch (err) {
      console.error('Failed to load battle pass:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const claimReward = useCallback(async (reward, tier) => {
    try {
      await fetch('/api/battlepass/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: reward.id, tierLevel: tier.level }),
      });
      loadBattlePass();
    } catch (err) {
      console.error('Failed to claim reward:', err);
    }
  }, [loadBattlePass]);

  const purchasePremium = useCallback(async () => {
    try {
      await fetch('/api/battlepass/purchase-premium', { method: 'POST' });
      setIsPremium(true);
    } catch (err) {
      console.error('Failed to purchase premium:', err);
    }
  }, []);

  useEffect(() => {
    loadBattlePass();
  }, [loadBattlePass]);

  return {
    seasonData,
    currentXP,
    isPremium,
    isLoading,
    claimReward,
    purchasePremium,
    refresh: loadBattlePass,
  };
}

// Generate sample battle pass data
export function generateSampleBattlePass() {
  const tiers = [];

  for (let i = 1; i <= 50; i++) {
    const tier = {
      level: i,
      requiredXP: i * 100,
      freeReward: {
        id: `free-${i}`,
        type: ['COINS', 'XP_BOOST', 'EMOTE'][i % 3],
        name: `Reward ${i}`,
        amount: i % 3 === 0 ? 100 : i % 3 === 1 ? 1 : undefined,
        icon: ['💰', '⚡', '😎'][i % 3],
        rarity: ['COMMON', 'UNCOMMON', 'RARE'][Math.floor(Math.random() * 3)],
        claimed: false,
      },
      premiumReward: {
        id: `premium-${i}`,
        type: ['SKIN', 'AVATAR', 'TRAIL', 'TITLE'][i % 4],
        name: `Premium ${i}`,
        icon: ['🎨', '👑', '✨', '🏆'][i % 4],
        rarity: ['RARE', 'EPIC', 'LEGENDARY'][Math.floor(Math.random() * 3)],
        claimed: false,
      },
    };

    tiers.push(tier);
  }

  return {
    id: 'season-1',
    name: 'Season 1: Summer Sprint',
    description: 'Race through summer with exclusive rewards!',
    startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    endDate: Date.now() + 60 * 24 * 60 * 60 * 1000,
    tiers,
    challenges: [
      {
        id: 'c1',
        name: 'Tag 50 Players',
        description: 'Tag players in any game mode',
        target: 50,
        current: 32,
        xpReward: 500,
      },
      {
        id: 'c2',
        name: 'Win 10 Games',
        description: 'Win matches in ranked or casual',
        target: 10,
        current: 7,
        xpReward: 750,
      },
      {
        id: 'c3',
        name: 'Play 20 Team Games',
        description: 'Complete team mode matches',
        target: 20,
        current: 20,
        xpReward: 400,
      },
    ],
    premiumPrice: '$9.99',
  };
}

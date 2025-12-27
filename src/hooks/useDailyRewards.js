// useDailyRewards Hook
// React hook for managing daily rewards state and interactions

import { useState, useEffect, useCallback } from 'react';
import { dailyRewardsService } from '../services/dailyRewardsService';

export function useDailyRewards() {
  const [state, setState] = useState(() => dailyRewardsService.getState());
  const [canClaim, setCanClaim] = useState(() => dailyRewardsService.canClaimToday());
  const [timeUntilNext, setTimeUntilNext] = useState(() => dailyRewardsService.getTimeUntilNextClaim());
  const [weeklyCalendar, setWeeklyCalendar] = useState(() => dailyRewardsService.getWeeklyCalendar());
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [lastClaimResult, setLastClaimResult] = useState(null);
  const [isOpeningBox, setIsOpeningBox] = useState(false);
  const [mysteryBoxResult, setMysteryBoxResult] = useState(null);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = dailyRewardsService.subscribe((newState) => {
      setState(newState);
      setCanClaim(dailyRewardsService.canClaimToday());
      setWeeklyCalendar(dailyRewardsService.getWeeklyCalendar());
    });

    return unsubscribe;
  }, []);

  // Update countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilNext(dailyRewardsService.getTimeUntilNextClaim());
      
      // Check if can claim has changed
      const newCanClaim = dailyRewardsService.canClaimToday();
      if (newCanClaim !== canClaim) {
        setCanClaim(newCanClaim);
        setState(dailyRewardsService.getState());
        setWeeklyCalendar(dailyRewardsService.getWeeklyCalendar());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [canClaim]);

  // Claim daily reward
  const claimDailyReward = useCallback(async () => {
    if (isClaimingReward || !canClaim) return null;
    
    setIsClaimingReward(true);
    
    // Simulate a small delay for animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = dailyRewardsService.claimDailyReward();
    setLastClaimResult(result);
    setIsClaimingReward(false);
    
    return result;
  }, [isClaimingReward, canClaim]);

  // Claim bonus
  const claimBonus = useCallback((bonusType) => {
    return dailyRewardsService.claimBonus(bonusType);
  }, []);

  // Open mystery box
  const openMysteryBox = useCallback(async () => {
    if (isOpeningBox || !state.mysteryBoxAvailable) return null;
    
    setIsOpeningBox(true);
    
    // Simulate animation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const result = dailyRewardsService.openMysteryBox();
    setMysteryBoxResult(result);
    setIsOpeningBox(false);
    
    return result;
  }, [isOpeningBox, state.mysteryBoxAvailable]);

  // Check if bonus is available
  const isBonusAvailable = useCallback((bonusType) => {
    return !state.bonusesClaimedToday.includes(bonusType);
  }, [state.bonusesClaimedToday]);

  // Spend coins
  const spendCoins = useCallback((amount) => {
    return dailyRewardsService.spendCoins(amount);
  }, []);

  // Clear last claim result
  const clearClaimResult = useCallback(() => {
    setLastClaimResult(null);
  }, []);

  // Clear mystery box result
  const clearMysteryBoxResult = useCallback(() => {
    setMysteryBoxResult(null);
  }, []);

  // Get streak info
  const getStreakInfo = useCallback(() => {
    const isStreakBroken = dailyRewardsService.isStreakBroken();
    const nextReward = dailyRewardsService.getRewardForStreak(state.currentStreak + 1);
    
    return {
      currentStreak: state.currentStreak,
      longestStreak: state.longestStreak,
      isStreakBroken,
      nextReward,
      streakAtRisk: isStreakBroken,
    };
  }, [state.currentStreak, state.longestStreak]);

  return {
    // State
    coins: state.coins,
    xp: state.xp,
    currentStreak: state.currentStreak,
    longestStreak: state.longestStreak,
    totalDaysClaimed: state.totalDaysClaimed,
    unlockedBadges: state.unlockedBadges,
    mysteryBoxAvailable: state.mysteryBoxAvailable,
    weeklyProgress: state.weeklyProgress,
    powerups: state.powerups,
    
    // Computed
    canClaim,
    timeUntilNext,
    weeklyCalendar,
    streakInfo: getStreakInfo(),
    
    // Loading states
    isClaimingReward,
    isOpeningBox,
    
    // Results
    lastClaimResult,
    mysteryBoxResult,
    
    // Actions
    claimDailyReward,
    claimBonus,
    openMysteryBox,
    isBonusAvailable,
    spendCoins,
    clearClaimResult,
    clearMysteryBoxResult,
  };
}

export default useDailyRewards;

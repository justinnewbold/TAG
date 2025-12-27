// Daily Rewards & Streak Service
// Manages daily login rewards, streak tracking, and reward claiming

export const STREAK_REWARDS = {
  1: { coins: 10, xp: 50, badge: null },
  2: { coins: 15, xp: 75, badge: null },
  3: { coins: 20, xp: 100, badge: null },
  4: { coins: 30, xp: 150, badge: null },
  5: { coins: 50, xp: 200, badge: null },
  6: { coins: 75, xp: 300, badge: null },
  7: { coins: 100, xp: 500, badge: 'weekly_warrior' },
  14: { coins: 200, xp: 1000, badge: 'fortnight_fanatic' },
  30: { coins: 500, xp: 2500, badge: 'monthly_master' },
  60: { coins: 1000, xp: 5000, badge: 'dedication_deity' },
  100: { coins: 2000, xp: 10000, badge: 'legendary_loyal' },
};

export const BONUS_REWARDS = {
  first_game_of_day: { coins: 25, xp: 100 },
  win_of_day: { coins: 50, xp: 200 },
  three_games_day: { coins: 40, xp: 150 },
  five_tags_day: { coins: 30, xp: 100 },
  invite_friend: { coins: 100, xp: 500 },
};

export const MYSTERY_BOX_CONTENTS = [
  { type: 'coins', amount: 50, probability: 0.3, label: '50 Coins' },
  { type: 'coins', amount: 100, probability: 0.2, label: '100 Coins' },
  { type: 'coins', amount: 250, probability: 0.1, label: '250 Coins' },
  { type: 'xp', amount: 200, probability: 0.25, label: '200 XP' },
  { type: 'xp', amount: 500, probability: 0.1, label: '500 XP' },
  { type: 'powerup', item: 'speed_boost', probability: 0.03, label: 'Speed Boost' },
  { type: 'powerup', item: 'invisibility', probability: 0.02, label: 'Invisibility Cloak' },
];

class DailyRewardsService {
  constructor() {
    this.storageKey = 'tag_daily_rewards';
    this.listeners = [];
  }

  // Get current rewards state from storage
  getState() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load daily rewards state:', e);
    }
    
    return {
      lastClaimDate: null,
      currentStreak: 0,
      longestStreak: 0,
      totalDaysClaimed: 0,
      totalCoinsEarned: 0,
      totalXpEarned: 0,
      unlockedBadges: [],
      bonusesClaimedToday: [],
      mysteryBoxAvailable: false,
      weeklyProgress: 0, // Days claimed this week (0-7)
      coins: 0,
      xp: 0,
      powerups: [],
    };
  }

  // Save state to storage
  saveState(state) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
      this.notifyListeners(state);
    } catch (e) {
      console.warn('Failed to save daily rewards state:', e);
    }
  }

  // Check if user can claim daily reward
  canClaimToday() {
    const state = this.getState();
    if (!state.lastClaimDate) return true;
    
    const lastClaim = new Date(state.lastClaimDate);
    const today = new Date();
    
    // Reset at midnight local time
    const lastClaimDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return todayDay > lastClaimDay;
  }

  // Check if streak is broken (missed a day)
  isStreakBroken() {
    const state = this.getState();
    if (!state.lastClaimDate) return false;
    
    const lastClaim = new Date(state.lastClaimDate);
    const today = new Date();
    
    const lastClaimDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const diffTime = todayDay - lastClaimDay;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    return diffDays > 1;
  }

  // Get reward for current streak
  getRewardForStreak(streak) {
    // Find the highest reward tier the user qualifies for
    const tiers = Object.keys(STREAK_REWARDS)
      .map(Number)
      .sort((a, b) => a - b);
    
    // Get the cyclic day (1-7 for weekly cycle after day 7)
    let effectiveDay = streak;
    if (streak > 7) {
      effectiveDay = ((streak - 1) % 7) + 1;
    }
    
    // Check for milestone rewards
    if (STREAK_REWARDS[streak]) {
      return { ...STREAK_REWARDS[streak], isMilestone: true, day: streak };
    }
    
    // Regular weekly cycle reward
    return { 
      ...STREAK_REWARDS[effectiveDay] || STREAK_REWARDS[1], 
      isMilestone: false, 
      day: effectiveDay 
    };
  }

  // Claim daily reward
  claimDailyReward() {
    if (!this.canClaimToday()) {
      return { success: false, error: 'Already claimed today' };
    }

    const state = this.getState();
    const isStreakBroken = this.isStreakBroken();
    
    // Calculate new streak
    let newStreak = isStreakBroken ? 1 : state.currentStreak + 1;
    
    // Get reward for this day
    const reward = this.getRewardForStreak(newStreak);
    
    // Check for mystery box (every 7 days or on milestones)
    const mysteryBoxEarned = newStreak % 7 === 0 || reward.isMilestone;
    
    // Update state
    const newState = {
      ...state,
      lastClaimDate: new Date().toISOString(),
      currentStreak: newStreak,
      longestStreak: Math.max(state.longestStreak, newStreak),
      totalDaysClaimed: state.totalDaysClaimed + 1,
      totalCoinsEarned: state.totalCoinsEarned + reward.coins,
      totalXpEarned: state.totalXpEarned + reward.xp,
      coins: state.coins + reward.coins,
      xp: state.xp + reward.xp,
      bonusesClaimedToday: [], // Reset daily bonuses
      weeklyProgress: (state.weeklyProgress % 7) + 1,
      mysteryBoxAvailable: mysteryBoxEarned || state.mysteryBoxAvailable,
    };
    
    // Add badge if earned
    if (reward.badge && !state.unlockedBadges.includes(reward.badge)) {
      newState.unlockedBadges = [...state.unlockedBadges, reward.badge];
    }
    
    this.saveState(newState);
    
    return {
      success: true,
      reward,
      newStreak,
      streakBroken: isStreakBroken,
      mysteryBoxEarned,
      badgeEarned: reward.badge && !state.unlockedBadges.includes(reward.badge) ? reward.badge : null,
    };
  }

  // Claim bonus reward
  claimBonus(bonusType) {
    const state = this.getState();
    
    if (state.bonusesClaimedToday.includes(bonusType)) {
      return { success: false, error: 'Bonus already claimed today' };
    }
    
    const bonus = BONUS_REWARDS[bonusType];
    if (!bonus) {
      return { success: false, error: 'Invalid bonus type' };
    }
    
    const newState = {
      ...state,
      coins: state.coins + bonus.coins,
      xp: state.xp + bonus.xp,
      totalCoinsEarned: state.totalCoinsEarned + bonus.coins,
      totalXpEarned: state.totalXpEarned + bonus.xp,
      bonusesClaimedToday: [...state.bonusesClaimedToday, bonusType],
    };
    
    this.saveState(newState);
    
    return { success: true, bonus };
  }

  // Open mystery box
  openMysteryBox() {
    const state = this.getState();
    
    if (!state.mysteryBoxAvailable) {
      return { success: false, error: 'No mystery box available' };
    }
    
    // Random selection based on probability
    const roll = Math.random();
    let cumulative = 0;
    let selectedReward = MYSTERY_BOX_CONTENTS[0];
    
    for (const item of MYSTERY_BOX_CONTENTS) {
      cumulative += item.probability;
      if (roll <= cumulative) {
        selectedReward = item;
        break;
      }
    }
    
    const newState = {
      ...state,
      mysteryBoxAvailable: false,
    };
    
    // Apply reward
    if (selectedReward.type === 'coins') {
      newState.coins = state.coins + selectedReward.amount;
      newState.totalCoinsEarned = state.totalCoinsEarned + selectedReward.amount;
    } else if (selectedReward.type === 'xp') {
      newState.xp = state.xp + selectedReward.amount;
      newState.totalXpEarned = state.totalXpEarned + selectedReward.amount;
    } else if (selectedReward.type === 'powerup') {
      newState.powerups = [...state.powerups, selectedReward.item];
    }
    
    this.saveState(newState);
    
    return { success: true, reward: selectedReward };
  }

  // Get time until next claim
  getTimeUntilNextClaim() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const diff = tomorrow - now;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds, total: diff };
  }

  // Get weekly calendar view data
  getWeeklyCalendar() {
    const state = this.getState();
    const days = [];
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    for (let i = 0; i < 7; i++) {
      const dayNum = i + 1;
      const reward = STREAK_REWARDS[dayNum];
      const isClaimed = i < state.weeklyProgress;
      const isToday = i === state.weeklyProgress && this.canClaimToday();
      const isLocked = i > state.weeklyProgress;
      
      days.push({
        day: dayNum,
        dayName: dayNames[i],
        reward,
        isClaimed,
        isToday,
        isLocked,
      });
    }
    
    return days;
  }

  // Subscribe to state changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(state) {
    this.listeners.forEach(callback => callback(state));
  }

  // Spend coins
  spendCoins(amount) {
    const state = this.getState();
    if (state.coins < amount) {
      return { success: false, error: 'Not enough coins' };
    }
    
    const newState = {
      ...state,
      coins: state.coins - amount,
    };
    
    this.saveState(newState);
    return { success: true, newBalance: newState.coins };
  }
}

export const dailyRewardsService = new DailyRewardsService();
export default dailyRewardsService;

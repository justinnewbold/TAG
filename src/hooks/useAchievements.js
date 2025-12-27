import { useState, useEffect, useCallback } from 'react';
import { achievementService, ACHIEVEMENT_CATEGORIES, BADGE_RARITY } from '../services/achievementService';

/**
 * Custom hook for managing achievements and badges
 * Provides reactive state updates and tracking methods
 */
export function useAchievements() {
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState({ total: 0, unlocked: 0, percentage: 0, totalXP: 0 });
  const [recentUnlock, setRecentUnlock] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load achievements on mount
  useEffect(() => {
    const loadAchievements = () => {
      setAchievements(achievementService.getAllAchievements());
      setStats(achievementService.getStats());
      setLoading(false);
    };

    loadAchievements();

    // Subscribe to achievement updates
    const unsubscribe = achievementService.subscribe((event) => {
      if (event.type === 'unlock') {
        setRecentUnlock(event.achievement);
        setAchievements(achievementService.getAllAchievements());
        setStats(achievementService.getStats());
        
        // Clear recent unlock after animation
        setTimeout(() => setRecentUnlock(null), 5000);
      }
    });

    return unsubscribe;
  }, []);

  // Get achievements by category
  const getByCategory = useCallback((category) => {
    return achievements.filter(a => a.category === category);
  }, [achievements]);

  // Get unlocked achievements
  const getUnlocked = useCallback(() => {
    return achievements.filter(a => a.unlocked);
  }, [achievements]);

  // Get locked achievements (excluding hidden)
  const getLocked = useCallback(() => {
    return achievements.filter(a => !a.unlocked && !a.hidden);
  }, [achievements]);

  // Get achievements by rarity
  const getByRarity = useCallback((rarity) => {
    return achievements.filter(a => a.rarity.name === rarity.name);
  }, [achievements]);

  // Get recently unlocked achievements
  const getRecent = useCallback((count = 5) => {
    return getUnlocked()
      .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
      .slice(0, count);
  }, [getUnlocked]);

  // Get closest to completion
  const getAlmostComplete = useCallback((count = 3) => {
    return achievements
      .filter(a => !a.unlocked && !a.hidden && a.progress > 0)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, count);
  }, [achievements]);

  // Track game events
  const trackTag = useCallback((context = {}) => {
    return achievementService.trackTag(context);
  }, []);

  const trackWin = useCallback((context = {}) => {
    return achievementService.trackWin(context);
  }, []);

  const trackSurvival = useCallback((minutes) => {
    return achievementService.trackSurvival(minutes);
  }, []);

  const trackFriend = useCallback(() => {
    return achievementService.trackFriend();
  }, []);

  const trackDistance = useCallback((km) => {
    return achievementService.trackDistance(km);
  }, []);

  // Dismiss recent unlock notification
  const dismissUnlock = useCallback(() => {
    setRecentUnlock(null);
  }, []);

  // Get category display info
  const getCategoryInfo = useCallback((category) => {
    const categoryAchievements = getByCategory(category);
    const unlocked = categoryAchievements.filter(a => a.unlocked).length;
    const total = categoryAchievements.length;
    
    const categoryLabels = {
      [ACHIEVEMENT_CATEGORIES.TAGGING]: { label: 'Tagging', icon: '🏷️', color: '#EF4444' },
      [ACHIEVEMENT_CATEGORIES.SURVIVAL]: { label: 'Survival', icon: '🏃', color: '#22C55E' },
      [ACHIEVEMENT_CATEGORIES.SOCIAL]: { label: 'Social', icon: '👥', color: '#3B82F6' },
      [ACHIEVEMENT_CATEGORIES.EXPLORATION]: { label: 'Exploration', icon: '🗺️', color: '#F59E0B' },
      [ACHIEVEMENT_CATEGORIES.MASTERY]: { label: 'Mastery', icon: '🎮', color: '#A855F7' },
      [ACHIEVEMENT_CATEGORIES.SEASONAL]: { label: 'Seasonal', icon: '🌟', color: '#EC4899' },
      [ACHIEVEMENT_CATEGORIES.SECRET]: { label: 'Secret', icon: '🔮', color: '#6366F1' }
    };

    return {
      ...categoryLabels[category],
      unlocked,
      total,
      percentage: Math.round((unlocked / total) * 100) || 0
    };
  }, [getByCategory]);

  // Get all category stats
  const getAllCategoryStats = useCallback(() => {
    return Object.values(ACHIEVEMENT_CATEGORIES).map(category => ({
      category,
      ...getCategoryInfo(category)
    }));
  }, [getCategoryInfo]);

  return {
    // State
    achievements,
    stats,
    recentUnlock,
    loading,
    
    // Getters
    getByCategory,
    getUnlocked,
    getLocked,
    getByRarity,
    getRecent,
    getAlmostComplete,
    getCategoryInfo,
    getAllCategoryStats,
    
    // Trackers
    trackTag,
    trackWin,
    trackSurvival,
    trackFriend,
    trackDistance,
    
    // Actions
    dismissUnlock,
    
    // Constants
    categories: ACHIEVEMENT_CATEGORIES,
    rarities: BADGE_RARITY
  };
}

export default useAchievements;

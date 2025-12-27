// useSeason Hook - React hook for season leaderboard functionality
import { useState, useEffect, useCallback } from 'react';
import { seasonService, RANK_TIERS, SEASON_REWARDS } from '../services/seasonService';
import { supabase } from '../services/supabase';

export function useSeason(playerId) {
  const [season, setSeason] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerRank, setPlayerRank] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize season service
  useEffect(() => {
    const initSeason = async () => {
      try {
        await seasonService.initialize(supabase);
        setSeason(seasonService.currentSeason);
        setTimeRemaining(seasonService.getSeasonTimeRemaining());
      } catch (err) {
        console.error('Failed to initialize season:', err);
        setError(err.message);
      }
    };

    initSeason();
  }, []);

  // Subscribe to season events
  useEffect(() => {
    const unsubscribe = seasonService.subscribe((event, data) => {
      switch (event) {
        case 'timerUpdate':
          setTimeRemaining(data);
          break;
        case 'statsUpdated':
          if (data.playerId === playerId) {
            setPlayerRank(prev => ({
              ...prev,
              ...data.stats,
              tier: seasonService.getRankTier(data.stats.points),
            }));
          }
          break;
        case 'seasonEnded':
          setSeason(null);
          // Trigger reload of new season
          setTimeout(() => {
            setSeason(seasonService.currentSeason);
          }, 1000);
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, [playerId]);

  // Load leaderboard
  const loadLeaderboard = useCallback(async (limit = 50) => {
    setLoading(true);
    try {
      const data = await seasonService.getLeaderboard('season', limit);
      setLeaderboard(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load player rank
  const loadPlayerRank = useCallback(async () => {
    if (!playerId) return;
    
    try {
      const rank = await seasonService.getPlayerRank(playerId);
      setPlayerRank(rank);
    } catch (err) {
      console.error('Failed to load player rank:', err);
    }
  }, [playerId]);

  // Initial data load
  useEffect(() => {
    loadLeaderboard();
    if (playerId) {
      loadPlayerRank();
    }
  }, [loadLeaderboard, loadPlayerRank, playerId]);

  // Update player stats after game
  const updateStats = useCallback(async (gameStats) => {
    if (!playerId) return null;
    
    try {
      const newStats = await seasonService.updatePlayerStats(playerId, gameStats);
      setPlayerRank({
        ...newStats,
        tier: seasonService.getRankTier(newStats.points),
      });
      // Refresh leaderboard
      await loadLeaderboard();
      return newStats;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [playerId, loadLeaderboard]);

  // Get rank tier info
  const getRankTier = useCallback((points) => {
    return seasonService.getRankTier(points);
  }, []);

  // Get rewards preview
  const getRewardsPreview = useCallback((points) => {
    return seasonService.calculateSeasonRewards(points);
  }, []);

  // Format time remaining
  const formatTimeRemaining = useCallback(() => {
    if (!timeRemaining || timeRemaining.expired) {
      return 'Season Ended';
    }
    
    const { days, hours, minutes } = timeRemaining;
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  }, [timeRemaining]);

  // Check if near promotion
  const getPromotionProgress = useCallback(() => {
    if (!playerRank?.points) return null;

    const currentTier = seasonService.getRankTier(playerRank.points);
    const tierKeys = Object.keys(RANK_TIERS);
    const currentIndex = tierKeys.indexOf(currentTier.tier);
    
    if (currentIndex >= tierKeys.length - 1) {
      return { atMax: true, progress: 100 };
    }

    const nextTier = RANK_TIERS[tierKeys[currentIndex + 1]];
    const pointsInTier = playerRank.points - currentTier.min;
    const tierRange = currentTier.max - currentTier.min;
    const progress = Math.min(100, (pointsInTier / tierRange) * 100);

    return {
      currentTier,
      nextTier: { tier: tierKeys[currentIndex + 1], ...nextTier },
      progress,
      pointsToNext: nextTier.min - playerRank.points,
    };
  }, [playerRank]);

  return {
    // State
    season,
    leaderboard,
    playerRank,
    timeRemaining,
    loading,
    error,
    
    // Actions
    loadLeaderboard,
    loadPlayerRank,
    updateStats,
    
    // Utilities
    getRankTier,
    getRewardsPreview,
    formatTimeRemaining,
    getPromotionProgress,
    
    // Constants
    RANK_TIERS,
    SEASON_REWARDS,
  };
}

export default useSeason;

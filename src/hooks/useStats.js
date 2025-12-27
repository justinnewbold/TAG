// useStats - Custom hook for player statistics management
import { useState, useEffect, useCallback } from 'react';
import statsService from '../services/statsService';

export function useStats() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Load analytics on mount
  useEffect(() => {
    refreshAnalytics();
  }, []);

  const refreshAnalytics = useCallback(() => {
    setIsLoading(true);
    try {
      const data = statsService.getAnalytics();
      setAnalytics(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Game lifecycle methods
  const startGameTracking = useCallback((gameMode, players = []) => {
    statsService.startGame(gameMode, players);
  }, []);

  const recordTag = useCallback((taggerId, taggedId, isUserTagger) => {
    statsService.recordTag(taggerId, taggedId, isUserTagger);
    refreshAnalytics();
  }, [refreshAnalytics]);

  const recordPosition = useCallback((lat, lng) => {
    statsService.recordPosition(lat, lng);
  }, []);

  const recordPowerup = useCallback((powerupType, collected = false, used = false) => {
    statsService.recordPowerup(powerupType, collected, used);
    refreshAnalytics();
  }, [refreshAnalytics]);

  const endGameTracking = useCallback((result, gameMode) => {
    const gameRecord = statsService.endGame(result, gameMode);
    refreshAnalytics();
    return gameRecord;
  }, [refreshAnalytics]);

  // Data management
  const resetStats = useCallback(() => {
    statsService.resetStats();
    refreshAnalytics();
  }, [refreshAnalytics]);

  const exportStats = useCallback(() => {
    return statsService.exportStats();
  }, []);

  const importStats = useCallback((jsonString) => {
    const success = statsService.importStats(jsonString);
    if (success) {
      refreshAnalytics();
    }
    return success;
  }, [refreshAnalytics]);

  // Computed values for easy access
  const overview = analytics?.overview || {};
  const performance = analytics?.performance || {};
  const records = analytics?.records || {};
  const recentGames = analytics?.recentGames || [];
  const recentForm = analytics?.recentForm || { wins: 0, losses: 0, draws: 0, form: [] };
  const gameModes = analytics?.gameModes || {};
  const powerups = analytics?.powerups || {};
  const activity = analytics?.activity || {};

  return {
    // State
    analytics,
    isLoading,
    lastRefresh,
    
    // Computed values
    overview,
    performance,
    records,
    recentGames,
    recentForm,
    gameModes,
    powerups,
    activity,
    
    // Actions
    refreshAnalytics,
    startGameTracking,
    recordTag,
    recordPosition,
    recordPowerup,
    endGameTracking,
    resetStats,
    exportStats,
    importStats
  };
}

export default useStats;

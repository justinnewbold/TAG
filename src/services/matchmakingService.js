/**
 * Matchmaking Service
 * Phase 6: Auto-matchmaking, skill-based matching, location-based finding
 */

import { api } from './api';
import { socketService } from './socket';

// Matchmaking status
export const MatchmakingStatus = {
  IDLE: 'idle',
  SEARCHING: 'searching',
  FOUND: 'found',
  CONFIRMING: 'confirming',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
};

// Matchmaking preferences
export const MatchmakingPreference = {
  ANY_MODE: 'any',
  CLASSIC: 'classic',
  FREEZE_TAG: 'freezeTag',
  INFECTION: 'infection',
  TEAM_TAG: 'teamTag',
};

class MatchmakingService {
  constructor() {
    this.status = MatchmakingStatus.IDLE;
    this.queueId = null;
    this.estimatedWaitTime = null;
    this.playersInQueue = 0;
    this.statusCallbacks = [];
    this.matchFoundCallbacks = [];
    this.searchStartTime = null;

    this.setupSocketListeners();
  }

  /**
   * Set up socket listeners for matchmaking events
   */
  setupSocketListeners() {
    if (typeof window !== 'undefined') {
      socketService.on('matchmaking:status', (data) => {
        this.handleStatusUpdate(data);
      });

      socketService.on('matchmaking:found', (data) => {
        this.handleMatchFound(data);
      });

      socketService.on('matchmaking:cancelled', () => {
        this.handleCancelled();
      });

      socketService.on('matchmaking:timeout', () => {
        this.handleTimeout();
      });
    }
  }

  /**
   * Join matchmaking queue
   */
  async joinQueue(preferences = {}) {
    const {
      mode = MatchmakingPreference.ANY_MODE,
      maxDistance = 5000, // meters
      skillRange = 200, // ELO range
      minPlayers = 2,
      maxPlayers = 10,
    } = preferences;

    try {
      const result = await api.request('/matchmaking/join', {
        method: 'POST',
        body: JSON.stringify({
          mode,
          maxDistance,
          skillRange,
          minPlayers,
          maxPlayers,
        }),
      });

      if (result.success) {
        this.queueId = result.queueId;
        this.status = MatchmakingStatus.SEARCHING;
        this.searchStartTime = Date.now();
        this.estimatedWaitTime = result.estimatedWaitTime;
        this.playersInQueue = result.playersInQueue;

        // Emit socket event to join matchmaking room
        socketService.emit('matchmaking:join', { queueId: this.queueId });

        this.notifyStatusChange();
      }

      return result;
    } catch (error) {
      console.error('Failed to join matchmaking queue:', error);
      this.status = MatchmakingStatus.FAILED;
      this.notifyStatusChange();
      throw error;
    }
  }

  /**
   * Leave matchmaking queue
   */
  async leaveQueue() {
    if (!this.queueId) return;

    try {
      await api.request('/matchmaking/leave', {
        method: 'POST',
        body: JSON.stringify({ queueId: this.queueId }),
      });

      socketService.emit('matchmaking:leave', { queueId: this.queueId });

      this.reset();
    } catch (error) {
      console.error('Failed to leave matchmaking queue:', error);
    }
  }

  /**
   * Confirm match acceptance
   */
  async confirmMatch(matchId) {
    try {
      const result = await api.request('/matchmaking/confirm', {
        method: 'POST',
        body: JSON.stringify({ matchId }),
      });

      return result;
    } catch (error) {
      console.error('Failed to confirm match:', error);
      throw error;
    }
  }

  /**
   * Decline match
   */
  async declineMatch(matchId) {
    try {
      await api.request('/matchmaking/decline', {
        method: 'POST',
        body: JSON.stringify({ matchId }),
      });

      this.status = MatchmakingStatus.SEARCHING;
      this.notifyStatusChange();
    } catch (error) {
      console.error('Failed to decline match:', error);
    }
  }

  /**
   * Get current queue status
   */
  async getQueueStatus() {
    try {
      const result = await api.request('/matchmaking/status');
      this.estimatedWaitTime = result.estimatedWaitTime;
      this.playersInQueue = result.playersInQueue;
      return result;
    } catch (error) {
      console.error('Failed to get queue status:', error);
      throw error;
    }
  }

  /**
   * Get estimated wait time
   */
  getEstimatedWaitTime() {
    if (!this.estimatedWaitTime) return null;

    const minutes = Math.ceil(this.estimatedWaitTime / 60000);
    if (minutes < 1) return 'Less than 1 minute';
    if (minutes === 1) return '~1 minute';
    return `~${minutes} minutes`;
  }

  /**
   * Get actual time in queue
   */
  getTimeInQueue() {
    if (!this.searchStartTime) return 0;
    return Date.now() - this.searchStartTime;
  }

  /**
   * Format time in queue for display
   */
  getFormattedTimeInQueue() {
    const ms = this.getTimeInQueue();
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `0:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Handle status update from socket
   */
  handleStatusUpdate(data) {
    this.estimatedWaitTime = data.estimatedWaitTime;
    this.playersInQueue = data.playersInQueue;
    this.notifyStatusChange();
  }

  /**
   * Handle match found event
   */
  handleMatchFound(data) {
    this.status = MatchmakingStatus.FOUND;
    this.matchFoundCallbacks.forEach(cb => cb(data));
    this.notifyStatusChange();
  }

  /**
   * Handle cancelled event
   */
  handleCancelled() {
    this.reset();
    this.notifyStatusChange();
  }

  /**
   * Handle timeout event
   */
  handleTimeout() {
    this.status = MatchmakingStatus.TIMEOUT;
    this.notifyStatusChange();
  }

  /**
   * Register for status changes
   */
  onStatusChange(callback) {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) this.statusCallbacks.splice(index, 1);
    };
  }

  /**
   * Register for match found events
   */
  onMatchFound(callback) {
    this.matchFoundCallbacks.push(callback);
    return () => {
      const index = this.matchFoundCallbacks.indexOf(callback);
      if (index > -1) this.matchFoundCallbacks.splice(index, 1);
    };
  }

  /**
   * Notify all status callbacks
   */
  notifyStatusChange() {
    const statusData = {
      status: this.status,
      queueId: this.queueId,
      estimatedWaitTime: this.estimatedWaitTime,
      playersInQueue: this.playersInQueue,
      timeInQueue: this.getTimeInQueue(),
    };
    this.statusCallbacks.forEach(cb => cb(statusData));
  }

  /**
   * Reset matchmaking state
   */
  reset() {
    this.status = MatchmakingStatus.IDLE;
    this.queueId = null;
    this.estimatedWaitTime = null;
    this.searchStartTime = null;
    this.playersInQueue = 0;
  }

  /**
   * Check if currently in queue
   */
  isInQueue() {
    return this.status === MatchmakingStatus.SEARCHING;
  }

  /**
   * Get skill rating display
   */
  getSkillTier(rating) {
    if (rating >= 2000) return { name: 'Legend', icon: '🏆', color: 'text-yellow-400' };
    if (rating >= 1800) return { name: 'Diamond', icon: '💎', color: 'text-blue-300' };
    if (rating >= 1600) return { name: 'Platinum', icon: '🥈', color: 'text-gray-300' };
    if (rating >= 1400) return { name: 'Gold', icon: '🥇', color: 'text-yellow-500' };
    if (rating >= 1200) return { name: 'Silver', icon: '🥈', color: 'text-gray-400' };
    if (rating >= 1000) return { name: 'Bronze', icon: '🥉', color: 'text-amber-600' };
    return { name: 'Beginner', icon: '🌱', color: 'text-green-400' };
  }
}

// Singleton instance
export const matchmakingService = new MatchmakingService();
export default matchmakingService;

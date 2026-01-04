/**
 * Replay Service
 * Phase 6: Game replay recording and playback
 */

import { api } from './api';
import { cacheService, CacheTTL } from './cacheService';

// Replay event types
export const ReplayEventType = {
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  PLAYER_JOIN: 'player_join',
  PLAYER_LEAVE: 'player_leave',
  TAG: 'tag',
  POSITION_UPDATE: 'position_update',
  POWERUP_SPAWN: 'powerup_spawn',
  POWERUP_PICKUP: 'powerup_pickup',
  POWERUP_USE: 'powerup_use',
  ZONE_CHANGE: 'zone_change',
  CHAT_MESSAGE: 'chat_message',
};

// Playback speeds
export const PlaybackSpeed = {
  SLOW: 0.5,
  NORMAL: 1,
  FAST: 2,
  SUPER_FAST: 4,
};

class ReplayService {
  constructor() {
    this.cache = cacheService;
    this.currentReplay = null;
    this.isRecording = false;
    this.recordedEvents = [];
    this.playbackState = {
      isPlaying: false,
      currentTime: 0,
      speed: PlaybackSpeed.NORMAL,
      duration: 0,
    };
    this.playbackInterval = null;
    this.eventListeners = new Map();
  }

  /**
   * Start recording a game
   */
  startRecording(gameId, gameData) {
    this.isRecording = true;
    this.recordedEvents = [];
    this.addEvent(ReplayEventType.GAME_START, {
      gameId,
      gameData,
      timestamp: Date.now(),
    });
    return true;
  }

  /**
   * Stop recording
   */
  stopRecording() {
    if (!this.isRecording) return null;

    this.isRecording = false;
    this.addEvent(ReplayEventType.GAME_END, {
      timestamp: Date.now(),
    });

    return this.recordedEvents;
  }

  /**
   * Add an event to the recording
   */
  addEvent(type, data) {
    if (!this.isRecording) return;

    const event = {
      type,
      data,
      timestamp: Date.now(),
      index: this.recordedEvents.length,
    };

    this.recordedEvents.push(event);
    return event;
  }

  /**
   * Record a position update (sampled to reduce data)
   */
  recordPosition(playerId, position) {
    // Only record position updates every 500ms per player
    const lastEvent = this.recordedEvents
      .filter(e => e.type === ReplayEventType.POSITION_UPDATE && e.data.playerId === playerId)
      .pop();

    if (lastEvent && Date.now() - lastEvent.timestamp < 500) {
      return;
    }

    this.addEvent(ReplayEventType.POSITION_UPDATE, {
      playerId,
      position,
    });
  }

  /**
   * Record a tag event
   */
  recordTag(taggerId, taggedId, position) {
    this.addEvent(ReplayEventType.TAG, {
      taggerId,
      taggedId,
      position,
    });
  }

  /**
   * Save replay to server
   */
  async saveReplay(gameId, metadata = {}) {
    if (this.recordedEvents.length === 0) {
      throw new Error('No replay data to save');
    }

    try {
      // Compress events for storage
      const compressedEvents = this.compressEvents(this.recordedEvents);

      const data = await api.request('/replays', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          events: compressedEvents,
          duration: this.calculateDuration(),
          metadata,
        }),
      });

      return data;
    } catch (error) {
      console.error('Failed to save replay:', error);
      throw error;
    }
  }

  /**
   * Load a replay from server
   */
  async loadReplay(replayId) {
    const cacheKey = `replay_${replayId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.currentReplay = cached;
      return cached;
    }

    try {
      const data = await api.request(`/replays/${replayId}`);

      // Decompress events
      const events = this.decompressEvents(data.events);

      this.currentReplay = {
        ...data,
        events,
      };

      // Cache for future viewing
      await this.cache.set(cacheKey, this.currentReplay, CacheTTL.LONG);

      return this.currentReplay;
    } catch (error) {
      console.error('Failed to load replay:', error);
      throw error;
    }
  }

  /**
   * Get user's replays
   */
  async getUserReplays(limit = 20, offset = 0) {
    try {
      const data = await api.request(`/replays?limit=${limit}&offset=${offset}`);
      return data;
    } catch (error) {
      console.error('Failed to fetch replays:', error);
      throw error;
    }
  }

  /**
   * Delete a replay
   */
  async deleteReplay(replayId) {
    try {
      await api.request(`/replays/${replayId}`, {
        method: 'DELETE',
      });
      await this.cache.remove(`replay_${replayId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete replay:', error);
      throw error;
    }
  }

  /**
   * Start playback
   */
  startPlayback(onEvent) {
    if (!this.currentReplay || this.playbackState.isPlaying) {
      return false;
    }

    const events = this.currentReplay.events;
    if (!events || events.length === 0) return false;

    const startTime = events[0].timestamp;
    const endTime = events[events.length - 1].timestamp;

    this.playbackState = {
      isPlaying: true,
      currentTime: 0,
      speed: this.playbackState.speed,
      duration: endTime - startTime,
      startTime,
    };

    let lastEventIndex = 0;

    this.playbackInterval = setInterval(() => {
      if (!this.playbackState.isPlaying) {
        this.stopPlayback();
        return;
      }

      // Advance time
      this.playbackState.currentTime += 16 * this.playbackState.speed;

      // Calculate actual timestamp
      const currentTimestamp = startTime + this.playbackState.currentTime;

      // Find and emit events up to current time
      while (lastEventIndex < events.length && events[lastEventIndex].timestamp <= currentTimestamp) {
        const event = events[lastEventIndex];
        if (onEvent) onEvent(event);
        this.emitEvent('replay:event', event);
        lastEventIndex++;
      }

      // Check for end
      if (this.playbackState.currentTime >= this.playbackState.duration) {
        this.stopPlayback();
        this.emitEvent('replay:end', {});
      }

      // Emit progress
      this.emitEvent('replay:progress', {
        currentTime: this.playbackState.currentTime,
        duration: this.playbackState.duration,
        progress: this.playbackState.currentTime / this.playbackState.duration,
      });
    }, 16); // ~60fps

    return true;
  }

  /**
   * Stop playback
   */
  stopPlayback() {
    this.playbackState.isPlaying = false;
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  /**
   * Pause playback
   */
  pausePlayback() {
    this.playbackState.isPlaying = false;
  }

  /**
   * Resume playback
   */
  resumePlayback(onEvent) {
    if (this.currentReplay && !this.playbackState.isPlaying) {
      this.playbackState.isPlaying = true;
      // Re-start from current position
      // In a real implementation, would need to track position
    }
  }

  /**
   * Seek to position
   */
  seekTo(timeMs) {
    this.playbackState.currentTime = Math.max(0, Math.min(timeMs, this.playbackState.duration));
  }

  /**
   * Set playback speed
   */
  setSpeed(speed) {
    this.playbackState.speed = speed;
  }

  /**
   * Get playback state
   */
  getPlaybackState() {
    return { ...this.playbackState };
  }

  /**
   * Calculate replay duration
   */
  calculateDuration() {
    if (this.recordedEvents.length < 2) return 0;
    const first = this.recordedEvents[0];
    const last = this.recordedEvents[this.recordedEvents.length - 1];
    return last.timestamp - first.timestamp;
  }

  /**
   * Compress events for storage (reduce position update data)
   */
  compressEvents(events) {
    // Group consecutive position updates
    const compressed = [];
    let positionBuffer = [];

    for (const event of events) {
      if (event.type === ReplayEventType.POSITION_UPDATE) {
        positionBuffer.push(event);
      } else {
        // Flush position buffer as batch
        if (positionBuffer.length > 0) {
          compressed.push({
            type: 'position_batch',
            data: positionBuffer.map(e => ({
              p: e.data.playerId,
              pos: e.data.position,
              t: e.timestamp,
            })),
          });
          positionBuffer = [];
        }
        compressed.push(event);
      }
    }

    // Flush remaining positions
    if (positionBuffer.length > 0) {
      compressed.push({
        type: 'position_batch',
        data: positionBuffer.map(e => ({
          p: e.data.playerId,
          pos: e.data.position,
          t: e.timestamp,
        })),
      });
    }

    return compressed;
  }

  /**
   * Decompress events from storage
   */
  decompressEvents(compressed) {
    const events = [];

    for (const item of compressed) {
      if (item.type === 'position_batch') {
        for (const pos of item.data) {
          events.push({
            type: ReplayEventType.POSITION_UPDATE,
            data: {
              playerId: pos.p,
              position: pos.pos,
            },
            timestamp: pos.t,
          });
        }
      } else {
        events.push(item);
      }
    }

    // Sort by timestamp
    events.sort((a, b) => a.timestamp - b.timestamp);

    return events;
  }

  /**
   * Event listener management
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.eventListeners.has(event)) return;
    const listeners = this.eventListeners.get(event);
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  }

  emitEvent(event, data) {
    if (!this.eventListeners.has(event)) return;
    for (const callback of this.eventListeners.get(event)) {
      callback(data);
    }
  }

  /**
   * Format duration for display
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Clear cache
   */
  async clearCache() {
    // Clear all replay caches
    const keys = await this.cache.keys();
    for (const key of keys) {
      if (key.startsWith('replay_')) {
        await this.cache.remove(key);
      }
    }
  }
}

// Singleton instance
export const replayService = new ReplayService();
export default replayService;

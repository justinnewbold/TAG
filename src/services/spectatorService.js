/**
 * Enhanced Spectator Mode Service
 * Live commentary, multi-camera following, replay sharing
 */

import { api } from './api';
import { socketService } from './socket';

// Event types for commentary
export const GAME_EVENT_TYPES = {
  TAG: 'tag',
  NEAR_MISS: 'near_miss',
  CLOSE_CALL: 'close_call',
  POWER_UP: 'power_up',
  ZONE_SHRINK: 'zone_shrink',
  ELIMINATION: 'elimination',
  STREAK: 'streak',
  COMEBACK: 'comeback',
  FINAL_TWO: 'final_two',
  VICTORY: 'victory',
};

// Commentary templates
const COMMENTARY_TEMPLATES = {
  [GAME_EVENT_TYPES.TAG]: [
    '{tagger} tags {tagged}! 🎯',
    'Got em! {tagger} catches {tagged}!',
    '{tagged} has been tagged by {tagger}!',
    'TAG! {tagger} ➡️ {tagged}',
  ],
  [GAME_EVENT_TYPES.NEAR_MISS]: [
    '{player} barely escapes! 😰',
    'So close! {player} dodges at the last second!',
    '{player} slips away by inches!',
  ],
  [GAME_EVENT_TYPES.CLOSE_CALL]: [
    '{player1} and {player2} are in a standoff! 👀',
    'Tension! {player1} vs {player2} - who will blink first?',
  ],
  [GAME_EVENT_TYPES.POWER_UP]: [
    '{player} grabbed {powerup}! ⚡',
    '{powerup} activated by {player}!',
  ],
  [GAME_EVENT_TYPES.ZONE_SHRINK]: [
    '⚠️ Zone shrinking in {time}!',
    'The circle is closing! Get to the safe zone!',
  ],
  [GAME_EVENT_TYPES.ELIMINATION]: [
    '💀 {player} has been eliminated!',
    '{player} is out! {remaining} players remain.',
  ],
  [GAME_EVENT_TYPES.STREAK]: [
    '🔥 {player} is on a {count}-tag streak!',
    '{player} is unstoppable! {count} tags in a row!',
  ],
  [GAME_EVENT_TYPES.COMEBACK]: [
    '🔄 {player} makes a comeback!',
    'Incredible! {player} turns the tables!',
  ],
  [GAME_EVENT_TYPES.FINAL_TWO]: [
    '🏁 Final two! {player1} vs {player2}!',
    "It's down to the wire! {player1} and {player2} remain!",
  ],
  [GAME_EVENT_TYPES.VICTORY]: [
    '🏆 {player} wins the game!',
    'VICTORY! {player} is the champion!',
    '👑 {player} takes the crown!',
  ],
};

class SpectatorService {
  constructor() {
    this.currentGame = null;
    this.followedPlayerId = null;
    this.eventFeed = [];
    this.maxFeedSize = 50;
    this.eventListeners = new Map();
    this.isSpectating = false;
    this.autoFollow = true; // Auto-follow action
  }

  /**
   * Start spectating a game
   */
  async startSpectating(gameId) {
    try {
      const data = await api.request(`/games/${gameId}/spectate`, { method: 'POST' });

      this.currentGame = data.game;
      this.isSpectating = true;
      this.eventFeed = [];

      // Join spectator socket room
      socketService.emit('spectator:join', { gameId });

      // Set up event listeners
      this.setupSocketListeners();

      return data;
    } catch (error) {
      console.error('Failed to start spectating:', error);
      throw error;
    }
  }

  /**
   * Stop spectating
   */
  stopSpectating() {
    if (this.currentGame) {
      socketService.emit('spectator:leave', { gameId: this.currentGame.id });
    }

    this.currentGame = null;
    this.followedPlayerId = null;
    this.isSpectating = false;
    this.eventFeed = [];

    this.removeSocketListeners();
  }

  /**
   * Setup socket listeners for spectator events
   */
  setupSocketListeners() {
    socketService.on('game:event', this.handleGameEvent.bind(this));
    socketService.on('game:state', this.handleGameState.bind(this));
    socketService.on('player:location', this.handlePlayerLocation.bind(this));
    socketService.on('game:ended', this.handleGameEnded.bind(this));
  }

  /**
   * Remove socket listeners
   */
  removeSocketListeners() {
    socketService.off('game:event', this.handleGameEvent);
    socketService.off('game:state', this.handleGameState);
    socketService.off('player:location', this.handlePlayerLocation);
    socketService.off('game:ended', this.handleGameEnded);
  }

  /**
   * Handle incoming game events
   */
  handleGameEvent(event) {
    // Generate commentary
    const commentary = this.generateCommentary(event);

    // Add to feed
    this.addToFeed({
      ...event,
      commentary,
      timestamp: Date.now(),
    });

    // Auto-follow exciting action
    if (this.autoFollow && this.shouldAutoFollow(event)) {
      this.followPlayer(event.playerId || event.taggerId);
    }

    // Emit to listeners
    this.emitEvent('event', event);
  }

  /**
   * Handle game state updates
   */
  handleGameState(state) {
    this.currentGame = { ...this.currentGame, ...state };
    this.emitEvent('state', state);
  }

  /**
   * Handle player location updates
   */
  handlePlayerLocation(data) {
    this.emitEvent('location', data);
  }

  /**
   * Handle game ended
   */
  handleGameEnded(result) {
    const victory = {
      type: GAME_EVENT_TYPES.VICTORY,
      player: result.winner,
    };

    this.handleGameEvent(victory);
    this.emitEvent('ended', result);
  }

  /**
   * Generate commentary for an event
   */
  generateCommentary(event) {
    const templates = COMMENTARY_TEMPLATES[event.type];
    if (!templates || templates.length === 0) return null;

    // Select random template
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Replace placeholders
    return template
      .replace('{tagger}', event.taggerName || event.tagger || 'Player')
      .replace('{tagged}', event.taggedName || event.tagged || 'Player')
      .replace('{player}', event.playerName || event.player || 'Player')
      .replace('{player1}', event.player1Name || event.player1 || 'Player 1')
      .replace('{player2}', event.player2Name || event.player2 || 'Player 2')
      .replace('{powerup}', event.powerupName || event.powerup || 'Power-up')
      .replace('{time}', event.time || '30 seconds')
      .replace('{count}', event.count || '3')
      .replace('{remaining}', event.remaining || '?');
  }

  /**
   * Should auto-follow this event
   */
  shouldAutoFollow(event) {
    const excitingEvents = [
      GAME_EVENT_TYPES.TAG,
      GAME_EVENT_TYPES.NEAR_MISS,
      GAME_EVENT_TYPES.STREAK,
      GAME_EVENT_TYPES.FINAL_TWO,
    ];
    return excitingEvents.includes(event.type);
  }

  /**
   * Add event to feed
   */
  addToFeed(event) {
    this.eventFeed.unshift(event);
    if (this.eventFeed.length > this.maxFeedSize) {
      this.eventFeed.pop();
    }
  }

  /**
   * Follow a specific player
   */
  followPlayer(playerId) {
    this.followedPlayerId = playerId;
    socketService.emit('spectator:follow', { playerId });
    this.emitEvent('follow', { playerId });
  }

  /**
   * Unfollow current player
   */
  unfollowPlayer() {
    this.followedPlayerId = null;
    socketService.emit('spectator:unfollow', {});
    this.emitEvent('unfollow', {});
  }

  /**
   * Enable/disable auto-follow
   */
  setAutoFollow(enabled) {
    this.autoFollow = enabled;
  }

  /**
   * Get event feed
   */
  getEventFeed() {
    return [...this.eventFeed];
  }

  /**
   * Get players in game
   */
  getPlayers() {
    return this.currentGame?.players || [];
  }

  /**
   * Get specific player
   */
  getPlayer(playerId) {
    return this.getPlayers().find(p => p.id === playerId);
  }

  /**
   * Get followed player
   */
  getFollowedPlayer() {
    if (!this.followedPlayerId) return null;
    return this.getPlayer(this.followedPlayerId);
  }

  // ============ REPLAY SHARING ============

  /**
   * Generate shareable replay link
   */
  async generateReplayLink(gameId, options = {}) {
    try {
      const data = await api.request('/replays/share', {
        method: 'POST',
        body: JSON.stringify({
          gameId,
          startTime: options.startTime,
          endTime: options.endTime,
          highlightEvents: options.highlightEvents,
        }),
      });

      return data.shareUrl;
    } catch (error) {
      console.error('Failed to generate replay link:', error);
      throw error;
    }
  }

  /**
   * Share replay to social media
   */
  async shareToSocial(platform, gameId, message = '') {
    const shareUrl = await this.generateReplayLink(gameId);

    const shareText = message || 'Check out this TAG game! 🏃‍♂️🎯';
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    const shareLinks = {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    };

    const link = shareLinks[platform];
    if (link) {
      window.open(link, '_blank', 'width=600,height=400');
      return true;
    }

    return false;
  }

  /**
   * Download replay as video (placeholder - would need server-side rendering)
   */
  async downloadReplayVideo(gameId) {
    try {
      const data = await api.request(`/replays/${gameId}/video`);

      // Trigger download
      const link = document.createElement('a');
      link.href = data.videoUrl;
      link.download = `tag-replay-${gameId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return true;
    } catch (error) {
      console.error('Failed to download replay:', error);
      throw error;
    }
  }

  // ============ EVENT EMITTER ============

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);

    return () => this.off(event, callback);
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
}

// Singleton
export const spectatorService = new SpectatorService();
export default spectatorService;

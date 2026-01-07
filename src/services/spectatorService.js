/**
 * Enhanced Spectator Mode Service
 * Live commentary, multi-camera following, AI predictions, replay sharing
 */

import { api } from './api';
import { socketService } from './socket';
import { getDistance } from '../../shared/utils';

// Prediction types
export const PredictionType = {
  NEXT_TAG: 'next_tag',
  WINNER: 'winner',
  TAG_TIME: 'tag_time',
  SURVIVOR: 'survivor',
};

// View modes
export const ViewMode = {
  OVERVIEW: 'overview',
  FOLLOW_IT: 'follow_it',
  FOLLOW_PLAYER: 'follow_player',
  DRAMA_CAM: 'drama_cam',
};

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
    this.viewMode = ViewMode.DRAMA_CAM;

    // AI Predictions
    this.predictions = new Map();
    this.currentPredictions = [];
    this.predictionHistory = [];
    this.userPoints = 100; // Starting points for predictions
    this.playerStats = new Map();

    // Excitement tracking
    this.excitementLevel = 50;
    this.dramaFocus = null;
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

  // ============ AI PREDICTIONS ============

  /**
   * Analyze game state and generate predictions
   */
  analyzeAndPredict(gameState) {
    if (!gameState?.players) return;

    const players = gameState.players;
    const itPlayer = players.find(p => p.id === gameState.itPlayerId);
    const runners = players.filter(p => p.id !== gameState.itPlayerId);

    if (!itPlayer) return;

    // Calculate distances and probabilities
    const analysis = runners.map(runner => {
      const distance = runner.location && itPlayer.location
        ? getDistance(runner.location, itPlayer.location)
        : Infinity;

      const stats = this.playerStats.get(runner.id) || { evasionScore: 50 };
      let tagProbability = Math.max(0, 100 - distance * 2);
      tagProbability -= stats.evasionScore * 0.3;

      return {
        player: runner,
        distance,
        tagProbability: Math.max(0, Math.min(100, tagProbability)),
      };
    }).sort((a, b) => a.distance - b.distance);

    const closest = analysis[0];

    // Update excitement level
    if (closest) {
      if (closest.distance < 15) this.excitementLevel = 100;
      else if (closest.distance < 30) this.excitementLevel = 85;
      else if (closest.distance < 50) this.excitementLevel = 70;
      else if (closest.distance < 100) this.excitementLevel = 50;
      else this.excitementLevel = 30;
    }

    // Generate predictions
    this.currentPredictions = [];

    // Next tag prediction
    if (closest && closest.tagProbability > 20) {
      this.currentPredictions.push({
        type: PredictionType.NEXT_TAG,
        prediction: closest.player.name,
        confidence: Math.round(closest.tagProbability),
        reasoning: `${Math.round(closest.distance)}m from IT`,
        odds: this.calculateOdds(closest.tagProbability),
      });
    }

    // Tag timing prediction
    if (closest && closest.distance < 30) {
      const timeEstimate = closest.distance < 15 ? 'Under 10s' : 'Under 30s';
      this.currentPredictions.push({
        type: PredictionType.TAG_TIME,
        prediction: timeEstimate,
        confidence: closest.distance < 15 ? 85 : 60,
        reasoning: 'Active pursuit detected',
        odds: closest.distance < 15 ? 1.2 : 1.8,
      });
    }

    // Winner prediction
    const winnerPred = this.predictWinner(players, gameState.itPlayerId);
    if (winnerPred) {
      this.currentPredictions.push(winnerPred);
    }

    // Drama cam auto-focus
    if (this.viewMode === ViewMode.DRAMA_CAM) {
      this.updateDramaFocus(itPlayer, closest, analysis);
    }

    this.emitEvent('predictions', this.currentPredictions);
    this.emitEvent('excitement', this.excitementLevel);
  }

  /**
   * Calculate betting odds from probability
   */
  calculateOdds(probability) {
    if (probability <= 0) return 10.0;
    const odds = (100 / probability);
    return Math.round(odds * 10) / 10;
  }

  /**
   * Predict likely winner
   */
  predictWinner(players, currentItId) {
    const scores = players.map(player => {
      const stats = this.playerStats.get(player.id) || {};
      let score = 50;

      score += (stats.evasionScore || 0) * 0.5;
      score -= (stats.tagsReceived || 0) * 5;
      score += ((stats.tagsMade || 0) - (stats.tagsReceived || 0)) * 3;

      // Non-IT players have survival advantage
      if (player.id !== currentItId) score += 10;

      return { player, score };
    }).sort((a, b) => b.score - a.score);

    if (scores.length < 2) return null;

    const confidence = Math.min(85, 50 + (scores[0].score - scores[1].score));

    return {
      type: PredictionType.WINNER,
      prediction: scores[0].player.name,
      confidence: Math.round(confidence),
      reasoning: 'Based on performance metrics',
      odds: this.calculateOdds(confidence),
    };
  }

  /**
   * Update drama camera focus
   */
  updateDramaFocus(itPlayer, closest, analysis) {
    let newFocus;

    if (closest && closest.distance < 20) {
      newFocus = { mode: 'chase', it: itPlayer, target: closest.player };
    } else if (analysis.filter(a => a.distance < 80).length > 2) {
      newFocus = { mode: 'overview' };
    } else {
      newFocus = { mode: 'follow', player: itPlayer };
    }

    if (JSON.stringify(newFocus) !== JSON.stringify(this.dramaFocus)) {
      this.dramaFocus = newFocus;
      this.emitEvent('camera', newFocus);
    }
  }

  /**
   * Make a prediction bet
   */
  placeBet(predictionType, choice, points = 10) {
    if (this.userPoints < points) return null;

    const prediction = this.currentPredictions.find(p => p.type === predictionType);
    if (!prediction) return null;

    const bet = {
      id: `bet_${Date.now()}`,
      type: predictionType,
      choice,
      points,
      odds: prediction.odds,
      timestamp: Date.now(),
      resolved: false,
    };

    this.userPoints -= points;
    this.predictions.set(bet.id, bet);
    this.emitEvent('bet_placed', bet);

    return bet;
  }

  /**
   * Resolve a bet
   */
  resolveBet(betId, correct) {
    const bet = this.predictions.get(betId);
    if (!bet || bet.resolved) return;

    bet.resolved = true;
    bet.correct = correct;

    if (correct) {
      const winnings = Math.round(bet.points * bet.odds);
      this.userPoints += winnings;
      this.emitEvent('bet_won', { bet, winnings });
    } else {
      this.emitEvent('bet_lost', { bet });
    }

    this.predictionHistory.push(bet);
  }

  /**
   * Get current predictions
   */
  getPredictions() {
    return this.currentPredictions;
  }

  /**
   * Get user betting stats
   */
  getBettingStats() {
    const total = this.predictionHistory.length;
    const wins = this.predictionHistory.filter(b => b.correct).length;

    return {
      points: this.userPoints,
      totalBets: total,
      wins,
      accuracy: total > 0 ? Math.round((wins / total) * 100) : 0,
    };
  }

  /**
   * Get excitement description
   */
  getExcitementLabel() {
    if (this.excitementLevel >= 90) return '🔥 INSANE!';
    if (this.excitementLevel >= 75) return '⚡ ELECTRIC!';
    if (this.excitementLevel >= 60) return '😱 INTENSE!';
    if (this.excitementLevel >= 40) return '👀 Heating up...';
    return '😌 Calm';
  }

  /**
   * Set view mode
   */
  setViewMode(mode) {
    this.viewMode = mode;
    this.emitEvent('view_mode', mode);
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

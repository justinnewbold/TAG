/**
 * TAG! Client-side AI Service
 * Interfaces with backend AI features
 */

import { api } from './api';

class AIService {
  constructor() {
    this.cachedTrashTalk = new Map();
    this.lastTrashTalkFetch = 0;
  }

  /**
   * Generate a game recap
   */
  async generateRecap(gameData) {
    try {
      const response = await api.post('/ai/recap', { gameData });
      return response.recap;
    } catch (error) {
      console.error('Failed to generate recap:', error);
      return this.generateFallbackRecap(gameData);
    }
  }

  /**
   * Fallback recap when API fails
   */
  generateFallbackRecap(gameData) {
    const duration = Math.round((gameData.duration || 0) / 60000);
    const totalTags = gameData.tags?.length || 0;
    const winner = gameData.winner?.name || 'Everyone';
    return `🎮 Great ${duration}-minute game with ${totalTags} tags! ${winner} wins! 🏆`;
  }

  /**
   * Get contextual trash talk suggestions
   */
  async getTrashTalk(context) {
    const cacheKey = `${context.playerRole}-${context.gameState}`;
    
    // Return cached if recent
    if (this.cachedTrashTalk.has(cacheKey) && 
        Date.now() - this.lastTrashTalkFetch < 30000) {
      return this.cachedTrashTalk.get(cacheKey);
    }

    try {
      const response = await api.post('/ai/trash-talk', { context });
      this.cachedTrashTalk.set(cacheKey, response.messages);
      this.lastTrashTalkFetch = Date.now();
      return response.messages;
    } catch (error) {
      console.error('Failed to get trash talk:', error);
      return this.getFallbackTrashTalk(context);
    }
  }

  /**
   * Fallback trash talk options
   */
  getFallbackTrashTalk(context) {
    if (context.playerRole === 'it') {
      return [
        "I'm coming for you! 👀",
        "You can't run forever! 🏃",
        "Tag time! ⚡",
        "Ready or not! 😈",
        "No escape! 🎯",
      ];
    }
    return [
      "Can't catch me! 😎",
      "Too fast! 🏃💨",
      "Nice try! 😏",
      "Over here! 📍",
      "Catch me if you can! 😂",
    ];
  }

  /**
   * Analyze movement for anti-cheat (client-side quick check)
   */
  quickMovementCheck(currentLocation, lastLocation, timeDiff) {
    if (!lastLocation || timeDiff < 1000) return { valid: true };

    const distance = this.calculateDistance(
      lastLocation.latitude, lastLocation.longitude,
      currentLocation.latitude, currentLocation.longitude
    );

    const speed = distance / (timeDiff / 1000); // m/s
    const speedKmh = speed * 3.6;

    // Quick checks
    if (speedKmh > 50) {
      return { 
        valid: false, 
        reason: 'impossible_speed',
        speed: speedKmh 
      };
    }

    if (distance > 200 && timeDiff < 5000) {
      return { 
        valid: false, 
        reason: 'teleport',
        distance 
      };
    }

    return { valid: true, speed: speedKmh };
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Get player's skill rating
   */
  async getSkillRating(playerId) {
    try {
      const response = await api.get(`/ai/skill-rating/${playerId}`);
      return response;
    } catch (error) {
      console.error('Failed to get skill rating:', error);
      return { rating: 1000, tier: 'unranked', confidence: 'low' };
    }
  }

  /**
   * Get personalized strategy tips
   */
  async getStrategyTips() {
    try {
      const response = await api.get('/ai/strategy-tips');
      return response.tips;
    } catch (error) {
      console.error('Failed to get strategy tips:', error);
      return [{
        category: 'general',
        tip: 'Keep moving and stay unpredictable!',
        priority: 'medium'
      }];
    }
  }

  /**
   * Generate local commentary (instant, no API)
   */
  generateLocalCommentary(event) {
    const comments = {
      'tag': [
        `🎯 ${event.tagger} tags ${event.tagged}!`,
        `💥 TAG! ${event.tagged} is now IT!`,
        `⚡ Got 'em! ${event.tagger} strikes!`,
      ],
      'close_call': [
        `😱 SO CLOSE! Escaped by ${event.distance}m!`,
        `👀 INCHES! That was too close!`,
        `🏃 Narrow escape!`,
      ],
      'power_up': [
        `✨ Power-up collected!`,
        `🎁 ${event.powerUp} activated!`,
      ],
      'game_start': [
        `🎮 Game ON! Let's TAG!`,
        `🏃 The chase begins!`,
        `⚡ IT is hunting!`,
      ],
      'game_end': [
        `🏆 GAME OVER!`,
        `🎊 What a match!`,
      ],
    };

    const options = comments[event.type] || ['🎮 Game event!'];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Ask AI Assistant a question about the game
   */
  async askAssistant(question) {
    try {
      const response = await api.post('/ai/assistant', { question });
      return response.answer;
    } catch (error) {
      console.error('AI Assistant error:', error);
      return this.getFallbackAnswer(question);
    }
  }

  /**
   * Fallback answers when API fails
   */
  getFallbackAnswer(question) {
    const q = question.toLowerCase();
    
    if (q.includes('play') || q.includes('rules')) {
      return `TAG! is a GPS tag game! 🎮 One player is IT and must tag others. When tagged, you become IT. Use power-ups and strategy to win!`;
    }
    if (q.includes('mode')) {
      return `We have 7 modes: Classic Tag, Freeze Tag, Infection, Team Tag, Manhunt, Hot Potato, and Hide & Seek! 🎯`;
    }
    if (q.includes('power')) {
      return `Power-ups include: Speed Boost 🏃, Invisibility 👻, Shield 🛡️, Radar 📡, Freeze ❄️, Teleport ⚡, and Decoy 🎭!`;
    }
    if (q.includes('tag') && q.includes('how')) {
      return `Get within range of another player (shown on map), then tap the TAG button when it appears! 🎯`;
    }
    
    return `Great question! 🤔 I can help with game rules, modes, power-ups, and strategies. What would you like to know?`;
  }

}

export const aiService = new AIService();
export default aiService;


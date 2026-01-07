/**
 * AI Live Commentary Service
 * Real-time sports-style commentary for TAG games
 */

// Commentary event types
export const CommentaryEventType = {
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  TAG: 'tag',
  NEAR_MISS: 'near_miss',
  CHASE_BEGIN: 'chase_begin',
  ESCAPE: 'escape',
  POWERUP_COLLECT: 'powerup_collect',
  POWERUP_USE: 'powerup_use',
  STREAK: 'streak',
  COMEBACK: 'comeback',
  LEAD_CHANGE: 'lead_change',
  FINAL_MOMENTS: 'final_moments',
  IDLE: 'idle',
};

// Commentary templates for different events
const COMMENTARY_TEMPLATES = {
  [CommentaryEventType.GAME_START]: [
    "AND WE'RE OFF! {playerCount} players ready to battle it out!",
    "The hunt begins! {itPlayer} is IT and looking HUNGRY!",
    "Ladies and gentlemen, welcome to TAG! {itPlayer} starts as IT!",
    "Game on! Can anyone survive {itPlayer}'s pursuit?!",
    "The chase is ON! {playerCount} players, one IT, infinite possibilities!",
  ],
  [CommentaryEventType.TAG]: [
    "TAGGED! {tagger} gets {tagged}! What a play!",
    "OH NO! {tagged} couldn't escape! {tagger} with the TAG!",
    "BOOM! {tagger} strikes! {tagged} is now IT!",
    "INCREDIBLE! {tagger} closes the gap and TAGS {tagged}!",
    "AND THAT'S A TAG! {tagged} never saw {tagger} coming!",
    "WHAT A CHASE! {tagger} finally catches {tagged}!",
    "The tables have TURNED! {tagged} is now the hunter!",
  ],
  [CommentaryEventType.NEAR_MISS]: [
    "OHHH! So close! {runner} escapes by INCHES!",
    "NEAR MISS! {runner} slips away from {chaser}!",
    "WHAT A DODGE! {runner} with the JUKE of the century!",
    "Heart-stopping moment! {runner} barely escapes!",
    "{chaser} SO CLOSE but {runner} survives another day!",
    "THE CROWD GOES WILD! {runner} with an INCREDIBLE escape!",
  ],
  [CommentaryEventType.CHASE_BEGIN]: [
    "{chaser} has spotted {target}! The chase is ON!",
    "Here we go! {chaser} is closing in on {target}!",
    "TENSION building! {chaser} locked onto {target}!",
    "{target} better RUN! {chaser} is coming in HOT!",
  ],
  [CommentaryEventType.ESCAPE]: [
    "BRILLIANT escape by {runner}! They're in the clear!",
    "{runner} creates distance! What a maneuver!",
    "Safe for now! {runner} has broken free!",
    "{runner} vanishes into the distance! MASTERFUL!",
  ],
  [CommentaryEventType.POWERUP_COLLECT]: [
    "{player} grabs a {powerup}! Game changer!",
    "POWER UP! {player} snatches the {powerup}!",
    "Strategic pickup! {player} now has {powerup}!",
  ],
  [CommentaryEventType.POWERUP_USE]: [
    "{player} activates {powerup}! LET'S GO!",
    "BOOM! {player} uses {powerup}!",
    "The {powerup} is LIVE! {player} making moves!",
  ],
  [CommentaryEventType.STREAK]: [
    "{player} is ON FIRE! {count} tags in a row!",
    "UNSTOPPABLE! {player} with {count} consecutive tags!",
    "Can anyone stop {player}?! {count} tag streak!",
  ],
  [CommentaryEventType.COMEBACK]: [
    "WHAT A COMEBACK! {player} turning it around!",
    "From zero to HERO! {player} is back in this!",
    "Never count out {player}! What a recovery!",
  ],
  [CommentaryEventType.FINAL_MOMENTS]: [
    "FINAL SECONDS! Who will survive?!",
    "The clock is ticking! ANYTHING can happen!",
    "We're in the ENDGAME now, folks!",
    "Last chance plays! The tension is UNBEARABLE!",
  ],
  [CommentaryEventType.GAME_END]: [
    "GAME OVER! What an INCREDIBLE match!",
    "AND THAT'S THE GAME! {winner} takes the victory!",
    "FINAL WHISTLE! {winner} emerges as the champion!",
    "What a battle! Congratulations to {winner}!",
    "The dust settles! {winner} stands VICTORIOUS!",
  ],
  [CommentaryEventType.IDLE]: [
    "The calm before the storm...",
    "Players are positioning themselves strategically...",
    "Who will make the first move?",
    "Tension in the air! Everyone's waiting...",
    "A chess match unfolding in real-time!",
  ],
};

// Excitement modifiers based on game state
const EXCITEMENT_PHRASES = {
  low: ["", "Interesting...", "Let's see..."],
  medium: ["Nice!", "Good play!", "Things are heating up!"],
  high: ["INCREDIBLE!", "UNBELIEVABLE!", "I CAN'T BELIEVE IT!"],
  extreme: ["ABSOLUTELY INSANE!", "LEGENDARY PLAY!", "FOR THE HISTORY BOOKS!"],
};

class LiveCommentaryService {
  constructor() {
    this.isEnabled = true;
    this.isMuted = false;
    this.commentaryQueue = [];
    this.lastCommentary = null;
    this.lastCommentaryTime = 0;
    this.minInterval = 3000; // Minimum ms between commentary
    this.listeners = new Set();
    this.gameState = {
      excitement: 0, // 0-100
      tagStreak: {},
      lastTagTime: 0,
      nearMissCount: 0,
    };
    this.speechSynthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.preferredVoice = null;
    this.initVoice();
  }

  /**
   * Initialize text-to-speech voice
   */
  initVoice() {
    if (!this.speechSynthesis) return;

    const setVoice = () => {
      const voices = this.speechSynthesis.getVoices();
      // Prefer an energetic English voice
      this.preferredVoice = voices.find(v =>
        v.lang.startsWith('en') && (v.name.includes('Daniel') || v.name.includes('Alex'))
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    };

    if (this.speechSynthesis.getVoices().length) {
      setVoice();
    } else {
      this.speechSynthesis.onvoiceschanged = setVoice;
    }
  }

  /**
   * Generate commentary for an event
   */
  generateCommentary(eventType, context = {}) {
    if (!this.isEnabled) return null;

    const templates = COMMENTARY_TEMPLATES[eventType];
    if (!templates || templates.length === 0) return null;

    // Pick a random template
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Replace placeholders with context values
    let commentary = template;
    Object.entries(context).forEach(([key, value]) => {
      commentary = commentary.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    // Add excitement modifier for high-intensity moments
    if (this.gameState.excitement > 80) {
      const phrases = EXCITEMENT_PHRASES.extreme;
      commentary = phrases[Math.floor(Math.random() * phrases.length)] + ' ' + commentary;
    } else if (this.gameState.excitement > 60) {
      const phrases = EXCITEMENT_PHRASES.high;
      commentary = phrases[Math.floor(Math.random() * phrases.length)] + ' ' + commentary;
    }

    return commentary;
  }

  /**
   * Trigger commentary with rate limiting
   */
  triggerCommentary(eventType, context = {}, priority = 'normal') {
    const now = Date.now();
    const timeSinceLast = now - this.lastCommentaryTime;

    // High priority events (tags, near misses) bypass rate limiting
    if (priority !== 'high' && timeSinceLast < this.minInterval) {
      return null;
    }

    const commentary = this.generateCommentary(eventType, context);
    if (!commentary) return null;

    this.lastCommentary = commentary;
    this.lastCommentaryTime = now;

    // Update excitement based on event
    this.updateExcitement(eventType);

    // Notify listeners
    this.notifyListeners({
      type: eventType,
      text: commentary,
      timestamp: now,
      excitement: this.gameState.excitement,
    });

    // Speak if not muted
    if (!this.isMuted) {
      this.speak(commentary);
    }

    return commentary;
  }

  /**
   * Update excitement level based on events
   */
  updateExcitement(eventType) {
    const excitementBoosts = {
      [CommentaryEventType.TAG]: 20,
      [CommentaryEventType.NEAR_MISS]: 15,
      [CommentaryEventType.CHASE_BEGIN]: 10,
      [CommentaryEventType.POWERUP_USE]: 8,
      [CommentaryEventType.STREAK]: 25,
      [CommentaryEventType.FINAL_MOMENTS]: 30,
    };

    const boost = excitementBoosts[eventType] || 0;
    this.gameState.excitement = Math.min(100, this.gameState.excitement + boost);

    // Excitement decays over time
    setTimeout(() => {
      this.gameState.excitement = Math.max(0, this.gameState.excitement - boost / 2);
    }, 5000);
  }

  /**
   * Speak commentary using text-to-speech
   */
  speak(text) {
    if (!this.speechSynthesis || this.isMuted) return;

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.preferredVoice;
    utterance.rate = 1.1 + (this.gameState.excitement / 200); // Faster when excited
    utterance.pitch = 1.0 + (this.gameState.excitement / 500); // Higher pitch when excited
    utterance.volume = 0.9;

    this.speechSynthesis.speak(utterance);
  }

  /**
   * Handle game events
   */
  onGameStart(players, itPlayer) {
    this.resetState();
    this.triggerCommentary(CommentaryEventType.GAME_START, {
      playerCount: players.length,
      itPlayer: itPlayer.name,
    }, 'high');
  }

  onTag(tagger, tagged) {
    // Track tag streak
    this.gameState.tagStreak[tagger.id] = (this.gameState.tagStreak[tagger.id] || 0) + 1;
    const streak = this.gameState.tagStreak[tagger.id];

    this.triggerCommentary(CommentaryEventType.TAG, {
      tagger: tagger.name,
      tagged: tagged.name,
    }, 'high');

    // Announce streak if impressive
    if (streak >= 3) {
      setTimeout(() => {
        this.triggerCommentary(CommentaryEventType.STREAK, {
          player: tagger.name,
          count: streak,
        }, 'high');
      }, 2000);
    }

    this.gameState.lastTagTime = Date.now();
  }

  onNearMiss(runner, chaser, distance) {
    this.gameState.nearMissCount++;
    this.triggerCommentary(CommentaryEventType.NEAR_MISS, {
      runner: runner.name,
      chaser: chaser.name,
      distance: Math.round(distance),
    }, 'high');
  }

  onChaseBegin(chaser, target) {
    this.triggerCommentary(CommentaryEventType.CHASE_BEGIN, {
      chaser: chaser.name,
      target: target.name,
    });
  }

  onEscape(runner) {
    this.triggerCommentary(CommentaryEventType.ESCAPE, {
      runner: runner.name,
    });
  }

  onPowerupCollect(player, powerup) {
    this.triggerCommentary(CommentaryEventType.POWERUP_COLLECT, {
      player: player.name,
      powerup: powerup.name,
    });
  }

  onPowerupUse(player, powerup) {
    this.triggerCommentary(CommentaryEventType.POWERUP_USE, {
      player: player.name,
      powerup: powerup.name,
    }, 'high');
  }

  onFinalMoments(remainingTime) {
    this.triggerCommentary(CommentaryEventType.FINAL_MOMENTS, {
      time: remainingTime,
    }, 'high');
  }

  onGameEnd(winner, stats) {
    this.triggerCommentary(CommentaryEventType.GAME_END, {
      winner: winner?.name || 'Nobody',
      ...stats,
    }, 'high');
  }

  /**
   * Periodic idle commentary
   */
  startIdleCommentary(interval = 15000) {
    this.idleInterval = setInterval(() => {
      const timeSinceLastTag = Date.now() - this.gameState.lastTagTime;
      if (timeSinceLastTag > 10000) {
        this.triggerCommentary(CommentaryEventType.IDLE, {});
      }
    }, interval);
  }

  stopIdleCommentary() {
    if (this.idleInterval) {
      clearInterval(this.idleInterval);
      this.idleInterval = null;
    }
  }

  /**
   * Reset game state
   */
  resetState() {
    this.gameState = {
      excitement: 50, // Start with medium excitement
      tagStreak: {},
      lastTagTime: Date.now(),
      nearMissCount: 0,
    };
  }

  /**
   * Subscribe to commentary events
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event) {
    this.listeners.forEach(cb => cb(event));
  }

  /**
   * Toggle features
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted && this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
  }

  /**
   * Get current excitement level
   */
  getExcitement() {
    return this.gameState.excitement;
  }
}

// Singleton
export const liveCommentaryService = new LiveCommentaryService();
export default liveCommentaryService;

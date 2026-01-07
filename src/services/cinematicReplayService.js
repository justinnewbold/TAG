/**
 * Cinematic Replay Generator Service
 * Auto-generates shareable highlight reels from game data
 */

import { getDistance } from '../../shared/utils';

// Highlight types
export const HighlightType = {
  TAG: 'tag',
  NEAR_MISS: 'near_miss',
  CHASE: 'chase',
  ESCAPE: 'escape',
  POWERUP: 'powerup',
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  STREAK: 'streak',
};

// Camera shot types
export const CameraShot = {
  WIDE: 'wide', // Overview shot
  CLOSE_UP: 'close_up', // Focus on single player
  TRACKING: 'tracking', // Follow movement
  OVERHEAD: 'overhead', // Bird's eye view
  DRAMATIC: 'dramatic', // Slow zoom with effects
  SPLIT: 'split', // Show two players
};

// Transition types
export const Transition = {
  CUT: 'cut',
  FADE: 'fade',
  WIPE: 'wipe',
  ZOOM: 'zoom',
  FLASH: 'flash',
};

// Epic music cues
const MUSIC_CUES = {
  tension: { name: 'Rising Tension', bpm: 100, intensity: 0.6 },
  chase: { name: 'The Chase', bpm: 140, intensity: 0.8 },
  victory: { name: 'Triumphant', bpm: 120, intensity: 1.0 },
  defeat: { name: 'Fallen', bpm: 60, intensity: 0.4 },
  climax: { name: 'Final Showdown', bpm: 160, intensity: 1.0 },
  ambient: { name: 'Calm Before Storm', bpm: 80, intensity: 0.3 },
};

class CinematicReplayService {
  constructor() {
    this.highlights = [];
    this.cinematicTimeline = [];
    this.gameData = null;
  }

  /**
   * Analyze game data and extract highlights
   */
  analyzeGame(game) {
    this.gameData = game;
    this.highlights = [];

    if (!game) return [];

    // Add game start highlight
    this.addHighlight({
      type: HighlightType.GAME_START,
      timestamp: game.startedAt,
      duration: 3000,
      players: game.players,
      importance: 80,
      title: 'Game Begins!',
      subtitle: `${game.players?.length || 0} players ready to battle`,
    });

    // Analyze all tags
    this.analyzeTagEvents(game);

    // Analyze player movements for chases/escapes
    this.analyzeMovements(game);

    // Add game end highlight
    if (game.endedAt) {
      const winner = game.players?.find(p => p.id === game.winnerId);
      this.addHighlight({
        type: HighlightType.GAME_END,
        timestamp: game.endedAt,
        duration: 5000,
        winner,
        importance: 100,
        title: winner ? `${winner.name} Wins!` : 'Game Over!',
        subtitle: `${game.tags?.length || 0} total tags`,
      });
    }

    // Sort by timestamp
    this.highlights.sort((a, b) => a.timestamp - b.timestamp);

    return this.highlights;
  }

  /**
   * Analyze tag events
   */
  analyzeTagEvents(game) {
    const tags = game.tags || [];
    const players = game.players || [];
    const playerMap = new Map(players.map(p => [p.id, p]));

    // Track streaks
    const streaks = {};

    tags.forEach((tag, index) => {
      const tagger = playerMap.get(tag.taggerId);
      const tagged = playerMap.get(tag.taggedId);

      if (!tagger || !tagged) return;

      // Track streak
      streaks[tagger.id] = (streaks[tagger.id] || 0) + 1;

      // Calculate importance based on context
      let importance = 70;

      // Fast tags are more exciting
      if (tag.tagTime && tag.tagTime < 10000) {
        importance += 15;
      }

      // Streak tags
      if (streaks[tagger.id] >= 3) {
        importance += 10 * (streaks[tagger.id] - 2);

        // Add streak highlight
        this.addHighlight({
          type: HighlightType.STREAK,
          timestamp: tag.timestamp,
          duration: 2000,
          player: tagger,
          streak: streaks[tagger.id],
          importance: importance,
          title: `${streaks[tagger.id]}x Streak!`,
          subtitle: `${tagger.name} is on fire!`,
        });
      }

      // First tag of game
      if (index === 0) {
        importance += 10;
      }

      // Last tag of game
      if (index === tags.length - 1) {
        importance += 20;
      }

      this.addHighlight({
        type: HighlightType.TAG,
        timestamp: tag.timestamp,
        duration: 2500,
        tagger,
        tagged,
        tagTime: tag.tagTime,
        importance,
        title: 'TAG!',
        subtitle: `${tagger.name} catches ${tagged.name}`,
      });

      // Reset opponent's streak
      streaks[tagged.id] = 0;
    });
  }

  /**
   * Analyze player movements for chase sequences
   */
  analyzeMovements(game) {
    // This would analyze position history for exciting moments
    // For now, we'll generate placeholder chase highlights based on tag proximity

    const tags = game.tags || [];

    tags.forEach(tag => {
      // Add a chase highlight before each tag
      if (tag.timestamp > game.startedAt + 10000) {
        const tagger = game.players?.find(p => p.id === tag.taggerId);
        const tagged = game.players?.find(p => p.id === tag.taggedId);

        if (tagger && tagged) {
          this.addHighlight({
            type: HighlightType.CHASE,
            timestamp: tag.timestamp - 5000,
            duration: 4000,
            chaser: tagger,
            target: tagged,
            importance: 60,
            title: 'The Chase!',
            subtitle: `${tagger.name} closes in on ${tagged.name}`,
          });
        }
      }
    });
  }

  /**
   * Add a highlight
   */
  addHighlight(highlight) {
    this.highlights.push({
      id: `highlight_${this.highlights.length}`,
      ...highlight,
    });
  }

  /**
   * Generate cinematic timeline from highlights
   */
  generateCinematicTimeline(options = {}) {
    const {
      maxDuration = 60000, // 60 seconds max
      minHighlightImportance = 50,
      includeTransitions = true,
    } = options;

    // Filter highlights by importance
    const selectedHighlights = this.highlights
      .filter(h => h.importance >= minHighlightImportance)
      .sort((a, b) => b.importance - a.importance);

    // Build timeline
    this.cinematicTimeline = [];
    let currentTime = 0;

    // Opening shot
    this.addTimelineClip({
      type: 'intro',
      startTime: currentTime,
      duration: 3000,
      camera: CameraShot.WIDE,
      music: MUSIC_CUES.ambient,
      title: this.gameData?.settings?.gameName || 'TAG!',
      subtitle: new Date(this.gameData?.startedAt).toLocaleDateString(),
    });
    currentTime += 3000;

    // Add highlights
    for (const highlight of selectedHighlights) {
      if (currentTime >= maxDuration) break;

      // Transition
      if (includeTransitions && this.cinematicTimeline.length > 0) {
        this.addTimelineClip({
          type: 'transition',
          startTime: currentTime,
          duration: 500,
          transition: this.getTransitionForHighlight(highlight),
        });
        currentTime += 500;
      }

      // Highlight clip
      const camera = this.getCameraForHighlight(highlight);
      const music = this.getMusicForHighlight(highlight);

      this.addTimelineClip({
        type: 'highlight',
        highlight,
        startTime: currentTime,
        duration: highlight.duration,
        camera,
        music,
        effects: this.getEffectsForHighlight(highlight),
      });

      currentTime += highlight.duration;
    }

    // Outro
    if (currentTime < maxDuration) {
      this.addTimelineClip({
        type: 'outro',
        startTime: currentTime,
        duration: 4000,
        camera: CameraShot.WIDE,
        music: MUSIC_CUES.victory,
        title: 'Game Over',
        stats: this.generateStats(),
      });
    }

    return this.cinematicTimeline;
  }

  /**
   * Add clip to timeline
   */
  addTimelineClip(clip) {
    this.cinematicTimeline.push({
      id: `clip_${this.cinematicTimeline.length}`,
      ...clip,
    });
  }

  /**
   * Get appropriate camera shot for highlight type
   */
  getCameraForHighlight(highlight) {
    switch (highlight.type) {
      case HighlightType.TAG:
        return CameraShot.DRAMATIC;
      case HighlightType.CHASE:
        return CameraShot.TRACKING;
      case HighlightType.NEAR_MISS:
        return CameraShot.CLOSE_UP;
      case HighlightType.ESCAPE:
        return CameraShot.TRACKING;
      case HighlightType.STREAK:
        return CameraShot.CLOSE_UP;
      case HighlightType.GAME_END:
        return CameraShot.DRAMATIC;
      default:
        return CameraShot.WIDE;
    }
  }

  /**
   * Get music cue for highlight
   */
  getMusicForHighlight(highlight) {
    switch (highlight.type) {
      case HighlightType.TAG:
        return MUSIC_CUES.climax;
      case HighlightType.CHASE:
        return MUSIC_CUES.chase;
      case HighlightType.GAME_END:
        return highlight.winner ? MUSIC_CUES.victory : MUSIC_CUES.defeat;
      case HighlightType.STREAK:
        return MUSIC_CUES.climax;
      default:
        return MUSIC_CUES.tension;
    }
  }

  /**
   * Get transition for highlight
   */
  getTransitionForHighlight(highlight) {
    switch (highlight.type) {
      case HighlightType.TAG:
        return Transition.FLASH;
      case HighlightType.GAME_END:
        return Transition.FADE;
      default:
        return Transition.CUT;
    }
  }

  /**
   * Get visual effects for highlight
   */
  getEffectsForHighlight(highlight) {
    const effects = [];

    switch (highlight.type) {
      case HighlightType.TAG:
        effects.push({ type: 'slowmo', factor: 0.5 });
        effects.push({ type: 'zoom', amount: 1.5 });
        effects.push({ type: 'flash', color: '#ff0000' });
        break;
      case HighlightType.NEAR_MISS:
        effects.push({ type: 'slowmo', factor: 0.3 });
        effects.push({ type: 'vignette', intensity: 0.7 });
        break;
      case HighlightType.STREAK:
        effects.push({ type: 'fire', intensity: 1.0 });
        effects.push({ type: 'shake', intensity: 0.3 });
        break;
      case HighlightType.GAME_END:
        effects.push({ type: 'confetti' });
        effects.push({ type: 'glow', color: '#00ffff' });
        break;
    }

    return effects;
  }

  /**
   * Generate stats summary
   */
  generateStats() {
    if (!this.gameData) return {};

    const players = this.gameData.players || [];
    const tags = this.gameData.tags || [];
    const duration = this.gameData.endedAt - this.gameData.startedAt;

    // Find MVP (most tags)
    const tagCounts = {};
    tags.forEach(t => {
      tagCounts[t.taggerId] = (tagCounts[t.taggerId] || 0) + 1;
    });

    const mvpId = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0];
    const mvp = players.find(p => p.id === mvpId);

    return {
      totalTags: tags.length,
      duration: Math.round(duration / 1000),
      playerCount: players.length,
      mvp: mvp?.name,
      winner: players.find(p => p.id === this.gameData.winnerId)?.name,
    };
  }

  /**
   * Get top highlights for quick share
   */
  getTopHighlights(count = 5) {
    return [...this.highlights]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, count);
  }

  /**
   * Export timeline as shareable data
   */
  exportTimeline() {
    return {
      gameId: this.gameData?.id,
      gameName: this.gameData?.settings?.gameName,
      date: this.gameData?.startedAt,
      duration: this.getTotalDuration(),
      highlights: this.highlights.length,
      timeline: this.cinematicTimeline,
      stats: this.generateStats(),
    };
  }

  /**
   * Get total duration of cinematic replay
   */
  getTotalDuration() {
    if (this.cinematicTimeline.length === 0) return 0;
    const lastClip = this.cinematicTimeline[this.cinematicTimeline.length - 1];
    return lastClip.startTime + lastClip.duration;
  }

  /**
   * Generate share text
   */
  generateShareText() {
    const stats = this.generateStats();
    return `🎮 TAG! Game Highlight\n` +
           `👥 ${stats.playerCount} players\n` +
           `🎯 ${stats.totalTags} tags\n` +
           `⏱️ ${Math.floor(stats.duration / 60)}:${(stats.duration % 60).toString().padStart(2, '0')}\n` +
           `🏆 Winner: ${stats.winner || 'Unknown'}\n` +
           `⭐ MVP: ${stats.mvp || 'Unknown'}`;
  }
}

// Singleton
export const cinematicReplayService = new CinematicReplayService();
export default cinematicReplayService;

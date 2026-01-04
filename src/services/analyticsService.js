/**
 * Analytics Service
 * Phase 7: User analytics tracking, event logging, performance monitoring
 */

// Analytics event names
export const AnalyticsEvent = {
  // Session events
  APP_OPEN: 'app_open',
  APP_CLOSE: 'app_close',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',

  // User events
  USER_SIGNUP: 'user_signup',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  PROFILE_UPDATE: 'profile_update',

  // Game events
  GAME_CREATE: 'game_create',
  GAME_JOIN: 'game_join',
  GAME_START: 'game_start',
  GAME_END: 'game_end',
  GAME_LEAVE: 'game_leave',
  TAG_MADE: 'tag_made',
  TAG_RECEIVED: 'tag_received',

  // Social events
  FRIEND_ADD: 'friend_add',
  FRIEND_REMOVE: 'friend_remove',
  FRIEND_INVITE: 'friend_invite',
  CHAT_SEND: 'chat_send',

  // Feature usage
  POWERUP_COLLECT: 'powerup_collect',
  POWERUP_USE: 'powerup_use',
  ACHIEVEMENT_UNLOCK: 'achievement_unlock',
  CHALLENGE_COMPLETE: 'challenge_complete',
  LEADERBOARD_VIEW: 'leaderboard_view',
  SETTINGS_CHANGE: 'settings_change',

  // Navigation
  SCREEN_VIEW: 'screen_view',
  BUTTON_CLICK: 'button_click',
  FEATURE_DISCOVER: 'feature_discover',

  // Performance
  PERF_MARK: 'performance_mark',
  ERROR_OCCUR: 'error_occur',
  API_REQUEST: 'api_request',

  // Engagement
  SHARE_GAME: 'share_game',
  INVITE_SENT: 'invite_sent',
  NOTIFICATION_CLICK: 'notification_click',
  DAILY_REWARD_CLAIM: 'daily_reward_claim',
};

class AnalyticsService {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.userId = null;
    this.deviceInfo = this.getDeviceInfo();
    this.eventQueue = [];
    this.flushInterval = null;
    this.isEnabled = true;
    this.performanceMarks = new Map();

    // Start flush interval
    this.startFlushInterval();

    // Track session start
    this.track(AnalyticsEvent.SESSION_START, {
      device: this.deviceInfo,
    });

    // Track page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.track(AnalyticsEvent.APP_CLOSE);
          this.flush();
        } else {
          this.track(AnalyticsEvent.APP_OPEN);
        }
      });
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device/browser info
   */
  getDeviceInfo() {
    if (typeof window === 'undefined') return {};

    const ua = navigator.userAgent;
    return {
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: screen.width,
      screenHeight: screen.height,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userAgent: ua,
      isMobile: /Mobile|Android|iPhone|iPad/.test(ua),
      isPWA: window.matchMedia('(display-mode: standalone)').matches,
    };
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId) {
    this.userId = userId;
    this.track(AnalyticsEvent.USER_LOGIN, { userId });
  }

  /**
   * Clear user ID on logout
   */
  clearUserId() {
    this.track(AnalyticsEvent.USER_LOGOUT, { userId: this.userId });
    this.userId = null;
  }

  /**
   * Enable/disable tracking
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Track an event
   */
  track(eventName, properties = {}) {
    if (!this.isEnabled) return;

    const event = {
      event: eventName,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: Date.now(),
        sessionDuration: Date.now() - this.sessionStart,
      },
    };

    this.eventQueue.push(event);

    // Log in development
    if (import.meta.env.DEV) {
      console.log('[Analytics]', eventName, properties);
    }

    // Immediate flush for important events
    if (this.isImportantEvent(eventName)) {
      this.flush();
    }
  }

  /**
   * Track screen view
   */
  trackScreen(screenName, properties = {}) {
    this.track(AnalyticsEvent.SCREEN_VIEW, {
      screen: screenName,
      ...properties,
    });
  }

  /**
   * Track button click
   */
  trackClick(buttonName, properties = {}) {
    this.track(AnalyticsEvent.BUTTON_CLICK, {
      button: buttonName,
      ...properties,
    });
  }

  /**
   * Track error
   */
  trackError(error, context = {}) {
    this.track(AnalyticsEvent.ERROR_OCCUR, {
      errorMessage: error.message,
      errorStack: error.stack?.slice(0, 500),
      errorName: error.name,
      ...context,
    });
  }

  /**
   * Start performance mark
   */
  startPerformanceMark(name) {
    this.performanceMarks.set(name, Date.now());
  }

  /**
   * End performance mark and track
   */
  endPerformanceMark(name, properties = {}) {
    const startTime = this.performanceMarks.get(name);
    if (!startTime) return;

    const duration = Date.now() - startTime;
    this.performanceMarks.delete(name);

    this.track(AnalyticsEvent.PERF_MARK, {
      markName: name,
      duration,
      ...properties,
    });

    return duration;
  }

  /**
   * Track API request
   */
  trackApiRequest(endpoint, method, duration, success, statusCode) {
    this.track(AnalyticsEvent.API_REQUEST, {
      endpoint,
      method,
      duration,
      success,
      statusCode,
    });
  }

  /**
   * Check if event should trigger immediate flush
   */
  isImportantEvent(eventName) {
    return [
      AnalyticsEvent.USER_SIGNUP,
      AnalyticsEvent.GAME_END,
      AnalyticsEvent.ACHIEVEMENT_UNLOCK,
      AnalyticsEvent.ERROR_OCCUR,
    ].includes(eventName);
  }

  /**
   * Start periodic flush
   */
  startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Flush events to server
   */
  async flush() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Only send to server in production
      if (!import.meta.env.DEV) {
        await fetch('/api/analytics/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events }),
          keepalive: true, // Allow in visibilitychange
        });
      }
    } catch (error) {
      // Re-queue failed events
      this.eventQueue = [...events, ...this.eventQueue];
      console.warn('Failed to flush analytics:', error);
    }
  }

  /**
   * Get session duration
   */
  getSessionDuration() {
    return Date.now() - this.sessionStart;
  }

  /**
   * Track game metrics
   */
  trackGameMetrics(game) {
    const duration = game.endedAt - game.startedAt;
    const playerCount = game.players?.length || 0;

    this.track(AnalyticsEvent.GAME_END, {
      gameId: game.id,
      gameMode: game.gameMode || 'classic',
      duration,
      playerCount,
      totalTags: game.tags?.length || 0,
      winnerId: game.winnerId,
    });
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.track(AnalyticsEvent.SESSION_END, {
      duration: this.getSessionDuration(),
    });
    this.flush();
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;

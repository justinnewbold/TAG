/**
 * Notification Sender Utility
 * Call these functions from game logic to trigger push notifications
 */

// Notification types with templates
export const NOTIFICATION_TYPES = {
  GAME_INVITE: {
    title: '🎮 Game Invite!',
    template: (data) => `${data.from} invited you to ${data.gameMode}`,
    action: 'join',
  },
  GAME_STARTING: {
    title: '⏰ Game Starting!',
    template: (data) => `${data.gameName} starts in ${data.seconds} seconds!`,
    action: 'open',
  },
  BEING_HUNTED: {
    title: '🎯 You\'re Being Hunted!',
    template: (data) => `${data.hunter} is coming for you! RUN!`,
    urgent: true,
  },
  TAGGED: {
    title: '👋 You\'ve Been Tagged!',
    template: (data) => `${data.tagger} got you! You're now IT!`,
  },
  TAG_SUCCESS: {
    title: '✅ Tag Successful!',
    template: (data) => `You tagged ${data.target}! Keep hunting!`,
  },
  BOUNTY_PLACED: {
    title: '💰 Bounty on Your Head!',
    template: (data) => `${data.from} placed a ${data.amount} XP bounty on you!`,
    urgent: true,
  },
  BOUNTY_CLAIMED: {
    title: '🏆 Bounty Claimed!',
    template: (data) => `You earned ${data.amount} XP for tagging ${data.target}!`,
  },
  FRIEND_ONLINE: {
    title: '👥 Friend Online',
    template: (data) => `${data.friend} is now online`,
  },
  DAILY_CHALLENGE: {
    title: '📋 New Daily Challenges!',
    template: () => 'Fresh challenges are waiting for you!',
  },
  GAME_ENDED: {
    title: '🏁 Game Over!',
    template: (data) => data.won ? 'Congratulations, you won!' : `${data.winner} won the game!`,
  },
  SPECTATOR_JOIN: {
    title: '👁️ New Spectator',
    template: (data) => `${data.spectator} is now watching your game`,
  },
};

/**
 * Send a notification to a specific user
 */
export async function sendNotification(userId, type, data = {}) {
  const notifConfig = NOTIFICATION_TYPES[type];
  if (!notifConfig) {
    console.error('Unknown notification type:', type);
    return;
  }

  const notification = {
    userId,
    type,
    title: notifConfig.title,
    body: notifConfig.template(data),
    data: {
      ...data,
      type,
      action: notifConfig.action,
      timestamp: Date.now(),
    },
    urgent: notifConfig.urgent || false,
  };

  // Send to backend API
  try {
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to send notification:', err);
    return false;
  }
}

/**
 * Send notification to multiple users
 */
export async function sendBulkNotification(userIds, type, data = {}) {
  return Promise.all(userIds.map(id => sendNotification(id, type, data)));
}

/**
 * Send notification to all players in a game
 */
export async function notifyGamePlayers(gameId, type, data = {}, excludeUserId = null) {
  try {
    const response = await fetch(`/api/games/${gameId}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data, excludeUserId }),
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to notify game players:', err);
    return false;
  }
}

/**
 * Show local notification (for immediate feedback)
 */
export function showLocalNotification(title, body, options = {}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notif = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: options.urgent ? [200, 100, 200, 100, 200] : [200, 100, 200],
      tag: options.tag || 'tag-game',
      renotify: true,
      ...options,
    });

    // Auto-close after 5 seconds
    setTimeout(() => notif.close(), 5000);

    return notif;
  }
  return null;
}

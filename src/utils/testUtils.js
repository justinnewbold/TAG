/**
 * Test Utilities
 * Phase 10: Testing helpers and mock data generators
 */

import { generateId, generateGameCode } from '../../shared/utils';

/**
 * Generate mock user data
 */
export function createMockUser(overrides = {}) {
  return {
    id: generateId(),
    name: `Player${Math.floor(Math.random() * 1000)}`,
    avatar: ['😀', '🏃', '🎮', '⚡', '🔥'][Math.floor(Math.random() * 5)],
    email: null,
    createdAt: Date.now(),
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      totalTags: 0,
      timesTagged: 0,
      longestSurvival: 0,
      totalPlayTime: 0,
      uniqueFriendsPlayed: 0,
      fastestTag: null,
      playedAtNight: false,
    },
    achievements: [],
    ...overrides,
  };
}

/**
 * Generate mock game data
 */
export function createMockGame(overrides = {}) {
  const host = createMockUser();
  return {
    id: generateId(),
    code: generateGameCode(),
    host: host.id,
    hostName: host.name,
    status: 'waiting',
    gameMode: 'classic',
    settings: {
      gpsInterval: 10000,
      tagRadius: 20,
      duration: null,
      maxPlayers: 10,
      gameName: `${host.name}'s Game`,
      noTagZones: [],
      noTagTimes: [],
      isPublic: false,
    },
    players: [{ ...host, isIt: false, joinedAt: Date.now(), tagCount: 0 }],
    itPlayerId: null,
    startedAt: null,
    endedAt: null,
    tags: [],
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Generate mock location
 */
export function createMockLocation(baseLocation = { lat: 37.7749, lng: -122.4194 }, radiusMeters = 100) {
  // Random offset within radius
  const r = radiusMeters / 111320; // Convert meters to degrees (approximately)
  const u = Math.random();
  const v = Math.random();
  const w = r * Math.sqrt(u);
  const t = 2 * Math.PI * v;

  return {
    lat: baseLocation.lat + w * Math.cos(t),
    lng: baseLocation.lng + w * Math.sin(t) / Math.cos(baseLocation.lat * Math.PI / 180),
    accuracy: 10 + Math.random() * 20,
    timestamp: Date.now(),
  };
}

/**
 * Generate mock players
 */
export function createMockPlayers(count = 5, baseLocation = null) {
  const players = [];
  for (let i = 0; i < count; i++) {
    const player = createMockUser({ name: `Player ${i + 1}` });
    if (baseLocation) {
      player.location = createMockLocation(baseLocation, 500);
    }
    players.push({
      ...player,
      isIt: false,
      joinedAt: Date.now() - i * 60000,
      tagCount: Math.floor(Math.random() * 10),
      isOnline: Math.random() > 0.1,
    });
  }
  return players;
}

/**
 * Generate mock achievement
 */
export function createMockAchievement(overrides = {}) {
  return {
    id: `achievement_${generateId()}`,
    name: 'Test Achievement',
    description: 'This is a test achievement',
    icon: '🏆',
    earnedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Generate mock friend
 */
export function createMockFriend(overrides = {}) {
  const user = createMockUser();
  return {
    ...user,
    status: 'accepted',
    addedAt: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    isOnline: Math.random() > 0.5,
    lastSeen: Date.now() - Math.random() * 60 * 60 * 1000,
    ...overrides,
  };
}

/**
 * Generate mock chat message
 */
export function createMockChatMessage(overrides = {}) {
  const sender = createMockUser();
  return {
    id: `msg_${generateId()}`,
    senderId: sender.id,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    content: 'This is a test message',
    type: 'text',
    timestamp: Date.now(),
    ...overrides,
  };
}

/**
 * Generate mock notification
 */
export function createMockNotification(overrides = {}) {
  return {
    id: `notif_${generateId()}`,
    type: 'info',
    title: 'Test Notification',
    body: 'This is a test notification',
    read: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Generate mock power-up
 */
export function createMockPowerup(overrides = {}) {
  const types = ['speed_boost', 'invisibility', 'shield', 'radar'];
  return {
    id: types[Math.floor(Math.random() * types.length)],
    instanceId: `pu_${generateId()}`,
    name: 'Speed Boost',
    effect: 'speed_boost',
    duration: 30000,
    rarity: 'common',
    acquiredAt: Date.now(),
    ...overrides,
  };
}

/**
 * Generate mock leaderboard entry
 */
export function createMockLeaderboardEntry(rank, overrides = {}) {
  const user = createMockUser();
  return {
    rank,
    userId: user.id,
    name: user.name,
    avatar: user.avatar,
    value: Math.floor(Math.random() * 1000),
    ...overrides,
  };
}

/**
 * Generate mock leaderboard
 */
export function createMockLeaderboard(count = 10) {
  return Array.from({ length: count }, (_, i) =>
    createMockLeaderboardEntry(i + 1)
  );
}

/**
 * Wait for a specified time
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(conditionFn, options = {}) {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (conditionFn()) return true;
    await wait(interval);
  }

  throw new Error('Condition not met within timeout');
}

/**
 * Create a mock socket for testing
 */
export function createMockSocket() {
  const listeners = new Map();

  return {
    on: (event, callback) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event).push(callback);
    },
    off: (event, callback) => {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(callback);
        if (index > -1) eventListeners.splice(index, 1);
      }
    },
    emit: (event, data) => {
      // Mock emit - could store for assertions
    },
    trigger: (event, data) => {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach(cb => cb(data));
      }
    },
    connect: () => {},
    disconnect: () => {},
    isConnected: () => true,
  };
}

/**
 * Create a mock API for testing
 */
export function createMockApi() {
  const responses = new Map();

  return {
    setResponse: (endpoint, response) => {
      responses.set(endpoint, response);
    },
    request: async (endpoint) => {
      if (responses.has(endpoint)) {
        return responses.get(endpoint);
      }
      throw new Error(`No mock response for ${endpoint}`);
    },
    getToken: () => 'mock-token',
    setToken: () => {},
    logout: () => {},
  };
}

export default {
  createMockUser,
  createMockGame,
  createMockLocation,
  createMockPlayers,
  createMockAchievement,
  createMockFriend,
  createMockChatMessage,
  createMockNotification,
  createMockPowerup,
  createMockLeaderboard,
  wait,
  waitFor,
  createMockSocket,
  createMockApi,
};

/**
 * Shared game constants used by both client and server
 */

// Game Mode definitions
export const GAME_MODES = {
  classic: {
    id: 'classic',
    name: 'Classic Tag',
    description: 'One player is IT and must tag others. Tagged player becomes the new IT.',
    icon: '🏃',
    color: 'neon-cyan',
    minPlayers: 2,
    features: ['Single IT player', 'Tag transfers IT', 'Last non-IT survives longest wins'],
  },
  freezeTag: {
    id: 'freezeTag',
    name: 'Freeze Tag',
    description: 'Tagged players are frozen until unfrozen by a teammate touching them.',
    icon: '🧊',
    color: 'blue-400',
    minPlayers: 3,
    features: ['Frozen players can\'t move', 'Teammates can unfreeze', 'IT wins when all frozen'],
  },
  infection: {
    id: 'infection',
    name: 'Infection',
    description: 'Tagged players become infected and join the IT team. Last survivor wins!',
    icon: '🧟',
    color: 'green-400',
    minPlayers: 3,
    features: ['Multiple IT players', 'Infection spreads', 'Last survivor wins'],
  },
  teamTag: {
    id: 'teamTag',
    name: 'Team Tag',
    description: 'Two teams compete! Tag players on the opposing team to eliminate them.',
    icon: '⚔️',
    color: 'neon-purple',
    minPlayers: 4,
    features: ['Red vs Blue teams', 'Tag enemies only', 'Last team standing wins'],
  },
  manhunt: {
    id: 'manhunt',
    name: 'Manhunt',
    description: 'One hunter vs all runners. Runners must survive until time runs out!',
    icon: '🎯',
    color: 'neon-orange',
    minPlayers: 3,
    features: ['One dedicated hunter', 'Runners can\'t tag back', 'Survival time matters'],
  },
  hotPotato: {
    id: 'hotPotato',
    name: 'Hot Potato',
    description: 'The IT player has a countdown timer. Pass the tag before time runs out or lose!',
    icon: '🥔',
    color: 'amber-400',
    minPlayers: 3,
    features: ['30-60s countdown', 'Tag resets timer', 'Timer out = eliminated'],
    settings: {
      potatoTimer: 45000, // 45 seconds default
    },
  },
  hideAndSeek: {
    id: 'hideAndSeek',
    name: 'Hide & Seek',
    description: 'Seeker waits while others hide. After hiding phase, the hunt begins!',
    icon: '👀',
    color: 'pink-400',
    minPlayers: 3,
    features: ['Hiding phase (2-5 min)', 'Seeker GPS disabled during hide', 'Find all hiders to win'],
    settings: {
      hideTime: 120000, // 2 minutes default
    },
  },
};

// Achievement definitions
export const ACHIEVEMENTS = {
  firstTag: {
    id: 'firstTag',
    name: 'First Blood',
    description: 'Tag your first player',
    icon: '🎯',
    requirement: (stats) => stats.totalTags >= 1,
  },
  tagged10: {
    id: 'tagged10',
    name: 'Tag Master',
    description: 'Tag 10 players total',
    icon: '🏃',
    requirement: (stats) => stats.totalTags >= 10,
  },
  tagged50: {
    id: 'tagged50',
    name: 'Tag Legend',
    description: 'Tag 50 players total',
    icon: '👑',
    requirement: (stats) => stats.totalTags >= 50,
  },
  survivor: {
    id: 'survivor',
    name: 'Survivor',
    description: 'Survive for 5 minutes without being tagged',
    icon: '🛡️',
    requirement: (stats) => stats.longestSurvival >= 300000,
  },
  firstWin: {
    id: 'firstWin',
    name: 'Victory Royale',
    description: 'Win your first game',
    icon: '🏆',
    requirement: (stats) => stats.gamesWon >= 1,
  },
  win5: {
    id: 'win5',
    name: 'Champion',
    description: 'Win 5 games',
    icon: '⭐',
    requirement: (stats) => stats.gamesWon >= 5,
  },
  social: {
    id: 'social',
    name: 'Social Butterfly',
    description: 'Play with 10 different friends',
    icon: '🦋',
    requirement: (stats) => stats.uniqueFriendsPlayed >= 10,
  },
  marathoner: {
    id: 'marathoner',
    name: 'Marathoner',
    description: 'Play 10 games',
    icon: '🏅',
    requirement: (stats) => stats.gamesPlayed >= 10,
  },
  quickTag: {
    id: 'quickTag',
    name: 'Speed Demon',
    description: 'Tag someone within 30 seconds of being IT',
    icon: '⚡',
    requirement: (stats) => stats.fastestTag && stats.fastestTag <= 30000,
  },
  nightOwl: {
    id: 'nightOwl',
    name: 'Night Owl',
    description: 'Play a game after 10 PM',
    icon: '🦉',
    requirement: (stats) => stats.playedAtNight,
  },
};

// Game settings limits
export const GAME_LIMITS = {
  // GPS update intervals (in milliseconds)
  GPS_INTERVAL_MIN: 5000,      // 5 seconds
  GPS_INTERVAL_MAX: 86400000,  // 24 hours
  GPS_INTERVAL_DEFAULT: 10000, // 10 seconds

  // Tag radius (in meters)
  TAG_RADIUS_MIN: 1,
  TAG_RADIUS_MAX: 1000,
  TAG_RADIUS_DEFAULT: 20,

  // Game duration (in milliseconds)
  DURATION_MIN: 300000,        // 5 minutes
  DURATION_MAX: 2592000000,    // 30 days
  DURATION_DEFAULT: null,      // unlimited

  // Players
  PLAYERS_MIN: 2,
  PLAYERS_MAX: 50,
  PLAYERS_DEFAULT: 10,

  // No-tag zones
  NO_TAG_ZONES_MAX: 10,
  NO_TAG_ZONE_RADIUS_MAX: 1000,

  // No-tag times
  NO_TAG_TIMES_MAX: 10,

  // Hot potato timer (in milliseconds)
  POTATO_TIMER_MIN: 10000,     // 10 seconds
  POTATO_TIMER_MAX: 120000,    // 2 minutes
  POTATO_TIMER_DEFAULT: 45000, // 45 seconds

  // Hide and seek hide time (in milliseconds)
  HIDE_TIME_MIN: 30000,        // 30 seconds
  HIDE_TIME_MAX: 600000,       // 10 minutes
  HIDE_TIME_DEFAULT: 120000,   // 2 minutes
};

// Anti-cheat thresholds
export const ANTI_CHEAT = {
  MAX_RUNNING_SPEED: 15,       // m/s (~54 km/h, faster than Usain Bolt)
  MAX_VEHICLE_SPEED: 35,       // m/s (~126 km/h)
  TELEPORT_THRESHOLD: 100,     // m/s (~360 km/h, definitely cheating)
  MAX_GPS_AGE: 30000,          // Maximum age of GPS data in ms
  MIN_ACCURACY: 100,           // Minimum acceptable GPS accuracy in meters
  LOCATION_UPDATE_RATE_LIMIT: 1000, // Minimum ms between location updates
};

// Socket event rate limits (events per minute)
export const SOCKET_RATE_LIMITS = {
  LOCATION_UPDATE: 120,        // 2 per second max
  TAG_ATTEMPT: 30,             // 0.5 per second max
  CHAT_MESSAGE: 20,            // ~3 per 10 seconds
  GENERAL: 300,                // General events
};

// Power-up types
export const POWERUP_TYPES = {
  SPEED_BOOST: {
    id: 'speed_boost',
    name: 'Speed Boost',
    description: 'Move 50% faster for 30 seconds',
    icon: '⚡',
    duration: 30000,
    effect: 'speed_boost',
    rarity: 'common',
  },
  INVISIBILITY: {
    id: 'invisibility',
    name: 'Invisibility',
    description: 'Hide from the map for 20 seconds',
    icon: '👻',
    duration: 20000,
    effect: 'invisibility',
    rarity: 'rare',
  },
  SHIELD: {
    id: 'shield',
    name: 'Shield',
    description: 'Cannot be tagged for 15 seconds',
    icon: '🛡️',
    duration: 15000,
    effect: 'shield',
    rarity: 'epic',
  },
  RADAR: {
    id: 'radar',
    name: 'Radar Pulse',
    description: 'See all players for 10 seconds',
    icon: '📡',
    duration: 10000,
    effect: 'radar',
    rarity: 'uncommon',
  },
  FREEZE: {
    id: 'freeze',
    name: 'Freeze Ray',
    description: 'Slow nearby players for 10 seconds',
    icon: '❄️',
    duration: 10000,
    effect: 'freeze_area',
    rarity: 'rare',
  },
};

// Game status types
export const GAME_STATUS = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  HIDING: 'hiding',    // Hide and seek hiding phase
  PAUSED: 'paused',
  ENDED: 'ended',
};

// Player status in game
export const PLAYER_STATUS = {
  ACTIVE: 'active',
  FROZEN: 'frozen',
  ELIMINATED: 'eliminated',
  OFFLINE: 'offline',
};

// Teams for team modes
export const TEAMS = {
  RED: 'red',
  BLUE: 'blue',
};

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
    color: 'indigo-500',
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
    color: 'purple-500',
    minPlayers: 4,
    features: ['Red vs Blue teams', 'Tag enemies only', 'Last team standing wins'],
  },
  manhunt: {
    id: 'manhunt',
    name: 'Manhunt',
    description: 'One hunter vs all runners. Runners must survive until time runs out!',
    icon: '🎯',
    color: 'orange-500',
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
  // NEW GAME MODES
  survivalCheckIn: {
    id: 'survivalCheckIn',
    name: 'Survival Check-In',
    description: 'Random check-in prompts appear. Miss a check-in and you\'re eliminated!',
    icon: '✅',
    color: 'emerald-500',
    minPlayers: 2,
    features: ['Random check-in windows', 'Miss = Eliminated', 'Last player standing wins'],
    settings: {
      checkInFrequencyMin: 300000, // 5 minutes minimum
      checkInFrequencyMax: 900000, // 15 minutes maximum
      checkInWindowDuration: 60000, // 60 seconds to respond
      gracePeriods: 1, // 1 free miss allowed
    },
  },
  assassin: {
    id: 'assassin',
    name: 'Assassin',
    description: 'Each player is secretly assigned one target. Tag only your target to advance!',
    icon: '🗡️',
    color: 'red-500',
    minPlayers: 3,
    features: ['Secret target assignments', 'Chain elimination', 'Inherit target on kill'],
    settings: {
      showTargetDistance: true,
      revealOnProximity: false,
    },
  },
  kingOfTheHill: {
    id: 'kingOfTheHill',
    name: 'King of the Hill',
    description: 'Control the designated zone for the longest time. Others try to tag you out!',
    icon: '👑',
    color: 'yellow-500',
    minPlayers: 3,
    features: ['Moving control zones', 'Time-based scoring', 'Tag to steal control'],
    settings: {
      zoneRadius: 50, // meters
      zoneMoveInterval: 300000, // 5 minutes
      winScore: 300, // seconds to win
    },
  },
  battleRoyale: {
    id: 'battleRoyale',
    name: 'Battle Royale',
    description: 'Play area shrinks over time forcing encounters. Last one untagged wins!',
    icon: '🔥',
    color: 'rose-500',
    minPlayers: 3,
    features: ['Shrinking play zone', 'No respawns', 'Tag = Eliminate', 'Global scale support'],
    settings: {
      shrinkInterval: 120000, // 2 minutes between shrinks
      shrinkAmount: 0.15, // 15% smaller each time
      damageOutsideZone: true, // Eliminate if outside too long
      outsideZoneGrace: 30000, // 30 seconds to get back in
      // Global scale settings
      globalMode: false, // Enable for worldwide play
      startingRadius: null, // null = use custom boundary or unlimited
      minimumRadius: 100, // Minimum zone radius in meters
      zoneVisibility: 'always', // 'always', 'warning', 'never'
      eliminationWarningTime: 60000, // 1 minute warning before elimination
    },
  },
  // NEW: Global Battle Royale variant
  globalBattleRoyale: {
    id: 'globalBattleRoyale',
    name: 'Global Battle Royale',
    description: 'Worldwide battle royale! Start anywhere on Earth, zone shrinks globally. Last survivor wins!',
    icon: '🌍',
    color: 'blue-500',
    minPlayers: 10,
    features: ['Worldwide play area', 'Continental shrinking zones', 'GPS tracking across globe', 'Massive scale warfare', 'Country-based phases'],
    settings: {
      shrinkInterval: 3600000, // 1 hour between shrinks for global scale
      shrinkAmount: 0.20, // 20% smaller each shrink
      damageOutsideZone: true,
      outsideZoneGrace: 300000, // 5 minutes to get back in zone (global travel takes time)
      globalMode: true,
      startingRadius: 20015000, // Start with entire globe
      minimumRadius: 1000, // End at 1km radius
      zoneVisibility: 'always',
      eliminationWarningTime: 600000, // 10 minute warning
      phaseCount: 10, // Number of shrink phases
      finalZoneSelectionMethod: 'random_land', // 'random', 'random_land', 'most_players', 'poi'
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
  // NEW ACHIEVEMENTS
  checkInChamp: {
    id: 'checkInChamp',
    name: 'Check-In Champion',
    description: 'Win a Survival Check-In game without missing any check-ins',
    icon: '✅',
    requirement: (stats) => stats.perfectCheckInWins >= 1,
  },
  assassinMaster: {
    id: 'assassinMaster',
    name: 'Silent Assassin',
    description: 'Win an Assassin game with 3+ eliminations',
    icon: '🗡️',
    requirement: (stats) => stats.assassinWins >= 1 && stats.mostAssassinKills >= 3,
  },
  zoneController: {
    id: 'zoneController',
    name: 'Zone Controller',
    description: 'Hold the hill for 5 minutes total in King of the Hill',
    icon: '👑',
    requirement: (stats) => stats.totalHillTime >= 300000,
  },
  royaleWinner: {
    id: 'royaleWinner',
    name: 'Battle Royale Champion',
    description: 'Win a Battle Royale game',
    icon: '🔥',
    requirement: (stats) => stats.battleRoyaleWins >= 1,
  },
  revengeProtector: {
    id: 'revengeProtector',
    name: 'Revenge Denied',
    description: 'Attempt to tag someone during their revenge cooldown',
    icon: '🚫',
    requirement: (stats) => stats.revengeAttemptsBlocked >= 5,
  },
  bluetoothHunter: {
    id: 'bluetoothHunter',
    name: 'Close Encounters',
    description: 'Make 10 tags using Bluetooth proximity',
    icon: '📶',
    requirement: (stats) => stats.bluetoothTags >= 10,
  },
};

// Game settings limits
export const GAME_LIMITS = {
  // GPS update intervals (in milliseconds)
  GPS_INTERVAL_MIN: 5000,      // 5 seconds
  GPS_INTERVAL_MAX: 86400000,  // 24 hours
  GPS_INTERVAL_DEFAULT: 10000, // 10 seconds

  // Tag radius (in meters) - supports globe-scale games
  TAG_RADIUS_MIN: 1,
  TAG_RADIUS_MAX: 20015000,    // Half Earth's circumference (~20,015 km)
  TAG_RADIUS_DEFAULT: 20,

  // Play area radius (in meters) - supports globe-scale games
  PLAY_AREA_RADIUS_MIN: 10,
  PLAY_AREA_RADIUS_MAX: 20015000, // Half Earth's circumference
  PLAY_AREA_RADIUS_DEFAULT: 1000,

  // Game duration (in milliseconds)
  DURATION_MIN: 300000,        // 5 minutes
  DURATION_MAX: 2592000000,    // 30 days
  DURATION_DEFAULT: null,      // unlimited

  // Players
  PLAYERS_MIN: 2,
  PLAYERS_MAX: 1000,           // Increased for massive global games
  PLAYERS_DEFAULT: 10,

  // No-tag zones
  NO_TAG_ZONES_MAX: 100,       // More zones for large-scale games
  NO_TAG_ZONE_RADIUS_MAX: 1000000, // 1000km max zone radius

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

  // NEW: Cooldown settings
  COOLDOWN_MIN: 0,             // No cooldown
  COOLDOWN_MAX: 3600000,       // 1 hour max
  COOLDOWN_DEFAULT: 30000,     // 30 seconds default

  // NEW: Revenge protection
  REVENGE_COOLDOWN_MIN: 0,
  REVENGE_COOLDOWN_MAX: 1800000, // 30 minutes max
  REVENGE_COOLDOWN_DEFAULT: 60000, // 1 minute default

  // NEW: Check-in settings
  CHECKIN_FREQUENCY_MIN: 60000,   // 1 minute minimum
  CHECKIN_FREQUENCY_MAX: 1800000, // 30 minutes maximum
  CHECKIN_WINDOW_MIN: 15000,      // 15 seconds minimum
  CHECKIN_WINDOW_MAX: 120000,     // 2 minutes maximum

  // NEW: Shrinking zone
  SHRINK_INTERVAL_MIN: 60000,     // 1 minute
  SHRINK_INTERVAL_MAX: 600000,    // 10 minutes
  SHRINK_AMOUNT_MIN: 0.05,        // 5%
  SHRINK_AMOUNT_MAX: 0.50,        // 50%

  // NEW: Bluetooth
  BLUETOOTH_RANGE_MIN: 2,         // 2 meters
  BLUETOOTH_RANGE_MAX: 15,        // 15 meters
  BLUETOOTH_RANGE_DEFAULT: 5,     // 5 meters
};

// Tag Cooldown Types
export const COOLDOWN_TYPES = {
  NONE: 'none',
  GLOBAL: 'global',           // Can't tag anyone for X time after tagging
  REVENGE: 'revenge',         // Can't tag YOUR tagger for X time
  TARGET: 'target',           // Same person can't be tagged twice in X time
  POWER_PLAY: 'powerPlay',    // No cooldowns at all (chaos mode)
};

// Cooldown presets
export const COOLDOWN_PRESETS = [
  { value: 0, label: 'No Cooldown', description: 'Instant re-tags allowed' },
  { value: 30000, label: '30 seconds', description: 'Quick cooldown' },
  { value: 60000, label: '1 minute', description: 'Standard' },
  { value: 300000, label: '5 minutes', description: 'Extended' },
  { value: 1800000, label: '30 minutes', description: 'Long protection' },
  { value: 'custom', label: 'Custom', description: 'Set your own time' },
];

// Anti-cheat thresholds
export const ANTI_CHEAT = {
  MAX_RUNNING_SPEED: 15,       // m/s (~54 km/h, faster than Usain Bolt)
  MAX_VEHICLE_SPEED: 35,       // m/s (~126 km/h)
  TELEPORT_THRESHOLD: 100,     // m/s (~360 km/h, definitely cheating)
  MAX_GPS_AGE: 30000,          // Maximum age of GPS data in ms
  MIN_ACCURACY: 100,           // Minimum acceptable GPS accuracy in meters
  LOCATION_UPDATE_RATE_LIMIT: 1000, // Minimum ms between location updates
  // NEW: Motion detection
  REQUIRE_STEP_COUNTING: false, // Require step sensor data
  MIN_STEPS_PER_METER: 0.5,     // Minimum steps expected per meter moved
};

// Socket event rate limits (events per minute)
export const SOCKET_RATE_LIMITS = {
  LOCATION_UPDATE: 120,        // 2 per second max
  TAG_ATTEMPT: 30,             // 0.5 per second max
  CHAT_MESSAGE: 20,            // ~3 per 10 seconds
  CHECKIN_RESPONSE: 10,        // Check-in responses
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
  // NEW POWER-UPS
  DECOY: {
    id: 'decoy',
    name: 'Decoy',
    description: 'Create a fake position blip on the map for 15 seconds',
    icon: '🎭',
    duration: 15000,
    effect: 'decoy',
    rarity: 'uncommon',
  },
  TELEPORT: {
    id: 'teleport',
    name: 'Emergency Teleport',
    description: 'Instantly teleport to a random safe location',
    icon: '🌀',
    duration: 0,
    effect: 'teleport',
    rarity: 'legendary',
  },
  TRAP: {
    id: 'trap',
    name: 'Freeze Trap',
    description: 'Place a trap that freezes the first player who triggers it',
    icon: '🪤',
    duration: 60000, // Trap stays active for 1 minute
    effect: 'trap',
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
  CHECKIN: 'checkin',  // NEW: Check-in phase
  SHRINKING: 'shrinking', // NEW: Zone shrinking
};

// Player status in game
export const PLAYER_STATUS = {
  ACTIVE: 'active',
  FROZEN: 'frozen',
  ELIMINATED: 'eliminated',
  OFFLINE: 'offline',
  CHECKING_IN: 'checkingIn', // NEW: In check-in window
  OUTSIDE_ZONE: 'outsideZone', // NEW: Outside shrinking zone
};

// Teams for team modes
export const TEAMS = {
  RED: 'red',
  BLUE: 'blue',
};

// Bluetooth proximity states
export const BLUETOOTH_STATES = {
  UNAVAILABLE: 'unavailable',
  DISABLED: 'disabled',
  SCANNING: 'scanning',
  CONNECTED: 'connected',
  IN_RANGE: 'inRange',
  OUT_OF_RANGE: 'outOfRange',
};

// Check-in states
export const CHECKIN_STATES = {
  WAITING: 'waiting',         // Waiting for next check-in
  ACTIVE: 'active',           // Check-in window open
  RESPONDED: 'responded',     // Player checked in
  MISSED: 'missed',           // Player missed check-in
  GRACE: 'grace',             // Using grace period
};


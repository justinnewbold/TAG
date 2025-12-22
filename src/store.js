import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);
const generateGameCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

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
    requirement: (stats) => stats.totalTags >= 1
  },
  tagged10: {
    id: 'tagged10',
    name: 'Tag Master',
    description: 'Tag 10 players total',
    icon: '🏃',
    requirement: (stats) => stats.totalTags >= 10
  },
  tagged50: {
    id: 'tagged50',
    name: 'Tag Legend',
    description: 'Tag 50 players total',
    icon: '👑',
    requirement: (stats) => stats.totalTags >= 50
  },
  survivor: {
    id: 'survivor',
    name: 'Survivor',
    description: 'Survive for 5 minutes without being tagged',
    icon: '🛡️',
    requirement: (stats) => stats.longestSurvival >= 300000
  },
  firstWin: {
    id: 'firstWin',
    name: 'Victory Royale',
    description: 'Win your first game',
    icon: '🏆',
    requirement: (stats) => stats.gamesWon >= 1
  },
  win5: {
    id: 'win5',
    name: 'Champion',
    description: 'Win 5 games',
    icon: '⭐',
    requirement: (stats) => stats.gamesWon >= 5
  },
  social: {
    id: 'social',
    name: 'Social Butterfly',
    description: 'Play with 10 different friends',
    icon: '🦋',
    requirement: (stats) => stats.uniqueFriendsPlayed >= 10
  },
  marathoner: {
    id: 'marathoner',
    name: 'Marathoner',
    description: 'Play 10 games',
    icon: '🏅',
    requirement: (stats) => stats.gamesPlayed >= 10
  },
  quickTag: {
    id: 'quickTag',
    name: 'Speed Demon',
    description: 'Tag someone within 30 seconds of being IT',
    icon: '⚡',
    requirement: (stats) => stats.fastestTag && stats.fastestTag <= 30000
  },
  nightOwl: {
    id: 'nightOwl',
    name: 'Night Owl',
    description: 'Play a game after 10 PM',
    icon: '🦉',
    requirement: (stats) => stats.playedAtNight
  },
};

// Helper to check if current time is in a no-tag period
export const isInNoTagTime = (noTagTimes) => {
  if (!noTagTimes || noTagTimes.length === 0) return false;
  
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  return noTagTimes.some(rule => {
    // Check if current day is included
    if (!rule.days.includes(currentDay)) return false;
    
    // Parse times
    const [startHour, startMin] = rule.startTime.split(':').map(Number);
    const [endHour, endMin] = rule.endTime.split(':').map(Number);
    const startMins = startHour * 60 + startMin;
    const endMins = endHour * 60 + endMin;
    
    // Handle overnight times (e.g., 22:00 - 06:00)
    if (endMins < startMins) {
      return currentTime >= startMins || currentTime <= endMins;
    }
    
    return currentTime >= startMins && currentTime <= endMins;
  });
};

// Helper to check if location is in a no-tag zone
export const isInNoTagZone = (location, noTagZones) => {
  if (!location || !noTagZones || noTagZones.length === 0) return false;
  
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  return noTagZones.some(zone => {
    const distance = getDistance(location.lat, location.lng, zone.lat, zone.lng);
    return distance <= zone.radius;
  });
};

// Check if tagging is currently allowed
export const canTagNow = (game, taggerLocation, targetLocation) => {
  // Check no-tag times
  if (isInNoTagTime(game?.settings?.noTagTimes)) {
    return { allowed: false, reason: 'No-tag time period active' };
  }
  
  // Check if tagger is in no-tag zone
  if (isInNoTagZone(taggerLocation, game?.settings?.noTagZones)) {
    return { allowed: false, reason: 'You are in a safe zone' };
  }
  
  // Check if target is in no-tag zone
  if (isInNoTagZone(targetLocation, game?.settings?.noTagZones)) {
    return { allowed: false, reason: 'Target is in a safe zone' };
  }
  
  return { allowed: true, reason: null };
};

// Initial state
const initialState = {
  user: null,
  currentGame: null,
  games: [],
  friends: [],
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
    // New stats
    currentWinStreak: 0,
    bestWinStreak: 0,
    currentDailyStreak: 0,
    bestDailyStreak: 0,
    lastPlayDate: null,
    mostTagsInGame: 0,
    longestGamePlayed: 0,
    powerupsUsed: 0,
    powerupsCollected: 0,
  },
  achievements: [],
  newAchievement: null,
  settings: {
    notifications: true,
    sound: true,
    vibration: true,
    highAccuracyGPS: true,
    darkMode: true,
    showDistance: true,
    hasSeenOnboarding: false,
    // Battery optimization
    batteryMode: 'balanced', // 'power-save', 'balanced', 'high-accuracy'
    // Accessibility
    colorblindMode: 'none',
    largeText: false,
    reducedMotion: false,
    largeTouchTargets: false,
    audioCues: true,
    voiceAnnouncements: false,
    strongHaptics: false,
    // Game preferences
    autoJoinRematch: false,
    showSpectatorCount: true,
    enablePowerups: true,
    enableChat: true,
  },
  pendingInvites: [],
  // Power-ups
  powerupInventory: [],
  activePowerupEffects: [],
  // Game pause state
  isPaused: false,
  pausedAt: null,
};

export const useStore = create(
  persist(
    (set, get) => ({
      ...initialState,
      
      // User actions
      setUser: (user) => set({ user }),
      
      updateUserLocation: (location) => set((state) => ({
        user: state.user ? { ...state.user, location, lastUpdate: Date.now() } : null,
      })),
      
      updateUserProfile: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),
      
      // Achievement checking
      checkAchievements: () => {
        const state = get();
        const newAchievements = [];
        
        Object.values(ACHIEVEMENTS).forEach((achievement) => {
          if (!state.achievements.includes(achievement.id) && achievement.requirement(state.stats)) {
            newAchievements.push(achievement.id);
          }
        });
        
        if (newAchievements.length > 0) {
          const firstNew = ACHIEVEMENTS[newAchievements[0]];
          set((state) => ({
            achievements: [...state.achievements, ...newAchievements],
            newAchievement: firstNew,
          }));
        }
      },
      
      clearNewAchievement: () => set({ newAchievement: null }),
      
      // Game actions
      createGame: (settings) => {
        const gameCode = generateGameCode();
        const user = get().user;
        const gameMode = settings.gameMode || 'classic';
        const game = {
          id: generateId(),
          code: gameCode,
          host: user?.id,
          hostName: user?.name,
          status: 'waiting',
          gameMode: gameMode,
          settings: {
            gpsInterval: settings.gpsInterval || 5 * 60 * 1000, // Default 5 minutes
            tagRadius: settings.tagRadius || 20,
            duration: settings.duration || null,
            maxPlayers: settings.maxPlayers || 10,
            gameName: settings.gameName || `${user?.name}'s Game`,
            noTagZones: settings.noTagZones || [],
            noTagTimes: settings.noTagTimes || [],
            potatoTimer: settings.potatoTimer || 45000,
            hideTime: settings.hideTime || 120000,
            // New settings for public/private games, solo play, and scheduling
            isPublic: settings.isPublic ?? false,
            allowSoloPlay: settings.allowSoloPlay ?? false,
            minPlayers: settings.minPlayers ?? null,
            scheduledStartTime: settings.scheduledStartTime ?? null,
            requireApproval: settings.requireApproval ?? false,
          },
          players: [{
            ...user,
            isIt: false,
            isFrozen: false,
            isEliminated: false,
            team: null,
            joinedAt: Date.now(),
            tagCount: 0,
            survivalTime: 0,
          }],
          itPlayerId: null,
          itPlayerIds: [],
          startedAt: null,
          endedAt: null,
          hidePhaseEndAt: null,
          potatoExpiresAt: null,
          tags: [],
          createdAt: Date.now(),
        };
        
        set((state) => ({
          currentGame: game,
          games: [...state.games, game],
        }));
        
        return game;
      },
      
      joinGame: (gameCode) => {
        const user = get().user;
        if (!user) return null;
        
        set((state) => {
          const game = state.games.find(g => g.code === gameCode);
          if (!game || game.status !== 'waiting') return state;
          
          if (game.players.some(p => p.id === user.id)) {
            return { currentGame: game };
          }
          
          if (game.players.length >= game.settings.maxPlayers) {
            return state;
          }
          
          const updatedGame = {
            ...game,
            players: [...game.players, {
              ...user,
              isIt: false,
              joinedAt: Date.now(),
              tagCount: 0,
              survivalTime: 0,
            }],
          };
          
          return {
            currentGame: updatedGame,
            games: state.games.map(g => g.id === game.id ? updatedGame : g),
          };
        });
        
        return get().currentGame;
      },
      
      startGame: () => {
        const hour = new Date().getHours();
        const isNight = hour >= 22 || hour < 5;
        
        set((state) => {
          if (!state.currentGame) return state;
          
          const players = state.currentGame.players;
          const itIndex = Math.floor(Math.random() * players.length);
          const itPlayerId = players[itIndex].id;
          
          const updatedGame = {
            ...state.currentGame,
            status: 'active',
            itPlayerId,
            startedAt: Date.now(),
            players: players.map(p => ({
              ...p,
              isIt: p.id === itPlayerId,
              becameItAt: p.id === itPlayerId ? Date.now() : null,
            })),
          };
          
          const newStats = { ...state.stats };
          if (isNight) {
            newStats.playedAtNight = true;
          }
          
          return {
            currentGame: updatedGame,
            games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
            stats: newStats,
          };
        });
        
        get().checkAchievements();
      },
      
      tagPlayer: (taggedPlayerId) => {
        const state = get();
        const currentGame = state.currentGame;

        if (!currentGame || currentGame.status !== 'active') return { success: false };

        // Verify the current user is IT (only IT can tag)
        if (currentGame.itPlayerId !== state.user?.id) {
          return { success: false, reason: 'Only IT can tag' };
        }

        // Check no-tag rules
        const tagger = currentGame.players.find(p => p.id === currentGame.itPlayerId);
        const target = currentGame.players.find(p => p.id === taggedPlayerId);
        
        const tagCheck = canTagNow(currentGame, tagger?.location, target?.location);
        if (!tagCheck.allowed) {
          return { success: false, reason: tagCheck.reason };
        }
        
        set((state) => {
          const now = Date.now();
          const taggerId = state.currentGame.itPlayerId;
          const currentTagger = state.currentGame.players.find(p => p.id === taggerId);
          const tagTime = currentTagger?.becameItAt ? now - currentTagger.becameItAt : null;
          
          const tag = {
            id: generateId(),
            taggerId,
            taggedId: taggedPlayerId,
            timestamp: now,
            tagTime,
          };
          
          const updatedGame = {
            ...state.currentGame,
            itPlayerId: taggedPlayerId,
            tags: [...state.currentGame.tags, tag],
            players: state.currentGame.players.map(p => ({
              ...p,
              isIt: p.id === taggedPlayerId,
              tagCount: p.id === taggerId ? (p.tagCount || 0) + 1 : p.tagCount,
              // Track when player became IT (used for final survival time calculation)
              becameItAt: p.id === taggedPlayerId ? now : (p.id === taggerId ? null : p.becameItAt),
            })),
          };
          
          const newStats = { ...state.stats };
          if (taggerId === state.user?.id) {
            newStats.totalTags += 1;
            if (tagTime && (!newStats.fastestTag || tagTime < newStats.fastestTag)) {
              newStats.fastestTag = tagTime;
            }
          }
          if (taggedPlayerId === state.user?.id) {
            newStats.timesTagged += 1;
          }
          
          return {
            currentGame: updatedGame,
            games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
            stats: newStats,
          };
        });
        
        get().checkAchievements();
        return { success: true };
      },
      
      endGame: (winnerId = null) => {
        set((state) => {
          if (!state.currentGame) return state;
          
          const now = Date.now();
          const gameTime = state.currentGame.startedAt ? now - state.currentGame.startedAt : 0;
          
          // Calculate final survival time for each player
          const playerStats = state.currentGame.players.map(p => {
            let survivalTime;
            if (p.isIt) {
              // Currently IT at game end - survival time is time before they became IT
              survivalTime = p.becameItAt ? p.becameItAt - state.currentGame.startedAt : 0;
            } else if (p.becameItAt) {
              // Was IT at some point but passed it - survival = time before becoming IT
              survivalTime = p.becameItAt - state.currentGame.startedAt;
            } else {
              // Never was IT - survived the whole game
              survivalTime = gameTime;
            }
            return { ...p, finalSurvivalTime: Math.max(0, survivalTime) };
          });
          
          const actualWinner = winnerId || playerStats
            .filter(p => !p.isIt)
            .sort((a, b) => b.finalSurvivalTime - a.finalSurvivalTime)[0]?.id;
          
          const updatedGame = {
            ...state.currentGame,
            status: 'ended',
            endedAt: now,
            winnerId: actualWinner,
            players: playerStats,
          };
          
          const newStats = { ...state.stats };
          newStats.gamesPlayed += 1;
          newStats.totalPlayTime += gameTime;
          
          if (actualWinner === state.user?.id) {
            newStats.gamesWon += 1;
          }
          
          const userPlayer = playerStats.find(p => p.id === state.user?.id);
          if (userPlayer && userPlayer.finalSurvivalTime > newStats.longestSurvival) {
            newStats.longestSurvival = userPlayer.finalSurvivalTime;
          }
          
          const friendIds = new Set();
          state.games.forEach(g => {
            g.players.forEach(p => {
              if (p.id !== state.user?.id) friendIds.add(p.id);
            });
          });
          newStats.uniqueFriendsPlayed = friendIds.size;
          
          return {
            currentGame: null,
            games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
            stats: newStats,
          };
        });
        
        get().checkAchievements();
      },
      
      leaveGame: () => {
        set((state) => {
          if (!state.currentGame) return state;
          
          const updatedGame = {
            ...state.currentGame,
            players: state.currentGame.players.filter(p => p.id !== state.user?.id),
          };
          
          return {
            currentGame: null,
            games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
          };
        });
      },
      
      updatePlayerLocation: (playerId, location) => {
        set((state) => {
          if (!state.currentGame) return state;
          
          const updatedGame = {
            ...state.currentGame,
            players: state.currentGame.players.map(p =>
              p.id === playerId ? { ...p, location, lastUpdate: Date.now() } : p
            ),
          };
          
          return {
            currentGame: updatedGame,
            games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
          };
        });
      },
      
      // Demo players
      addDemoPlayers: () => {
        set((state) => {
          if (!state.currentGame || !state.user?.location) return state;
          
          const baseLat = state.user.location.lat;
          const baseLng = state.user.location.lng;
          
          const demoPlayers = [
            {
              id: 'demo1',
              name: 'Alex',
              avatar: '🏃',
              location: { lat: baseLat + 0.001, lng: baseLng + 0.001 },
              isIt: false,
              joinedAt: Date.now(),
              lastUpdate: Date.now(),
              tagCount: 0,
              survivalTime: 0,
            },
            {
              id: 'demo2',
              name: 'Sam',
              avatar: '🏃‍♀️',
              location: { lat: baseLat - 0.001, lng: baseLng + 0.002 },
              isIt: false,
              joinedAt: Date.now(),
              lastUpdate: Date.now(),
              tagCount: 0,
              survivalTime: 0,
            },
            {
              id: 'demo3',
              name: 'Jordan',
              avatar: '🏃‍♂️',
              location: { lat: baseLat + 0.0005, lng: baseLng - 0.001 },
              isIt: false,
              joinedAt: Date.now(),
              lastUpdate: Date.now(),
              tagCount: 0,
              survivalTime: 0,
            },
          ];
          
          const updatedGame = {
            ...state.currentGame,
            players: [...state.currentGame.players, ...demoPlayers],
          };
          
          return {
            currentGame: updatedGame,
            games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
          };
        });
      },
      
      // Friends actions
      addFriend: (friend) => set((state) => ({
        friends: [...state.friends, { ...friend, id: generateId(), addedAt: Date.now(), status: 'active' }],
      })),
      
      removeFriend: (friendId) => set((state) => ({
        friends: state.friends.filter(f => f.id !== friendId),
      })),
      
      // Invites
      sendInvite: (contact, gameCode) => {
        const invite = {
          id: generateId(),
          contact,
          gameCode,
          sentAt: Date.now(),
          status: 'pending',
        };
        set((state) => ({
          pendingInvites: [...state.pendingInvites, invite],
        }));
        return invite;
      },
      
      // Settings
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),
      
      clearGameHistory: () => set((state) => ({
        games: state.games.filter(g => g.id === state.currentGame?.id),
      })),
      
      // Game pause functionality
      pauseGame: () => set((state) => ({
        isPaused: true,
        pausedAt: Date.now(),
      })),
      
      resumeGame: () => set((state) => ({
        isPaused: false,
        pausedAt: null,
      })),
      
      // Power-up actions
      addPowerup: (powerup) => set((state) => ({
        powerupInventory: [...state.powerupInventory, {
          ...powerup,
          instanceId: `${powerup.id}_${Date.now()}`,
          acquiredAt: Date.now(),
        }],
        stats: {
          ...state.stats,
          powerupsCollected: state.stats.powerupsCollected + 1,
        },
      })),
      
      usePowerup: (powerupId) => {
        const state = get();
        const powerupIndex = state.powerupInventory.findIndex(p => p.id === powerupId);
        if (powerupIndex === -1) return { success: false, reason: 'Not in inventory' };
        
        const powerup = state.powerupInventory[powerupIndex];
        
        set((state) => {
          const newInventory = [...state.powerupInventory];
          newInventory.splice(powerupIndex, 1);
          
          const newEffects = powerup.duration > 0 
            ? [...state.activePowerupEffects, {
                ...powerup,
                startedAt: Date.now(),
                expiresAt: Date.now() + powerup.duration,
              }]
            : state.activePowerupEffects;
          
          return {
            powerupInventory: newInventory,
            activePowerupEffects: newEffects,
            stats: {
              ...state.stats,
              powerupsUsed: state.stats.powerupsUsed + 1,
            },
          };
        });
        
        return { success: true, effect: powerup.effect, duration: powerup.duration };
      },
      
      removePowerupEffect: (instanceId) => set((state) => ({
        activePowerupEffects: state.activePowerupEffects.filter(e => e.instanceId !== instanceId),
      })),
      
      hasPowerupEffect: (effectType) => {
        const state = get();
        return state.activePowerupEffects.some(
          e => e.effect === effectType && Date.now() < e.expiresAt
        );
      },
      
      // Update streaks
      updateStreaks: (won) => set((state) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMs = today.getTime();
        
        const lastPlay = state.stats.lastPlayDate;
        const lastPlayDate = lastPlay ? new Date(lastPlay) : null;
        lastPlayDate?.setHours(0, 0, 0, 0);
        
        let newDailyStreak = state.stats.currentDailyStreak;
        let newWinStreak = state.stats.currentWinStreak;
        
        // Check daily streak
        if (!lastPlayDate || lastPlayDate.getTime() < todayMs) {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (lastPlayDate && lastPlayDate.getTime() === yesterday.getTime()) {
            newDailyStreak = state.stats.currentDailyStreak + 1;
          } else if (!lastPlayDate || lastPlayDate.getTime() < yesterday.getTime()) {
            newDailyStreak = 1;
          }
        }
        
        // Check win streak
        if (won) {
          newWinStreak = state.stats.currentWinStreak + 1;
        } else {
          newWinStreak = 0;
        }
        
        return {
          stats: {
            ...state.stats,
            currentWinStreak: newWinStreak,
            bestWinStreak: Math.max(state.stats.bestWinStreak, newWinStreak),
            currentDailyStreak: newDailyStreak,
            bestDailyStreak: Math.max(state.stats.bestDailyStreak, newDailyStreak),
            lastPlayDate: Date.now(),
          },
        };
      }),
      
      reset: () => set(initialState),
      
      logout: () => set({
        user: null,
        currentGame: null,
      }),

      // Socket event handlers for real-time multiplayer
      syncGameState: (game) => set((state) => {
        if (!game) return { currentGame: null };

        // Update games list if this game exists
        const gameExists = state.games.some(g => g.id === game.id);
        const updatedGames = gameExists
          ? state.games.map(g => g.id === game.id ? game : g)
          : [...state.games, game];

        return {
          currentGame: game,
          games: updatedGames,
        };
      }),

      handlePlayerJoined: ({ player, playerCount }) => set((state) => {
        if (!state.currentGame) return state;

        // Check if player already exists
        const exists = state.currentGame.players.some(p => p.id === player.id);
        if (exists) return state;

        const updatedGame = {
          ...state.currentGame,
          players: [...state.currentGame.players, {
            ...player,
            isIt: false,
            joinedAt: Date.now(),
            tagCount: 0,
            survivalTime: 0,
          }],
        };

        return {
          currentGame: updatedGame,
          games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
        };
      }),

      handlePlayerLeft: ({ playerId, newHost, playerCount }) => set((state) => {
        if (!state.currentGame) return state;

        const updatedGame = {
          ...state.currentGame,
          players: state.currentGame.players.filter(p => p.id !== playerId),
          host: newHost || state.currentGame.host,
        };

        return {
          currentGame: updatedGame,
          games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
        };
      }),

      handlePlayerLocation: ({ playerId, location, timestamp }) => set((state) => {
        if (!state.currentGame) return state;

        const updatedGame = {
          ...state.currentGame,
          players: state.currentGame.players.map(p =>
            p.id === playerId ? { ...p, location, lastUpdate: timestamp } : p
          ),
        };

        return {
          currentGame: updatedGame,
          games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
        };
      }),

      handlePlayerTagged: ({ taggerId, taggedId, newItPlayerId, tagTime, tag }) => {
        set((state) => {
          if (!state.currentGame) return state;

          const now = Date.now();
          const updatedGame = {
            ...state.currentGame,
            itPlayerId: newItPlayerId,
            tags: [...state.currentGame.tags, tag],
            players: state.currentGame.players.map(p => ({
              ...p,
              isIt: p.id === newItPlayerId,
              tagCount: p.id === taggerId ? (p.tagCount || 0) + 1 : p.tagCount,
              becameItAt: p.id === newItPlayerId ? now : null,
            })),
          };

          const newStats = { ...state.stats };
          if (taggerId === state.user?.id) {
            newStats.totalTags += 1;
            if (tagTime && (!newStats.fastestTag || tagTime < newStats.fastestTag)) {
              newStats.fastestTag = tagTime;
            }
          }
          if (taggedId === state.user?.id) {
            newStats.timesTagged += 1;
          }

          return {
            currentGame: updatedGame,
            games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
            stats: newStats,
          };
        });

        get().checkAchievements();
      },

      handleGameStarted: ({ game, itPlayerId }) => {
        const hour = new Date().getHours();
        const isNight = hour >= 22 || hour < 5;

        set((state) => {
          const newStats = { ...state.stats };
          if (isNight) {
            newStats.playedAtNight = true;
          }

          return {
            currentGame: game,
            games: state.games.map(g => g.id === game.id ? game : g),
            stats: newStats,
          };
        });

        get().checkAchievements();
      },

      handleGameEnded: ({ game, winnerId, summary }) => {
        set((state) => {
          const gameTime = game.gameDuration || 0;

          const newStats = { ...state.stats };
          newStats.gamesPlayed += 1;
          newStats.totalPlayTime += gameTime;

          if (winnerId === state.user?.id) {
            newStats.gamesWon += 1;
          }

          const userPlayer = game.players.find(p => p.id === state.user?.id);
          if (userPlayer?.finalSurvivalTime > newStats.longestSurvival) {
            newStats.longestSurvival = userPlayer.finalSurvivalTime;
          }

          // Update unique friends count
          const friendIds = new Set();
          state.games.forEach(g => {
            g.players.forEach(p => {
              if (p.id !== state.user?.id) friendIds.add(p.id);
            });
          });
          game.players.forEach(p => {
            if (p.id !== state.user?.id) friendIds.add(p.id);
          });
          newStats.uniqueFriendsPlayed = friendIds.size;

          return {
            currentGame: null,
            games: state.games.map(g => g.id === game.id ? game : g),
            stats: newStats,
            lastGameSummary: summary,
          };
        });

        get().checkAchievements();
      },

      handlePlayerOffline: ({ playerId }) => set((state) => {
        if (!state.currentGame) return state;

        const updatedGame = {
          ...state.currentGame,
          players: state.currentGame.players.map(p =>
            p.id === playerId ? { ...p, isOnline: false } : p
          ),
        };

        return {
          currentGame: updatedGame,
          games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
        };
      }),

      handlePlayerOnline: ({ playerId }) => set((state) => {
        if (!state.currentGame) return state;

        const updatedGame = {
          ...state.currentGame,
          players: state.currentGame.players.map(p =>
            p.id === playerId ? { ...p, isOnline: true } : p
          ),
        };

        return {
          currentGame: updatedGame,
          games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
        };
      }),

      clearLastGameSummary: () => set({ lastGameSummary: null }),
    }),
    {
      name: 'tag-game-storage',
      partialize: (state) => ({
        user: state.user,
        games: state.games,
        friends: state.friends,
        stats: state.stats,
        achievements: state.achievements,
        settings: state.settings,
      }),
    }
  )
);

// Sound effects hook
export const useSounds = () => {
  const { settings } = useStore();
  
  const playSound = (soundName) => {
    if (!settings.sound) return;
    
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      switch (soundName) {
        case 'tag':
          oscillator.frequency.value = 800;
          gainNode.gain.value = 0.3;
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        case 'tagged':
          oscillator.frequency.value = 300;
          gainNode.gain.value = 0.3;
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'gameStart':
          oscillator.frequency.value = 440;
          gainNode.gain.value = 0.2;
          oscillator.start();
          oscillator.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.2);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'achievement':
          oscillator.type = 'triangle';
          oscillator.frequency.value = 523;
          gainNode.gain.value = 0.2;
          oscillator.start();
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          oscillator.stop(ctx.currentTime + 0.4);
          break;
        case 'error':
          oscillator.frequency.value = 200;
          gainNode.gain.value = 0.2;
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.2);
          break;
        case 'countdown':
          oscillator.type = 'sine';
          oscillator.frequency.value = 880;
          gainNode.gain.value = 0.25;
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        case 'warning':
          oscillator.type = 'sawtooth';
          oscillator.frequency.value = 440;
          gainNode.gain.value = 0.15;
          oscillator.start();
          oscillator.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.3);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'powerup':
          oscillator.type = 'triangle';
          oscillator.frequency.value = 600;
          gainNode.gain.value = 0.2;
          oscillator.start();
          oscillator.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.15);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
        case 'chat':
          oscillator.type = 'sine';
          oscillator.frequency.value = 1000;
          gainNode.gain.value = 0.1;
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.05);
          break;
        case 'emote':
          oscillator.type = 'sine';
          oscillator.frequency.value = 700;
          gainNode.gain.value = 0.15;
          oscillator.start();
          oscillator.frequency.setValueAtTime(900, ctx.currentTime + 0.05);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        case 'pause':
          oscillator.type = 'sine';
          oscillator.frequency.value = 500;
          gainNode.gain.value = 0.2;
          oscillator.start();
          oscillator.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.2);
          oscillator.stop(ctx.currentTime + 0.25);
          break;
        case 'resume':
          oscillator.type = 'sine';
          oscillator.frequency.value = 300;
          gainNode.gain.value = 0.2;
          oscillator.start();
          oscillator.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.2);
          oscillator.stop(ctx.currentTime + 0.25);
          break;
        default:
          oscillator.frequency.value = 440;
          gainNode.gain.value = 0.1;
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      // Audio context not available
    }
  };
  
  const vibrate = (pattern = [100]) => {
    if (settings.vibration && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };
  
  return { playSound, vibrate };
};

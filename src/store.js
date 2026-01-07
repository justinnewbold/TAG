import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDistance, generateId, generateGameCode, isInNoTagTime, isInNoTagZone, canTagNow } from '../shared/utils.js';
import { GAME_MODES, ACHIEVEMENTS } from '../shared/constants.js';

// Re-export for backward compatibility
export { GAME_MODES, ACHIEVEMENTS, isInNoTagTime, isInNoTagZone, canTagNow };

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
    useImperial: false, // false = metric (m/km), true = imperial (ft/mi)
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
  // Chat messages
  chatMessages: [],
  unreadChatCount: 0,
  // Spectator mode
  spectating: false,
  spectatorTarget: null,
  spectatorCount: 0,
  // Connection status
  connectionStatus: 'disconnected', // 'connected', 'disconnected', 'reconnecting'
  lastConnectionError: null,
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

      handlePlayerBooted: ({ playerId, playerName, reason, message }) => set((state) => {
        if (!state.currentGame) return state;

        // Check if the booted player is the current user
        const isCurrentUser = state.user?.id === playerId;

        // Remove player from game
        const updatedPlayers = state.currentGame.players.filter(p => p.id !== playerId);
        
        const updatedGame = {
          ...state.currentGame,
          players: updatedPlayers,
        };

        // If it was the current user who got booted, clear the game
        if (isCurrentUser) {
          return {
            currentGame: null,
            games: state.games.filter(g => g.id !== updatedGame.id),
          };
        }

        return {
          currentGame: updatedGame,
          games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
        };
      }),

      handleNewIt: ({ newItId, newItName, reason }) => set((state) => {
        if (!state.currentGame) return state;

        const updatedGame = {
          ...state.currentGame,
          itPlayerId: newItId,
          players: state.currentGame.players.map(p => ({
            ...p,
            isIt: p.id === newItId,
            becameItAt: p.id === newItId ? Date.now() : null,
          })),
        };

        return {
          currentGame: updatedGame,
          games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
        };
      }),


      clearLastGameSummary: () => set({ lastGameSummary: null }),

      // Chat messaging actions
      addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages.slice(-99), { // Keep last 100 messages
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...message,
          timestamp: Date.now(),
        }],
        unreadChatCount: state.unreadChatCount + 1,
      })),

      clearChatMessages: () => set({ chatMessages: [], unreadChatCount: 0 }),

      markChatAsRead: () => set({ unreadChatCount: 0 }),

      sendChatMessage: (content, type = 'text') => {
        const state = get();
        if (!state.user || !state.currentGame) return false;

        const message = {
          senderId: state.user.id,
          senderName: state.user.name,
          senderAvatar: state.user.avatar,
          content,
          type, // 'text', 'emoji', 'quick'
          gameId: state.currentGame.id,
        };

        // Add to local state immediately
        set((s) => ({
          chatMessages: [...s.chatMessages.slice(-99), {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...message,
            timestamp: Date.now(),
            isLocal: true, // Mark as not yet confirmed by server
          }],
        }));

        return message;
      },

      // Spectator mode actions
      setSpectating: (spectating) => set({ spectating }),

      setSpectatorTarget: (targetId) => set({ spectatorTarget: targetId }),

      updateSpectatorCount: (count) => set({ spectatorCount: count }),

      enterSpectatorMode: (targetId = null) => set({
        spectating: true,
        spectatorTarget: targetId,
      }),

      exitSpectatorMode: () => set({
        spectating: false,
        spectatorTarget: null,
      }),

      // Connection status actions
      setConnectionStatus: (status, error = null) => set({
        connectionStatus: status,
        lastConnectionError: error,
      }),
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

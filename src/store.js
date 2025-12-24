import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDistance } from './utils/distance';
// Re-export shared game logic utilities for backward compatibility
export { isInNoTagTime, isInNoTagZone, canTagNow } from './utils/gameLogic';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);
const generateGameCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

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
  },
  pendingInvites: [],
  toast: null, // { type: 'error' | 'success' | 'warning' | 'info', message: string, title?: string, duration?: number }
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

      // Toast notifications
      showToast: (toast) => set({ toast: typeof toast === 'string' ? { type: 'error', message: toast } : toast }),
      showError: (message, title) => set({ toast: { type: 'error', message, title } }),
      showSuccess: (message, title) => set({ toast: { type: 'success', message, title } }),
      showWarning: (message, title) => set({ toast: { type: 'warning', message, title } }),
      showInfo: (message, title) => set({ toast: { type: 'info', message, title } }),
      clearToast: () => set({ toast: null }),
      
      // Game actions
      createGame: (settings) => {
        const gameCode = generateGameCode();
        const user = get().user;
        const game = {
          id: generateId(),
          code: gameCode,
          host: user?.id,
          hostName: user?.name,
          status: 'waiting',
          settings: {
            gpsInterval: settings.gpsInterval || 5 * 60 * 1000, // Default 5 minutes
            tagRadius: settings.tagRadius || 20,
            duration: settings.duration || null,
            maxPlayers: settings.maxPlayers || 10,
            gameName: settings.gameName || `${user?.name}'s Game`,
            noTagZones: settings.noTagZones || [],
            noTagTimes: settings.noTagTimes || [],
          },
          players: [{
            ...user,
            isIt: false,
            joinedAt: Date.now(),
            tagCount: 0,
            survivalTime: 0,
          }],
          itPlayerId: null,
          startedAt: null,
          endedAt: null,
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
        currentGame: state.currentGame, // Cache current game for offline recovery
        currentGameCachedAt: state.currentGame ? Date.now() : null, // Track when game state was cached
        games: state.games,
        friends: state.friends,
        stats: state.stats,
        achievements: state.achievements,
        settings: state.settings,
      }),
    }
  )
);

// Re-export useSounds from uiStore for backward compatibility
export { useSounds } from './stores/uiStore';

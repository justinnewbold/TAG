import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);
const generateGameCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// Initial state
const initialState = {
  // User
  user: null,
  
  // Current game
  currentGame: null,
  
  // All games (history)
  games: [],
  
  // Friends list
  friends: [],
  
  // User stats
  stats: {
    gamesPlayed: 0,
    gamesWon: 0,
    totalTags: 0,
    timesTagged: 0,
    longestSurvival: 0,
  },
  
  // App settings
  settings: {
    notifications: true,
    sound: true,
    vibration: true,
    highAccuracyGPS: true,
  },
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
      
      // Game actions
      createGame: (settings) => {
        const gameCode = generateGameCode();
        const game = {
          id: generateId(),
          code: gameCode,
          host: get().user?.id,
          status: 'waiting', // waiting, active, ended
          settings: {
            gpsInterval: settings.gpsInterval || 10000,
            tagRadius: settings.tagRadius || 20,
            duration: settings.duration || null,
            maxPlayers: settings.maxPlayers || 10,
          },
          players: [{
            ...get().user,
            isIt: false,
            joinedAt: Date.now(),
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
        // In real app, this would fetch from server
        // For demo, we simulate joining
        const user = get().user;
        if (!user) return null;
        
        set((state) => {
          const game = state.games.find(g => g.code === gameCode);
          if (!game || game.status !== 'waiting') return state;
          
          const updatedGame = {
            ...game,
            players: [...game.players, { ...user, isIt: false, joinedAt: Date.now() }],
          };
          
          return {
            currentGame: updatedGame,
            games: state.games.map(g => g.id === game.id ? updatedGame : g),
          };
        });
        
        return get().currentGame;
      },
      
      startGame: () => {
        set((state) => {
          if (!state.currentGame) return state;
          
          // Randomly select IT
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
            })),
          };
          
          return {
            currentGame: updatedGame,
            games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
          };
        });
      },
      
      tagPlayer: (taggedPlayerId) => {
        set((state) => {
          if (!state.currentGame || state.currentGame.status !== 'active') return state;
          
          const taggerId = state.currentGame.itPlayerId;
          const tag = {
            id: generateId(),
            taggerId,
            taggedId: taggedPlayerId,
            timestamp: Date.now(),
          };
          
          const updatedGame = {
            ...state.currentGame,
            itPlayerId: taggedPlayerId,
            tags: [...state.currentGame.tags, tag],
            players: state.currentGame.players.map(p => ({
              ...p,
              isIt: p.id === taggedPlayerId,
            })),
          };
          
          // Update stats
          const newStats = { ...state.stats };
          if (taggerId === state.user?.id) {
            newStats.totalTags += 1;
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
      },
      
      endGame: (winnerId = null) => {
        set((state) => {
          if (!state.currentGame) return state;
          
          const updatedGame = {
            ...state.currentGame,
            status: 'ended',
            endedAt: Date.now(),
            winnerId,
          };
          
          // Update stats
          const newStats = { ...state.stats };
          newStats.gamesPlayed += 1;
          if (winnerId === state.user?.id) {
            newStats.gamesWon += 1;
          }
          
          return {
            currentGame: null,
            games: state.games.map(g => g.id === updatedGame.id ? updatedGame : g),
            stats: newStats,
          };
        });
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
      
      // Simulate other players (for demo)
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
              location: { lat: baseLat + 0.0003, lng: baseLng + 0.0002 },
              isIt: false,
              joinedAt: Date.now(),
              lastUpdate: Date.now(),
            },
            {
              id: 'demo2',
              name: 'Sam',
              avatar: '🏃‍♀️',
              location: { lat: baseLat - 0.0002, lng: baseLng + 0.0004 },
              isIt: false,
              joinedAt: Date.now(),
              lastUpdate: Date.now(),
            },
            {
              id: 'demo3',
              name: 'Jordan',
              avatar: '🏃‍♂️',
              location: { lat: baseLat + 0.0001, lng: baseLng - 0.0003 },
              isIt: false,
              joinedAt: Date.now(),
              lastUpdate: Date.now(),
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
        friends: [...state.friends, { ...friend, id: generateId(), addedAt: Date.now() }],
      })),
      
      removeFriend: (friendId) => set((state) => ({
        friends: state.friends.filter(f => f.id !== friendId),
      })),
      
      // Settings
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),
      
      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'tag-game-storage',
      partialize: (state) => ({
        user: state.user,
        games: state.games,
        friends: state.friends,
        stats: state.stats,
        settings: state.settings,
      }),
    }
  )
);

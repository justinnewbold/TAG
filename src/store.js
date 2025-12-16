import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    totalPlayTime: 0,
    uniqueFriendsPlayed: 0,
    fastestTag: null,
    playedAtNight: false,
  },
  
  // Achievements
  achievements: [],
  newAchievement: null,
  
  // App settings
  settings: {
    notifications: true,
    sound: true,
    vibration: true,
    highAccuracyGPS: true,
    darkMode: true,
    showDistance: true,
  },
  
  // Pending invites
  pendingInvites: [],
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
        const game = {
          id: generateId(),
          code: gameCode,
          host: user?.id,
          hostName: user?.name,
          status: 'waiting',
          settings: {
            gpsInterval: settings.gpsInterval || 10000,
            tagRadius: settings.tagRadius || 20,
            duration: settings.duration || null,
            maxPlayers: settings.maxPlayers || 10,
            gameName: settings.gameName || `${user?.name}'s Game`,
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
          
          // Check if already in game
          if (game.players.some(p => p.id === user.id)) {
            return { currentGame: game };
          }
          
          // Check max players
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
              becameItAt: p.id === itPlayerId ? Date.now() : null,
            })),
          };
          
          // Track night play
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
        set((state) => {
          if (!state.currentGame || state.currentGame.status !== 'active') return state;
          
          const now = Date.now();
          const taggerId = state.currentGame.itPlayerId;
          const tagger = state.currentGame.players.find(p => p.id === taggerId);
          const tagTime = tagger?.becameItAt ? now - tagger.becameItAt : null;
          
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
              becameItAt: p.id === taggedPlayerId ? now : null,
              survivalTime: p.id !== taggerId && p.id !== taggedPlayerId 
                ? (p.survivalTime || 0) + (now - (state.currentGame.startedAt || now))
                : p.survivalTime,
            })),
          };
          
          // Update stats
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
      },
      
      endGame: (winnerId = null) => {
        set((state) => {
          if (!state.currentGame) return state;
          
          const now = Date.now();
          const gameTime = state.currentGame.startedAt ? now - state.currentGame.startedAt : 0;
          
          // Calculate survival times
          const playerStats = state.currentGame.players.map(p => ({
            ...p,
            finalSurvivalTime: p.isIt ? 0 : gameTime - (p.becameItAt || 0),
          }));
          
          // Find winner (longest survivor who isn't IT)
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
          
          // Update stats
          const newStats = { ...state.stats };
          newStats.gamesPlayed += 1;
          newStats.totalPlayTime += gameTime;
          
          if (actualWinner === state.user?.id) {
            newStats.gamesWon += 1;
          }
          
          // Calculate user's survival time
          const userPlayer = playerStats.find(p => p.id === state.user?.id);
          if (userPlayer && userPlayer.finalSurvivalTime > newStats.longestSurvival) {
            newStats.longestSurvival = userPlayer.finalSurvivalTime;
          }
          
          // Count unique friends
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
              tagCount: 0,
              survivalTime: 0,
            },
            {
              id: 'demo2',
              name: 'Sam',
              avatar: '🏃‍♀️',
              location: { lat: baseLat - 0.0002, lng: baseLng + 0.0004 },
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
              location: { lat: baseLat + 0.0001, lng: baseLng - 0.0003 },
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
      
      // Delete game history
      clearGameHistory: () => set((state) => ({
        games: state.games.filter(g => g.id === state.currentGame?.id),
      })),
      
      // Reset
      reset: () => set(initialState),
      
      logout: () => set({
        user: null,
        currentGame: null,
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
    
    // Using web audio API for simple sounds
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
      default:
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1);
    }
  };
  
  const vibrate = (pattern = [100]) => {
    if (settings.vibration && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };
  
  return { playSound, vibrate };
};

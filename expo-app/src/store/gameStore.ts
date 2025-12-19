import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, User, Game, GameSettings, Player } from '../services/api';
import { socketService } from '../services/socket';

interface GameState {
  // Auth state
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Game state
  currentGame: Game | null;
  games: Game[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions - Auth
  register: (name: string, avatar?: string) => Promise<boolean>;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<void>;
  updateUserLocation: (location: { lat: number; lng: number }) => void;

  // Actions - Game
  createGame: (settings: GameSettings) => Promise<Game | null>;
  joinGame: (code: string) => Promise<boolean>;
  leaveGame: () => Promise<void>;
  startGame: () => Promise<boolean>;
  endGame: (winnerId?: string | null) => void;
  tagPlayer: (targetId: string) => { success: boolean; reason?: string };

  // State sync
  syncGameState: (game: Game) => void;
  updatePlayerLocation: (playerId: string, location: { lat: number; lng: number }) => void;

  // Helpers
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      currentGame: null,
      games: [],
      isLoading: false,
      error: null,

      // Auth actions
      register: async (name, avatar) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await api.register(name, avatar);
          api.setToken(token);
          socketService.connect(token);
          set({ user, token, isAuthenticated: true, isLoading: false });
          return true;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return false;
        }
      },

      login: async (token) => {
        set({ isLoading: true, error: null });
        try {
          api.setToken(token);
          const { user, token: newToken } = await api.login(token);
          api.setToken(newToken);
          socketService.connect(newToken);
          set({ user, token: newToken, isAuthenticated: true, isLoading: false });
          return true;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return false;
        }
      },

      logout: () => {
        api.setToken(null);
        socketService.disconnect();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          currentGame: null,
        });
      },

      updateProfile: async (data) => {
        try {
          const { user } = await api.updateProfile(data);
          set({ user });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      updateUserLocation: (location) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, location } });
        }
      },

      // Game actions
      createGame: async (settings) => {
        set({ isLoading: true, error: null });
        try {
          const { game } = await api.createGame(settings);
          socketService.joinGameRoom(game.id);
          set({ currentGame: game, isLoading: false });
          return game;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return null;
        }
      },

      joinGame: async (code) => {
        set({ isLoading: true, error: null });
        try {
          const { game } = await api.joinGame(code);
          socketService.joinGameRoom(game.id);
          set({ currentGame: game, isLoading: false });
          return true;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return false;
        }
      },

      leaveGame: async () => {
        const { currentGame } = get();
        if (currentGame) {
          try {
            await api.leaveGame();
            socketService.leaveGameRoom(currentGame.id);
          } catch {
            // Continue with local leave
          }
        }
        set({ currentGame: null });
      },

      startGame: async () => {
        const { currentGame } = get();
        if (!currentGame) return false;

        set({ isLoading: true, error: null });
        try {
          const { game } = await api.startGame(currentGame.id);
          set({ currentGame: game, isLoading: false });
          return true;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return false;
        }
      },

      endGame: (winnerId) => {
        const { currentGame, games, user } = get();
        if (!currentGame) return;

        const endedGame: Game = {
          ...currentGame,
          status: 'ended',
          endedAt: Date.now(),
          winnerId: winnerId || undefined,
          winnerName: winnerId
            ? currentGame.players.find((p) => p.id === winnerId)?.name
            : undefined,
        };

        set({
          currentGame: null,
          games: [endedGame, ...games].slice(0, 50),
        });
      },

      tagPlayer: (targetId) => {
        const state = get();
        const { currentGame, user } = state;

        if (!currentGame || currentGame.status !== 'active') {
          return { success: false, reason: 'No active game' };
        }

        if (currentGame.itPlayerId !== user?.id) {
          return { success: false, reason: 'Only IT can tag' };
        }

        const target = currentGame.players.find((p) => p.id === targetId);
        if (!target) {
          return { success: false, reason: 'Invalid target' };
        }

        // Send tag attempt to server via socket
        socketService.attemptTag(targetId);

        const now = Date.now();

        // Optimistically update local state (server will confirm via player:tagged event)
        set({
          currentGame: {
            ...currentGame,
            itPlayerId: targetId,
            players: currentGame.players.map((p) => ({
              ...p,
              isIt: p.id === targetId,
              tagCount:
                p.id === user?.id ? (p.tagCount || 0) + 1 : p.tagCount,
              becameItAt:
                p.id === targetId
                  ? now
                  : p.id === user?.id
                  ? null
                  : p.becameItAt,
            })),
            tags: [
              ...currentGame.tags,
              {
                taggerId: user.id,
                taggedId: targetId,
                timestamp: now,
                location: user.location,
              },
            ],
          },
        });

        return { success: true };
      },

      // State sync
      syncGameState: (game) => {
        set({ currentGame: game });
      },

      updatePlayerLocation: (playerId, location) => {
        const { currentGame } = get();
        if (!currentGame) return;

        set({
          currentGame: {
            ...currentGame,
            players: currentGame.players.map((p) =>
              p.id === playerId
                ? { ...p, location, lastUpdate: Date.now() }
                : p
            ),
          },
        });
      },

      // Helpers
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'tag-game-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        games: state.games,
      }),
    }
  )
);

// Initialize API token from stored state
useGameStore.subscribe((state) => {
  if (state.token) {
    api.setToken(state.token);
  }
});

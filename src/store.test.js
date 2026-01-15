/**
 * Tests for Zustand store
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from './store';

describe('useStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useStore.setState({
      user: null,
      currentGame: null,
      games: [],
      friends: [],
      friendRequests: [],
      powerups: [],
      settings: {
        theme: 'dark',
        vibration: true,
        sound: true,
        notifications: true,
        locationAccuracy: 'high',
        mapStyle: 'dark',
        enablePowerups: true,
      },
    });
  });

  describe('User Management', () => {
    it('sets user correctly', () => {
      const mockUser = {
        id: 'test-id',
        name: 'Test User',
        avatar: '🎮',
      };

      useStore.getState().setUser(mockUser);

      expect(useStore.getState().user).toEqual(mockUser);
    });

    it('updates user location', () => {
      const mockUser = { id: 'test-id', name: 'Test', avatar: '🎮' };
      useStore.setState({ user: mockUser });

      const newLocation = { lat: 40.7128, lng: -74.006 };
      useStore.getState().updateUserLocation(newLocation);

      expect(useStore.getState().user.location).toEqual(newLocation);
    });

    it('clears user on logout', () => {
      useStore.setState({ user: { id: 'test', name: 'Test' } });

      useStore.getState().setUser(null);

      expect(useStore.getState().user).toBeNull();
    });
  });

  describe('Game Management', () => {
    it('sets current game', () => {
      const mockGame = {
        id: 'game-123',
        code: 'ABC123',
        status: 'waiting',
        players: [],
      };

      useStore.getState().setCurrentGame(mockGame);

      expect(useStore.getState().currentGame).toEqual(mockGame);
    });

    it('adds player to current game', () => {
      const mockGame = {
        id: 'game-123',
        code: 'ABC123',
        status: 'waiting',
        players: [{ id: 'host', name: 'Host' }],
      };
      useStore.setState({ currentGame: mockGame });

      const newPlayer = { id: 'player-2', name: 'Player 2' };
      useStore.getState().handlePlayerJoined(newPlayer);

      expect(useStore.getState().currentGame.players).toHaveLength(2);
      expect(useStore.getState().currentGame.players[1]).toEqual(newPlayer);
    });

    it('removes player from current game', () => {
      const mockGame = {
        id: 'game-123',
        players: [
          { id: 'player-1', name: 'Player 1' },
          { id: 'player-2', name: 'Player 2' },
        ],
      };
      useStore.setState({ currentGame: mockGame });

      useStore.getState().handlePlayerLeft({ playerId: 'player-2' });

      expect(useStore.getState().currentGame.players).toHaveLength(1);
      expect(useStore.getState().currentGame.players[0].id).toBe('player-1');
    });

    it('updates player location in game', () => {
      const mockGame = {
        id: 'game-123',
        players: [{ id: 'player-1', name: 'Player 1', location: null }],
      };
      useStore.setState({ currentGame: mockGame });

      const newLocation = { lat: 40.7128, lng: -74.006 };
      useStore.getState().handlePlayerLocation({
        playerId: 'player-1',
        location: newLocation,
        timestamp: Date.now(),
      });

      expect(useStore.getState().currentGame.players[0].location).toEqual(newLocation);
    });
  });

  describe('Settings', () => {
    it('updates individual setting', () => {
      useStore.getState().updateSettings({ vibration: false });

      expect(useStore.getState().settings.vibration).toBe(false);
      expect(useStore.getState().settings.sound).toBe(true); // Other settings unchanged
    });

    it('updates multiple settings at once', () => {
      useStore.getState().updateSettings({
        vibration: false,
        sound: false,
        theme: 'light',
      });

      expect(useStore.getState().settings.vibration).toBe(false);
      expect(useStore.getState().settings.sound).toBe(false);
      expect(useStore.getState().settings.theme).toBe('light');
    });
  });

  describe('Powerups', () => {
    it('adds powerup to inventory', () => {
      const powerup = {
        id: 'powerup-1',
        type: 'speed_boost',
        collectedAt: Date.now(),
      };

      useStore.getState().addPowerup(powerup);

      expect(useStore.getState().powerups).toHaveLength(1);
      expect(useStore.getState().powerups[0]).toEqual(powerup);
    });

    it('removes powerup from inventory', () => {
      useStore.setState({
        powerups: [
          { id: 'powerup-1', type: 'speed_boost' },
          { id: 'powerup-2', type: 'shield' },
        ],
      });

      useStore.getState().removePowerup('powerup-1');

      expect(useStore.getState().powerups).toHaveLength(1);
      expect(useStore.getState().powerups[0].id).toBe('powerup-2');
    });
  });

  describe('Friends', () => {
    it('sets friends list', () => {
      const friends = [
        { id: 'friend-1', name: 'Friend 1' },
        { id: 'friend-2', name: 'Friend 2' },
      ];

      useStore.getState().setFriends(friends);

      expect(useStore.getState().friends).toEqual(friends);
    });

    it('adds friend request', () => {
      const request = {
        id: 'request-1',
        fromId: 'user-1',
        fromName: 'User 1',
      };

      useStore.getState().addFriendRequest(request);

      expect(useStore.getState().friendRequests).toHaveLength(1);
    });
  });
});

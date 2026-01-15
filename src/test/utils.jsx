/**
 * Test Utilities - Helper functions for testing React components
 */
import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Custom render function that wraps components with providers
export function renderWithProviders(ui, options = {}) {
  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        {children}
      </BrowserRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}

// Mock socket service for testing
export const mockSocketService = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: false,
};

// Mock user for testing
export const mockUser = {
  id: 'test-user-id',
  name: 'Test User',
  avatar: '🎮',
  stats: {
    gamesPlayed: 10,
    gamesWon: 5,
    totalTags: 25,
    timesTagged: 15,
  },
  achievements: [],
};

// Mock game for testing
export const mockGame = {
  id: 'test-game-id',
  code: 'ABC123',
  host: 'test-user-id',
  hostName: 'Test User',
  status: 'waiting',
  settings: {
    gameName: 'Test Game',
    tagRadius: 10,
    maxPlayers: 10,
    gameMode: 'classic',
  },
  players: [
    {
      id: 'test-user-id',
      name: 'Test User',
      avatar: '🎮',
      isIt: false,
      location: { lat: 40.7128, lng: -74.0060 },
    },
  ],
  itPlayerId: null,
  startedAt: null,
  endedAt: null,
};

// Helper to create a mock location
export function createMockLocation(lat = 40.7128, lng = -74.0060) {
  return { lat, lng };
}

// Helper to wait for async operations
export function waitFor(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

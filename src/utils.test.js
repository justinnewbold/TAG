/**
 * Tests for utility functions
 */
import { describe, it, expect } from 'vitest';

// Import shared utilities
// Note: These are the same functions used by both frontend and backend
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

describe('getDistance', () => {
  it('calculates distance between two points', () => {
    // New York to Los Angeles (approximately 3,940 km)
    const nyLat = 40.7128;
    const nyLng = -74.006;
    const laLat = 34.0522;
    const laLng = -118.2437;

    const distance = getDistance(nyLat, nyLng, laLat, laLng);

    // Should be approximately 3,940 km
    expect(distance).toBeGreaterThan(3900000);
    expect(distance).toBeLessThan(4000000);
  });

  it('returns 0 for same point', () => {
    const distance = getDistance(40.7128, -74.006, 40.7128, -74.006);
    expect(distance).toBe(0);
  });

  it('calculates short distances accurately', () => {
    // Two points about 100 meters apart
    const lat1 = 40.7128;
    const lng1 = -74.006;
    const lat2 = 40.7137; // About 100m north
    const lng2 = -74.006;

    const distance = getDistance(lat1, lng1, lat2, lng2);

    // Should be approximately 100 meters
    expect(distance).toBeGreaterThan(90);
    expect(distance).toBeLessThan(110);
  });
});

describe('formatDistance', () => {
  it('formats meters correctly', () => {
    expect(formatDistance(50)).toBe('50m');
    expect(formatDistance(100)).toBe('100m');
    expect(formatDistance(999)).toBe('999m');
  });

  it('formats kilometers correctly', () => {
    expect(formatDistance(1000)).toBe('1.0km');
    expect(formatDistance(1500)).toBe('1.5km');
    expect(formatDistance(10000)).toBe('10.0km');
  });

  it('rounds meters to whole numbers', () => {
    expect(formatDistance(50.7)).toBe('51m');
    expect(formatDistance(50.2)).toBe('50m');
  });
});

describe('formatDuration', () => {
  it('formats seconds correctly', () => {
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(30000)).toBe('30s');
    expect(formatDuration(59000)).toBe('59s');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(300000)).toBe('5m 0s');
  });

  it('formats hours and minutes correctly', () => {
    expect(formatDuration(3600000)).toBe('1h 0m');
    expect(formatDuration(5400000)).toBe('1h 30m');
    expect(formatDuration(7200000)).toBe('2h 0m');
  });
});

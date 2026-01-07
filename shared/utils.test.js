/**
 * Unit tests for shared utility functions
 * Run with: node --test shared/utils.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getDistance,
  calculateSpeed,
  isValidSpeed,
  formatTime,
  formatInterval,
  generateId,
  generateGameCode,
  throttle,
  debounce,
  isInNoTagTime,
  isInNoTagZone,
  canTagNow,
} from './utils.js';

describe('getDistance', () => {
  it('should return 0 for the same coordinates', () => {
    const distance = getDistance(37.7749, -122.4194, 37.7749, -122.4194);
    assert.strictEqual(distance, 0);
  });

  it('should calculate distance between two points correctly', () => {
    // San Francisco to Los Angeles is approximately 559 km
    const sfLat = 37.7749;
    const sfLng = -122.4194;
    const laLat = 34.0522;
    const laLng = -118.2437;

    const distance = getDistance(sfLat, sfLng, laLat, laLng);
    // Should be around 559000 meters (559 km)
    assert.ok(distance > 550000 && distance < 570000, `Expected ~559km, got ${distance/1000}km`);
  });

  it('should calculate short distances accurately', () => {
    // 100 meters north (approximately)
    const lat1 = 37.7749;
    const lng1 = -122.4194;
    const lat2 = 37.7758; // ~100m north
    const lng2 = -122.4194;

    const distance = getDistance(lat1, lng1, lat2, lng2);
    assert.ok(distance > 90 && distance < 110, `Expected ~100m, got ${distance}m`);
  });

  it('should handle negative coordinates', () => {
    // Buenos Aires to Sydney
    const distance = getDistance(-34.6037, -58.3816, -33.8688, 151.2093);
    // Should be around 11,900 km
    assert.ok(distance > 11800000 && distance < 12100000, `Expected ~11900km, got ${distance/1000}km`);
  });
});

describe('calculateSpeed', () => {
  it('should return 0 for no time difference', () => {
    const loc1 = { lat: 37.7749, lng: -122.4194, timestamp: 1000 };
    const loc2 = { lat: 37.7758, lng: -122.4194, timestamp: 1000 };

    const speed = calculateSpeed(loc1, loc2);
    assert.strictEqual(speed, 0);
  });

  it('should calculate correct speed for movement', () => {
    // ~100 meters in 10 seconds = 10 m/s
    const loc1 = { lat: 37.7749, lng: -122.4194, timestamp: 0 };
    const loc2 = { lat: 37.7758, lng: -122.4194, timestamp: 10000 };

    const speed = calculateSpeed(loc1, loc2);
    assert.ok(speed > 9 && speed < 11, `Expected ~10 m/s, got ${speed} m/s`);
  });

  it('should handle null locations', () => {
    assert.strictEqual(calculateSpeed(null, null), 0);
    assert.strictEqual(calculateSpeed({ lat: 0, lng: 0 }, null), 0);
    assert.strictEqual(calculateSpeed(null, { lat: 0, lng: 0 }), 0);
  });

  it('should handle missing timestamps', () => {
    const loc1 = { lat: 37.7749, lng: -122.4194 };
    const loc2 = { lat: 37.7758, lng: -122.4194 };

    assert.strictEqual(calculateSpeed(loc1, loc2), 0);
  });
});

describe('isValidSpeed', () => {
  it('should accept walking speed', () => {
    const result = isValidSpeed(1.4); // ~5 km/h
    assert.strictEqual(result.valid, true);
  });

  it('should accept running speed', () => {
    const result = isValidSpeed(10); // ~36 km/h, fast runner
    assert.strictEqual(result.valid, true);
  });

  it('should warn about vehicle speed but accept it', () => {
    const result = isValidSpeed(20); // ~72 km/h
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.reason, 'possibly_in_vehicle');
  });

  it('should reject very high vehicle speed', () => {
    const result = isValidSpeed(50); // ~180 km/h
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.severity, 'medium');
  });

  it('should reject teleport speed', () => {
    const result = isValidSpeed(150); // ~540 km/h
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, 'teleport_detected');
    assert.strictEqual(result.severity, 'high');
  });
});

describe('formatTime', () => {
  it('should format zero correctly', () => {
    assert.strictEqual(formatTime(0), '0:00');
  });

  it('should format seconds correctly', () => {
    assert.strictEqual(formatTime(5000), '0:05');
    assert.strictEqual(formatTime(59000), '0:59');
  });

  it('should format minutes correctly', () => {
    assert.strictEqual(formatTime(60000), '1:00');
    assert.strictEqual(formatTime(90000), '1:30');
  });

  it('should format hours correctly', () => {
    assert.strictEqual(formatTime(3600000), '60:00');
    assert.strictEqual(formatTime(3661000), '61:01');
  });
});

describe('formatInterval', () => {
  it('should format seconds', () => {
    assert.strictEqual(formatInterval(5000), '5s');
    assert.strictEqual(formatInterval(30000), '30s');
  });

  it('should format minutes', () => {
    assert.strictEqual(formatInterval(60000), '1m');
    assert.strictEqual(formatInterval(300000), '5m');
  });

  it('should format hours', () => {
    assert.strictEqual(formatInterval(3600000), '1h');
    assert.strictEqual(formatInterval(7200000), '2h');
  });

  it('should format days', () => {
    assert.strictEqual(formatInterval(86400000), '1d');
    assert.strictEqual(formatInterval(172800000), '2d');
  });
});

describe('generateId', () => {
  it('should generate a string', () => {
    const id = generateId();
    assert.strictEqual(typeof id, 'string');
  });

  it('should generate unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    assert.strictEqual(ids.size, 100, 'All generated IDs should be unique');
  });

  it('should generate IDs of reasonable length', () => {
    const id = generateId();
    assert.ok(id.length >= 5, 'ID should be at least 5 characters');
  });
});

describe('generateGameCode', () => {
  it('should generate uppercase codes', () => {
    const code = generateGameCode();
    assert.strictEqual(code, code.toUpperCase());
  });

  it('should generate 6 character codes', () => {
    const code = generateGameCode();
    assert.strictEqual(code.length, 6);
  });

  it('should generate alphanumeric codes', () => {
    const code = generateGameCode();
    assert.ok(/^[A-Z0-9]{6}$/.test(code), `Code ${code} should be alphanumeric`);
  });

  it('should generate unique codes', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateGameCode());
    }
    // Allow some duplicates since it's only 6 chars
    assert.ok(codes.size > 95, 'Most codes should be unique');
  });
});

describe('throttle', () => {
  it('should execute immediately on first call', () => {
    let count = 0;
    const throttled = throttle(() => count++, 100);

    throttled();
    assert.strictEqual(count, 1);
  });

  it('should throttle subsequent calls', async () => {
    let count = 0;
    const throttled = throttle(() => count++, 50);

    throttled();
    throttled();
    throttled();

    assert.strictEqual(count, 1);

    await new Promise(resolve => setTimeout(resolve, 60));
    throttled();
    assert.strictEqual(count, 2);
  });
});

describe('debounce', () => {
  it('should delay execution', async () => {
    let count = 0;
    const debounced = debounce(() => count++, 50);

    debounced();
    assert.strictEqual(count, 0);

    await new Promise(resolve => setTimeout(resolve, 60));
    assert.strictEqual(count, 1);
  });

  it('should reset delay on subsequent calls', async () => {
    let count = 0;
    const debounced = debounce(() => count++, 50);

    debounced();
    await new Promise(resolve => setTimeout(resolve, 30));
    debounced();
    await new Promise(resolve => setTimeout(resolve, 30));
    debounced();

    assert.strictEqual(count, 0);

    await new Promise(resolve => setTimeout(resolve, 60));
    assert.strictEqual(count, 1);
  });
});

describe('isInNoTagTime', () => {
  it('should return false for empty rules', () => {
    assert.strictEqual(isInNoTagTime([]), false);
    assert.strictEqual(isInNoTagTime(null), false);
    assert.strictEqual(isInNoTagTime(undefined), false);
  });

  it('should detect when in a no-tag time period', () => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Create a rule that includes current time
    const startTime = `${String(currentHour).padStart(2, '0')}:${String(Math.max(0, currentMin - 5)).padStart(2, '0')}`;
    const endTime = `${String(currentHour).padStart(2, '0')}:${String(Math.min(59, currentMin + 5)).padStart(2, '0')}`;

    const rules = [{
      days: [currentDay],
      startTime,
      endTime,
    }];

    assert.strictEqual(isInNoTagTime(rules), true);
  });

  it('should return false when not in no-tag time', () => {
    const now = new Date();
    const currentDay = now.getDay();
    const futureHour = (now.getHours() + 2) % 24;

    const rules = [{
      days: [currentDay],
      startTime: `${String(futureHour).padStart(2, '0')}:00`,
      endTime: `${String(futureHour).padStart(2, '0')}:30`,
    }];

    assert.strictEqual(isInNoTagTime(rules), false);
  });

  it('should return false when day does not match', () => {
    const now = new Date();
    const differentDay = (now.getDay() + 1) % 7;
    const currentHour = now.getHours();

    const rules = [{
      days: [differentDay],
      startTime: `${String(currentHour).padStart(2, '0')}:00`,
      endTime: `${String(currentHour).padStart(2, '0')}:59`,
    }];

    assert.strictEqual(isInNoTagTime(rules), false);
  });

  it('should handle overnight time periods', () => {
    // This test is inherently time-dependent
    // We'll just verify the logic handles overnight correctly
    // by checking that when end < start, it's treated as overnight
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();

    // Create a rule that spans the current time overnight-style
    // If between 22:00-23:59 or 00:00-06:00, a 22:00-06:00 rule should match
    if (currentHour >= 22 || currentHour < 6) {
      const rules = [{
        days: [currentDay],
        startTime: '22:00',
        endTime: '06:00',
      }];
      assert.strictEqual(isInNoTagTime(rules), true);
    } else {
      // Outside overnight window - just verify it doesn't crash
      const rules = [{
        days: [currentDay],
        startTime: '22:00',
        endTime: '06:00',
      }];
      // Should return false since we're not in overnight window
      assert.strictEqual(isInNoTagTime(rules), false);
    }
  });
});

describe('isInNoTagZone', () => {
  it('should return false for empty zones', () => {
    const location = { lat: 37.7749, lng: -122.4194 };
    assert.strictEqual(isInNoTagZone(location, []), false);
    assert.strictEqual(isInNoTagZone(location, null), false);
    assert.strictEqual(isInNoTagZone(null, []), false);
  });

  it('should detect when inside a zone', () => {
    const location = { lat: 37.7749, lng: -122.4194 };
    const zones = [{
      lat: 37.7749,
      lng: -122.4194,
      radius: 50, // 50 meters
    }];

    assert.strictEqual(isInNoTagZone(location, zones), true);
  });

  it('should return false when outside a zone', () => {
    const location = { lat: 37.7749, lng: -122.4194 };
    const zones = [{
      lat: 37.78, // ~500m away
      lng: -122.4194,
      radius: 50,
    }];

    assert.strictEqual(isInNoTagZone(location, zones), false);
  });

  it('should handle multiple zones', () => {
    const location = { lat: 37.7749, lng: -122.4194 };
    const zones = [
      { lat: 37.78, lng: -122.42, radius: 50 }, // Far zone
      { lat: 37.7749, lng: -122.4194, radius: 100 }, // Matching zone
    ];

    assert.strictEqual(isInNoTagZone(location, zones), true);
  });

  it('should correctly use radius boundary', () => {
    const location = { lat: 37.7749, lng: -122.4194 };
    // Zone exactly 100m away with 99m radius should NOT contain location
    const zones = [{
      lat: 37.7758, // ~100m north
      lng: -122.4194,
      radius: 90,
    }];

    assert.strictEqual(isInNoTagZone(location, zones), false);
  });
});

describe('canTagNow', () => {
  it('should allow tagging with no restrictions', () => {
    const game = { settings: {} };
    const taggerLoc = { lat: 37.7749, lng: -122.4194 };
    const targetLoc = { lat: 37.7750, lng: -122.4194 };

    const result = canTagNow(game, taggerLoc, targetLoc);
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.reason, null);
  });

  it('should block tagging when tagger is in safe zone', () => {
    const game = {
      settings: {
        noTagZones: [{ lat: 37.7749, lng: -122.4194, radius: 50 }],
      },
    };
    const taggerLoc = { lat: 37.7749, lng: -122.4194 }; // In zone
    const targetLoc = { lat: 37.78, lng: -122.4194 }; // Not in zone

    const result = canTagNow(game, taggerLoc, targetLoc);
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.reason, 'You are in a safe zone');
  });

  it('should block tagging when target is in safe zone', () => {
    const game = {
      settings: {
        noTagZones: [{ lat: 37.7749, lng: -122.4194, radius: 50 }],
      },
    };
    const taggerLoc = { lat: 37.78, lng: -122.4194 }; // Not in zone
    const targetLoc = { lat: 37.7749, lng: -122.4194 }; // In zone

    const result = canTagNow(game, taggerLoc, targetLoc);
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.reason, 'Target is in a safe zone');
  });

  it('should handle null game settings', () => {
    const result = canTagNow(null, { lat: 0, lng: 0 }, { lat: 0, lng: 0 });
    assert.strictEqual(result.allowed, true);
  });
});

console.log('All tests defined. Run with: node --test shared/utils.test.js');

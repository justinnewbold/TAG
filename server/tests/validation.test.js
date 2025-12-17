import { describe, it, expect } from 'vitest';
import { sanitize, validate } from '../utils/validation.js';

describe('Validation Utils', () => {
  describe('sanitize.playerName', () => {
    it('should trim whitespace', () => {
      expect(sanitize.playerName('  TestPlayer  ')).toBe('TestPlayer');
    });

    it('should remove HTML tags', () => {
      expect(sanitize.playerName('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });

    it('should limit length to 30 characters', () => {
      const longName = 'a'.repeat(50);
      expect(sanitize.playerName(longName).length).toBe(30);
    });

    it('should handle empty string', () => {
      expect(sanitize.playerName('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitize.playerName(null)).toBe('');
      expect(sanitize.playerName(undefined)).toBe('');
      expect(sanitize.playerName(123)).toBe('');
    });
  });

  describe('sanitize.emoji', () => {
    it('should extract valid emoji', () => {
      expect(sanitize.emoji('🏃')).toBe('🏃');
      expect(sanitize.emoji('🦊')).toBe('🦊');
    });

    it('should return default emoji for invalid input', () => {
      expect(sanitize.emoji('abc')).toBe('😀');
      expect(sanitize.emoji('')).toBe('😀');
      expect(sanitize.emoji(null)).toBe('😀');
    });
  });

  describe('validate.coordinates', () => {
    it('should accept valid coordinates', () => {
      const result = validate.coordinates(40.7128, -74.0060);
      expect(result.valid).toBe(true);
      expect(result.lat).toBe(40.7128);
      expect(result.lng).toBe(-74.0060);
    });

    it('should reject invalid latitude', () => {
      expect(validate.coordinates(91, 0).valid).toBe(false);
      expect(validate.coordinates(-91, 0).valid).toBe(false);
    });

    it('should reject invalid longitude', () => {
      expect(validate.coordinates(0, 181).valid).toBe(false);
      expect(validate.coordinates(0, -181).valid).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(validate.coordinates('abc', 0).valid).toBe(false);
      expect(validate.coordinates(0, 'xyz').valid).toBe(false);
    });
  });

  describe('validate.location', () => {
    it('should accept valid location object', () => {
      const result = validate.location({ lat: 40.7128, lng: -74.0060 });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid location object', () => {
      expect(validate.location(null).valid).toBe(false);
      expect(validate.location({}).valid).toBe(false);
      expect(validate.location({ lat: 'invalid' }).valid).toBe(false);
    });
  });

  describe('validate.gameCode', () => {
    it('should accept valid 6-char alphanumeric code', () => {
      const result = validate.gameCode('ABC123');
      expect(result.valid).toBe(true);
      expect(result.code).toBe('ABC123');
    });

    it('should uppercase the code', () => {
      const result = validate.gameCode('abc123');
      expect(result.code).toBe('ABC123');
    });

    it('should reject invalid codes', () => {
      expect(validate.gameCode('ABC').valid).toBe(false); // too short
      expect(validate.gameCode('ABC12345').valid).toBe(false); // too long
      expect(validate.gameCode('ABC12!').valid).toBe(false); // special char
    });
  });

  describe('validate.uuid', () => {
    it('should accept valid UUID', () => {
      const result = validate.uuid('123e4567-e89b-12d3-a456-426614174000');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid UUID', () => {
      expect(validate.uuid('not-a-uuid').valid).toBe(false);
      expect(validate.uuid('').valid).toBe(false);
      expect(validate.uuid(123).valid).toBe(false);
    });
  });

  describe('validate.gameSettings', () => {
    it('should accept valid settings', () => {
      const result = validate.gameSettings({
        tagRadius: 30,
        maxPlayers: 8,
        gameName: 'Test Game',
      });

      expect(result.valid).toBe(true);
      expect(result.settings.tagRadius).toBe(30);
      expect(result.settings.maxPlayers).toBe(8);
    });

    it('should reject invalid tagRadius', () => {
      expect(validate.gameSettings({ tagRadius: 0 }).valid).toBe(false);
      expect(validate.gameSettings({ tagRadius: 1001 }).valid).toBe(false);
    });

    it('should reject invalid maxPlayers', () => {
      expect(validate.gameSettings({ maxPlayers: 1 }).valid).toBe(false);
      expect(validate.gameSettings({ maxPlayers: 51 }).valid).toBe(false);
    });

    it('should validate noTagZones', () => {
      const result = validate.gameSettings({
        noTagZones: [
          { lat: 40.7128, lng: -74.0060, radius: 100, name: 'Home' },
        ],
      });

      expect(result.valid).toBe(true);
      expect(result.settings.noTagZones).toHaveLength(1);
    });

    it('should filter invalid noTagZones', () => {
      const result = validate.gameSettings({
        noTagZones: [
          { lat: 40.7128, lng: -74.0060, radius: 100 }, // valid
          { lat: 999, lng: -74.0060, radius: 100 }, // invalid lat
        ],
      });

      expect(result.valid).toBe(true);
      expect(result.settings.noTagZones).toHaveLength(1);
    });

    it('should limit noTagZones to 10', () => {
      const zones = Array(15).fill(null).map((_, i) => ({
        lat: 40.7128 + i * 0.001,
        lng: -74.0060,
        radius: 100,
      }));

      const result = validate.gameSettings({ noTagZones: zones });
      expect(result.valid).toBe(true);
      expect(result.settings.noTagZones.length).toBeLessThanOrEqual(10);
    });
  });
});

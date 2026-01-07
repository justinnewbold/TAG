/**
 * Shared input validation utilities
 * Used by both client and server for consistent validation
 */

// ============================================
// Types
// ============================================

export interface Location {
  lat: number;
  lng: number;
}

export interface NoTagZone extends Location {
  id?: string;
  name?: string;
  radius: number;
}

export interface TimeRule {
  days: number[];  // 0-6 (Sunday-Saturday)
  startTime: string;  // HH:MM format
  endTime: string;    // HH:MM format
}

export interface GameSettings {
  gameName?: string;
  gameMode?: string;
  tagRadius?: number;
  maxPlayers?: number;
  duration?: number | null;
  gpsInterval?: number;
  noTagZones?: NoTagZone[];
  noTagTimes?: TimeRule[];
  customBoundary?: unknown;
  isPublic?: boolean;
  allowSoloPlay?: boolean;
  requireApproval?: boolean;
  tagImmunityTime?: number;
  playAreaRadius?: number;
  potatoTimer?: number;
  hideTime?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SettingsLimit {
  min: number;
  max: number;
  default: number | null;
}

export interface SettingsLimits {
  tagRadius: SettingsLimit;
  maxPlayers: SettingsLimit;
  duration: SettingsLimit;
  gpsInterval: SettingsLimit;
  potatoTimer: SettingsLimit;
  hideTime: SettingsLimit;
  zoneRadius: SettingsLimit;
}

// ============================================
// Constants
// ============================================

export const GAME_CODE_REGEX = /^[A-Z0-9]{6}$/;
export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_REGEX = /^[a-zA-Z0-9_\-\s]+$/;
export const GAME_NAME_MAX_LENGTH = 50;

export const GAME_SETTINGS_LIMITS: SettingsLimits = {
  tagRadius: { min: 5, max: 100, default: 20 },
  maxPlayers: { min: 2, max: 50, default: 10 },
  duration: { min: 60000, max: 72 * 60 * 60 * 1000, default: null }, // 1 min to 72 hours
  gpsInterval: { min: 1000, max: 30 * 60 * 1000, default: 5 * 60 * 1000 }, // 1 sec to 30 min
  potatoTimer: { min: 10000, max: 120000, default: 45000 }, // 10 sec to 2 min
  hideTime: { min: 30000, max: 600000, default: 120000 }, // 30 sec to 10 min
  zoneRadius: { min: 10, max: 1000, default: 50 },
};

// Private regex constants
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;
const TIME_REGEX = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

// ============================================
// Game Code Validation
// ============================================

export function isValidGameCode(code: unknown): code is string {
  if (!code || typeof code !== 'string') return false;
  return GAME_CODE_REGEX.test(code.toUpperCase());
}

// ============================================
// Username Validation
// ============================================

export function isValidUsername(username: unknown): username is string {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  if (trimmed.length < USERNAME_MIN_LENGTH || trimmed.length > USERNAME_MAX_LENGTH) return false;
  return USERNAME_REGEX.test(trimmed);
}

export function sanitizeUsername(username: unknown): string {
  if (!username || typeof username !== 'string') return '';
  return username
    .trim()
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .substring(0, USERNAME_MAX_LENGTH);
}

// ============================================
// Game Name Validation
// ============================================

export function isValidGameName(name: unknown): name is string {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= GAME_NAME_MAX_LENGTH;
}

export function sanitizeGameName(name: unknown): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .substring(0, GAME_NAME_MAX_LENGTH);
}

// ============================================
// Location Validation
// ============================================

export function isValidLocation(location: unknown): location is Location {
  if (!location || typeof location !== 'object') return false;
  const loc = location as Record<string, unknown>;
  const { lat, lng } = loc;

  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;

  // Valid latitude: -90 to 90
  // Valid longitude: -180 to 180
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return isValidLocation({ lat, lng });
}

// ============================================
// Game Settings Validation
// ============================================

export function validateGameSettings(settings: GameSettings): ValidationResult {
  const errors: string[] = [];
  const limits = GAME_SETTINGS_LIMITS;

  if (settings.tagRadius !== undefined) {
    if (typeof settings.tagRadius !== 'number' ||
        settings.tagRadius < limits.tagRadius.min ||
        settings.tagRadius > limits.tagRadius.max) {
      errors.push(`Tag radius must be between ${limits.tagRadius.min} and ${limits.tagRadius.max} meters`);
    }
  }

  if (settings.maxPlayers !== undefined) {
    if (!Number.isInteger(settings.maxPlayers) ||
        settings.maxPlayers < limits.maxPlayers.min ||
        settings.maxPlayers > limits.maxPlayers.max) {
      errors.push(`Max players must be between ${limits.maxPlayers.min} and ${limits.maxPlayers.max}`);
    }
  }

  if (settings.duration !== undefined && settings.duration !== null) {
    if (typeof settings.duration !== 'number' ||
        settings.duration < limits.duration.min ||
        settings.duration > limits.duration.max) {
      errors.push('Invalid game duration');
    }
  }

  if (settings.gpsInterval !== undefined) {
    if (typeof settings.gpsInterval !== 'number' ||
        settings.gpsInterval < limits.gpsInterval.min ||
        settings.gpsInterval > limits.gpsInterval.max) {
      errors.push('Invalid GPS interval');
    }
  }

  if (settings.gameName !== undefined && !isValidGameName(settings.gameName)) {
    errors.push(`Game name must be 1-${GAME_NAME_MAX_LENGTH} characters`);
  }

  // Validate no-tag zones
  if (settings.noTagZones && Array.isArray(settings.noTagZones)) {
    for (let i = 0; i < settings.noTagZones.length; i++) {
      const zone = settings.noTagZones[i];
      if (!isValidLocation(zone)) {
        errors.push(`Invalid location for safe zone ${i + 1}`);
      }
      if (zone.radius !== undefined &&
          (typeof zone.radius !== 'number' ||
           zone.radius < limits.zoneRadius.min ||
           zone.radius > limits.zoneRadius.max)) {
        errors.push(`Safe zone ${i + 1} radius must be between ${limits.zoneRadius.min} and ${limits.zoneRadius.max} meters`);
      }
    }
  }

  // Validate no-tag times
  if (settings.noTagTimes && Array.isArray(settings.noTagTimes)) {
    for (let i = 0; i < settings.noTagTimes.length; i++) {
      const rule = settings.noTagTimes[i];
      if (!isValidTimeRule(rule)) {
        errors.push(`Invalid no-tag time rule ${i + 1}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// Time Rule Validation
// ============================================

export function isValidTimeRule(rule: unknown): rule is TimeRule {
  if (!rule || typeof rule !== 'object') return false;
  const r = rule as Record<string, unknown>;
  const { days, startTime, endTime } = r;

  // Days should be array of 0-6 (Sunday-Saturday)
  if (!Array.isArray(days) || days.length === 0) return false;
  if (!days.every((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6)) return false;

  // Times should be in HH:MM format
  if (typeof startTime !== 'string' || !TIME_REGEX.test(startTime)) return false;
  if (typeof endTime !== 'string' || !TIME_REGEX.test(endTime)) return false;

  return true;
}

// ============================================
// Settings Sanitization
// ============================================

export function sanitizeGameSettings(settings: GameSettings): GameSettings {
  const limits = GAME_SETTINGS_LIMITS;
  const sanitized = { ...settings };

  if (sanitized.tagRadius !== undefined) {
    sanitized.tagRadius = clamp(
      Number(sanitized.tagRadius) || limits.tagRadius.default!,
      limits.tagRadius.min,
      limits.tagRadius.max
    );
  }

  if (sanitized.maxPlayers !== undefined) {
    sanitized.maxPlayers = clamp(
      Math.round(Number(sanitized.maxPlayers) || limits.maxPlayers.default!),
      limits.maxPlayers.min,
      limits.maxPlayers.max
    );
  }

  if (sanitized.duration !== undefined && sanitized.duration !== null) {
    sanitized.duration = clamp(
      Number(sanitized.duration) || limits.duration.min,
      limits.duration.min,
      limits.duration.max
    );
  }

  if (sanitized.gpsInterval !== undefined) {
    sanitized.gpsInterval = clamp(
      Number(sanitized.gpsInterval) || limits.gpsInterval.default!,
      limits.gpsInterval.min,
      limits.gpsInterval.max
    );
  }

  if (sanitized.gameName !== undefined) {
    sanitized.gameName = sanitizeGameName(sanitized.gameName);
  }

  return sanitized;
}

// ============================================
// Utility Functions
// ============================================

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================
// ID Validation
// ============================================

export function isValidUUID(id: unknown): id is string {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id);
}

export function isValidId(id: unknown): boolean {
  if (!id) return false;
  if (typeof id === 'string') return id.length > 0 && id.length <= 100;
  if (typeof id === 'number') return Number.isFinite(id);
  return false;
}

// ============================================
// Contact Validation
// ============================================

export function isValidEmail(email: unknown): email is string {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim()) && email.length <= 254;
}

export function isValidPhone(phone: unknown): phone is string {
  if (!phone || typeof phone !== 'string') return false;
  return PHONE_REGEX.test(phone.trim());
}

// ============================================
// Avatar Validation
// ============================================

export function isValidAvatar(avatar: unknown): avatar is string {
  if (!avatar || typeof avatar !== 'string') return false;
  // Allow single emoji (1-4 chars for emoji with modifiers)
  if (avatar.length <= 4) return true;
  // Or URL starting with http/https
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    try {
      new URL(avatar);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

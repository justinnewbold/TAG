/**
 * Client-side Input Validation Utilities
 * Phase 1: Security foundations - input validation
 */

// Profanity word list (basic - can be expanded)
const PROFANITY_LIST = [
  'fuck', 'shit', 'ass', 'damn', 'bitch', 'crap', 'dick', 'cock', 'pussy',
  'bastard', 'slut', 'whore', 'nigger', 'faggot', 'retard', 'cunt',
];

/**
 * Validate username
 * - Max 20 characters
 * - Alphanumeric, spaces, underscores, and hyphens only
 * - No consecutive special characters
 */
export function validateUsername(username) {
  const errors = [];

  if (!username || typeof username !== 'string') {
    return { valid: false, errors: ['Username is required'] };
  }

  const trimmed = username.trim();

  if (trimmed.length === 0) {
    errors.push('Username cannot be empty');
  }

  if (trimmed.length > 20) {
    errors.push('Username must be 20 characters or less');
  }

  if (trimmed.length < 2) {
    errors.push('Username must be at least 2 characters');
  }

  // Only allow alphanumeric, spaces, underscores, and hyphens
  if (!/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) {
    errors.push('Username can only contain letters, numbers, spaces, underscores, and hyphens');
  }

  // No consecutive special characters
  if (/[_\- ]{2,}/.test(trimmed)) {
    errors.push('Username cannot have consecutive special characters');
  }

  // Must start with alphanumeric
  if (!/^[a-zA-Z0-9]/.test(trimmed)) {
    errors.push('Username must start with a letter or number');
  }

  // Check for profanity
  const lowerUsername = trimmed.toLowerCase();
  const hasProfanity = PROFANITY_LIST.some(word => lowerUsername.includes(word));
  if (hasProfanity) {
    errors.push('Username contains inappropriate language');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: trimmed,
  };
}

/**
 * Validate game name
 * - Max 50 characters
 * - Basic profanity filter
 */
export function validateGameName(name) {
  const errors = [];

  if (!name || typeof name !== 'string') {
    return { valid: false, errors: ['Game name is required'] };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    errors.push('Game name cannot be empty');
  }

  if (trimmed.length > 50) {
    errors.push('Game name must be 50 characters or less');
  }

  if (trimmed.length < 3) {
    errors.push('Game name must be at least 3 characters');
  }

  // Check for profanity
  const lowerName = trimmed.toLowerCase();
  const hasProfanity = PROFANITY_LIST.some(word => lowerName.includes(word));
  if (hasProfanity) {
    errors.push('Game name contains inappropriate language');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: trimmed,
  };
}

/**
 * Validate GPS coordinates
 * - Latitude: -90 to 90
 * - Longitude: -180 to 180
 */
export function validateGPSCoordinates(lat, lng) {
  const errors = [];

  if (typeof lat !== 'number' || isNaN(lat)) {
    errors.push('Invalid latitude');
  } else if (lat < -90 || lat > 90) {
    errors.push('Latitude must be between -90 and 90');
  }

  if (typeof lng !== 'number' || isNaN(lng)) {
    errors.push('Invalid longitude');
  } else if (lng < -180 || lng > 180) {
    errors.push('Longitude must be between -180 and 180');
  }

  return {
    valid: errors.length === 0,
    errors,
    lat: parseFloat(lat) || 0,
    lng: parseFloat(lng) || 0,
  };
}

/**
 * Validate movement speed (anti-cheat)
 * - Max 50 km/h for walking/running games
 * - Max 150 km/h if vehicles are allowed
 */
export function validateMovementSpeed(speedMps, allowVehicles = false) {
  const maxSpeed = allowVehicles ? 41.67 : 13.89; // m/s (150 km/h or 50 km/h)
  const isValid = speedMps <= maxSpeed;

  return {
    valid: isValid,
    speed: speedMps,
    maxSpeed,
    reason: isValid ? null : `Speed ${(speedMps * 3.6).toFixed(1)} km/h exceeds maximum ${(maxSpeed * 3.6).toFixed(0)} km/h`,
  };
}

/**
 * Validate email address
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);

  return {
    valid: isValid,
    error: isValid ? null : 'Invalid email address',
    sanitized: email?.toLowerCase().trim(),
  };
}

/**
 * Validate game code
 * - 6 alphanumeric characters
 */
export function validateGameCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Game code is required' };
  }

  const sanitized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isValid = sanitized.length === 6;

  return {
    valid: isValid,
    error: isValid ? null : 'Game code must be 6 characters',
    sanitized,
  };
}

/**
 * Validate chat message
 * - Max 500 characters
 * - Basic profanity filter
 */
export function validateChatMessage(message) {
  const errors = [];

  if (!message || typeof message !== 'string') {
    return { valid: false, errors: ['Message is required'] };
  }

  const trimmed = message.trim();

  if (trimmed.length === 0) {
    errors.push('Message cannot be empty');
  }

  if (trimmed.length > 500) {
    errors.push('Message must be 500 characters or less');
  }

  // Check for profanity (optional - can be toggled in settings)
  const lowerMessage = trimmed.toLowerCase();
  const hasProfanity = PROFANITY_LIST.some(word => lowerMessage.includes(word));

  return {
    valid: errors.length === 0,
    errors,
    sanitized: trimmed,
    hasProfanity,
  };
}

/**
 * Validate report reason
 */
export function validateReportReason(reason, description = '') {
  const validReasons = ['cheating', 'harassment', 'inappropriate_name', 'spam', 'other'];
  const errors = [];

  if (!validReasons.includes(reason)) {
    errors.push('Invalid report reason');
  }

  if (reason === 'other' && (!description || description.trim().length < 10)) {
    errors.push('Please provide a description (at least 10 characters)');
  }

  if (description && description.length > 500) {
    errors.push('Description must be 500 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHTML(html) {
  if (!html) return '';
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate tag radius setting
 */
export function validateTagRadius(radius) {
  const num = parseFloat(radius);
  if (isNaN(num)) {
    return { valid: false, error: 'Tag radius must be a number' };
  }
  if (num < 1 || num > 1000) {
    return { valid: false, error: 'Tag radius must be between 1 and 1000 meters' };
  }
  return { valid: true, value: num };
}

/**
 * Validate game duration
 */
export function validateDuration(duration) {
  if (duration === null || duration === 'unlimited') {
    return { valid: true, value: null };
  }
  const num = parseInt(duration, 10);
  if (isNaN(num) || num < 0) {
    return { valid: false, error: 'Duration must be a positive number' };
  }
  if (num > 0 && num < 300000) {
    return { valid: false, error: 'Duration must be at least 5 minutes' };
  }
  if (num > 2592000000) {
    return { valid: false, error: 'Duration cannot exceed 30 days' };
  }
  return { valid: true, value: num };
}

export default {
  validateUsername,
  validateGameName,
  validateGPSCoordinates,
  validateMovementSpeed,
  validateEmail,
  validateGameCode,
  validateChatMessage,
  validateReportReason,
  sanitizeHTML,
  validateTagRadius,
  validateDuration,
};

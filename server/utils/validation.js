import validator from 'validator';

// Sanitize and validate user input
export const sanitize = {
  // Sanitize string input
  string(input, maxLength = 100) {
    if (typeof input !== 'string') return '';
    return validator.escape(validator.trim(input)).slice(0, maxLength);
  },

  // Sanitize player name
  playerName(input) {
    if (typeof input !== 'string') return '';
    // Allow letters, numbers, spaces, and common punctuation
    const cleaned = input.trim().slice(0, 30);
    // Remove any potentially dangerous characters but keep emojis
    return cleaned.replace(/[<>\"\'&]/g, '');
  },

  // Sanitize game name
  gameName(input) {
    if (typeof input !== 'string') return '';
    const cleaned = input.trim().slice(0, 50);
    return cleaned.replace(/[<>\"\'&]/g, '');
  },

  // Validate emoji (for avatar)
  emoji(input) {
    if (typeof input !== 'string') return '😀';
    // Keep only first emoji-like character sequence
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/u;
    const match = input.match(emojiRegex);
    return match ? match[0] : '😀';
  }
};

// Validate data types and ranges
export const validate = {
  // Validate coordinates
  coordinates(lat, lng) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return { valid: false, error: 'Invalid coordinates' };
    }

    if (latitude < -90 || latitude > 90) {
      return { valid: false, error: 'Latitude must be between -90 and 90' };
    }

    if (longitude < -180 || longitude > 180) {
      return { valid: false, error: 'Longitude must be between -180 and 180' };
    }

    return { valid: true, lat: latitude, lng: longitude };
  },

  // Validate location object
  location(location) {
    if (!location || typeof location !== 'object') {
      return { valid: false, error: 'Invalid location object' };
    }

    return this.coordinates(location.lat, location.lng);
  },

  // Validate game settings
  gameSettings(settings) {
    const errors = [];
    const validated = {};

    // GPS interval: 1 second to 30 minutes
    if (settings.gpsInterval !== undefined) {
      const interval = parseInt(settings.gpsInterval);
      if (isNaN(interval) || interval < 1000 || interval > 30 * 60 * 1000) {
        errors.push('GPS interval must be between 1 second and 30 minutes');
      } else {
        validated.gpsInterval = interval;
      }
    }

    // Tag radius: 1 meter to 1000 meters
    if (settings.tagRadius !== undefined) {
      const radius = parseInt(settings.tagRadius);
      if (isNaN(radius) || radius < 1 || radius > 1000) {
        errors.push('Tag radius must be between 1 and 1000 meters');
      } else {
        validated.tagRadius = radius;
      }
    }

    // Max players: 2 to 50
    if (settings.maxPlayers !== undefined) {
      const max = parseInt(settings.maxPlayers);
      if (isNaN(max) || max < 2 || max > 50) {
        errors.push('Max players must be between 2 and 50');
      } else {
        validated.maxPlayers = max;
      }
    }

    // Game name
    if (settings.gameName !== undefined) {
      validated.gameName = sanitize.gameName(settings.gameName);
    }

    // Duration: null (unlimited) or 1 minute to 7 days
    if (settings.duration !== undefined) {
      if (settings.duration === null) {
        validated.duration = null; // Unlimited duration
      } else {
        const duration = parseInt(settings.duration);
        const minDuration = 60 * 1000; // 1 minute
        const maxDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (isNaN(duration) || duration < minDuration || duration > maxDuration) {
          errors.push('Duration must be between 1 minute and 7 days');
        } else {
          validated.duration = duration;
        }
      }
    }

    // No-tag zones (validate each zone, limit to 10)
    if (settings.noTagZones !== undefined) {
      if (!Array.isArray(settings.noTagZones)) {
        errors.push('No-tag zones must be an array');
      } else {
        // Truncate to max 10 zones silently
        validated.noTagZones = settings.noTagZones
          .slice(0, 10)
          .filter(zone => {
            const coords = this.coordinates(zone.lat, zone.lng);
            const radius = parseInt(zone.radius);
            return coords.valid && !isNaN(radius) && radius > 0 && radius <= 1000;
          })
          .map(zone => ({
            id: zone.id, // Preserve zone ID for React keys
            lat: parseFloat(zone.lat),
            lng: parseFloat(zone.lng),
            radius: Math.min(parseInt(zone.radius), 1000),
            name: sanitize.string(zone.name || '', 30)
          }));
      }
    }

    // No-tag times (validate each time rule)
    if (settings.noTagTimes !== undefined) {
      if (!Array.isArray(settings.noTagTimes)) {
        errors.push('No-tag times must be an array');
      } else if (settings.noTagTimes.length > 10) {
        errors.push('Maximum 10 no-tag time rules allowed');
      } else {
        validated.noTagTimes = settings.noTagTimes
          .slice(0, 10)
          .filter(rule => {
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            return (
              Array.isArray(rule.days) &&
              rule.days.every(d => Number.isInteger(d) && d >= 0 && d <= 6) &&
              timeRegex.test(rule.startTime) &&
              timeRegex.test(rule.endTime)
            );
          })
          .map(rule => ({
            id: rule.id, // Preserve rule ID for React keys
            days: rule.days.filter(d => d >= 0 && d <= 6),
            startTime: rule.startTime,
            endTime: rule.endTime,
            name: sanitize.string(rule.name || '', 30)
          }));
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      settings: validated
    };
  },

  // Validate game code format
  gameCode(code) {
    if (typeof code !== 'string') {
      return { valid: false, error: 'Game code must be a string' };
    }

    const cleaned = code.toUpperCase().trim();
    if (!/^[A-Z0-9]{6}$/.test(cleaned)) {
      return { valid: false, error: 'Game code must be 6 alphanumeric characters' };
    }

    return { valid: true, code: cleaned };
  },

  // Validate UUID
  uuid(id) {
    if (typeof id !== 'string') {
      return { valid: false, error: 'Invalid ID format' };
    }

    if (!validator.isUUID(id)) {
      return { valid: false, error: 'Invalid ID format' };
    }

    return { valid: true, id };
  }
};

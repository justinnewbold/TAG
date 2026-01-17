/**
 * Request Validation Schemas
 * Comprehensive schema validation for all API endpoints and socket events
 */

import { logger } from './logger.js';

// Custom validation functions
const validators = {
  isString: (v) => typeof v === 'string',
  isNumber: (v) => typeof v === 'number' && !isNaN(v),
  isInteger: (v) => Number.isInteger(v),
  isBoolean: (v) => typeof v === 'boolean',
  isArray: (v) => Array.isArray(v),
  isObject: (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
  isEmail: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  isUUID: (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v),
  isGameCode: (v) => /^[A-Z0-9]{6}$/.test(v?.toUpperCase?.()),
  isLatitude: (v) => typeof v === 'number' && v >= -90 && v <= 90,
  isLongitude: (v) => typeof v === 'number' && v >= -180 && v <= 180,
  isTimestamp: (v) => Number.isInteger(v) && v > 0,
  isPhone: (v) => /^\+?[1-9]\d{1,14}$/.test(v?.replace?.(/[\s()-]/g, '')),
  isHexColor: (v) => /^#[0-9A-Fa-f]{6}$/.test(v),
  isURL: (v) => {
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  },
};

// Sanitization functions
const sanitizers = {
  trim: (v) => (typeof v === 'string' ? v.trim() : v),
  lowercase: (v) => (typeof v === 'string' ? v.toLowerCase() : v),
  uppercase: (v) => (typeof v === 'string' ? v.toUpperCase() : v),
  escapeHtml: (v) => {
    if (typeof v !== 'string') return v;
    return v
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
  stripTags: (v) => {
    if (typeof v !== 'string') return v;
    return v.replace(/<[^>]*>/g, '');
  },
  normalizeSpaces: (v) => {
    if (typeof v !== 'string') return v;
    return v.replace(/\s+/g, ' ').trim();
  },
  removeControlChars: (v) => {
    if (typeof v !== 'string') return v;
    // eslint-disable-next-line no-control-regex
    return v.replace(/[\x00-\x1F\x7F]/g, '');
  },
  toNumber: (v) => {
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  },
  toInteger: (v) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? undefined : n;
  },
  toBoolean: (v) => {
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return undefined;
  },
};

// Schema field definition
class SchemaField {
  constructor(type) {
    this.type = type;
    this._required = false;
    this._default = undefined;
    this._min = undefined;
    this._max = undefined;
    this._minLength = undefined;
    this._maxLength = undefined;
    this._pattern = undefined;
    this._enum = undefined;
    this._sanitize = [];
    this._custom = [];
    this._message = undefined;
  }

  required(msg) {
    this._required = true;
    this._message = msg;
    return this;
  }

  optional() {
    this._required = false;
    return this;
  }

  default(value) {
    this._default = value;
    return this;
  }

  min(value) {
    this._min = value;
    return this;
  }

  max(value) {
    this._max = value;
    return this;
  }

  minLength(value) {
    this._minLength = value;
    return this;
  }

  maxLength(value) {
    this._maxLength = value;
    return this;
  }

  pattern(regex, msg) {
    this._pattern = { regex, msg };
    return this;
  }

  enum(values) {
    this._enum = values;
    return this;
  }

  sanitize(...fns) {
    this._sanitize.push(...fns);
    return this;
  }

  custom(fn, msg) {
    this._custom.push({ fn, msg });
    return this;
  }

  validate(value, fieldName) {
    const errors = [];

    // Apply sanitizers first
    let sanitized = value;
    for (const fn of this._sanitize) {
      const sanitizer = typeof fn === 'string' ? sanitizers[fn] : fn;
      if (sanitizer) {
        sanitized = sanitizer(sanitized);
      }
    }

    // Check required
    if (sanitized === undefined || sanitized === null || sanitized === '') {
      if (this._required) {
        return { valid: false, errors: [this._message || `${fieldName} is required`] };
      }
      // Return default if not required and no value
      return { valid: true, value: this._default };
    }

    // Type validation
    const typeValidator = validators[`is${this.type.charAt(0).toUpperCase() + this.type.slice(1)}`];
    if (typeValidator && !typeValidator(sanitized)) {
      // Try type coercion
      if (this.type === 'number') sanitized = sanitizers.toNumber(sanitized);
      else if (this.type === 'integer') sanitized = sanitizers.toInteger(sanitized);
      else if (this.type === 'boolean') sanitized = sanitizers.toBoolean(sanitized);

      if (sanitized === undefined || (typeValidator && !typeValidator(sanitized))) {
        return { valid: false, errors: [`${fieldName} must be a ${this.type}`] };
      }
    }

    // Min/max for numbers
    if ((this.type === 'number' || this.type === 'integer') && typeof sanitized === 'number') {
      if (this._min !== undefined && sanitized < this._min) {
        errors.push(`${fieldName} must be at least ${this._min}`);
      }
      if (this._max !== undefined && sanitized > this._max) {
        errors.push(`${fieldName} must be at most ${this._max}`);
      }
    }

    // Length for strings and arrays
    if (typeof sanitized === 'string' || Array.isArray(sanitized)) {
      if (this._minLength !== undefined && sanitized.length < this._minLength) {
        errors.push(`${fieldName} must be at least ${this._minLength} characters`);
      }
      if (this._maxLength !== undefined && sanitized.length > this._maxLength) {
        errors.push(`${fieldName} must be at most ${this._maxLength} characters`);
      }
    }

    // Pattern for strings
    if (typeof sanitized === 'string' && this._pattern) {
      if (!this._pattern.regex.test(sanitized)) {
        errors.push(this._pattern.msg || `${fieldName} format is invalid`);
      }
    }

    // Enum validation
    if (this._enum && !this._enum.includes(sanitized)) {
      errors.push(`${fieldName} must be one of: ${this._enum.join(', ')}`);
    }

    // Custom validators
    for (const { fn, msg } of this._custom) {
      if (!fn(sanitized)) {
        errors.push(msg || `${fieldName} is invalid`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, value: sanitized };
  }
}

// Schema factory functions
const Schema = {
  string: () => new SchemaField('string'),
  number: () => new SchemaField('number'),
  integer: () => new SchemaField('integer'),
  boolean: () => new SchemaField('boolean'),
  array: () => new SchemaField('array'),
  object: () => new SchemaField('object'),
  email: () => new SchemaField('string').custom(validators.isEmail, 'Invalid email format').sanitize('trim', 'lowercase'),
  uuid: () => new SchemaField('string').custom(validators.isUUID, 'Invalid ID format'),
  gameCode: () => new SchemaField('string').custom(validators.isGameCode, 'Invalid game code').sanitize('trim', 'uppercase'),
  latitude: () => new SchemaField('number').min(-90).max(90),
  longitude: () => new SchemaField('number').min(-180).max(180),
  timestamp: () => new SchemaField('integer').min(0),
  phone: () => new SchemaField('string').custom(validators.isPhone, 'Invalid phone number'),
  url: () => new SchemaField('string').custom(validators.isURL, 'Invalid URL'),
};

/**
 * Validate data against a schema definition
 */
function validateSchema(data, schemaDefinition) {
  const errors = [];
  const validated = {};

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Request body must be an object'], data: {} };
  }

  for (const [fieldName, fieldSchema] of Object.entries(schemaDefinition)) {
    const value = data[fieldName];
    const result = fieldSchema.validate(value, fieldName);

    if (!result.valid) {
      errors.push(...result.errors);
    } else if (result.value !== undefined) {
      validated[fieldName] = result.value;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: validated,
  };
}

/**
 * Express middleware for schema validation
 */
function validateRequest(schemaDefinition, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const result = validateSchema(data, schemaDefinition);

    if (!result.valid) {
      logger.debug('Validation failed', { path: req.path, errors: result.errors });
      return res.status(400).json({
        error: 'Validation failed',
        details: result.errors,
      });
    }

    // Replace request data with validated/sanitized data
    req.validated = result.data;
    next();
  };
}

// ============ Pre-defined Schemas ============

const schemas = {
  // Auth schemas
  register: {
    name: Schema.string().required().minLength(2).maxLength(30).sanitize('trim', 'stripTags'),
    avatar: Schema.string().optional().maxLength(10),
  },

  registerEmail: {
    email: Schema.email().required(),
    password: Schema.string().required().minLength(8).maxLength(100),
    name: Schema.string().optional().minLength(2).maxLength(30).sanitize('trim', 'stripTags'),
    avatar: Schema.string().optional().maxLength(10),
  },

  login: {
    email: Schema.email().required(),
    password: Schema.string().required(),
  },

  refreshToken: {
    refreshToken: Schema.string().required().minLength(64).maxLength(256),
  },

  // Game schemas
  createGame: {
    gameName: Schema.string().optional().maxLength(50).sanitize('trim', 'stripTags'),
    gameMode: Schema.string().optional().enum(['classic', 'freezeTag', 'infection', 'teamTag', 'manhunt', 'hotPotato', 'hideAndSeek']),
    duration: Schema.integer().optional().min(300000).max(2592000000), // 5 min to 30 days
    maxPlayers: Schema.integer().optional().min(2).max(50).default(10),
    tagRadius: Schema.integer().optional().min(1).max(1000).default(10),
    gpsInterval: Schema.integer().optional().min(5000).max(86400000).default(5000),
    isPublic: Schema.boolean().optional().default(false),
  },

  joinGame: {
    code: Schema.gameCode().required(),
  },

  // Location schemas
  locationUpdate: {
    lat: Schema.latitude().required(),
    lng: Schema.longitude().required(),
    accuracy: Schema.number().optional().min(0).max(1000),
    altitude: Schema.number().optional(),
    speed: Schema.number().optional().min(0),
    heading: Schema.number().optional().min(0).max(360),
    timestamp: Schema.timestamp().optional(),
  },

  // Tag schemas
  tagAttempt: {
    targetId: Schema.uuid().required(),
  },

  // Chat schemas
  chatMessage: {
    content: Schema.string().required().minLength(1).maxLength(500).sanitize('trim', 'stripTags', 'removeControlChars'),
    type: Schema.string().optional().enum(['text', 'emoji', 'system']).default('text'),
  },

  // Friend schemas
  friendRequest: {
    targetId: Schema.uuid().optional(),
    friendCode: Schema.string().optional().minLength(6).maxLength(20).sanitize('trim', 'uppercase'),
  },

  // Report schemas
  report: {
    reportedUserId: Schema.uuid().required(),
    reason: Schema.string().required().enum(['cheating', 'harassment', 'inappropriate_name', 'other']),
    description: Schema.string().optional().maxLength(500).sanitize('trim', 'stripTags'),
    gameId: Schema.uuid().optional(),
  },

  // Profile schemas
  updateProfile: {
    name: Schema.string().optional().minLength(2).maxLength(30).sanitize('trim', 'stripTags'),
    avatar: Schema.string().optional().maxLength(10),
  },

  // Settings schemas
  updateSettings: {
    notifications: Schema.boolean().optional(),
    soundEnabled: Schema.boolean().optional(),
    vibration: Schema.boolean().optional(),
    showDistance: Schema.boolean().optional(),
    theme: Schema.string().optional().enum(['light', 'dark', 'system']),
    language: Schema.string().optional().pattern(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code'),
  },

  // Pagination schemas
  pagination: {
    page: Schema.integer().optional().min(1).default(1),
    limit: Schema.integer().optional().min(1).max(100).default(20),
    sortBy: Schema.string().optional().sanitize('trim'),
    sortOrder: Schema.string().optional().enum(['asc', 'desc']).default('desc'),
  },

  // Search schemas
  search: {
    query: Schema.string().required().minLength(1).maxLength(100).sanitize('trim', 'stripTags'),
    type: Schema.string().optional().enum(['users', 'games', 'all']).default('all'),
  },
};

export {
  Schema,
  SchemaField,
  validateSchema,
  validateRequest,
  schemas,
  validators,
  sanitizers,
};

export default {
  Schema,
  validateSchema,
  validateRequest,
  schemas,
};

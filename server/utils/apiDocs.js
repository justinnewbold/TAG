/**
 * API Documentation Generator
 * Generates OpenAPI/Swagger documentation from validation schemas
 */

import { schemas } from './schemas.js';

// API Info
const API_INFO = {
  title: 'TAG Game API',
  description: 'Real-time GPS-based tag game API',
  version: '1.0.0',
  contact: {
    name: 'TAG Game Support',
  },
};

// Server configurations
const SERVERS = [
  {
    url: 'http://localhost:3001',
    description: 'Development server',
  },
  {
    url: 'https://api.tag.game',
    description: 'Production server',
  },
];

// Security schemes
const SECURITY_SCHEMES = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT access token',
  },
};

// Convert schema field to OpenAPI schema
function fieldToOpenAPI(field) {
  const schema = {};

  switch (field.type) {
    case 'string':
      schema.type = 'string';
      if (field._minLength) schema.minLength = field._minLength;
      if (field._maxLength) schema.maxLength = field._maxLength;
      if (field._pattern) schema.pattern = field._pattern.regex.source;
      if (field._enum) schema.enum = field._enum;
      break;
    case 'number':
      schema.type = 'number';
      if (field._min !== undefined) schema.minimum = field._min;
      if (field._max !== undefined) schema.maximum = field._max;
      break;
    case 'integer':
      schema.type = 'integer';
      if (field._min !== undefined) schema.minimum = field._min;
      if (field._max !== undefined) schema.maximum = field._max;
      break;
    case 'boolean':
      schema.type = 'boolean';
      break;
    case 'array':
      schema.type = 'array';
      schema.items = {};
      break;
    case 'object':
      schema.type = 'object';
      break;
    default:
      schema.type = 'string';
  }

  if (field._default !== undefined) {
    schema.default = field._default;
  }

  return schema;
}

// Convert schema definition to OpenAPI schema
function schemaToOpenAPI(schemaDefinition) {
  const properties = {};
  const required = [];

  for (const [name, field] of Object.entries(schemaDefinition)) {
    properties[name] = fieldToOpenAPI(field);
    if (field._required) {
      required.push(name);
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 && { required }),
  };
}

// API endpoint definitions
const ENDPOINTS = {
  // Authentication
  '/api/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Register anonymously',
      description: 'Create a new anonymous user account',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Register' },
          },
        },
      },
      responses: {
        201: {
          description: 'User created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthResponse' },
            },
          },
        },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },

  '/api/auth/register/email': {
    post: {
      tags: ['Authentication'],
      summary: 'Register with email',
      description: 'Create a new user account with email and password',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterEmail' },
          },
        },
      },
      responses: {
        201: {
          description: 'User created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthResponse' },
            },
          },
        },
        400: { $ref: '#/components/responses/BadRequest' },
        409: { description: 'Email already registered' },
      },
    },
  },

  '/api/auth/login/email': {
    post: {
      tags: ['Authentication'],
      summary: 'Login with email',
      description: 'Authenticate with email and password',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Login' },
          },
        },
      },
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthResponse' },
            },
          },
        },
        401: { description: 'Invalid credentials' },
      },
    },
  },

  '/api/auth/refresh': {
    post: {
      tags: ['Authentication'],
      summary: 'Refresh access token',
      description: 'Get a new access token using a refresh token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RefreshToken' },
          },
        },
      },
      responses: {
        200: {
          description: 'Tokens refreshed',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        401: { description: 'Invalid refresh token' },
      },
    },
  },

  '/api/auth/me': {
    get: {
      tags: ['Authentication'],
      summary: 'Get current user',
      description: 'Get the currently authenticated user',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'User data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },

  // Games
  '/api/games': {
    post: {
      tags: ['Games'],
      summary: 'Create a new game',
      description: 'Create a new TAG game with specified settings',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateGame' },
          },
        },
      },
      responses: {
        201: {
          description: 'Game created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Game' },
            },
          },
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
    get: {
      tags: ['Games'],
      summary: 'List public games',
      description: 'Get a list of public games available to join',
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
      ],
      responses: {
        200: {
          description: 'List of games',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  games: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Game' },
                  },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
  },

  '/api/games/join': {
    post: {
      tags: ['Games'],
      summary: 'Join a game',
      description: 'Join a game using a game code',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/JoinGame' },
          },
        },
      },
      responses: {
        200: {
          description: 'Joined game successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Game' },
            },
          },
        },
        404: { description: 'Game not found' },
        409: { description: 'Game is full or already started' },
      },
    },
  },

  '/api/games/{gameId}': {
    get: {
      tags: ['Games'],
      summary: 'Get game details',
      description: 'Get details of a specific game',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'gameId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        200: {
          description: 'Game details',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Game' },
            },
          },
        },
        404: { description: 'Game not found' },
      },
    },
  },

  // Health
  '/api/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check',
      description: 'Check API and database health status',
      responses: {
        200: {
          description: 'Service is healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['healthy', 'degraded'] },
                  timestamp: { type: 'string', format: 'date-time' },
                  checks: {
                    type: 'object',
                    properties: {
                      database: { type: 'boolean' },
                      memory: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// Common response schemas
const COMMON_SCHEMAS = {
  AuthResponse: {
    type: 'object',
    properties: {
      user: { $ref: '#/components/schemas/User' },
      token: { type: 'string', description: 'JWT access token' },
      refreshToken: { type: 'string', description: 'Refresh token' },
    },
  },

  User: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      avatar: { type: 'string' },
      email: { type: 'string', format: 'email' },
      emailVerified: { type: 'boolean' },
      stats: {
        type: 'object',
        properties: {
          totalTags: { type: 'integer' },
          timesTagged: { type: 'integer' },
          gamesPlayed: { type: 'integer' },
          gamesWon: { type: 'integer' },
        },
      },
    },
  },

  Game: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      code: { type: 'string', description: '6-character game code' },
      status: { type: 'string', enum: ['waiting', 'active', 'paused', 'completed'] },
      hostId: { type: 'string', format: 'uuid' },
      settings: { type: 'object' },
      players: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            isIt: { type: 'boolean' },
          },
        },
      },
      createdAt: { type: 'integer' },
      startedAt: { type: 'integer' },
    },
  },

  Error: {
    type: 'object',
    properties: {
      error: { type: 'string' },
      code: { type: 'string' },
      correlationId: { type: 'string' },
      details: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  },
};

// Common responses
const COMMON_RESPONSES = {
  BadRequest: {
    description: 'Invalid request data',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
      },
    },
  },
  Unauthorized: {
    description: 'Authentication required',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
      },
    },
  },
  NotFound: {
    description: 'Resource not found',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
      },
    },
  },
  RateLimited: {
    description: 'Too many requests',
    headers: {
      'Retry-After': {
        schema: { type: 'integer' },
        description: 'Seconds until rate limit resets',
      },
    },
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
      },
    },
  },
};

// Common parameters
const COMMON_PARAMETERS = {
  page: {
    name: 'page',
    in: 'query',
    schema: { type: 'integer', minimum: 1, default: 1 },
    description: 'Page number',
  },
  limit: {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    description: 'Items per page',
  },
};

/**
 * Generate OpenAPI specification
 */
export function generateOpenAPISpec() {
  // Convert validation schemas to OpenAPI schemas
  const schemaComponents = {};
  for (const [name, schema] of Object.entries(schemas)) {
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    schemaComponents[capitalizedName] = schemaToOpenAPI(schema);
  }

  return {
    openapi: '3.0.3',
    info: API_INFO,
    servers: SERVERS,
    paths: ENDPOINTS,
    components: {
      schemas: {
        ...schemaComponents,
        ...COMMON_SCHEMAS,
      },
      responses: COMMON_RESPONSES,
      parameters: COMMON_PARAMETERS,
      securitySchemes: SECURITY_SCHEMES,
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and registration' },
      { name: 'Games', description: 'Game creation, joining, and management' },
      { name: 'Social', description: 'Friends, chat, and social features' },
      { name: 'Health', description: 'Service health and monitoring' },
    ],
  };
}

/**
 * Generate HTML documentation page
 */
export function generateDocsHTML() {
  const spec = JSON.stringify(generateOpenAPISpec());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TAG Game API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        spec: ${spec},
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "BaseLayout",
        deepLinking: true,
        showExtensions: true,
        showCommonExtensions: true
      });
    };
  </script>
</body>
</html>`;
}

/**
 * Express route for API documentation
 */
export function apiDocsRouter() {
  const router = (await import('express')).Router();

  // Serve OpenAPI JSON
  router.get('/openapi.json', (req, res) => {
    res.json(generateOpenAPISpec());
  });

  // Serve Swagger UI
  router.get('/', (req, res) => {
    res.type('html').send(generateDocsHTML());
  });

  return router;
}

export default {
  generateOpenAPISpec,
  generateDocsHTML,
  apiDocsRouter,
};

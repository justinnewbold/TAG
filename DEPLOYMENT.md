# TAG! GPS Game - Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL database (production) or SQLite (development)
- npm or yarn

## Environment Variables

Create a `.env` file based on `.env.example`:

### Required for Production

```bash
# Database (REQUIRED in production)
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT Secret (REQUIRED - generate a secure random string)
JWT_SECRET=your-secure-random-string-min-32-chars

# CORS Origins (REQUIRED in production)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
# Or use domain patterns for preview deployments:
ALLOWED_DOMAIN_PATTERNS=.vercel.app,.yourdomain.com
```

### Optional Configuration

```bash
# Server
PORT=3001
NODE_ENV=production
LOG_LEVEL=info  # error, warn, info, debug

# Push Notifications (optional but recommended)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# Email Service (pick one)
RESEND_API_KEY=your-resend-api-key
# OR
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# SMS (optional)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id

# Error Tracking (recommended for production)
SENTRY_DSN=https://your-sentry-dsn

# AI Features (optional)
OPENAI_API_KEY=your-openai-key
```

## Deployment Steps

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server && npm install && cd ..
```

### 2. Build Frontend

```bash
npm run build
```

This creates a `dist/` folder with the production build.

### 3. Database Setup

The app automatically runs migrations on startup. For PostgreSQL:

```bash
# Create database
createdb tag_game

# Set DATABASE_URL
export DATABASE_URL=postgresql://localhost/tag_game
```

### 4. Start Server

```bash
# Production
NODE_ENV=production npm run server

# Development (with auto-reload)
npm run server:dev

# Full stack development
npm run dev:full
```

## Deployment Platforms

### Railway

1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

Railway will detect the `package.json` and run:
- Build: `npm run build`
- Start: `npm run server`

### Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel):**
1. Import project to Vercel
2. Set `VITE_API_URL` to your Railway backend URL
3. Build command: `npm run build`
4. Output directory: `dist`

**Backend (Railway):**
1. Create new project from `server/` directory
2. Set all required environment variables
3. Start command: `node index.js`

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm install
RUN cd server && npm install

# Build frontend
COPY . .
RUN npm run build

# Start server
EXPOSE 3001
CMD ["npm", "run", "server"]
```

## Health Checks

The server exposes health check endpoints:

- `GET /api/health` - Comprehensive health status (DB, memory, errors)
- `GET /api/ready` - Readiness check (validates DB connection)
- `GET /api/live` - Liveness check (simple OK response)
- `GET /api/metrics` - Detailed metrics for monitoring

### Example Health Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "2.0.0",
  "environment": "production",
  "uptime": 3600,
  "checks": {
    "database": { "status": "connected", "type": "postgresql" },
    "errors": { "recentErrors": 0, "windowMs": 60000 },
    "memory": { "heapUsedMB": 128, "heapTotalMB": 256, "rssMB": 320 }
  }
}
```

## Monitoring

### Recommended Setup

1. **Sentry** - Error tracking and performance monitoring
2. **Uptime Robot / Pingdom** - Uptime monitoring via `/api/live`
3. **Grafana + Prometheus** - Metrics from `/api/metrics`

### Log Format

In production, logs are JSON formatted for easy parsing:

```json
{"timestamp":"2024-01-15T10:30:00.000Z","level":"info","message":"User connected","userId":"abc123"}
```

## Troubleshooting

### Database Connection Issues

```bash
# Check DATABASE_URL is set correctly
echo $DATABASE_URL

# Test connection manually
psql $DATABASE_URL -c "SELECT 1"
```

### CORS Errors

Ensure `ALLOWED_ORIGINS` includes your frontend domain:

```bash
ALLOWED_ORIGINS=https://tag.yourdomain.com
```

### JWT Token Issues

1. Ensure `JWT_SECRET` is the same across all server instances
2. Clear browser localStorage if tokens are corrupted

### WebSocket Connection Issues

1. Ensure your load balancer supports WebSocket upgrades
2. Check firewall allows WebSocket connections
3. Verify CORS is configured correctly

## Security Checklist

- [ ] `JWT_SECRET` is a strong random value (not default)
- [ ] `DATABASE_URL` credentials are secure
- [ ] HTTPS is enabled in production
- [ ] Rate limiting is working (test with rapid requests)
- [ ] Admin accounts are created via database, not API
- [ ] Sensitive env vars are not logged
- [ ] CORS is restricted to your domains only

## Scaling

### Horizontal Scaling

The app supports horizontal scaling with these considerations:

1. **Database** - Use PostgreSQL (not SQLite) for multi-instance
2. **Socket.io** - Use Redis adapter for multi-instance WebSocket
3. **Sessions** - JWT tokens are stateless, no session store needed

### Redis Adapter (for Socket.io scaling)

```bash
npm install @socket.io/redis-adapter redis
```

```javascript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

## Backup & Recovery

### Database Backup

```bash
# PostgreSQL dump
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### Automated Backups

Set up cron job or use managed database service with automatic backups.

# Multi-stage build for TAG! GPS Game

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install server dependencies (production only)
RUN npm install --omit=dev

# Stage 3: Production image
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy server files
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY server/*.js ./server/
COPY server/db ./server/db
COPY server/game ./server/game
COPY server/routes ./server/routes
COPY server/services ./server/services
COPY server/socket ./server/socket
COPY server/utils ./server/utils
COPY server/managers ./server/managers
COPY server/shared ./server/shared

# Copy shared utilities (used by both client and server)
COPY shared ./shared

# Create data directory for SQLite
RUN mkdir -p /app/server/data && chown -R nodejs:nodejs /app/server/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start server with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]

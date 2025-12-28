# Server-only build for TAG! GPS Game API
# Frontend is deployed separately on Vercel

FROM node:20-alpine

WORKDIR /app

# Install dumb-init and build tools for native modules (better-sqlite3)
RUN apk add --no-cache dumb-init python3 make g++

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy and install server dependencies (including optional deps)
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --include=optional

# Copy server source files
WORKDIR /app
COPY server/*.js ./server/
COPY server/db ./server/db
COPY server/game ./server/game
COPY server/routes ./server/routes
COPY server/services ./server/services
COPY server/socket ./server/socket
COPY server/utils ./server/utils
COPY server/managers ./server/managers
COPY server/shared ./server/shared

# Copy shared utilities (used by server)
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

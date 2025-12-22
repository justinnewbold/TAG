# TAG! GPS Game - AI Agent Instructions

## Architecture Overview

**TAG!** is a real-time GPS-based tag game with three interconnected systems:
- **Web Frontend** (React 18 + Vite): Serves as the primary client with live maps, real-time gameplay
- **Server** (Node.js/Express): REST API + Socket.io for real-time game state and location updates
- **Expo App** (React Native): Mobile-first companion app (currently placeholder, bootstrapped)

### Critical Data Flows

1. **Authentication → Game Lifecycle**: User registers → receives JWT token → uses token for all subsequent requests
2. **Real-time Location**: Client emits `location:update` via socket → Server validates & broadcasts to game room → Triggers proximity-based tag detection via Haversine formula
3. **Game State Sync**: GameManager (server) is source of truth → clients sync via socket events (`game:state`) → local Zustand store mirrors server state
4. **Socket Rooms**: Games organized as `game:{gameId}` rooms for isolated real-time messaging

### Key Services Architecture

- **GameManager** (`server/game/GameManager.js`): 5-phase game lifecycle (waiting → ready → active/hiding → ended), location caching, tag validation
- **socketService** (`src/services/socket.js`): Client-side socket wrapper with auto-reconnection, listener tracking, prevents duplicate handlers
- **apiService** (`src/services/api.js`): Fetch wrapper with JWT header injection, localStorage token persistence
- **userDb & gameDb** (`server/db/index.js`): Postgres/SQLite abstractions supporting both dev (SQLite) and production (Postgres)

## Developer Workflows

### Local Development (Full Stack)
```bash
npm run dev:full  # Starts Vite (port 5173) + Node server --watch (port 3001) concurrently
```
- Frontend: `npm run dev` (port 5173, HMR enabled)
- Server: `npm run server:dev` (port 3001, watches for changes)
- Separate terminal: tests during dev with `cd server && npm run test:watch`

### Testing Strategy
- **Backend**: Vitest with supertest (`server/tests/`) - uses isolated test app from `setup.js`
- **Key patterns**: Mock gameManager via app context, validate request bodies with `validate.location()`, `validate.gameSettings()`
- **Run**: `cd server && npm run test` (single run) or `npm run test:watch`
- No frontend tests currently - focus on critical server logic

### Database Initialization
- Postgres via environment `DATABASE_URL` (auto-creates schema on startup)
- SQLite default when `DATABASE_URL` unset (uses `better-sqlite3` in dev)
- Schema migration: Edit `server/db/index.js` CREATE TABLE statements, restart server

## Project-Specific Conventions

### Game Modes (Polymorphic Behavior)
Seven game modes share common structure but diverge in tag logic:
- **Shared definition** in `src/store.js` (client) AND `server/game/GameManager.js` (must stay in sync!)
- Each mode has: `id`, `name`, `minPlayers`, `features`, optional `defaultTimer` (Hot Potato), `defaultHideTime` (Hide & Seek)
- **Tag validation logic** is mode-specific in `GameManager.validateTag()` - check mode type before allowing tags
- When adding new mode: update BOTH `src/store.js` AND `server/game/GameManager.js` definitions

### Safety Constraints
Games support **no-tag zones** (geographic circles) and **no-tag times** (weekly schedules):
- `isInNoTagZone()` uses Haversine distance calc (`server/game/GameManager.js` line ~47)
- `isInNoTagTime()` parses cron-like day/time rules with overnight wraparound support
- Always check constraints before allowing tags (see `GameManager.validateTag()`)

### Input Validation & Sanitization
- **String sanitization**: `sanitize.playerName()`, `sanitize.gameName()`, `sanitize.string()` in `server/utils/validation.js` - removes HTML/special chars
- **Game settings validation**: `validate.gameSettings()` enforces field constraints (e.g., tag radius must be in [10, 100] meters)
- **Location validation**: `validate.location()` checks lat/lng bounds, accuracy
- Apply validation **before** any business logic (especially in socket handlers)

### Zustand State Patterns
- **Web frontend** (`src/store.js`): Single 1166-line store combining auth, game, achievements, powerups
- **Expo** (`expo-app/src/store/gameStore.ts`): Separate modular approach with TypeScript
- **Persistence middleware**: Web uses browser localStorage, Expo uses AsyncStorage
- When modifying store: check if related feature exists in BOTH implementations (web + Expo) for consistency

### Location Updates (Performance-Critical)
- Socket handler `location:update` is **synchronous** (no DB writes) for low-latency broadcasting
- Updates live cache in `GameManager.updatePlayerLocation()` (returns game object)
- Proximity checks happen immediately; asynchronous DB writes deferred to game end
- Hide & Seek hides hider locations from seeker during hiding phase (check game.status === 'hiding')

## File Organization Reference

### Frontend (`src/`)
- `store.js`: Zustand store (1166 lines) - game state, achievements, powerups, animations
- `pages/ActiveGame.jsx`: Main game loop (986 lines) - map rendering, gesture controls, real-time sync
- `services/socket.js`: Socket.io wrapper - always check `.connected` before emitting
- `services/api.js`: Fetch wrapper with JWT persistence
- `components/`: UI components (Modal, Chat, Safety, Spectator, Powerups)

### Backend (`server/`)
- `index.js`: Express setup, middleware (helmet, CORS, rate limiting), socket.io server
- `game/GameManager.js`: Game state machine (953 lines), Haversine distance, tag validation
- `auth.js`: JWT generation, user sanitization, token refresh logic (892 lines)
- `db/index.js`: Postgres/SQLite adapter (644 lines), schema definitions
- `socket/handlers.js`: Socket event listeners - all game I/O goes through here
- `utils/validation.js`: Input validation functions (sanitize, validate)

### Mobile (`expo-app/`)
- `App.tsx`: Currently scaffolded, not yet implemented
- `src/store/gameStore.ts`: Zustand with AsyncStorage persistence
- `src/services/api.ts`: Matches web API signature for code reuse potential

## Critical Implementation Notes

1. **Token Lifecycle**: JWT expires in 15 minutes; refresh tokens stored as HTTP-only cookies. On token expiry, use refresh endpoint automatically (see `auth.js` line ~400)

2. **GameManager as Source of Truth**: Never directly modify game state on client; always wait for server socket event (`game:state`). Client store is a read-only cache.

3. **Socket Reconnection**: `socketService.connect()` auto-retries up to 5 times. On reconnect, client emits `game:join` to rejoin game room (see `socket/handlers.js` line ~5)

4. **Distance Calculation**: Haversine formula in meters. Tag radius defaults are 10m, 20m, 50m, 100m. Always validate player is within radius AND not in no-tag zone/time before tagging.

5. **Test App Setup**: `server/tests/setup.js` creates isolated Express app with in-memory database. Import and use `createTestApp()` to avoid test isolation issues.

6. **Achievements**: Defined in `store.js` with validator functions checking `stats` object. On tag/win, run all achievement validators and emit `achievement:earned` socket event.

7. **PWA Service Worker**: `public/sw-push.js` imported into service worker for push notifications. Changes require rebuild and service worker cache invalidation.

## Common Task Patterns

- **Add game mode**: Update both `src/store.js` + `server/game/GameManager.js`, add tag logic to `validateTag()`, test with server tests
- **Modify tag rules**: Edit `GameManager.validateTag()` + corresponding client-side check in `ActiveGame.jsx`
- **Add achievement**: Define in `store.js` ACHIEVEMENTS, add validator function, emit event in socket handler
- **API endpoint**: Add route in `server/routes/`, register with Express, add client method in `api.js`
- **Socket event**: Add listener in `server/socket/handlers.js`, emit from client via `socketService.emit()`

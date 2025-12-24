/**
 * TypeScript type definitions for TAG GPS Game
 * These provide IDE support without requiring full TypeScript migration
 */

// Location types
export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

// User types
export interface User {
  id: string;
  name: string;
  avatar: string;
  createdAt: number;
  isOffline?: boolean;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalTags: number;
  timesTagged: number;
  longestSurvival: number;
  totalPlayTime: number;
  uniqueFriendsPlayed: number;
  fastestTag: number | null;
  playedAtNight: boolean;
}

// Game types
export interface Player {
  id: string;
  name: string;
  avatar: string;
  location: Location | null;
  isIt: boolean;
  joinedAt: number;
  lastUpdate: number | null;
  tagCount: number;
  survivalTime: number;
  becameItAt: number | null;
  finalSurvivalTime?: number;
}

export interface NoTagZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface NoTagTime {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: number[];
}

export interface GameSettings {
  gameName: string;
  gpsInterval: number;
  tagRadius: number;
  duration: number | null;
  maxPlayers: number;
  noTagZones: NoTagZone[];
  noTagTimes: NoTagTime[];
}

export interface Tag {
  id: string;
  taggerId: string;
  taggedId: string;
  timestamp: number;
  tagTime?: number;
  distance?: number;
}

export interface Game {
  id: string;
  code: string;
  host: string;
  hostName: string;
  status: 'waiting' | 'active' | 'ended';
  settings: GameSettings;
  players: Player[];
  itPlayerId: string | null;
  startedAt: number | null;
  endedAt: number | null;
  winnerId?: string;
  winnerName?: string;
  gameDuration?: number;
  tags: Tag[];
  createdAt: number;
}

// Friend types
export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  status: 'invited' | 'active';
}

// Achievement types
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: (stats: UserStats) => boolean;
}

// Settings types
export interface AppSettings {
  notifications: boolean;
  sound: boolean;
  vibration: boolean;
  highAccuracyGPS: boolean;
  showDistance: boolean;
}

// Store types
export interface StoreState {
  user: User | null;
  currentGame: Game | null;
  games: Game[];
  friends: Friend[];
  stats: UserStats;
  achievements: string[];
  settings: AppSettings;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  queued?: boolean;
  message?: string;
}

// Socket event types
export interface SocketEvents {
  'game:update': (game: Game) => void;
  'location:update': (data: { playerId: string; location: Location }) => void;
  'player:joined': (player: Player) => void;
  'player:left': (playerId: string) => void;
  'tag:success': (data: { taggerId: string; taggedId: string }) => void;
  'game:started': (game: Game) => void;
  'game:ended': (data: { winnerId: string; winnerName: string }) => void;
}

// Offline queue types
export interface QueuedRequest {
  id: string;
  endpoint: string;
  options: RequestInit;
  metadata: Record<string, unknown>;
  attempts: number;
  createdAt: number;
}

export interface QueueStatus {
  pending: number;
  isProcessing: boolean;
  isOnline: boolean;
}

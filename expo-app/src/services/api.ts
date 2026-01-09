import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3001/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data as T;
  }

  // Auth
  async register(name: string, avatar?: string) {
    return this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, avatar }),
    });
  }

  async login(token: string) {
    return this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async getMe() {
    return this.request<{ user: User }>('/auth/me');
  }

  async updateProfile(data: { name?: string; avatar?: string }) {
    return this.request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Games
  async createGame(settings: GameSettings) {
    return this.request<{ game: Game }>('/games', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
  }

  async getGameByCode(code: string) {
    return this.request<{ game: Game }>(`/games/code/${code}`);
  }

  async joinGame(code: string) {
    return this.request<{ game: Game }>(`/games/join/${code}`, {
      method: 'POST',
    });
  }

  async leaveGame() {
    return this.request<{ success: boolean }>('/games/leave', {
      method: 'POST',
    });
  }

  async startGame(gameId: string) {
    return this.request<{ game: Game }>(`/games/${gameId}/start`, {
      method: 'POST',
    });
  }

  async endGame(gameId: string) {
    return this.request<{ game: Game; summary: GameSummary }>(
      `/games/${gameId}/end`,
      { method: 'POST' }
    );
  }

  async tagPlayer(gameId: string, targetId: string) {
    return this.request<{ success: boolean; tagTime: number }>(
      `/games/${gameId}/tag/${targetId}`,
      { method: 'POST' }
    );
  }

  // Friends
  async getFriends() {
    return this.request<{ friends: Friend[] }>('/friends');
  }

  async getFriendRequests() {
    return this.request<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>(
      '/friends/requests'
    );
  }

  async getFriendCode() {
    return this.request<{ code: string }>('/friends/code');
  }

  async sendFriendRequest(code: string) {
    return this.request<{ success: boolean }>('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async acceptFriendRequest(requestId: string) {
    return this.request<{ success: boolean }>(`/friends/requests/${requestId}/accept`, {
      method: 'POST',
    });
  }

  async declineFriendRequest(requestId: string) {
    return this.request<{ success: boolean }>(`/friends/requests/${requestId}/decline`, {
      method: 'POST',
    });
  }

  async removeFriend(friendId: string) {
    return this.request<{ success: boolean }>(`/friends/${friendId}`, {
      method: 'DELETE',
    });
  }

  async getRecentPlayers() {
    return this.request<{ recentPlayers: RecentPlayer[] }>('/friends/recent');
  }
}

export const api = new ApiService();

// Types
export interface User {
  id: string;
  name: string;
  avatar: string;
  location?: { lat: number; lng: number };
}

export interface Player extends User {
  isIt: boolean;
  tagCount: number;
  survivalTime: number;
  becameItAt: number | null;
  joinedAt: number;
  lastUpdate: number | null;
}

export interface GameSettings {
  gameName?: string;
  gpsInterval?: number;
  tagRadius?: number;
  duration?: number | null;
  maxPlayers?: number;
  noTagZones?: NoTagZone[];
  noTagTimes?: NoTagTime[];
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
  tags: Tag[];
  createdAt: number;
}

export interface Tag {
  taggerId: string;
  taggedId: string;
  timestamp: number;
  location?: { lat: number; lng: number };
}

export interface GameSummary {
  duration: number;
  totalTags: number;
  players: PlayerStats[];
}

export interface PlayerStats {
  id: string;
  name: string;
  avatar: string;
  tagCount: number;
  timesTagged: number;
  survivalTime: number;
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  isOnline?: boolean;
  inGame?: boolean;
  lastSeen?: number;
}

export interface FriendRequest {
  id: string;
  fromUser: { id: string; name: string; avatar: string };
  toUser: { id: string; name: string; avatar: string };
  createdAt: number;
}

export interface RecentPlayer {
  id: string;
  name: string;
  avatar: string;
  lastPlayed: number;
}

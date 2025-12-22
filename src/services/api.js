const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('tag-auth-token');
    this.refreshToken = localStorage.getItem('tag-refresh-token');
    this.isRefreshing = false;
    this.refreshPromise = null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('tag-auth-token', token);
    } else {
      localStorage.removeItem('tag-auth-token');
    }
  }

  setRefreshToken(refreshToken) {
    this.refreshToken = refreshToken;
    if (refreshToken) {
      localStorage.setItem('tag-refresh-token', refreshToken);
    } else {
      localStorage.removeItem('tag-refresh-token');
    }
  }

  getToken() {
    return this.token;
  }

  async refreshAccessToken() {
    // If already refreshing, wait for the existing promise
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });

        if (!response.ok) {
          // Refresh failed - clear tokens and throw
          this.setToken(null);
          this.setRefreshToken(null);
          throw new Error('Session expired. Please log in again.');
        }

        const data = await response.json();
        this.setToken(data.token);
        this.setRefreshToken(data.refreshToken);
        return data.token;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request(endpoint, options = {}, isRetry = false) {
    const url = `${API_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin', // Explicit for Safari compatibility
      });
    } catch (fetchError) {
      // Network error or CORS issue
      throw new Error('Unable to connect to server. Please check your connection.');
    }

    // Handle token expiration - try refresh and retry
    if (response.status === 403 && !isRetry && this.refreshToken) {
      try {
        await this.refreshAccessToken();
        // Retry the original request with new token
        return this.request(endpoint, options, true);
      } catch (refreshError) {
        // Refresh failed, throw the original error
        throw new Error('Session expired. Please log in again.');
      }
    }

    // Handle empty responses
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      // Response wasn't valid JSON
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    return data;
  }

  // Auth endpoints
  async register(name, avatar) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, avatar }),
    });
    this.setToken(data.token);
    this.setRefreshToken(data.refreshToken);
    return data;
  }

  async login(existingToken) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ token: existingToken }),
    });
    this.setToken(data.token);
    if (data.refreshToken) {
      this.setRefreshToken(data.refreshToken);
    }
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateProfile(updates) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Game endpoints
  async createGame(settings) {
    return this.request('/games', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
  }

  async getCurrentGame() {
    return this.request('/games/current');
  }

  async getGameByCode(code) {
    return this.request(`/games/code/${code}`);
  }

  async getGame(gameId) {
    return this.request(`/games/${gameId}`);
  }

  async joinGame(code) {
    return this.request(`/games/join/${code}`, {
      method: 'POST',
    });
  }

  async leaveGame() {
    return this.request('/games/leave', {
      method: 'POST',
    });
  }

  async startGame(gameId) {
    return this.request(`/games/${gameId}/start`, {
      method: 'POST',
    });
  }

  async endGame(gameId) {
    return this.request(`/games/${gameId}/end`, {
      method: 'POST',
    });
  }

  async tagPlayer(gameId, targetId) {
    return this.request(`/games/${gameId}/tag/${targetId}`, {
      method: 'POST',
    });
  }

  // Get public games list
  async getPublicGames() {
    return this.request('/games/public/list');
  }

  // Kick a player from the game (host only)
  async kickPlayer(gameId, playerId) {
    return this.request(`/games/${gameId}/players/${playerId}/kick`, {
      method: 'POST',
    });
  }

  // Ban a player from the game (host only)
  async banPlayer(gameId, playerId) {
    return this.request(`/games/${gameId}/players/${playerId}/ban`, {
      method: 'POST',
    });
  }

  // Update game settings (host only)
  async updateGameSettings(gameId, settings) {
    return this.request(`/games/${gameId}/settings`, {
      method: 'PATCH',
      body: JSON.stringify({ settings }),
    });
  }

  // Approve a pending player (host only)
  async approvePlayer(gameId, playerId) {
    return this.request(`/games/${gameId}/players/${playerId}/approve`, {
      method: 'POST',
    });
  }

  // Reject a pending player (host only)
  async rejectPlayer(gameId, playerId) {
    return this.request(`/games/${gameId}/players/${playerId}/reject`, {
      method: 'POST',
    });
  }

  logout() {
    this.setToken(null);
    this.setRefreshToken(null);
  }
}

export const api = new ApiService();

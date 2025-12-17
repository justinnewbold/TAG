const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('tag-auth-token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('tag-auth-token', token);
    } else {
      localStorage.removeItem('tag-auth-token');
    }
  }

  getToken() {
    return this.token;
  }

  async request(endpoint, options = {}) {
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
    return data;
  }

  async login(existingToken) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ token: existingToken }),
    });
    this.setToken(data.token);
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

  logout() {
    this.setToken(null);
  }
}

export const api = new ApiService();

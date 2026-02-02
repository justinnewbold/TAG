import { api } from './api';
import { socketService } from './socket';

let feedListeners = [];

export const killFeedService = {
  async getGlobalFeed(limit = 25, since = 0) {
    return api.request(`/kill-feed?limit=${limit}&since=${since}`);
  },

  async getGameFeed(gameId, limit = 25) {
    return api.request(`/kill-feed/game/${gameId}?limit=${limit}`);
  },

  async postEvent(event) {
    return api.request('/kill-feed', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  },

  onFeedEvent(callback) {
    feedListeners.push(callback);
    return () => {
      feedListeners = feedListeners.filter(cb => cb !== callback);
    };
  },

  emitToListeners(event) {
    feedListeners.forEach(cb => cb(event));
  },
};

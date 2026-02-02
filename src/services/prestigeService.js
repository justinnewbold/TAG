import { api } from './api';

export const prestigeService = {
  async getPrestige() {
    return api.request('/prestige');
  },

  async performPrestige() {
    return api.request('/prestige/prestige', { method: 'POST' });
  },

  async addXp(amount) {
    return api.request('/prestige/xp', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  async getLeaderboard() {
    return api.request('/prestige/leaderboard');
  },
};

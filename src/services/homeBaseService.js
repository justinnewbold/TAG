import { api } from './api';

export const homeBaseService = {
  async getMyBase() {
    return api.request('/home-bases');
  },

  async getPlayerBase(userId) {
    return api.request(`/home-bases/${userId}`);
  },

  async claimBase(lat, lng, name) {
    return api.request('/home-bases/claim', {
      method: 'POST',
      body: JSON.stringify({ lat, lng, name }),
    });
  },

  async upgradeBase(upgradeId) {
    return api.request('/home-bases/upgrade', {
      method: 'POST',
      body: JSON.stringify({ upgradeId }),
    });
  },
};

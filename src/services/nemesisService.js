import { api } from './api';

export const nemesisService = {
  async getRivalries() {
    return api.request('/nemesis');
  },

  async recordEncounter(taggerId, taggedId) {
    return api.request('/nemesis/encounter', {
      method: 'POST',
      body: JSON.stringify({ taggerId, taggedId }),
    });
  },
};

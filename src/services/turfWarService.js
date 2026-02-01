import { api } from './api';

export const turfWarService = {
  async getZones(bounds) {
    const params = bounds
      ? `?minLat=${bounds.minLat}&maxLat=${bounds.maxLat}&minLng=${bounds.minLng}&maxLng=${bounds.maxLng}`
      : '';
    return api.request(`/turf-wars/zones${params}`);
  },

  async captureZone(lat, lng, clanId) {
    return api.request('/turf-wars/zones/capture', {
      method: 'POST',
      body: JSON.stringify({ lat, lng, clanId }),
    });
  },

  async upgradeZone(zoneId) {
    return api.request(`/turf-wars/zones/${zoneId}/upgrade`, { method: 'POST' });
  },

  async getClanStats(clanId) {
    return api.request(`/turf-wars/stats/${clanId}`);
  },

  async getLeaderboard() {
    return api.request('/turf-wars/leaderboard');
  },
};

import { api } from './api';

export const bountyService = {
  async getActiveBounties() {
    return api.request('/bounties');
  },

  async getTargetBounties(userId) {
    return api.request(`/bounties/target/${userId}`);
  },

  async placeBounty(targetId, amount, reason) {
    return api.request('/bounties', {
      method: 'POST',
      body: JSON.stringify({ targetId, amount, reason }),
    });
  },

  async claimBounty(bountyId) {
    return api.request(`/bounties/claim/${bountyId}`, { method: 'POST' });
  },

  async cancelBounty(bountyId) {
    return api.request(`/bounties/${bountyId}`, { method: 'DELETE' });
  },

  async getLeaderboard() {
    return api.request('/bounties/leaderboard');
  },
};

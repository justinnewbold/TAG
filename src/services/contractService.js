import { api } from './api';

export const contractService = {
  async getContracts() {
    return api.request('/contracts');
  },

  async updateProgress(contractId, progress, completed) {
    return api.request(`/contracts/${contractId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ progress, completed }),
    });
  },
};

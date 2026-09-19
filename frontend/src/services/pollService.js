import { fetchAPI } from './api';

export const pollService = {
  async createPoll(question, options) {
    return await fetchAPI('/polls', {
      method: 'POST',
      body: JSON.stringify({
        question,
        options: options.map((optText) => ({ text: optText })),
      }),
    });
  },

  async getUserPolls() {
    return await fetchAPI('/polls', {
      method: 'GET',
    });
  },

  async getPollById(pollId) {
    return await fetchAPI(`/polls/${pollId}`, {
      method: 'GET',
    });
  },

  async vote(pollId, optionId) {
    return await fetchAPI(`/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    });
  },

  async deletePoll(pollId) {
    return await fetchAPI(`/polls/${pollId}`, {
      method: 'DELETE',
    });
  },

  async togglePollStatus(pollId, isActive) {
    return await fetchAPI(`/polls/${pollId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  async getDashboardStats() {
    return await fetchAPI('/polls/stats', {
      method: 'GET',
    });
  },
};

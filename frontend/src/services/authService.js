import { fetchAPI } from './api';

export const authService = {
  async register(name, email, password) {
    return await fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async login(email, password) {
    return await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getMe() {
    return await fetchAPI('/auth/me', {
      method: 'GET',
    });
  },
};

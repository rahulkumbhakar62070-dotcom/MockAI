import api from './api';

/**
 * Authentication Service:
 * Directly maps frontend requests to the Phase 3 backend endpoints.
 */
export const authService = {
  /**
   * Register a new user account
   * POST /api/auth/register
   */
  async register({ name, email, password }) {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },

  /**
   * Authenticate user credentials & receive JWT token
   * POST /api/auth/login
   */
  async login({ email, password }) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Retrieve current authenticated user profile
   * GET /api/auth/me
   */
  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export default authService;

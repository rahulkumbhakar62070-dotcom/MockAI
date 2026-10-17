import axios from 'axios';

// Read API base URL from environment or default to localhost:5000/api
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 35000,
});

/**
 * Request Interceptor:
 * Attaches the JWT Bearer token from localStorage to private requests if present.
 * Uses both AxiosHeaders.set() and standard headers object property for maximum compatibility.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && typeof token === 'string' && token.trim() !== '') {
      const bearerValue = `Bearer ${token.trim()}`;
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', bearerValue);
      } else {
        config.headers = config.headers || {};
        config.headers.Authorization = bearerValue;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor:
 * Centralized error handler that sanitizes technical errors, normalizes status codes,
 * and broadcasts 401 session expiration events without leaking sensitive internals.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Network Failure / Backend Unavailable / Server down
    if (!error.response) {
      const isTimeout = error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'));
      return Promise.reject({
        status: 0,
        message: isTimeout
          ? 'Request timed out. The server or AI service is taking longer than expected. Please try again.'
          : 'Unable to connect to the backend server. Please verify the server is running on port 5000.',
        isNetworkError: true,
        errors: [],
      });
    }

    const { status, data } = error.response;

    // 2. HTTP 401 Unauthorized: Stale / Expired / Invalid Session
    if (status === 401) {
      localStorage.removeItem('token');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth:expired'));
      }
    }

    // 3. Extract sanitized, user-friendly message
    let friendlyMessage = data?.message;

    if (!friendlyMessage) {
      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        friendlyMessage = data.errors[0];
      } else if (status === 400) {
        friendlyMessage = 'Invalid request parameters. Please check your input.';
      } else if (status === 401) {
        friendlyMessage = 'Your session has expired. Please sign in again to continue.';
      } else if (status === 403) {
        friendlyMessage = 'You do not have permission to access or modify this resource.';
      } else if (status === 404) {
        friendlyMessage = 'The requested resource could not be found.';
      } else if (status === 429) {
        friendlyMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (status >= 500) {
        friendlyMessage = 'A server error occurred. Please try again in a few moments.';
      } else {
        friendlyMessage = 'An unexpected error occurred. Please try again.';
      }
    }

    // Collect array of specific validation field errors if provided
    const errorsList = Array.isArray(data?.errors) ? data.errors : [];

    return Promise.reject({
      status,
      message: friendlyMessage,
      errors: errorsList,
      data,
      isNetworkError: false,
    });
  }
);

export default api;

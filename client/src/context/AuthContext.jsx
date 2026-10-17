import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const clearAuthState = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Validate session against the backend on initial app mount
  useEffect(() => {
    const verifyUserSession = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await authService.getMe();
        if (response?.data?.user) {
          setUser(response.data.user);
          setToken(storedToken);
        } else {
          clearAuthState();
        }
      } catch {
        // Token was expired, tampered with, or server rejected it
        clearAuthState();
      } finally {
        setLoading(false);
      }
    };

    verifyUserSession();
  }, []);

  // Synchronize state when an API call encounters 401 Unauthorized
  useEffect(() => {
    const handleAuthExpired = () => {
      clearAuthState();
      // Inform the user immediately so they know why they need to sign in again
      toast.error('Your session has expired. Please log in again.', { id: 'session-expired-toast' });
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  /**
   * Log in user with credentials and store token
   */
  const login = async (email, password) => {
    const response = await authService.login({ email, password });
    if (response?.token && response?.data?.user) {
      localStorage.setItem('token', response.token);
      setToken(response.token);
      setUser(response.data.user);
    }
    return response;
  };

  /**
   * Register new user account
   */
  const register = async (name, email, password) => {
    const response = await authService.register({ name, email, password });
    return response;
  };

  /**
   * Clear session and reset auth state
   */
  const logout = () => {
    clearAuthState();
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user), // Truly authenticated only when user object is loaded
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

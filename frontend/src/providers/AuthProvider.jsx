import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useLocalStorage } from '../hooks/useLocalStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [storedUser, setStoredUser] = useLocalStorage('pharma360-user', null);
  const [storedToken, setStoredToken] = useLocalStorage('pharma360-token', null);
  const [user, setUser] = useState(storedUser);
  const [token, setToken] = useState(storedToken);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = () => {
      if (storedToken && storedUser) {
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        setUser(storedUser);
        setToken(storedToken);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, [storedToken, storedUser]);

  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', credentials);
      const { user: userData, access_token } = response.data;
      
      setUser(userData);
      setToken(access_token);
      setStoredUser(userData);
      setStoredToken(access_token);
      setIsAuthenticated(true);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setIsLoading(false);
      return { success: true, user: userData };
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      setIsLoading(false);
      return { success: false, error: err.response?.data?.message || 'Login failed' };
    }
  }, [setStoredUser, setStoredToken]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setStoredUser(null);
    setStoredToken(null);
    setIsAuthenticated(false);
    delete api.defaults.headers.common['Authorization'];
    setError(null);
  }, [setStoredUser, setStoredToken]);

  const register = useCallback(async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/register', userData);
      setIsLoading(false);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      setIsLoading(false);
      return { success: false, error: err.response?.data?.message || 'Registration failed' };
    }
  }, []);

  const verifyToken = useCallback(async () => {
    if (!token) return false;
    try {
      const response = await api.get('/auth/verify');
      return response.data.valid;
    } catch (err) {
      logout();
      return false;
    }
  }, [token, logout]);

  const hasRole = useCallback((role) => {
    if (!user) return false;
    return user.roles?.includes(role) || user.role === role;
  }, [user]);

  const hasAnyRole = useCallback((roles) => {
    if (!user) return false;
    return roles.some(role => user.roles?.includes(role) || user.role === role);
  }, [user]);

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    verifyToken,
    hasRole,
    hasAnyRole,
    setError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;

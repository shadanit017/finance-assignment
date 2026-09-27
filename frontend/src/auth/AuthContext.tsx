import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AuthState, User } from '../types';
import { apiClient, authApi } from '../services/api';

interface AuthContextType extends AuthState {
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  authenticated: false,
  user: null,
  loading: true,
  checkAuth: async () => {},
  setUser: () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    user: null,
    loading: true,
  });

  const isCheckingRef = useRef(false);

  const checkAuth = async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const response = await apiClient.get('/auth/me');
      if (response.data?.authenticated) {
        setState({
          authenticated: true,
          user: response.data.user,
          loading: false,
        });
        if (window.location.search.includes('auth=success')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        setState({
          authenticated: false,
          user: null,
          loading: false,
        });
      }
    } catch {
      setState({
        authenticated: false,
        user: null,
        loading: false,
      });
    } finally {
      isCheckingRef.current = false;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {}
    setState({
      authenticated: false,
      user: null,
      loading: false,
    });
  };

  const setUser = (user: User | null) => {
    setState({
      authenticated: !!user,
      user,
      loading: false,
    });
  };

  useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    if ((path === '/login' || path === '/signup') && !search.includes('auth=success')) {
      // Skip automatic /auth/me call on public login/signup pages unless OAuth success query is present
      setState({
        authenticated: false,
        user: null,
        loading: false,
      });
    } else {
      checkAuth();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, checkAuth, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

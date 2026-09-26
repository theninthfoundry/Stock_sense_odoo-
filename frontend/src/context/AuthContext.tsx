import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isManager: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (params: { name: string; email: string; password: string; role?: string; warehouse_id?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifyAuth() {
      if (token) {
        try {
          const res = await api.auth.me();
          setUser(res.user);
          setStoredUser(res.user);
        } catch {
          // Token expired or invalid
          setStoredToken(null);
          setStoredUser(null);
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    }
    verifyAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    setToken(res.token);
    setUser(res.user);
    setStoredToken(res.token);
    setStoredUser(res.user);
  };

  const signup = async (params: { name: string; email: string; password: string; role?: string; warehouse_id?: string }) => {
    const res = await api.auth.signup(params);
    setToken(res.token);
    setUser(res.user);
    setStoredToken(res.token);
    setStoredUser(res.user);
  };

  const logout = () => {
    setStoredToken(null);
    setStoredUser(null);
    setUser(null);
    setToken(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await api.auth.me();
      setUser(res.user);
      setStoredUser(res.user);
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isManager: user?.role === 'inventory_manager',
        isLoading,
        login,
        signup,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

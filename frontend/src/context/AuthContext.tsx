import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('aicte_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('aicte_token');
      if (storedToken) {
        try {
          const userData = await api.getMe();
          setUser(userData);
        } catch {
          localStorage.removeItem('aicte_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await api.login({ email, password });
      localStorage.setItem('aicte_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      showToast(`Welcome, ${res.user.full_name}! Authenticated as ${res.user.role.toUpperCase()}.`, 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Authentication failed. Please verify credentials.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('aicte_token');
    setToken(null);
    setUser(null);
    showToast('Signed out successfully.', 'info');
  };

  const switchRole = async (role: UserRole) => {
    try {
      setLoading(true);
      const res = await api.switchDemoRole(role);
      localStorage.setItem('aicte_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
      showToast(`Switched active demo context to: ${role.toUpperCase()}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to switch demo role', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        switchRole,
        isAuthenticated: !!user,
      }}
    >
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

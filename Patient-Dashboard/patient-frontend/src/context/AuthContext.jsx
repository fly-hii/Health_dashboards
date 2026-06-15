import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(localStorage.getItem('patient_token'));
  const [loading, setLoading] = useState(true);

  // Restore user session on load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('patient_token');
      if (storedToken) {
        try {
          const res = await api.getProfile();
          setUser(res.user || res);
          setToken(storedToken);
        } catch (err) {
          console.error("Session restore failed:", err);
          localStorage.removeItem('patient_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.login({ email, password });
    const { token: newToken, user: userData } = res;
    localStorage.setItem('patient_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (data) => {
    const res = await api.register(data);
    const { token: newToken, user: userData } = res;
    localStorage.setItem('patient_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('patient_token');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

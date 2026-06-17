import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(localStorage.getItem('nurse_token'));
  const [loading, setLoading] = useState(true);
  const [theme, setTheme]     = useState(localStorage.getItem('theme') || 'light');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Restore user session on load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('nurse_token');
      if (storedToken) {
        try {
          const res = await authService.getProfile();
          setUser(res.data.data?.user || res.data.user || res.data);
          setToken(storedToken);
        } catch {
          localStorage.removeItem('nurse_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password, otp) => {
    const res = await authService.login({ email, password, otp });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('nurse_token', newToken);
    setToken(newToken);
    setUser(userData);
    toast.success(`Welcome back, ${userData.name}! 👋`);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('nurse_token');
    setToken(null);
    setUser(null);
    toast.info('Logged out successfully');
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, theme, login, logout, updateUser, toggleTheme, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

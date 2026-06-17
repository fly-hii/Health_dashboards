import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sa_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password, otp) => {
    setLoading(true);
    try {
      const { data } = await apiLogin({ email, password, otp });
      if (data.success) {
        localStorage.setItem('sa_token', data.token);
        localStorage.setItem('sa_user', JSON.stringify(data.user));
        setUser(data.user);
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_user');
    setUser(null);
  };

  const updateUser = (newUser) => {
    localStorage.setItem('sa_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

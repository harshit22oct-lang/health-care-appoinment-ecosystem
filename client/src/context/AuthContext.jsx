import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('hs_token');
    if (!token) { setLoading(false); return; }

    try {
      const data = await api.auth.me();
      setUser(data.data.user);
      setDoctorProfile(data.data.doctorProfile);
    } catch {
      localStorage.removeItem('hs_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCurrentUser(); }, [fetchCurrentUser]);

  const login = async (email, password) => {
    const data = await api.auth.login({ email, password });
    localStorage.setItem('hs_token', data.data.token);
    setUser(data.data.user);
    setDoctorProfile(data.data.doctorProfile || null);
    return data.data;
  };

  const register = async (payload) => {
    const data = await api.auth.register(payload);
    localStorage.setItem('hs_token', data.data.token);
    setUser(data.data.user);
    return data.data;
  };

  const logout = async () => {
    try { await api.auth.logout(); } catch {}
    localStorage.removeItem('hs_token');
    setUser(null);
    setDoctorProfile(null);
  };

  const updateUser = (updated) => setUser((prev) => ({ ...prev, ...updated }));

  return (
    <AuthContext.Provider value={{ user, doctorProfile, loading, error, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

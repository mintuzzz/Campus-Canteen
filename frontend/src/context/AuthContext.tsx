import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  studentId?: string;
  department?: string;
  role: 'student' | 'canteen' | 'admin';
  token: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('canteen_user');
  }, []);

  // On mount: verify stored token against backend
  useEffect(() => {
    const verifyStoredSession = async () => {
      const stored = localStorage.getItem('canteen_user');
      if (!stored) {
        setLoading(false);
        return;
      }

      let parsed: User;
      try {
        parsed = JSON.parse(stored);
      } catch {
        localStorage.removeItem('canteen_user');
        setLoading(false);
        return;
      }

      if (!parsed.token) {
        localStorage.removeItem('canteen_user');
        setLoading(false);
        return;
      }

      try {
        // Call /auth/me to verify the token is valid and get the real role
        const res = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${parsed.token}` },
        });

        const backendUser = res.data;

        // CRITICAL: verify the role matches what was stored locally
        // This prevents a student token from granting admin access (or vice-versa)
        if (backendUser.role !== parsed.role) {
          console.warn(`[Auth] Role mismatch: stored="${parsed.role}", server="${backendUser.role}". Forcing logout.`);
          localStorage.removeItem('canteen_user');
          setLoading(false);
          return;
        }

        // Token is valid — restore the session with server-verified data
        const verifiedUser: User = {
          _id: backendUser._id,
          name: backendUser.name,
          email: backendUser.email,
          phone: backendUser.phone,
          studentId: backendUser.studentId,
          department: backendUser.department,
          role: backendUser.role,
          token: parsed.token, // keep the same JWT
        };

        setUser(verifiedUser);
        localStorage.setItem('canteen_user', JSON.stringify(verifiedUser));
      } catch (error: any) {
        // Token invalid / expired / network error
        console.warn('[Auth] Token verification failed:', error?.response?.status || error.message);
        localStorage.removeItem('canteen_user');
      } finally {
        setLoading(false);
      }
    };

    verifyStoredSession();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('canteen_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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

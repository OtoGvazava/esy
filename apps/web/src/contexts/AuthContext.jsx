/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';
import { authApi } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Backend /api/auth user payload -> the shape the app's UI expects.
const mapBackendUser = (u) => {
  const roles = u.roles || [];
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    name: name || u.email,
    avatar: u.profileImageUrl || undefined,
    profileImageUrl: u.profileImageUrl,
    roles,
    role: roles.includes('ADMIN') ? 'admin' : 'user',
    provider: 'google',
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = (u) => {
    setUser(u);
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
    } catch (error) {
      console.error('Error saving user to localStorage:', error);
    }
  };

  // Restore the session from the esy_token cookie on mount. The cookie is
  // HttpOnly (invisible to JS) and shared across esy.ge + every *.esy.ge
  // store, so we always ask the server who we are — signing in on one store
  // restores here on all of them.
  useEffect(() => {
    const restore = async () => {
      try {
        const res = await authApi.me();
        if (res?.authenticated && res.user) {
          persistUser(mapBackendUser(res.user));
        } else {
          localStorage.removeItem(STORAGE_KEYS.USER);
        }
      } catch (error) {
        console.error('Session restore failed:', error);
        localStorage.removeItem(STORAGE_KEYS.USER);
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  // The only sign-in: real Google OAuth. Full-page redirect to the backend
  // authorization endpoint; it returns a JWT to /auth/callback, which the
  // session-restore effect above then exchanges for the user.
  const signInWithGoogle = () => {
    const base = window.location.port === '5173' ? 'http://localhost:8080' : '';
    const origin = encodeURIComponent(window.location.origin);
    window.location.href = `${base}/oauth2/authorization/google?tenant_origin=${origin}`;
  };

  // Kept for API compatibility with components that call login(userData) directly.
  const login = async (userData) => {
    try {
      persistUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    // Server expires the shared esy.ge cookie → signed out on every subdomain.
    authApi.logout().catch(() => {});
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  const updateProfile = async (userData) => {
    try {
      const updatedUser = {
        ...user,
        ...userData,
        updatedAt: new Date().toISOString(),
      };
      persistUser(updatedUser);
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  };

  const changePassword = async () => {
    // The backend has no password endpoint (OAuth/dev-login only); no-op success.
    try {
      const updatedUser = { ...user, passwordChangedAt: new Date().toISOString() };
      persistUser(updatedUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    signInWithGoogle,
    updateProfile,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isUser: user?.role === 'user' || !user?.role,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

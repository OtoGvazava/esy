import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';
import { authApi, setToken, clearToken, getToken } from '../utils/api';

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
    provider: 'dev',
    isNewUser: false,
    registrationCompleted: true,
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

  // Restore the session from the stored JWT on mount.
  useEffect(() => {
    const restore = async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const res = await authApi.me();
        if (res?.authenticated && res.user) {
          persistUser(mapBackendUser(res.user));
        } else {
          clearToken();
          localStorage.removeItem(STORAGE_KEYS.USER);
        }
      } catch (error) {
        console.error('Session restore failed:', error);
        clearToken();
        localStorage.removeItem(STORAGE_KEYS.USER);
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  // Core login: exchange an email for a real JWT via the backend dev-login.
  const loginDev = async (email, name, admin = false) => {
    try {
      const res = await authApi.devLogin({ email, name, admin });
      if (!res?.token) {
        return { success: false, error: 'No token returned' };
      }
      setToken(res.token);
      const mapped = mapBackendUser(res.user);
      persistUser(mapped);
      return { success: true, user: mapped };
    } catch (error) {
      console.error('Dev login failed:', error);
      return { success: false, error: error.message };
    }
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
    authApi.logout().catch(() => {});
    clearToken();
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  // OAuth buttons map to dev-login locally (real Google/Apple needs credentials).
  const loginWithGoogle = () => loginDev('googleuser@esy.dev', 'Google User');
  const loginWithApple = () => loginDev('appleuser@esy.dev', 'Apple User');

  const completeRegistration = async (userData) => {
    try {
      const updatedUser = {
        ...user,
        ...userData,
        isNewUser: false,
        registrationCompleted: true,
      };
      persistUser(updatedUser);
      return { success: true };
    } catch (error) {
      console.error('Error completing registration:', error);
      return { success: false, error: error.message };
    }
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
    loginDev,
    logout,
    loginWithGoogle,
    loginWithApple,
    completeRegistration,
    updateProfile,
    changePassword,
    isAuthenticated: !!user,
    isNewUser: user?.isNewUser || false,
    registrationCompleted: user?.registrationCompleted || false,
    isAdmin: user?.role === 'admin',
    isUser: user?.role === 'user' || !user?.role,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

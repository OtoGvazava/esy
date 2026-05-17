/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';
import { authApi, accountApi } from '../utils/api';

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
    dateOfBirth: u.dateOfBirth || undefined,
    phoneNumber: u.phoneNumber || undefined,
    phoneVerified: !!u.phoneVerified,
    // Backend-derived: name + surname + date of birth all present.
    profileComplete: !!u.profileComplete,
    roles,
    role: roles.includes('ADMIN') ? 'admin' : 'user',
    // Owner of the store this request resolved to (by host). Backend-derived.
    ownsCurrentStore: !!u.ownsCurrentStore,
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
    // window.location.origin can't carry ?tenant= (the dev store simulation
    // runs every store on one host), so the OAuth round-trip would drop the
    // store and land back on the platform. The round-trip returns to this same
    // origin, so stash the return path for AuthCallback to restore.
    try {
      sessionStorage.setItem('esy_post_login', window.location.pathname + window.location.search);
    } catch { /* storage blocked — AuthCallback falls back to /account */ }
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

  // Re-pull the canonical user from /api/auth/user (carries ownsCurrentStore +
  // profileComplete + phone state) and persist it. Used after profile/phone
  // changes so the gate and UI reflect the new state without a reload.
  const refreshUser = async () => {
    const res = await authApi.me();
    if (res?.authenticated && res.user) {
      const mapped = mapBackendUser(res.user);
      persistUser(mapped);
      return mapped;
    }
    return null;
  };

  // Save the mandatory profile (name/surname/dateOfBirth; phone optional).
  const saveProfile = async (body) => {
    await accountApi.updateProfile(body);
    return refreshUser();
  };

  // Phone is a separate field from the profile; changing it clears
  // verification server-side, so the new number must be re-verified.
  const savePhone = async (phoneNumber) => {
    await accountApi.updatePhone(phoneNumber);
    return refreshUser();
  };

  const sendPhoneCode = () => accountApi.sendPhoneCode();

  const verifyPhone = async (code) => {
    await accountApi.verifyPhone(code);
    return refreshUser();
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
    refreshUser,
    saveProfile,
    savePhone,
    sendPhoneCode,
    verifyPhone,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isUser: user?.role === 'user' || !user?.role,
    // Owner of the store currently being viewed.
    isStoreOwner: !!user?.ownsCurrentStore,
    // Allowed to manage this store (add/edit products, edit branding):
    // a global admin, or the store's owner.
    canManageStore: user?.role === 'admin' || !!user?.ownsCurrentStore,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

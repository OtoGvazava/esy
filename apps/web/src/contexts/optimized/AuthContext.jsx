// Optimized AuthContext with better performance
import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const AuthContext = createContext();

// Auth reducer for better state management
const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false };
    case 'CLEAR_USER':
      return { ...state, user: null, loading: false };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [savedUser, setSavedUser] = useLocalStorage('user', null);
  const [state, dispatch] = useReducer(authReducer, {
    user: savedUser,
    loading: !savedUser, // Only show loading if no saved user
  });

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user: state.user,
    loading: state.loading,
    isAuthenticated: !!state.user,
    isNewUser: state.user?.isNewUser || false,
    registrationCompleted: state.user?.registrationCompleted || false,
    
    login: async (userData) => {
      try {
        dispatch({ type: 'SET_USER', payload: userData });
        setSavedUser(userData);
        return { success: true };
      } catch (error) {
        console.error('Error saving user to localStorage:', error);
        return { success: false, error: error.message };
      }
    },

    logout: () => {
      dispatch({ type: 'CLEAR_USER' });
      setSavedUser(null);
    },

    loginWithGoogle: async () => {
      const mockUser = {
        id: 'google_' + Date.now(),
        name: 'Google User',
        email: 'user@gmail.com',
        provider: 'google',
        avatar: 'https://via.placeholder.com/40',
        isNewUser: true,
        registrationCompleted: false
      };
      
      const result = await contextValue.login(mockUser);
      return { ...result, user: mockUser };
    },

    loginWithApple: async () => {
      const mockUser = {
        id: 'apple_' + Date.now(),
        name: 'Apple User',
        email: 'user@icloud.com',
        provider: 'apple',
        avatar: 'https://via.placeholder.com/40',
        isNewUser: true,
        registrationCompleted: false
      };
      
      const result = await contextValue.login(mockUser);
      return { ...result, user: mockUser };
    },

    completeRegistration: async (userData) => {
      try {
        const updatedUser = {
          ...state.user,
          ...userData,
          isNewUser: false,
          registrationCompleted: true
        };
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        setSavedUser(updatedUser);
        return { success: true };
      } catch (error) {
        console.error('Error completing registration:', error);
        return { success: false, error: error.message };
      }
    },

    updateProfile: async (userData) => {
      try {
        const updatedUser = {
          ...state.user,
          ...userData,
          updatedAt: new Date().toISOString()
        };
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        setSavedUser(updatedUser);
        return { success: true };
      } catch (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
      }
    },

    changePassword: async (passwordData) => {
      try {
        const updatedUser = {
          ...state.user,
          passwordChangedAt: new Date().toISOString()
        };
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        setSavedUser(updatedUser);
        return { success: true };
      } catch (error) {
        console.error('Error changing password:', error);
        return { success: false, error: error.message };
      }
    },
  }), [state.user, state.loading, setSavedUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};


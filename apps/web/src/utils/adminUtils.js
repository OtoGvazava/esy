// Utility functions for admin functionality
// In a real application, these would be handled by the backend

export const setAdminRole = (user) => {
  if (!user) return null;
  
  return {
    ...user,
    role: 'admin',
  };
};

export const setUserRole = (user) => {
  if (!user) return null;
  
  return {
    ...user,
    role: 'user',
  };
};

export const isAdmin = (user) => {
  return user?.role === 'admin';
};

export const isUser = (user) => {
  return user?.role === 'user' || !user?.role;
};

// Mock function to simulate admin login
export const loginAsAdmin = () => {
  const adminUser = {
    id: `admin_${Date.now()}`,
    name: 'Admin User',
    email: 'admin@example.com',
    provider: 'admin',
    avatar: 'https://via.placeholder.com/40',
    isNewUser: false,
    registrationCompleted: true,
    role: 'admin',
  };
  
  return adminUser;
};

// Mock function to simulate regular user login
export const loginAsUser = () => {
  const regularUser = {
    id: `user_${Date.now()}`,
    name: 'Regular User',
    email: 'user@example.com',
    provider: 'user',
    avatar: 'https://via.placeholder.com/40',
    isNewUser: false,
    registrationCompleted: true,
    role: 'user',
  };
  
  return regularUser;
};


import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdminProvider } from '../contexts/AdminContext';
import AdminDashboard from '../components/admin/AdminDashboard';

const Admin = () => {
  const { isAdmin, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <h2>Please log in to access the admin panel</h2>
        <p>You need to be authenticated to view this page.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <h2>Access Denied</h2>
        <p>You don't have admin permissions to access this page.</p>
      </div>
    );
  }

  return (
    <AdminProvider>
      <AdminDashboard />
    </AdminProvider>
  );
};

export default Admin;


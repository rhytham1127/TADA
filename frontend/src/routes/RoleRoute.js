import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleRoute({ children, allowedRoles = [], fallbackPath = '/dashboard' }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18, color: '#0d1b2a' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Normalize role — handles "super_admin", "SuperAdmin", "ADMIN", etc.
  const normalizedRole = (user.role || '').toLowerCase().replace(/_/g, '').trim();
  const normalizedAllowed = allowedRoles.map(r => r.toLowerCase().replace(/_/g, '').trim());

  if (!normalizedAllowed.includes(normalizedRole)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

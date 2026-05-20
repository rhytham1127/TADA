import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewClaim from './pages/NewClaim';
import ClaimDetail from './pages/ClaimDetail';
import BankDetails from './pages/BankDetails';
import AdminDashboard from './pages/AdminDashboard';
import Layout from './components/Layout';
import AdminUsers from './pages/AdminUsers';
import AuditLogs from './pages/AuditLogs';

const RoleGuard = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18 }}>Loading...</div>;
  const normalizedRole = (user?.role || '').toLowerCase().trim();
  return allowedRoles.includes(normalizedRole) ? children : <Navigate to="/dashboard" replace />;
};

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18 }}>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18 }}>Loading...</div>;
  const normalizedRole = (user?.role || '').toLowerCase().trim();
  return user && (normalizedRole === 'admin' || normalizedRole === 'superadmin') ? children : <Navigate to="/dashboard" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    const role = (user.role || '').toLowerCase().trim();
    return <Navigate to={role === 'superadmin' || role === 'admin' ? '/admin' : '/dashboard'} />;
  }
  return children;
};

// Redirect superadmin/admin away from /dashboard to /admin
const UserOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 18 }}>Loading...</div>;
  const role = (user?.role || '').toLowerCase().trim();
  if (role === 'superadmin' || role === 'admin') return <Navigate to="/admin" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<UserOnlyRoute><Dashboard /></UserOnlyRoute>} />
            <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="admin/users" element={<RoleGuard allowedRoles={['superadmin']}><AdminUsers /></RoleGuard>} />
            <Route path="admin/audit-logs" element={<RoleGuard allowedRoles={['superadmin', 'admin']}><AuditLogs /></RoleGuard>} />
            <Route path="claims/new" element={<NewClaim />} />
            <Route path="claims/:id" element={<ClaimDetail />} />
            <Route path="bank-details" element={<BankDetails />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="colored" />
    </AuthProvider>
  );
}

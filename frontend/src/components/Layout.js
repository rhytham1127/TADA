import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch (_) {}
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">T</div>
          <div>
            <div className="logo-title">TADA</div>
            <div className="logo-sub">Travel & Daily Allowance</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Regular users: Dashboard + New Claim */}
          {!isAdmin && !isSuperAdmin && (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <span className="nav-icon">⊞</span> Dashboard
              </NavLink>
              <NavLink to="/claims/new" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <span className="nav-icon">＋</span> New Claim
              </NavLink>
            </>
          )}

          {/* Admin: Claims Dashboard */}
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <span className="nav-icon">⊞</span> Dashboard
            </NavLink>
          )}

          {/* SuperAdmin: Review Claims, Manage Users */}
          {isSuperAdmin && (
            <>
              <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <span className="nav-icon">✅</span> Review Claims
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <span className="nav-icon">🧑‍💼</span> Manage Users
              </NavLink>
            </>
          )}

          {/* Audit Logs: admin + superadmin */}
          {(isAdmin || isSuperAdmin) && (
            <NavLink to="/admin/audit-logs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <span className="nav-icon">📋</span> Audit Logs
            </NavLink>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{user?.full_name?.charAt(0)?.toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{user?.full_name}</div>
            <div className="user-dept">{user?.designation || user?.department || user?.role}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">⏻</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className="topbar-right">
            <span className="topbar-greeting">Welcome, {user?.full_name?.split(' ')[0]}</span>
            {isSuperAdmin && <span style={{ marginLeft: 8, fontSize: 11, background: '#0d1b2a', color: '#fff', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>Super Admin</span>}
            {isAdmin && <span style={{ marginLeft: 8, fontSize: 11, background: '#1e3a5f', color: '#fff', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>Admin</span>}
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

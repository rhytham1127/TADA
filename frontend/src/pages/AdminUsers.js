import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI, authAPI } from '../utils/api';
import './AdminUsers.css';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FALLBACK_DESIGNATIONS = [
  { id: 1, name: 'Project Analyst' },
  { id: 2, name: 'Software Developer' },
  { id: 3, name: 'Junior Software Developer' },
  { id: 4, name: 'Senior Software Developer' },
  { id: 5, name: 'UI/UX Designer' },
  { id: 6, name: 'Data Analyst' },
  { id: 7, name: 'System Administrator' },
  { id: 8, name: 'Operations Executive' },
  { id: 9, name: 'Project Manager' },
  { id: 10, name: 'Assistant Manager' },
  { id: 11, name: 'Branch Manager' },
  { id: 12, name: 'Regional Head' },
  { id: 13, name: 'Clerk' },
  { id: 14, name: 'Cashier' },
  { id: 15, name: 'SDG' },
  { id: 16, name: 'DG' },
];
const ROLES = ['admin', 'user', 'superadmin'];

const emptyForm = { name: '', email: '', password: '', role: 'admin', designation: '', department: '' };

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [designations, setDesignations] = useState([]);

  const normalizeRole = (r) => (r || '').toLowerCase().trim();
  const isSuperAdmin = user && normalizeRole(user.role) === 'superadmin';

  useEffect(() => {
    if (!isSuperAdmin) navigate('/dashboard');
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    authAPI.getDesignations()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setDesignations(data.length > 0 ? data : FALLBACK_DESIGNATIONS);
      })
      .catch(() => setDesignations(FALLBACK_DESIGNATIONS));
  }, []);

  const fetchUsers = useCallback(async (searchTerm = '') => {
    try {
      setLoading(true);
      const res = await adminAPI.getUsers({ q: searchTerm || undefined });
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) fetchUsers();
  }, [fetchUsers, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const t = setTimeout(() => fetchUsers(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchUsers, isSuperAdmin]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      (u.full_name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term) ||
      (u.designation || '').toLowerCase().includes(term)
    );
  }, [users, search]);

  const validate = (f) => {
    if (!f.name?.trim()) return 'Name is required';
    if (!f.email?.trim() || !emailRegex.test(f.email.trim())) return 'Valid email is required';
    if (!f.password || f.password.length < 6) return 'Password must be at least 6 characters';
    if (!f.designation?.trim()) return 'Designation is required';
    return null;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errMsg = validate(form);
    if (errMsg) { toast.error(errMsg); return; }
    try {
      setCreating(true);
      await adminAPI.createUser({
        name: form.name, full_name: form.name,
        email: form.email, password: form.password,
        role: form.role, designation: form.designation,
        department: form.department
      });
      toast.success('User created successfully');
      setForm(emptyForm);
      await fetchUsers(search);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSave = async () => {
    try {
      await adminAPI.updateUser(editingUser.id, {
        full_name: editForm.full_name,
        designation: editForm.designation,
        department: editForm.department,
        role: editForm.role,
        ...(editForm.password ? { password: editForm.password } : {})
      });
      toast.success('User updated successfully');
      setEditingUser(null);
      await fetchUsers(search);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    try {
      setDeletingId(id);
      await adminAPI.deleteUser(id);
      toast.success('User deleted successfully');
      await fetchUsers(search);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <div className="admin-users-page">
      <div className="admin-users-shell">
        <div className="admin-users-header">
          <div className="admin-users-title">
            <h1>Manage Users</h1>
            <p>Super Admin: create and manage user accounts</p>
          </div>
          <div className="admin-users-search">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, role..." />
          </div>
        </div>

        <div className="admin-users-grid">
          {/* Create User Form */}
          <div className="card">
            <div className="card-inner">
              <h2>Create User</h2>
              <form onSubmit={handleCreate} className="form-stack">
                <div className="field">
                  <label>Name *</label>
                  <input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" required />
                </div>
                <div className="field">
                  <label>Email *</label>
                  <input value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} placeholder="user@example.com" type="email" required />
                </div>
                <div className="field">
                  <label>Password *</label>
                  <input value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" type="password" required />
                </div>
                <div className="field">
                  <label>Designation *</label>
                  <select value={form.designation} onChange={(e) => setForm(p => ({ ...p, designation: e.target.value }))} required>
                    <option value="">-- Select Designation --</option>
                    {designations.map((d) => (
                      <option key={d.id || d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Department</label>
                  <input value={form.department} onChange={(e) => setForm(p => ({ ...p, department: e.target.value }))} placeholder="Department (optional)" />
                </div>
                <div className="field">
                  <label>Role</label>
                  <select value={form.role} onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>
          </div>

          {/* Users Table */}
          <div className="card">
            <div className="card-inner">
              <h2>Existing Users</h2>
              {loading ? (
                <div className="loading-state">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="no-users">No users found</div>
              ) : (
                <div className="table-wrap">
                  <table className="users-table" aria-label="Users table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Designation</th>
                        <th>Role</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((u) => (
                        <tr key={u.id}>
                          <td>{u.full_name}</td>
                          <td>{u.email}</td>
                          <td>{u.designation || '—'}</td>
                          <td><span className={`role-pill ${u.role || 'user'}`}>{u.role}</span></td>
                          <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}</td>
                          <td style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                              onClick={() => { setEditingUser(u); setEditForm({ full_name: u.full_name, designation: u.designation || '', department: u.department || '', role: u.role, password: '' }); }}>
                              Edit
                            </button>
                            {u.role !== 'superadmin' ? (
                              <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 12 }}
                                disabled={deletingId === u.id} onClick={() => handleDelete(u.id)}>
                                {deletingId === u.id ? '...' : 'Delete'}
                              </button>
                            ) : (
                              <span className="helper-text">Protected</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 420, maxWidth: '95vw' }}>
              <h2 style={{ marginBottom: 20 }}>Edit User: {editingUser.full_name}</h2>
              <div className="form-stack">
                <div className="field">
                  <label>Full Name</label>
                  <input value={editForm.full_name} onChange={(e) => setEditForm(p => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Designation</label>
                  <select value={editForm.designation} onChange={(e) => setEditForm(p => ({ ...p, designation: e.target.value }))}>
                    <option value="">-- Select Designation --</option>
                    {designations.map((d) => (
                      <option key={d.id || d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Department</label>
                  <input value={editForm.department} onChange={(e) => setEditForm(p => ({ ...p, department: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Role</label>
                  <select value={editForm.role} onChange={(e) => setEditForm(p => ({ ...p, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>New Password (leave blank to keep current)</label>
                  <input type="password" value={editForm.password} onChange={(e) => setEditForm(p => ({ ...p, password: e.target.value }))} placeholder="Leave blank to keep current" />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={handleEditSave} style={{ flex: 1 }}>Save Changes</button>
                  <button className="btn btn-secondary" onClick={() => setEditingUser(null)} style={{ flex: 1 }}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

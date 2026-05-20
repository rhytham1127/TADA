import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { tadaAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [allClaims, setAllClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const normalizeRole = (r) => (r || '').toLowerCase().replace(/_/g, '').trim();
  const isSuperAdmin = user && normalizeRole(user.role) === 'superadmin';
  const isAdmin = user && normalizeRole(user.role) === 'admin';
  const isAdminOrSuper = isSuperAdmin || isAdmin;

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true);
      const res = await tadaAPI.getClaims();
      setAllClaims(res.data);
    } catch (err) {
      toast.error('Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  useEffect(() => { applyFilters(); }, [allClaims, statusFilter, searchTerm, dateFrom, dateTo]);

  const normalizeStatus = (s) => (s || '').toString().toLowerCase().trim();

  const applyFilters = () => {
    let filtered = [...allClaims];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => normalizeStatus(c.status) === normalizeStatus(statusFilter));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        (c.claim_number || '').toLowerCase().includes(term) ||
        (c.purpose_of_travel || '').toLowerCase().includes(term) ||
        (c.travel_from || '').toLowerCase().includes(term) ||
        (c.travel_to || '').toLowerCase().includes(term) ||
        (c.full_name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term)
      );
    }
    if (dateFrom) {
      filtered = filtered.filter(c => new Date(c.departure_date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(c => new Date(c.return_date) <= new Date(dateTo));
    }
    setFilteredClaims(filtered);
  };

  // Stats
  const stats = {
    total:       allClaims.length,
    draft:       allClaims.filter(c => normalizeStatus(c.status) === 'draft').length,
    submitted:   allClaims.filter(c => normalizeStatus(c.status) === 'submitted' || normalizeStatus(c.status) === 'pending').length,
    approved:    allClaims.filter(c => normalizeStatus(c.status) === 'approved').length,
    rejected:    allClaims.filter(c => normalizeStatus(c.status) === 'rejected').length,
    totalAmount: allClaims.reduce((s, c) => s + parseFloat(c.total_amount || 0), 0),
  };

  const fmt = (n) => '₹' + parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const handleClearFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
  };

  const statusBadgeClass = (status) => {
    const s = normalizeStatus(status);
    if (s === 'approved') return 'badge badge-approved';
    if (s === 'rejected') return 'badge badge-rejected';
    if (s === 'submitted' || s === 'pending') return 'badge badge-submitted';
    return 'badge badge-draft';
  };

  const pageTitle = isSuperAdmin ? 'Claims Overview' : isAdmin ? 'Admin Dashboard' : 'Dashboard';
  const pageSubtitle = isSuperAdmin
    ? 'All submitted TADA claims across the organisation'
    : isAdmin
    ? 'Manage and process TADA claims'
    : `Welcome ${user?.full_name || user?.name || 'back'}! Overview of your TADA claims`;

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h2>{pageTitle}</h2>
          <p>{pageSubtitle}</p>
        </div>
        {!isAdminOrSuper && (
          <Link to="/claims/new" className="btn-gold">＋ New Claim</Link>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e8f0fe' }}>📋</div>
          <div className="stat-num">{stats.total}</div>
          <div className="stat-label">Total Claims</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3e8' }}>📝</div>
          <div className="stat-num">{stats.draft}</div>
          <div className="stat-label">Drafts</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff4e6' }}>⏳</div>
          <div className="stat-num">{stats.submitted}</div>
          <div className="stat-label">Submitted</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.12)' }}>✓</div>
          <div className="stat-num" style={{ color: '#16a34a' }}>{stats.approved}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.1)' }}>✕</div>
          <div className="stat-num" style={{ color: '#dc2626' }}>{stats.rejected}</div>
          <div className="stat-label">Rejected</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(201,168,76,0.15)' }}>₹</div>
          <div className="stat-num">{fmt(stats.totalAmount)}</div>
          <div className="stat-label">Total Claimed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-card">
        <h3>Filters & Search</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Search {isAdminOrSuper ? '(Claim #, Employee, Purpose, Location)' : '(Claim #, Purpose, Location)'}</label>
            <input type="text" placeholder="Search claims..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} className="filter-input" />
          </div>
          <div className="filter-group">
            <label>From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="filter-input" />
          </div>
          <div className="filter-group">
            <label>To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="filter-input" />
          </div>
        </div>
        {(statusFilter !== 'all' || searchTerm || dateFrom || dateTo) && (
          <button onClick={handleClearFilters} className="btn-clear-filters">Clear Filters</button>
        )}
      </div>

      {/* Claims Table */}
      <div className="claims-section">
        <h3>{isAdminOrSuper ? 'All TADA Claims' : 'Your TADA Claims'} ({filteredClaims.length})</h3>
        {loading ? (
          <div className="loading-state">
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
            Loading claims...
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <p>
              {searchTerm || statusFilter !== 'all' || dateFrom || dateTo
                ? 'No claims match your filters. Try adjusting your search.'
                : isAdminOrSuper
                  ? 'No claims have been submitted yet.'
                  : <><Link to="/claims/new">Submit your first TADA claim</Link></>
              }
            </p>
          </div>
        ) : (
          <div className="claims-table-wrap">
            <table className="claims-table">
              <thead>
                <tr>
                  <th>Claim #</th>
                  {isAdminOrSuper && <th>Employee</th>}
                  <th>Purpose</th>
                  <th>From → To</th>
                  <th>Dates</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => (
                  <tr key={claim.id}>
                    <td><code>{claim.claim_number}</code></td>
                    {isAdminOrSuper && (
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{claim.full_name || '—'}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>{claim.email || ''}</div>
                      </td>
                    )}
                    <td className="purpose-cell">{claim.purpose_of_travel}</td>
                    <td>{claim.travel_from} → {claim.travel_to}</td>
                    <td className="date-cell">
                      <span>{new Date(claim.departure_date).toLocaleDateString('en-IN')}</span>
                      <span style={{ opacity: 0.6 }}>to {new Date(claim.return_date).toLocaleDateString('en-IN')}</span>
                    </td>
                    <td className="amount-cell">{fmt(claim.total_amount)}</td>
                    <td><span className={statusBadgeClass(claim.status)}>{claim.status}</span></td>
                    <td>
                      <Link to={`/claims/${claim.id}`} className="btn-outline" style={{ padding: '6px 14px', fontSize: 13 }}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

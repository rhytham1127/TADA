import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CLAIM_STATUS } from '../constants/claimStatus';
import { adminAPI } from '../utils/api';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Normalize role for comparison
  const normalizeRole = (r) => (r || '').toLowerCase().trim();
  const isSuperAdmin = user && normalizeRole(user.role) === 'superadmin';

  const [claims, setClaims] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [selectedClaim, setSelectedClaim] = useState(null);  // full claim detail
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'reject' | 'revert' | null
  const [modalRemarks, setModalRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const normalizeStatus = (s) => (s || '').toString().toLowerCase().trim();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [claimsRes, statsRes] = await Promise.all([
        adminAPI.getClaims({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchTerm || undefined
        }),
        adminAPI.getStats()
      ]);
      setClaims(claimsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      if (err.response?.status === 403) {
        toast.error('You do not have admin access');
        navigate('/dashboard');
      } else {
        toast.error(err.response?.data?.error || 'Failed to load admin data');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── View claim: fetch full details for the modal ─────────────────────────

  const handleViewClaim = async (claim) => {
    setActiveModal(null);
    setModalRemarks('');
    setSelectedClaim(claim); // show modal immediately with list data
    try {
      setLoadingDetail(true);
      const res = await adminAPI.getClaim(claim.id);
      setSelectedClaim(res.data); // upgrade with full data (expenses, docs, audit_trail)
    } catch (err) {
      console.error('Failed to load claim details:', err);
      toast.error(err.response?.data?.error || 'Failed to load full claim details');
      // keep the list data - modal still works for approve/reject
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeModal = () => {
    setSelectedClaim(null);
    setActiveModal(null);
    setModalRemarks('');
  };

  const handleApproveClaim = async () => {
    if (!selectedClaim) return;
    try {
      setActionLoading(true);
      await adminAPI.approveClaim(selectedClaim.id, '');
      toast.success('Claim approved successfully');
      closeModal();
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to approve claim');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClaim = async () => {
    if (!selectedClaim) return;
    if (!modalRemarks.trim()) { toast.error('Please provide remarks for rejection'); return; }
    try {
      setActionLoading(true);
      await adminAPI.rejectClaim(selectedClaim.id, modalRemarks);
      toast.success('Claim rejected successfully');
      closeModal();
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to reject claim');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevertClaim = async () => {
    if (!selectedClaim) return;
    if (!modalRemarks.trim()) { toast.error('Please provide a reason for reverting this approval'); return; }
    try {
      setActionLoading(true);
      await adminAPI.revertClaim(selectedClaim.id, modalRemarks);
      toast.success('Claim approval reverted successfully');
      closeModal();
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to revert claim');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const canApproveOrReject = (claim) => {
    const s = normalizeStatus(claim && claim.status);
    return s === CLAIM_STATUS.SUBMITTED || s === 'pending';
  };

  const canRevert = (claim) => {
    if (!isSuperAdmin) return false;
    if (normalizeStatus(claim && claim.status) !== CLAIM_STATUS.APPROVED) return false;
    if (!claim.approved_at) return false;
    const diffHours = (new Date() - new Date(claim.approved_at)) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  const getStatusBadgeClass = (status) => {
    const s = normalizeStatus(status);
    if (s === 'approved') return 'badge badge-approved';
    if (s === 'rejected') return 'badge badge-rejected';
    if (s === 'submitted' || s === 'pending') return 'badge badge-submitted';
    return 'badge badge-draft';
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">

      {/* ── Header ── */}
      <div className="admin-header">
        <div>
          <h1>{isSuperAdmin ? 'Claims Review' : 'Admin Dashboard'}</h1>
          <p>{isSuperAdmin ? 'View and revert TADA claims' : 'Manage and process TADA claims'}</p>
        </div>
        {isSuperAdmin && <span className="superadmin-badge">Super Admin</span>}
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Total Claims</div><div className="stat-value">{stats.total_claims}</div></div>
          <div className="stat-card stat-pending"><div className="stat-label">Pending Review</div><div className="stat-value">{stats.submitted_claims}</div></div>
          <div className="stat-card stat-approved"><div className="stat-label">Approved</div><div className="stat-value">{stats.approved_claims}</div></div>
          <div className="stat-card stat-rejected"><div className="stat-label">Rejected</div><div className="stat-value">{stats.rejected_claims}</div></div>
          <div className="stat-card stat-amount"><div className="stat-label">Approved Amount</div><div className="stat-value stat-value-sm">{fmt(stats.approved_amount)}</div></div>
          {isSuperAdmin && stats.total_users > 0 && (
            <div className="stat-card"><div className="stat-label">Total Users</div><div className="stat-value">{stats.total_users}</div></div>
          )}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="status-filter">Filter by Status</label>
          <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="search-filter">Search Claims</label>
          <input id="search-filter" type="text" placeholder="Search by claim number, name, or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="filter-input" />
        </div>
        <div className="filter-actions">
          <button className="btn-refresh" onClick={fetchData}>↻ Refresh</button>
        </div>
      </div>

      {/* ── Claims Table ── */}
      <div className="claims-section">
        <div className="claims-section-header">
          <h2>Claims <span className="claims-count">({claims.length})</span></h2>
        </div>

        {claims.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No claims found matching your filters.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="claims-table">
              <thead>
                <tr>
                  <th>Claim #</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Submitted On</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id} className={canApproveOrReject(claim) ? 'row-actionable' : ''}>
                    <td className="claim-number">{claim.claim_number}</td>
                    <td>
                      <div className="employee-info">
                        <div className="name">{claim.full_name}</div>
                        <div className="email">{claim.email}</div>
                      </div>
                    </td>
                    <td>{claim.department || '—'}</td>
                    <td className="amount">{fmt(claim.total_amount)}</td>
                    <td><span className={getStatusBadgeClass(claim.status)}>{claim.status}</span></td>
                    <td className="date">
                      {claim.submitted_at ? new Date(claim.submitted_at).toLocaleDateString('en-IN') : claim.created_at ? new Date(claim.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <button onClick={() => handleViewClaim(claim)} className="btn-view">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Claim Detail Modal ── */}
      {selectedClaim && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <div>
                <h2>{selectedClaim.claim_number}</h2>
                <span className={getStatusBadgeClass(selectedClaim.status)}>{selectedClaim.status}</span>
              </div>
              <button className="close-btn" onClick={closeModal} aria-label="Close">✕</button>
            </div>

            <div className="modal-body">
              {loadingDetail && <div style={{ textAlign: 'center', padding: '10px', color: '#888', fontSize: 13 }}>Loading full details...</div>}

              {/* Employee Info */}
              <div className="info-section">
                <h3>Employee Information</h3>
                <div className="info-grid">
                  <div><span className="label">Name</span><span className="value">{selectedClaim.full_name}</span></div>
                  <div><span className="label">Email</span><span className="value">{selectedClaim.email}</span></div>
                  <div><span className="label">Employee ID</span><span className="value">{selectedClaim.employee_id || '—'}</span></div>
                  <div><span className="label">Department</span><span className="value">{selectedClaim.department || '—'}</span></div>
                </div>
              </div>

              {/* Trip Details */}
              <div className="info-section">
                <h3>Trip Details</h3>
                <div className="info-grid">
                  <div style={{ gridColumn: '1 / -1' }}><span className="label">Purpose of Travel</span><span className="value">{selectedClaim.purpose_of_travel || '—'}</span></div>
                  <div><span className="label">From</span><span className="value">{selectedClaim.travel_from || '—'}</span></div>
                  <div><span className="label">To</span><span className="value">{selectedClaim.travel_to || '—'}</span></div>
                  <div><span className="label">Departure</span><span className="value">{selectedClaim.departure_date ? new Date(selectedClaim.departure_date).toLocaleDateString('en-IN') : '—'}</span></div>
                  <div><span className="label">Return</span><span className="value">{selectedClaim.return_date ? new Date(selectedClaim.return_date).toLocaleDateString('en-IN') : '—'}</span></div>
                </div>
              </div>

              {/* Expenses Summary */}
              {selectedClaim.expenses && selectedClaim.expenses.length > 0 && (
                <div className="info-section">
                  <h3>Expense Breakdown ({selectedClaim.expenses.length} entries)</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#0d1b2a', color: 'white' }}>
                          {['Date', 'Place', 'Mode', 'Fare', 'Accom.', 'DA', 'Total'].map((h) => (
                            <th key={h} style={{ padding: '8px 6px', textAlign: 'center' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedClaim.expenses.map((exp, i) => {
                          const total = ['fare','accommodation','conveyance','da','phone','internet','guest_entertainment','others'].reduce((s, k) => s + (parseFloat(exp[k]) || 0), 0);
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '7px 6px', textAlign: 'center' }}>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-IN') : '—'}</td>
                              <td style={{ padding: '7px 6px', textAlign: 'center' }}>{exp.place_from ? `${exp.place_from}→${exp.place_to}` : '—'}</td>
                              <td style={{ padding: '7px 6px', textAlign: 'center' }}>{exp.mode || '—'}</td>
                              <td style={{ padding: '7px 6px', textAlign: 'right' }}>{fmt(exp.fare)}</td>
                              <td style={{ padding: '7px 6px', textAlign: 'right' }}>{fmt(exp.accommodation)}</td>
                              <td style={{ padding: '7px 6px', textAlign: 'right' }}>{fmt(exp.da)}</td>
                              <td style={{ padding: '7px 6px', textAlign: 'right', fontWeight: 700, color: '#b8860b' }}>{fmt(total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Uploaded Documents */}
              {selectedClaim.documents && selectedClaim.documents.length > 0 && (
                <div className="info-section">
                  <h3>Uploaded Documents</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedClaim.documents.map((doc) => (
                      <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                        <span>{doc.file_type?.includes('pdf') ? '📄' : '🖼️'}</span>
                        <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>{doc.file_name}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ''}</span>
                        <a href={`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'}/uploads/download/${doc.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#b8860b', fontWeight: 600, textDecoration: 'none' }}>Download</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="info-section highlight">
                <div className="amount-row">
                  <span className="label">Total Amount Claimed</span>
                  <span className="value-large">{fmt(selectedClaim.total_amount)}</span>
                </div>
              </div>

              {/* Status Info */}
              <div className="info-section">
                <h3>Status Information</h3>
                <div className="info-grid">
                  <div><span className="label">Current Status</span><span className={getStatusBadgeClass(selectedClaim.status)}>{selectedClaim.status}</span></div>
                  {selectedClaim.approved_at && (
                    <div><span className="label">Approved On</span><span className="value">{new Date(selectedClaim.approved_at).toLocaleString('en-IN')}</span></div>
                  )}
                  {selectedClaim.rejected_at && (
                    <div><span className="label">Rejected On</span><span className="value">{new Date(selectedClaim.rejected_at).toLocaleString('en-IN')}</span></div>
                  )}
                  {selectedClaim.approval_message && (
                    <div style={{ gridColumn: '1 / -1' }}><span className="label">Approval Message</span><span className="value">{selectedClaim.approval_message}</span></div>
                  )}
                  {selectedClaim.remarks && (
                    <div style={{ gridColumn: '1 / -1' }}><span className="label">Remarks</span><span className="value">{selectedClaim.remarks}</span></div>
                  )}
                </div>
              </div>

              {/* Status History */}
              {selectedClaim.audit_trail && selectedClaim.audit_trail.length > 0 && (
                <div className="info-section">
                  <h3>Status History</h3>
                  {selectedClaim.audit_trail.map((entry, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                      <span>{entry.action === 'approved' ? '✅' : entry.action === 'rejected' ? '❌' : '↩️'}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{(entry.action || '').replace(/_/g, ' ')}</div>
                        {entry.actor_name && <div style={{ fontSize: 11, color: '#6b7280' }}>by {entry.actor_name}</div>}
                        {entry.remarks && <div style={{ fontSize: 12, color: '#374151' }}>{entry.remarks}</div>}
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{entry.created_at ? new Date(entry.created_at).toLocaleString('en-IN') : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reject Form */}
              {activeModal === 'reject' && (
                <div className="inline-action-form">
                  <h4>Reject Claim — Provide Reason</h4>
                  <textarea value={modalRemarks} onChange={(e) => setModalRemarks(e.target.value)} placeholder="Provide a detailed reason for rejection..." className="remarks-textarea" rows="3" disabled={actionLoading} autoFocus />
                  <div className="inline-action-buttons">
                    <button onClick={() => { setActiveModal(null); setModalRemarks(''); }} className="btn-cancel-action" disabled={actionLoading}>Cancel</button>
                    <button onClick={handleRejectClaim} disabled={actionLoading || !modalRemarks.trim()} className="btn-confirm-reject">
                      {actionLoading ? 'Processing...' : '✕ Confirm Rejection'}
                    </button>
                  </div>
                </div>
              )}

              {/* Revert Form */}
              {activeModal === 'revert' && (
                <div className="inline-action-form inline-action-form--revert">
                  <h4>Revert Approval — Provide Reason</h4>
                  <p className="revert-warning">⚠️ This will revert the claim to "Submitted" status for re-evaluation. Only available within 24 hours of approval.</p>
                  <textarea value={modalRemarks} onChange={(e) => setModalRemarks(e.target.value)} placeholder="Provide a reason for reverting..." className="remarks-textarea" rows="3" disabled={actionLoading} autoFocus />
                  <div className="inline-action-buttons">
                    <button onClick={() => { setActiveModal(null); setModalRemarks(''); }} className="btn-cancel-action" disabled={actionLoading}>Cancel</button>
                    <button onClick={handleRevertClaim} disabled={actionLoading || !modalRemarks.trim()} className="btn-confirm-revert">
                      {actionLoading ? 'Processing...' : '↩ Confirm Revert'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button onClick={closeModal} className="btn-cancel" disabled={actionLoading}>Close</button>
              <div className="modal-action-group">
                {/* Approve / Reject — available to both admin and superadmin for submitted/pending claims */}
                {canApproveOrReject(selectedClaim) && activeModal !== 'reject' && activeModal !== 'revert' && (
                  <>
                    <button onClick={() => { setActiveModal('reject'); setModalRemarks(''); }} disabled={actionLoading} className="btn-reject">✕ Reject</button>
                    <button onClick={handleApproveClaim} disabled={actionLoading} className="btn-approve">
                      {actionLoading ? 'Processing...' : '✓ Approve'}
                    </button>
                  </>
                )}

                {/* Revert — only for Super Admin, only on approved claims within 24h */}
                {canRevert(selectedClaim) && activeModal !== 'reject' && activeModal !== 'revert' && (
                  <button onClick={() => { setActiveModal('revert'); setModalRemarks(''); }} disabled={actionLoading} className="btn-revert">
                    ↩ Revert Approval
                  </button>
                )}

                {normalizeStatus(selectedClaim.status) === CLAIM_STATUS.APPROVED && !canRevert(selectedClaim) && activeModal === null && (
                  <span className="status-label status-label--approved">✓ Approved</span>
                )}
                {normalizeStatus(selectedClaim.status) === CLAIM_STATUS.REJECTED && activeModal === null && (
                  <span className="status-label status-label--rejected">✕ Rejected</span>
                )}
                {normalizeStatus(selectedClaim.status) === 'draft' && activeModal === null && (
                  <span className="status-label status-label--draft">Draft — No actions available</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

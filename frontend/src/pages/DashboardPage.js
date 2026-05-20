import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tadaAPI } from '../utils/api';
import { toast } from 'react-toastify';


const fmt = (n) => `₹ ${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function StatCard({ label, value, color, icon }) {
  return (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)', fontFamily: 'var(--mono)' }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tadaAPI
      .getClaims()
      .then((r) => setClaims(Array.isArray(r.data) ? r.data : r.data?.claims || []))
      .catch(() => toast.error('Failed to load claims'))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: claims.length,
    pending: claims.filter(c => c.status === 'pending').length,
    approved: claims.filter(c => c.status === 'approved').length,
    totalAmount: claims.reduce((s, c) => s + parseFloat(c.grand_total || 0), 0),
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '0.25rem' }}>
              Welcome, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>
              {user?.designation} • Manage your travel expense claims
            </p>
          </div>
          <Link to="/claims/new" className="btn btn-primary">
            ➕ New TADA Claim
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Total Claims" value={stats.total} color="#dbeafe" icon="📋" />
        <StatCard label="Pending" value={stats.pending} color="#ede9fe" icon="⏳" />
        <StatCard label="Approved" value={stats.approved} color="#d1fae5" icon="✅" />
        <StatCard label="Total Amount" value={`₹${(stats.totalAmount / 1000).toFixed(1)}K`} color="#fef9c3" icon="💰" />
      </div>

      {/* Claims list */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)' }}>My TADA Claims</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>{claims.length} total</span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-400)' }}>Loading claims...</div>
        ) : claims.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗂️</div>
            <p style={{ color: 'var(--gray-400)', marginBottom: '1rem' }}>No TADA claims submitted yet</p>
            <Link to="/claims/new" className="btn btn-primary btn-sm">Submit your first claim</Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-100)' }}>
                  {['Ref No', 'Journey Purpose', 'Tour Period', 'Project', 'Grand Total', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {claims.map(claim => (
                  <tr key={claim.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--gray-600)' }}>{claim.ref_no || '—'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--navy)', fontSize: '0.875rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{claim.journey_purpose}</td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>
                      {new Date(claim.tour_date_from).toLocaleDateString('en-IN')} – {new Date(claim.tour_date_to).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--gray-600)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{claim.project || '—'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap' }}>{fmt(claim.grand_total)}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className={`badge badge-${claim.status}`}>{claim.status}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Link to={`/claims/${claim.id}`} className="btn btn-outline btn-sm">View</Link>
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

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AuditLogs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', action: '', module: '', page: 1 });
  const [total, setTotal] = useState(0);

  const normalizeRole = (r) => (r || '').toLowerCase().trim();
  const isSuperAdmin = user && normalizeRole(user.role) === 'superadmin';
  const isAdmin = user && normalizeRole(user.role) === 'admin';

  useEffect(() => {
    if (!isSuperAdmin && !isAdmin) navigate('/dashboard');
  }, [isSuperAdmin, isAdmin, navigate]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { ...filters, limit: 50 };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await adminAPI.getAuditLogs(params);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const setFilter = (field) => (e) => setFilters(p => ({ ...p, [field]: e.target.value, page: 1 }));

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: 8, color: '#0d1b2a' }}>Audit Logs</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>System-wide activity log for all user actions</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: '#555' }}>From Date</label>
          <input type="date" value={filters.dateFrom} onChange={setFilter('dateFrom')}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: '#555' }}>To Date</label>
          <input type="date" value={filters.dateTo} onChange={setFilter('dateTo')}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: '#555' }}>Action</label>
          <input placeholder="e.g. login, create_user" value={filters.action} onChange={setFilter('action')}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, display: 'block', marginBottom: 4, color: '#555' }}>Module</label>
          <input placeholder="e.g. auth, claims" value={filters.module} onChange={setFilter('module')}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
        <div style={{ alignSelf: 'flex-end' }}>
          <button onClick={fetchLogs} style={{ padding: '8px 20px', background: '#0d1b2a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            Apply Filters
          </button>
        </div>
        <div style={{ alignSelf: 'flex-end' }}>
          <button onClick={() => setFilters({ dateFrom: '', dateTo: '', action: '', module: '', page: 1 })}
            style={{ padding: '8px 16px', background: '#fff', color: '#666', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 12, color: '#666', fontSize: 14 }}>
        Showing {logs.length} of {total} entries
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>No audit logs found for the selected filters.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <thead>
              <tr style={{ background: '#0d1b2a', color: '#fff' }}>
                {['Time', 'User', 'Role', 'Action', 'Module', 'Entity', 'Remarks', 'IP'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>{log.display_name || log.user_name || log.user_email || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12 }}>
                    <span style={{ background: '#e8f0fe', color: '#1a73e8', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                      {log.role || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12 }}>
                    <span style={{ background: '#e6f4ea', color: '#137333', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                      {log.action || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12 }}>{log.module || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12 }}>{log.entity_type ? `${log.entity_type} #${log.entity_id}` : '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, maxWidth: 200 }}>{log.remarks || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#999' }}>{log.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > 50 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          <button disabled={filters.page <= 1}
            onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
            style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>
            Previous
          </button>
          <span style={{ padding: '8px 16px', color: '#666' }}>Page {filters.page}</span>
          <button disabled={filters.page * 50 >= total}
            onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
            style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { tadaAPI, uploadAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { CLAIM_STATUS } from '../constants/claimStatus';
import { generateClaimPDF } from '../utils/pdfExport';
import FlightPDFReader from '../components/FlightPDFReader';
import './ClaimDetail.css';

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [deletingFile, setDeletingFile] = useState(null);
  const [pdfDates, setPdfDates] = useState(null);

  const normalizeStatus = (s) => (s || '').toString().toLowerCase().trim();

  const fetchClaimDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await tadaAPI.getClaim(id);
      const claimData = res.data;

      // Fetch files separately
      try {
        const filesRes = await uploadAPI.getFiles(id);
        claimData.documents = filesRes.data;
      } catch (err) {
        claimData.documents = [];
      }

      setClaim(claimData);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load claim');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchClaimDetail();
  }, [fetchClaimDetail]);

  const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const calculateExpenseTotal = (exp) =>
    ['fare', 'accommodation', 'conveyance', 'da', 'phone', 'internet', 'guest_entertainment', 'others']
      .reduce((s, k) => s + (parseFloat(exp[k]) || 0), 0);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this claim? This action cannot be undone.')) {
      return;
    }
    try {
      setDeleting(true);
      await tadaAPI.deleteClaim(id);
      toast.success('Claim deleted successfully');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete claim');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      setDownloadingFile(fileId);
      const response = await uploadAPI.downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      // FIX: was link.parentChild (typo) → link.parentNode
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('File downloaded');
    } catch (err) {
      toast.error('Failed to download file');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      setDeletingFile(fileId);
      await uploadAPI.deleteFile(fileId);
      setClaim((prev) => ({
        ...prev,
        documents: prev.documents.filter((d) => d.id !== fileId)
      }));
      toast.success('File deleted');
    } catch (err) {
      toast.error('Failed to delete file');
    } finally {
      setDeletingFile(null);
    }
  };

  const handleDownloadPDF = () => {
    try {
      generateClaimPDF(claim);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    }
  };

  const handlePDFDatesExtracted = ({ departureDate, returnDate, flightInfo }) => {
    setPdfDates({ departureDate, returnDate, flightInfo });
  };

  const handleSubmitClaim = async () => {
    try {
      const res = await tadaAPI.updateClaim(id, { status: CLAIM_STATUS.SUBMITTED });
      setClaim(res.data.claim || res.data || { ...claim, status: CLAIM_STATUS.SUBMITTED });
      toast.success('Claim submitted successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit claim');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-400)' }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
        Loading claim details...
      </div>
    );
  }

  if (!claim) return null;

  const isEditable = normalizeStatus(claim.status) === CLAIM_STATUS.DRAFT;
  const isDraft = normalizeStatus(claim.status) === CLAIM_STATUS.DRAFT;

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/dashboard')} className="btn-outline">← Back</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 28, color: 'var(--navy)', marginBottom: 4 }}>{claim.claim_number}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className={`badge badge-${claim.status}`}>{claim.status}</span>
            {isEditable && (
              <span style={{ fontSize: 12, color: 'var(--gray-500)', fontStyle: 'italic' }}>
                (Draft — You can edit and submit this claim)
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isDraft && (
            <button
              onClick={handleSubmitClaim}
              style={{
                background: 'var(--navy)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              ✓ Submit Claim
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            style={{
              background: 'var(--gold)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            📥 Download PDF
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: 'var(--red-50)',
              color: 'var(--red-600)',
              border: '1px solid var(--red-200)',
              padding: '10px 20px',
              borderRadius: 'var(--radius)',
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.6 : 1
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Claim'}
          </button>
        </div>
      </div>

      {/* Employee Details - now shows real user info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 16 }}>Employee Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Employee Name</div>
            <div style={{ fontSize: 15, color: 'var(--gray-800)', fontWeight: 500 }}>{user?.full_name || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Email</div>
            <div style={{ fontSize: 15, color: 'var(--gray-800)', fontWeight: 500 }}>{user?.email || '—'}</div>
          </div>
          {user?.designation && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Designation</div>
              <div style={{ fontSize: 15, color: 'var(--gray-800)', fontWeight: 500 }}>{user.designation}</div>
            </div>
          )}
          {user?.department && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Department</div>
              <div style={{ fontSize: 15, color: 'var(--gray-800)', fontWeight: 500 }}>{user.department}</div>
            </div>
          )}
        </div>
      </div>

      {/* Trip Information */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 16 }}>Trip Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[
            ['Purpose of Travel', claim.purpose_of_travel],
            ['Travel From', claim.travel_from],
            ['Travel To', claim.travel_to],
            ['Departure Date', claim.departure_date ? new Date(claim.departure_date).toLocaleDateString('en-IN', { dateStyle: 'long' }) : '—'],
            ['Return Date', claim.return_date ? new Date(claim.return_date).toLocaleDateString('en-IN', { dateStyle: 'long' }) : '—'],
            ['Status', <span key="status" className={`badge badge-${claim.status}`}>{claim.status}</span>],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, color: 'var(--gray-800)', fontWeight: label === 'Status' ? 500 : 400 }}>{val}</div>
            </div>
          ))}
        </div>
        {claim.remarks && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--gray-100)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Remarks</div>
            <div style={{ fontSize: 15, color: 'var(--gray-800)' }}>{claim.remarks}</div>
          </div>
        )}
        {normalizeStatus(claim.status) === CLAIM_STATUS.APPROVED && claim.approval_message && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--gray-100)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-600)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>✓ Approval Message</div>
            <div style={{ fontSize: 15, color: 'var(--green-700)', fontWeight: 500, background: 'var(--green-50)', padding: '12px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--green-200)' }}>{claim.approval_message}</div>
          </div>
        )}
      </div>

      {/* Flight PDF Reader — only for draft claims */}
      {isEditable && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 4 }}>Auto-Fill Dates from Flight Ticket</h3>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Upload your flight ticket PDF to automatically detect departure and arrival dates. The TA/DA rule (landing after 12 PM = +1 extra day) is applied automatically.</p>
          <FlightPDFReader onDatesExtracted={handlePDFDatesExtracted} />
          {pdfDates && (
            <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '12px 16px', marginTop: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#1b5e20', marginBottom: 6 }}>📝 Dates auto-filled from PDF:</div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
                <span>Departure: <strong>{pdfDates.departureDate || '—'}</strong></span>
                <span>Return: <strong>{pdfDates.returnDate || '—'}</strong></span>
                {pdfDates.flightInfo?.landingAfterNoon && (
                  <span style={{ color: '#b45309' }}>⚠️ +1 day added (landing after 12 PM)</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expenses Table */}
      {claim.expenses && claim.expenses.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 16 }}>Expense Breakdown</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: 'var(--navy)' }}>
                  {['Date', 'Place', 'Mode', 'Fare', 'Accom.', 'Convey.', 'DA', 'Phone', 'Internet', 'Guest Ent.', 'Others', 'Total'].map((h) => (
                    <th key={h} style={{ color: 'white', padding: '12px 10px', textAlign: 'center', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {claim.expenses.map((exp, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'center', color: 'var(--gray-700)' }}>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'center', color: 'var(--gray-600)' }}>{exp.place_from ? `${exp.place_from}→${exp.place_to}` : '—'}</td>
                    <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'center', color: 'var(--gray-600)' }}>{exp.mode || '—'}</td>
                    <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'right', color: 'var(--navy)', fontWeight: 500 }}>{fmt(exp.fare)}</td>
                    <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'right', color: 'var(--navy)', fontWeight: 500 }}>{fmt(exp.accommodation)}</td>
                    <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'right', color: 'var(--navy)', fontWeight: 500 }}>{fmt(exp.conveyance)}</td>
                    <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'right', color: 'var(--navy)', fontWeight: 500 }}>{fmt(exp.da)}</td>
                    <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'right', color: 'var(--navy)', fontWeight: 500 }}>{fmt(exp.phone)}</td>
                    <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'right', color: 'var(--navy)', fontWeight: 500 }}>{fmt(exp.internet)}</td>
                    <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'right', color: 'var(--navy)', fontWeight: 500 }}>{fmt(exp.guest_entertainment)}</td>
                    <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'right', color: 'var(--navy)', fontWeight: 500 }}>{fmt(exp.others)}</td>
                    <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'right', color: 'var(--gold)', fontWeight: 700, borderLeft: '2px solid var(--gray-200)' }}>{fmt(calculateExpenseTotal(exp))}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--navy)' }}>
                  <td colSpan={11} style={{ padding: '14px 12px', color: 'white', fontWeight: 600, textAlign: 'right' }}>Grand Total</td>
                  <td style={{ padding: '14px 12px', color: 'var(--gold)', fontWeight: 800, fontSize: 16, textAlign: 'right' }}>{fmt(claim.total_amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No expenses yet */}
      {(!claim.expenses || claim.expenses.length === 0) && (
        <div className="card" style={{ background: 'var(--gray-50)', textAlign: 'center', padding: '30px 20px', color: 'var(--gray-500)', marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
          <div>No expenses recorded for this claim</div>
        </div>
      )}

      {/* Bank Details */}
      {claim.bank_details && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 16 }}>Bank Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              ['Account Holder', claim.bank_details.account_holder_name],
              ['Account Number', claim.bank_details.account_number],
              ['Bank Name', claim.bank_details.bank_name],
              ['Branch', claim.bank_details.branch_name],
              ['IFSC Code', claim.bank_details.ifsc_code],
              ['Account Type', claim.bank_details.account_type],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 15, color: 'var(--gray-800)' }}>{val || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status History / Audit Trail */}
      {claim.audit_trail && claim.audit_trail.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 16 }}>Status History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {claim.audit_trail.map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: 20, marginTop: 2 }}>
                  {entry.action === 'approved' ? '✅' : entry.action === 'rejected' ? '❌' : entry.action === 'reverted_to_submitted' ? '↩️' : '📋'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)', textTransform: 'capitalize' }}>{(entry.action || '').replace(/_/g, ' ')}</div>
                  {entry.actor_name && <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>by {entry.actor_name}</div>}
                  {entry.remarks && <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 4 }}>{entry.remarks}</div>}
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>{entry.created_at ? new Date(entry.created_at).toLocaleString('en-IN') : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {claim.documents && claim.documents.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 16 }}>Uploaded Documents</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {claim.documents.map((doc) => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--gray-50)', padding: '14px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: 22 }}>{doc.file_type?.includes('pdf') ? '📄' : '🖼️'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--gray-800)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.file_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                    {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'Unknown size'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleDownloadFile(doc.id, doc.file_name)}
                    disabled={downloadingFile === doc.id}
                    style={{ background: 'var(--gold)', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 'var(--radius)', cursor: downloadingFile === doc.id ? 'not-allowed' : 'pointer', opacity: downloadingFile === doc.id ? 0.6 : 1, fontSize: 13, fontWeight: 600 }}
                  >
                    {downloadingFile === doc.id ? '...' : '⬇'}
                  </button>
                  <button
                    onClick={() => handleDeleteFile(doc.id)}
                    disabled={deletingFile === doc.id}
                    style={{ background: 'var(--red-50)', color: 'var(--red-600)', border: '1px solid var(--red-200)', padding: '8px 14px', borderRadius: 'var(--radius)', cursor: deletingFile === doc.id ? 'not-allowed' : 'pointer', opacity: deletingFile === doc.id ? 0.6 : 1, fontSize: 13, fontWeight: 600 }}
                  >
                    {deletingFile === doc.id ? '...' : '✕'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!claim.documents || claim.documents.length === 0) && (
        <div className="card" style={{ background: 'var(--gray-50)', textAlign: 'center', padding: '30px 20px', color: 'var(--gray-500)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
          <div>No documents uploaded yet</div>
        </div>
      )}
    </div>
  );
}

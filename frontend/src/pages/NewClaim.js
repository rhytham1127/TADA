import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { tadaAPI, uploadAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getDAForDesignation, DA_LABEL } from '../utils/daRules';
import './NewClaim.css';
import FlightPDFReader from '../components/FlightPDFReader';

const emptyExpense = (daAmount = 0) => ({
  expense_date: '', place_from: '', place_to: '', mode: '',
  fare: 0,
  accommodation: 0,
  conveyance: 0,
  da: daAmount,
  others: 0
});


export default function NewClaim() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const normalizedRole = (user?.role || '').toLowerCase().trim();

  useEffect(() => {
    // Only USER can create claims (admin/superadmin must be blocked)
    if (normalizedRole === 'admin' || normalizedRole === 'superadmin') {
      toast.error('Not authorized to create claims');
      navigate('/dashboard', { replace: true });
    }
  }, [normalizedRole, navigate]);

  const [loading, setLoading] = useState(false);

  if (!user) {
    return null;
  }


  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({
    purpose_of_travel: '', travel_from: '', travel_to: '',
    departure_date: '', return_date: '', remarks: ''
  });

  // Resolve DA rate from the logged-in user's designation
  const daRate = getDAForDesignation(user?.designation || '');
  const daLabel = DA_LABEL[daRate] || 'Other';

  const [expenses, setExpenses] = useState([emptyExpense(daRate)]);

  const dateToYMD = (d) => {
    if (!d) return '';
    const dd = new Date(d);
    if (Number.isNaN(dd.getTime())) return '';
    const y = dd.getFullYear();
    const m = String(dd.getMonth() + 1).padStart(2, '0');
    const day = String(dd.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const generateExpenseRowsForRange = (fromISO, toISO) => {
    const from = fromISO ? new Date(fromISO) : null;
    const to = toISO ? new Date(toISO) : null;
    if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];

    // normalize to midnight
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);

    if (to < from) return [];

    const rows = [];
    const cur = new Date(from);
    while (cur <= to) {
      rows.push({ ...emptyExpense(daRate), expense_date: dateToYMD(cur) });
      cur.setDate(cur.getDate() + 1);
    }
    return rows;
  };

  // Auto-generate expense rows when user selects From/To dates
  useEffect(() => {
    const { departure_date, return_date } = form;
    if (!departure_date || !return_date) return;

    const from = new Date(departure_date);
    const to = new Date(return_date);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return;

    const rows = generateExpenseRowsForRange(departure_date, return_date);
    if (rows.length === 0) return;

    setExpenses(rows);
  }, [form.departure_date, form.return_date]);


  // If DA resolves after mount, update existing rows' DA values
  useEffect(() => {
    if (!daRate) return;
    setExpenses(prev => prev.map(exp => ({ ...exp, da: daRate })));
  }, [daRate]);


  const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const calculateExpenseTotal = (exp) =>
    ['fare','accommodation','conveyance','da','others']
      .reduce((s, k) => s + (parseFloat(exp[k]) || 0), 0);


  const totalAmount = expenses.reduce((s, e) => s + calculateExpenseTotal(e), 0);

  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const setExpense = (index, key) => (e) => {
    const updated = [...expenses];
    updated[index] = { ...updated[index], [key]: e.target.value };
    setExpenses(updated);
  };

  const addExpenseRow = () => setExpenses([...expenses, emptyExpense(daRate)]);

  const removeExpenseRow = (index) => {
    if (expenses.length === 1) return toast.error('You must have at least one expense row');
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e) => {
    const maxSize = 10 * 1024 * 1024;
    const valid = Array.from(e.target.files || []).filter((f) => {
      if (f.size > maxSize) { toast.warn(`${f.name} exceeds 10MB`); return false; }
      return true;
    });
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index) => setFiles(files.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.purpose_of_travel || !form.travel_from || !form.travel_to || !form.departure_date || !form.return_date)
      return toast.error('Please fill in all required trip details');

    const from = new Date(form.departure_date);
    const to = new Date(form.return_date);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
      return toast.error('Invalid date range. Return date must be the same or after Departure date.');
    }

    // For this form: only Travel (fare+accom+conveyance), DA, and Others contribute to total
    const validExpenses = expenses.filter((exp) => exp.expense_date && calculateExpenseTotal(exp) > 0);


    if (validExpenses.length === 0) return toast.error('Please add at least one expense item');
    setLoading(true);
    try {
      const claimRes = await tadaAPI.createClaim({ ...form, expenses: validExpenses });
      const claimId = claimRes.data.claim.id;
      if (files.length > 0) await uploadAPI.uploadFiles(claimId, files);
      toast.success(`Claim ${claimRes.data.claim.claim_number} created successfully!`);
      navigate(`/claims/${claimId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-claim">
      <div className="page-header">
        <h2>New TADA Claim</h2>
        <p>Fill in your travel details, expenses, and upload supporting documents</p>
      </div>

      {/* ── DA Rate Info Banner ── */}
      <div className="da-info-banner">
        <span className="da-info-icon">ℹ️</span>
        <span>
          Your designation: <strong>{user?.designation || 'Not set'}</strong>
          &nbsp;|&nbsp; DA rate: <strong>{fmt(daRate)} / day</strong>
          &nbsp;<span className="da-category">({daLabel})</span>
        </span>
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── Flight PDF Reader ── */}
        <div className="claim-section">
          <div className="section-title">
            <span className="step-num">✈</span>Auto-Fill from Flight Ticket (Optional)
          </div>
          <div className="section-body" style={{ paddingBottom: 0 }}>
            <FlightPDFReader
              onDatesExtracted={({ departureDate, returnDate, flightInfo }) => {
                setForm(prev => ({
                  ...prev,
                  ...(departureDate ? { departure_date: departureDate } : {}),
                  ...(returnDate    ? { return_date: returnDate }       : {}),
                  ...(flightInfo?.fromCity && !prev.travel_from ? { travel_from: flightInfo.fromCity } : {}),
                  ...(flightInfo?.toCity   && !prev.travel_to   ? { travel_to:   flightInfo.toCity   } : {}),
                }));
              }}
            />
          </div>
        </div>

        {/* ── Section 1: Trip Details ── */}
        <div className="claim-section">
          <div className="section-title">
            <span className="step-num">1</span>Trip Details
          </div>
          <div className="section-body">
            <div className="form-group full-width">
              <label className="form-label">PURPOSE OF TRAVEL *</label>
              <textarea className="form-input" rows={3}
                placeholder="e.g. Client meeting, Conference, Site visit..."
                value={form.purpose_of_travel} onChange={setField('purpose_of_travel')} required />
            </div>
            <div className="form-group">
              <label className="form-label">TRAVEL FROM *</label>
              <input className="form-input" placeholder="City / Location"
                value={form.travel_from} onChange={setField('travel_from')} required />
            </div>
            <div className="form-group">
              <label className="form-label">TRAVEL TO *</label>
              <input className="form-input" placeholder="City / Location"
                value={form.travel_to} onChange={setField('travel_to')} required />
            </div>
            <div className="form-group">
              <label className="form-label">DEPARTURE DATE *</label>
              <input type="date" className="form-input"
                value={form.departure_date} onChange={setField('departure_date')} required />
            </div>
            <div className="form-group">
              <label className="form-label">RETURN DATE *</label>
              <input type="date" className="form-input"
                value={form.return_date} onChange={setField('return_date')} required />
            </div>
            <div className="form-group full-width">
              <label className="form-label">REMARKS</label>
              <textarea className="form-input" rows={3}
                placeholder="Any additional notes..."
                value={form.remarks} onChange={setField('remarks')} />
            </div>
          </div>
        </div>

        {/* ── Section 2: Expense Details ── */}
        <div className="claim-section">
          <div className="section-title">
            <span className="step-num">2</span>Expense Details
            <span className="da-note"> — DA pre-filled at {fmt(daRate)}/day for your designation</span>
          </div>
          <div className="expenses-table-wrap">
    <table className="expenses-table" aria-label="Expenses table">

              <thead>
                <tr>
                  <th>Date</th><th>From</th><th>To</th><th>Mode</th>
                  <th>Fare</th><th>Accom.</th><th>Conv.</th>
                  <th>DA <span className="da-badge">{fmt(daRate)}</span></th>
                  <th>Others</th>

                  <th>Total</th><th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="date"
                        className="form-input table-input"
                        value={expense.expense_date}
                        readOnly
                        required
                      />
                    </td>

                    <td><input type="text" className="form-input table-input" placeholder="From" value={expense.place_from} onChange={setExpense(idx,'place_from')} /></td>
                    <td><input type="text" className="form-input table-input" placeholder="To" value={expense.place_to} onChange={setExpense(idx,'place_to')} /></td>
                    <td>
                      <select className="form-input table-input" value={expense.mode} onChange={setExpense(idx,'mode')}>
                        <option value="">--</option>
                        <option>Air</option><option>Train</option><option>Bus</option><option>Car</option><option>Taxi</option>
                      </select>
                    </td>
                    {['fare','accommodation','conveyance'].map((key) => (
                      <td key={key}>
                        <input type="number" className="form-input table-input amount-inp"
                          value={expense[key]} onChange={setExpense(idx, key)} placeholder="0" step="0.01" min="0" />
                      </td>
                    ))}
                    {/* DA field — auto-filled and readonly */}
                    <td>
                      <input
                        type="number"
                        className="form-input table-input amount-inp da-input"
                        value={expense.da}
                        readOnly
                        step="0.01"
                        min="0"
                        title={`Default DA for your designation (${daLabel}): ₹${daRate}`}
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        className="form-input table-input amount-inp"
                        value={expense.others}
                        onChange={setExpense(idx, 'others')}
                        placeholder="0"
                        step="0.01"
                        min="0"
                      />
                    </td>

                    <td className="cell-total">{fmt(calculateExpenseTotal(expense))}</td>
                    <td><button type="button" className="del-row-btn" onClick={() => removeExpenseRow(idx)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="expenses-footer">
              {/* <button type="button" className="add-row-btn" onClick={addExpenseRow}>＋ Add Row</button> */}
              <div className="total-box">
                Grand Total <span className="grand-total">{fmt(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 3: Upload Documents ── */}
        <div className="claim-section">
          <div className="section-title">
            <span className="step-num">3</span>Upload Documents
          </div>
          <div className="upload-body">
            <div className="upload-area" onClick={() => document.getElementById('file-input').click()}>
              <div className="upload-icon">📎</div>
              <p>Click to upload bills, tickets &amp; receipts</p>
              <p className="upload-sub">PDF, JPG, PNG – max 10MB each</p>
              <input id="file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }} onChange={handleFileSelect} />
            </div>
            {files.length > 0 && (
              <div className="file-list">
                {files.map((f, i) => (
                  <div key={i} className="file-item">
                    <span className="file-icon">{f.name.endsWith('.pdf') ? '📄' : '🖼️'}</span>
                    <span className="file-name">{f.name}</span>
                    <span className="file-size">{(f.size / 1024).toFixed(1)} KB</span>
                    <button type="button" className="del-row-btn" onClick={() => removeFile(i)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Submit Bar ── */}
        <div className="submit-bar">
          <div className="submit-actions">
            <button type="button" className="btn-outline" onClick={() => navigate('/dashboard')}>Cancel</button>
            <button type="submit" className="btn-gold" disabled={loading}>
              {loading ? 'Submitting…' : '✓ Submit Claim'}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}

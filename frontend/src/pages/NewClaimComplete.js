import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { tadaAPI, uploadAPI } from '../utils/api';

const emptyExpense = () => ({
  expense_date: '',
  place_from: '',
  place_to: '',
  mode: '',
  fare: 0,
  accommodation: 0,
  conveyance: 0,
  da: 0,
  others: 0
});

export default function NewClaimComplete() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);

  const [form, setForm] = useState({
    purpose_of_travel: '',
    travel_from: '',
    travel_to: '',
    departure_date: '',
    return_date: '',
    remarks: ''
  });

  const [expenses, setExpenses] = useState([emptyExpense()]);

  const fmt = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const calculateExpenseTotal = (expense) => {
    const fare = parseFloat(expense.fare) || 0;
    const accommodation = parseFloat(expense.accommodation) || 0;
    const conveyance = parseFloat(expense.conveyance) || 0;
    const da = parseFloat(expense.da) || 0;
    const others = parseFloat(expense.others) || 0;
    return fare + accommodation + conveyance + da + others;
  };

  const totalAmount = useMemo(
    () => expenses.reduce((sum, exp) => sum + calculateExpenseTotal(exp), 0),
    [expenses]
  );

  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const setExpense = (index, key) => (e) => {
    const updated = [...expenses];
    updated[index] = { ...updated[index], [key]: e.target.value };
    setExpenses(updated);
  };

  const addExpenseRow = () => setExpenses((prev) => [...prev, emptyExpense()]);

  const removeExpenseRow = (index) => {
    if (expenses.length === 1) {
      toast.error('You must have at least one expense row');
      return;
    }
    setExpenses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles = selected.filter((f) => {
      if (f.size > maxSize) {
        toast.warn(`${f.name} exceeds 10MB and was skipped`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.purpose_of_travel || !form.travel_from || !form.travel_to || !form.departure_date || !form.return_date) {
      return toast.error('Please fill in all required trip details');
    }

    const validExpenses = expenses.filter(
      (exp) =>
        exp.expense_date &&
        calculateExpenseTotal(exp) > 0
    );

    if (validExpenses.length === 0) {
      return toast.error('Please add at least one expense item');
    }

    setLoading(true);
    try {
      const claimRes = await tadaAPI.createClaim({
        ...form,
        expenses: validExpenses
      });

      const claimId = claimRes.data?.claim?.id;
      if (!claimId) throw new Error('Claim id missing from response');

      if (files.length > 0) {
        await uploadAPI.uploadFiles(claimId, files);
      }

      toast.success(`Claim ${claimRes.data?.claim?.claim_number || ''} created successfully!`);
      navigate(`/claims/${claimId}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to create claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-claim">
      <div className="page-header">
        <div>
          <h2>New TADA Claim</h2>
          <p>Fill in your travel details, expenses, and upload supporting documents</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="claim-form">
        {/* Section 1: Trip Details */}
        <div className="claim-section">
          <div className="section-title">
            <span className="step-num">1</span>Trip Details
          </div>
          <div className="section-body">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Purpose of Travel *</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="e.g. Client meeting, Conference, Site visit..."
                value={form.purpose_of_travel}
                onChange={setField('purpose_of_travel')}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Travel From *</label>
              <input
                className="form-input"
                placeholder="City / Location"
                value={form.travel_from}
                onChange={setField('travel_from')}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Travel To *</label>
              <input
                className="form-input"
                placeholder="City / Location"
                value={form.travel_to}
                onChange={setField('travel_to')}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Departure Date *</label>
              <input
                type="date"
                className="form-input"
                value={form.departure_date}
                onChange={setField('departure_date')}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Return Date *</label>
              <input
                type="date"
                className="form-input"
                value={form.return_date}
                onChange={setField('return_date')}
                required
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Remarks</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Any additional notes..."
                value={form.remarks}
                onChange={setField('remarks')}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Expenses Table */}
        <div className="claim-section">
          <div className="section-title">
            <span className="step-num">2</span>Expense Details
          </div>

          <div className="section-body" style={{ gridColumn: '1/-1', overflow: 'auto' }}>
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Mode</th>
                  <th>Fare</th>
                  <th>Accom.</th>
                  <th>Conv.</th>
                  <th>DA</th>
                  <th>Others</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense, idx) => {
                  const expTotal = calculateExpenseTotal(expense);
                  return (
                    <tr key={idx} className="expense-row">
                      <td>
                        <input
                          type="date"
                          value={expense.expense_date}
                          onChange={setExpense(idx, 'expense_date')}
                          className="input-sm"
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={expense.place_from}
                          onChange={setExpense(idx, 'place_from')}
                          placeholder="From"
                          className="input-sm"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={expense.place_to}
                          onChange={setExpense(idx, 'place_to')}
                          placeholder="To"
                          className="input-sm"
                        />
                      </td>
                      <td>
                        <select
                          value={expense.mode}
                          onChange={setExpense(idx, 'mode')}
                          className="input-sm"
                        >
                          <option value="">--</option>
                          <option>Air</option>
                          <option>Train</option>
                          <option>Bus</option>
                          <option>Car</option>
                          <option>Taxi</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={expense.fare}
                          onChange={setExpense(idx, 'fare')}
                          placeholder="0"
                          className="input-sm input-num"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={expense.accommodation}
                          onChange={setExpense(idx, 'accommodation')}
                          placeholder="0"
                          className="input-sm input-num"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={expense.conveyance}
                          onChange={setExpense(idx, 'conveyance')}
                          placeholder="0"
                          className="input-sm input-num"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={expense.da}
                          onChange={setExpense(idx, 'da')}
                          placeholder="0"
                          className="input-sm input-num"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={expense.others}
                          onChange={setExpense(idx, 'others')}
                          placeholder="0"
                          className="input-sm input-num"
                        />
                      </td>
                      <td className="cell-total">{fmt(expTotal)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeExpenseRow(idx)}
                          className="btn-delete"
                          title="Remove row"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="table-footer">
              <button type="button" onClick={addExpenseRow} className="btn-add-row">
                ＋ Add Row
              </button>
              <div className="grand-total">
                <strong>Grand Total: {fmt(totalAmount)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: File Uploads */}
        <div className="claim-section">
          <div className="section-title">
            <span className="step-num">3</span>Supporting Documents
          </div>
          <div className="section-body" style={{ gridColumn: '1/-1' }}>
            <div className="upload-area">
              <label htmlFor="file-input" className="upload-label">
                <div className="upload-icon">📎</div>
                <div className="upload-text">
                  <strong>Click to select files or drag and drop</strong>
                  <p>PDF, JPG, PNG (Max 10MB each)</p>
                </div>
              </label>
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {files.length > 0 && (
              <div className="files-list">
                <h4>Selected Files ({files.length})</h4>
                {files.map((file, idx) => (
                  <div key={idx} className="file-item">
                    <span>📄 {file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="btn-delete"
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard')} className="btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-gold">
            {loading ? 'Submitting...' : '✓ Create Claim'}
          </button>
        </div>
      </form>
    </div>
  );
}


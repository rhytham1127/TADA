import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { bankAPI } from '../utils/api';
import './BankDetails.css';

export default function BankDetails() {
  const [form, setForm] = useState({
    account_holder_name: '',
    account_number: '',
    bank_name: '',
    branch_name: '',
    ifsc_code: '',
    account_type: 'savings',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchBankDetails();
  }, []);


  const fetchBankDetails = async () => {
    try {
      const res = await bankAPI.getBankDetails();
      if (res.data) {
        setForm(res.data);
        setSaved(true);
      }
    } catch (err) {
      // No bank details saved yet / ignore
    } finally {
      setFetching(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await bankAPI.saveBankDetails(form);
      toast.success('Bank details saved successfully!');
      setSaved(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save bank details');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--gray-400)' }}>Loading...</div>;
  }

  return (
    <div className="bank-page">
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <h2>Bank Details</h2>
          <p>Your bank account for TADA reimbursement</p>
        </div>
        {saved && <div className="saved-badge">✓ Details Saved</div>}
      </div>

      <div className="bank-layout">
        <div>
          <div className="card">
            <h3 style={{ fontSize: 20, color: 'var(--navy)', marginBottom: 24 }}>Account Information</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group">
                <label className="form-label">Account Holder Name *</label>
                <input
                  className="form-input"
                  placeholder="Full name as per bank records"
                  value={form.account_holder_name}
                  onChange={set('account_holder_name')}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Account Number *</label>
                  <input
                    className="form-input"
                    placeholder="Enter account number"
                    value={form.account_number}
                    onChange={set('account_number')}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Type *</label>
                  <select className="form-input" value={form.account_type} onChange={set('account_type')}>
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                    <option value="salary">Salary</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Bank Name *</label>
                <input
                  className="form-input"
                  placeholder="e.g. State Bank of India"
                  value={form.bank_name}
                  onChange={set('bank_name')}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Branch Name *</label>
                  <input
                    className="form-input"
                    placeholder="Branch location"
                    value={form.branch_name}
                    onChange={set('branch_name')}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">IFSC Code *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. SBIN0001234"
                    value={form.ifsc_code}
                    onChange={set('ifsc_code')}
                    required
                    style={{ textTransform: 'uppercase' }}
                    maxLength={11}
                  />
                </div>
              </div>

              <button type="submit" className="btn-gold" disabled={loading} style={{ marginTop: 8, justifyContent: 'center' }}>
                {loading ? 'Saving...' : saved ? '✓ Update Bank Details' : '✓ Save Bank Details'}
              </button>
            </form>
          </div>
        </div>

        <div className="bank-info-card">
          <div className="bank-info-icon">🏦</div>
          <h4>Why we need this?</h4>
          <p>Your bank details are used to process TADA (Travel and Daily Allowance) reimbursements directly to your account.</p>
          <ul>
            <li>◆ Secure & encrypted storage</li>
            <li>◆ Direct bank transfer</li>
            <li>◆ Processed within 7 working days</li>
            <li>◆ Update anytime</li>
          </ul>

          {saved && (
            <div className="bank-preview">
              <strong>Saved Account:</strong>
              <p>{form.account_holder_name}</p>
              <p>
                {form.bank_name} • {form.branch_name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


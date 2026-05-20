import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import './Auth.css';

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

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', designation: '', phone: '',
  });

  const [loading, setLoading] = useState(false);
  const [designations, setDesignations] = useState(FALLBACK_DESIGNATIONS);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    authAPI.getDesignations()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        // Use API data only if it returned actual rows
        setDesignations(data.length > 0 ? data : FALLBACK_DESIGNATIONS);
      })
      .catch(() => setDesignations(FALLBACK_DESIGNATIONS));
  }, []);



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (!form.designation) { toast.error('Please select a designation'); return; }


    setLoading(true);
    try {
      await register(form);

      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo">T</div>
          <h1>TADA Portal</h1>
          <p>Travel & Daily Allowance<br />Management System</p>
        </div>
        <div className="auth-features">
          <div className="feature-item"><span>✦</span> Submit travel expense claims</div>
          <div className="feature-item"><span>✦</span> Upload bills & tickets as PDF</div>
          <div className="feature-item"><span>✦</span> Auto-calculate total reimbursement</div>
          <div className="feature-item"><span>✦</span> Track claim status in real-time</div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card register-card">
          <h2>Create Account</h2>
          <p className="auth-subtitle">Fill in your details to register</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="John Doe" value={form.name} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input type="email" className="form-input" placeholder="your@company.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Designation *</label>
              <select className="form-input" value={form.designation} onChange={set('designation')} required>
                <option value="">-- Select Designation --</option>
                {designations.map((d) => (
                  <option key={d.id || d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" placeholder="+91 9876543210" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input type="password" className="form-input" placeholder="Min 6 characters" value={form.password} onChange={set('password')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input type="password" className="form-input" placeholder="Re-enter password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
            </div>



            <button type="submit" className="btn-gold auth-submit" disabled={loading || !captcha.captchaId}>

              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <p className="auth-switch">Already have an account? <Link to="/login">Sign in here</Link></p>
        </div>
      </div>
    </div>
  );
}

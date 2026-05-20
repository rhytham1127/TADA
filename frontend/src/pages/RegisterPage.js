import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ employee_id: '', name: '', email: '', password: '', confirm_password: '', designation: '', department: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form);
      toast.success('Registration successful! Welcome to TADA Portal.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0a2540 0%, #0d3060 50%, #1a1a2e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: 'white' }}>BISAG-N</div>
          <div style={{ color: 'var(--gold)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>TADA Portal</div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '2rem' }}>
          <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>Create your account</h2>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={submit}>
            <div className="form-row">
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)' }}>Employee ID *</label>
                <input name="employee_id" value={form.employee_id} onChange={handle} placeholder="EMP001" required
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white' }} />
              </div>
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)' }}>Full Name *</label>
                <input name="name" value={form.name} onChange={handle} placeholder="Nikhil Kasana" required
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white' }} />
              </div>
            </div>
            <div className="form-group">
              <label style={{ color: 'rgba(255,255,255,0.6)' }}>Email Address *</label>
              <input name="email" type="email" value={form.email} onChange={handle} placeholder="nikhil@bisag-n.gov.in" required
                style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white' }} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)' }}>Designation</label>
                <input name="designation" value={form.designation} onChange={handle} placeholder="Software Developer"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white' }} />
              </div>
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)' }}>Department</label>
                <input name="department" value={form.department} onChange={handle} placeholder="IT Division"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white' }} />
              </div>
            </div>
            <div className="form-group">
              <label style={{ color: 'rgba(255,255,255,0.6)' }}>Phone Number</label>
              <input name="phone" value={form.phone} onChange={handle} placeholder="+91 98765 43210"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white' }} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)' }}>Password *</label>
                <input name="password" type="password" value={form.password} onChange={handle} placeholder="Min 6 characters" required
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white' }} />
              </div>
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)' }}>Confirm Password *</label>
                <input name="confirm_password" type="password" value={form.confirm_password} onChange={handle} placeholder="Repeat password" required
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white' }} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.5rem' }}>
              {loading ? '⏳ Creating account...' : '✓ Register'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

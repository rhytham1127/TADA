import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg, #0a2540 0%, #0d3060 50%, #1a1a2e 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background pattern */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(245,166,35,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(26,86,219,0.1) 0%, transparent 40%)' }} />

      {/* Left panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', position: 'relative' }}>
        <div style={{ maxWidth: 440, width: '100%' }}>
          {/* Logo */}
          <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: '1rem 2rem', marginBottom: '1.5rem' }}>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: '2rem', color: 'white', letterSpacing: '-0.03em' }}>BISAG-N</div>
              <div style={{ color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>MeitY • Government of India</div>
            </div>
            <h1 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>TADA Portal</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem' }}>Travel Allowance & Daily Allowance Management</p>
          </div>

          {/* Form card */}
          <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '2rem' }}>
            <h2 style={{ color: 'white', fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.5rem' }}>Sign In to your account</h2>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={submit}>
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)' }}>Email Address</label>
                <input name="email" type="email" value={form.email} onChange={handle} placeholder="you@bisag-n.gov.in" required
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white' }} />
              </div>
              <div className="form-group">
                <label style={{ color: 'rgba(255,255,255,0.6)' }}>Password</label>
                <input name="password" type="password" value={form.password} onChange={handle} placeholder="••••••••" required
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'white' }} />
              </div>
              <button type="submit" disabled={loading} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                {loading ? '⏳ Signing in...' : '→ Sign In'}
              </button>
            </form>

            

            <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--gold)', fontWeight: 600 }}>Register here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

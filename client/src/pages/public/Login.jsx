import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/NotificationToast';
import { Activity, Mail, Lock, Eye, EyeOff, ArrowRight, User, Stethoscope, ShieldCheck, Sparkles } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (email, password) => {
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      addToast(`Welcome back, ${data.user.firstName}!`, 'success');
      const searchParams = new URLSearchParams(location.search);
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl && redirectUrl.startsWith('/')) {
        navigate(redirectUrl, { replace: true });
      } else {
        navigate(`/${data.user.role}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter both email and password.');
      return;
    }
    handleLogin(form.email, form.password);
  };

  const BETA_DEMO_ACCOUNTS = [
    {
      role: 'Patient',
      name: 'Rohan Verma',
      email: 'rohan@patient.demo',
      password: 'Patient@123456',
      icon: User,
      color: '#0284C7',
    },
    {
      role: 'Doctor',
      name: 'Dr. Priya Sharma',
      email: 'dr.priya@healthsync.demo',
      password: 'Doctor@123456',
      icon: Stethoscope,
      color: '#059669',
    },
    {
      role: 'Admin',
      name: 'Platform Admin',
      email: 'admin@healthsync.demo',
      password: 'Admin@123456',
      icon: ShieldCheck,
      color: '#7C3AED',
    },
  ];

  return (
    <div style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', background: '#F8FAFC' }}>
      <div className="animate-scaleIn" style={{ width: '100%', maxWidth: '440px' }}>
        
        {/* Simple Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '14px',
            background: 'linear-gradient(135deg, #0284C7, #0D9488)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
            boxShadow: '0 8px 20px rgba(2, 132, 199, 0.2)',
          }}>
            <Activity size={26} color="white" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 4px 0' }}>
            Sign In to HealthSync
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Enter your credentials to access your healthcare portal
          </p>
        </div>

        {/* Simple Clean Login Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          marginBottom: '20px',
        }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '40px', fontSize: '14px', borderRadius: '10px' }}
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password" style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: '40px', paddingRight: '40px', fontSize: '14px', borderRadius: '10px' }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px',
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                marginTop: '4px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#64748B', marginBottom: 0 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none' }}>
              Create one free →
            </Link>
          </p>
        </div>

        {/* 🧪 Clear Beta Testing Evaluation Box */}
        <div style={{
          background: '#F8FAFC',
          border: '1.5px dashed #CBD5E1',
          borderRadius: '14px',
          padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🧪 Beta Testing Phase — Quick Evaluation Access
              </span>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 700, background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: '4px' }}>
              Demo Mode Only
            </span>
          </div>

          <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.4 }}>
            For review and evaluator testing during this <strong>Beta Phase</strong>, tap any demo role below to autofill credentials and sign in instantly:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {BETA_DEMO_ACCOUNTS.map(({ role, name, email, password, icon: Icon, color }) => (
              <button
                key={role}
                type="button"
                id={`demo-login-${role.toLowerCase()}`}
                onClick={() => handleLogin(email, password)}
                disabled={loading}
                style={{
                  padding: '8px 6px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = color;
                  e.currentTarget.style.background = '#F0F9FF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
              >
                <Icon size={16} color={color} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>{role}</span>
                <span style={{ fontSize: '9px', color: '#64748B' }}>Touch to Test</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

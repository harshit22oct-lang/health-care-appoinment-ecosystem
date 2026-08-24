import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/NotificationToast';
import {
  Activity, Mail, Lock, Eye, EyeOff, ArrowRight,
  User, Stethoscope, ShieldCheck, Sparkles, CheckCircle2, AlertCircle, HelpCircle
} from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleToken = params.get('googleToken');
    const role = params.get('role') || 'patient';
    const name = params.get('name') || 'User';
    const oauthError = params.get('error');

    if (googleToken) {
      localStorage.setItem('hs_token', googleToken);
      addToast(`Signed in with Google as ${name}!`, 'success');
      window.location.href = `/${role}`;
    } else if (oauthError) {
      setError('Google Sign-In failed or was cancelled. Please try again.');
    }
  }, [location.search]);

  const handleGoogleSignIn = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'https://healthsync-api-yqrn.onrender.com';
    const cleanBackend = backendUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
    window.location.href = `${cleanBackend}/api/v1/auth/google/login`;
  };

  const handleLogin = async (email, password) => {
    setError('');
    setLoading(true);
    const cleanEmail = (email || '').trim().toLowerCase();
    try {
      const data = await login(cleanEmail, password);
      addToast(`Welcome back, ${data.user.firstName}!`, 'success');
      const searchParams = new URLSearchParams(location.search);
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl && redirectUrl.startsWith('/')) {
        navigate(redirectUrl, { replace: true });
      } else {
        navigate(`/${data.user.role}`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please check your credentials.');
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
      desc: 'Book slots, track health & view AI Rx',
      icon: User,
      color: '#0284C7',
      bgLight: '#E0F2FE',
    },
    {
      role: 'Doctor',
      name: 'Dr. Priya Sharma',
      email: 'dr.priya@healthsync.demo',
      password: 'Doctor@123456',
      desc: 'Live schedule queue, notes & Rx AI',
      icon: Stethoscope,
      color: '#059669',
      bgLight: '#ECFDF5',
    },
    {
      role: 'Admin',
      name: 'Platform Admin',
      email: 'admin@healthsync.demo',
      password: 'Admin@123456',
      desc: 'Manage staff, audit logs & queue metrics',
      icon: ShieldCheck,
      color: '#7C3AED',
      bgLight: '#F5F3FF',
    },
  ];

  return (
    <div style={{
      minHeight: 'calc(100vh - 70px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '36px 16px',
      background: 'radial-gradient(ellipse at top, #F0F9FF 0%, #F8FAFC 60%, #F1F5F9 100%)',
    }}>
      <div className="animate-scaleIn" style={{ width: '100%', maxWidth: '440px' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '16px',
            background: 'linear-gradient(135deg, #0284C7, #0D9488)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
            boxShadow: '0 10px 25px rgba(2, 132, 199, 0.25)',
          }}>
            <Activity size={28} color="white" strokeWidth={2.5} />
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '20px', background: '#FEF3C7', border: '1px solid #FDE047', marginBottom: '6px' }}>
            <Sparkles size={12} color="#92400E" />
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Secure Healthcare Access
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '2px 0 4px 0' }}>
            Sign In to HealthSync
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Enter your credentials to access your unified medical portal
          </p>
        </div>

        {/* Main Clean Form Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '20px',
          padding: '28px 24px',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)',
          marginBottom: '20px',
        }}>
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '18px',
            }}>
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  style={{
                    paddingLeft: '40px',
                    height: '46px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '1.5px solid #E2E8F0',
                    transition: 'all 0.15s ease',
                  }}
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" htmlFor="login-password" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', margin: 0 }}>
                  Password
                </label>
                <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 600, cursor: 'pointer' }} onClick={() => addToast('Please use any demo credential below to sign in instantly.', 'info')}>
                  Forgot password?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  style={{
                    paddingLeft: '40px',
                    paddingRight: '42px',
                    height: '46px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '1.5px solid #E2E8F0',
                    transition: 'all 0.15s ease',
                  }}
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
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '6px',
                  }}
                  title={showPw ? 'Hide password' : 'Show password'}
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
                marginTop: '6px',
                height: '46px',
                fontSize: '14px',
                fontWeight: 700,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Google 1-Click Sign-In */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 12px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            style={{
              width: '100%',
              height: '44px',
              background: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#1E293B',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.background = '#F8FAFC';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#64748B', marginBottom: 0 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none' }}>
              Create a free Patient Account →
            </Link>
          </p>
        </div>

        {/* 🧪 Beta Testing Instant Evaluation Logins */}
        <div style={{
          background: '#FFFFFF',
          border: '1.5px dashed #CBD5E1',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ⚡ Beta Testing Phase — 1-Click Evaluation
              </span>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 800, background: '#FEF3C7', color: '#92400E', padding: '2px 7px', borderRadius: '4px' }}>
              Touch to Sign In
            </span>
          </div>

          <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 12px 0', lineHeight: 1.4 }}>
            For review and evaluator testing during this <strong>Beta Phase</strong>, tap any demo role below to sign in instantly with seeded medical data:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {BETA_DEMO_ACCOUNTS.map(({ role, name, email, password, desc, icon: Icon, color, bgLight }) => (
              <button
                key={role}
                type="button"
                id={`demo-login-${role.toLowerCase()}`}
                onClick={() => handleLogin(email, password)}
                disabled={loading}
                style={{
                  padding: '10px 8px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = color;
                  e.currentTarget.style.background = bgLight;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: bgLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2px' }}>
                  <Icon size={16} color={color} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>{role}</span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: color }}>Instant Login</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

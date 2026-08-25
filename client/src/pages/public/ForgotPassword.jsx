import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.auth.forgotPassword({ email });
      setSubmitted(true);
    } catch (err) {
      // Show submitted anyway for security & fallback
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', background: '#F8FAFC' }}>
      <div style={{ width: '100%', maxWidth: '440px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '36px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748B', textDecoration: 'none', marginBottom: '24px', fontWeight: '500' }}>
          <ArrowLeft size={16} /> Back to Sign In
        </Link>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <CheckCircle size={32} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px 0' }}>
              Check your inbox
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              We sent a password reset link to <strong>{email}</strong>. Please check your inbox and spam folder.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
                Return to Sign In
              </Link>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                style={{ background: 'transparent', border: 'none', color: '#0284C7', fontSize: '13px', cursor: 'pointer', fontWeight: '600', padding: '6px' }}
              >
                Didn't receive email? Try again
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
                Reset your password
              </h1>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                Enter the email associated with your account, and we'll send you instructions to reset your password.
              </p>
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '8px', padding: '12px', color: '#991B1B', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', paddingLeft: '38px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '8px' }}
              >
                {loading ? <><Loader2 size={16} className="spin" /> Sending link...</> : 'Send Reset Link'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/NotificationToast';
import { Activity, User, Mail, Lock, Phone, ArrowRight } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'patient' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const data = await register(form);
      addToast(`Welcome to HealthSync, ${data.user.firstName}! 🎉`, 'success');
      navigate(`/${data.user.role}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const field = (id, label, type, placeholder, icon) => (
    <div className="form-group" key={id}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        {React.createElement(icon, { size: 16, style: { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' } })}
        <input
          id={id}
          type={type}
          className="form-input"
          style={{ paddingLeft: '42px' }}
          placeholder={placeholder}
          value={form[id] || ''}
          onChange={(e) => setForm({ ...form, [id]: e.target.value })}
          required={id !== 'phone'}
        />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)' }} className="gradient-hero">
      <div className="animate-scaleIn" style={{ width: '100%', maxWidth: '500px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-xl)', background: 'linear-gradient(135deg, var(--color-accent-emerald), var(--color-accent-teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)', boxShadow: 'var(--shadow-teal)' }}>
            <Activity size={32} color="white" />
          </div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 'var(--space-2)' }}>Create Your Account</h1>
          <p className="text-secondary text-sm">Join HealthSync for smarter healthcare</p>
        </div>

        <div className="card-glass" style={{ border: '1px solid var(--color-border)' }}>
          {error && <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Role selection */}
            <div className="form-group">
              <label className="form-label">I am a</label>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                {['patient', 'admin'].map((r) => (
                  <button key={r} type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    style={{
                      flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)',
                      border: '2px solid',
                      borderColor: form.role === r ? 'var(--color-accent-teal)' : 'var(--color-border)',
                      background: form.role === r ? 'rgba(20,184,166,0.1)' : 'transparent',
                      color: form.role === r ? 'var(--color-accent-teal)' : 'var(--color-text-secondary)',
                      cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)',
                      textTransform: 'capitalize', transition: 'all 0.2s',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              {field('firstName', 'First Name', 'text', 'John', User)}
              {field('lastName',  'Last Name',  'text', 'Doe',  User)}
            </div>
            {field('email',    'Email Address', 'email',    'your@email.com', Mail)}
            {field('phone',    'Phone Number',  'tel',      '+91 98765 43210', Phone)}
            {field('password', 'Password',      'password', 'Min 8 characters', Lock)}

            <button id="register-submit-btn" type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 'var(--space-2)', padding: 'var(--space-4)' }}>
              {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating account...</> : <>Create Account <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>

        <p className="text-secondary text-sm" style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-accent-teal)', fontWeight: 600 }}>Sign in →</Link>
        </p>
      </div>
    </div>
  );
}

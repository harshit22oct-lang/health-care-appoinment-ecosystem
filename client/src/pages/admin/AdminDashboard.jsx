import React, { useState, useEffect } from 'react';
import { Users, Activity, Bell, Shield, RotateCcw, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/NotificationToast';

const STATUS_BADGES = {
  QUEUED:     'badge-teal',
  PROCESSING: 'badge-sky',
  SENT:       'badge-green',
  FAILED:     'badge-amber',
  DEAD_LETTER:'badge-red',
};

export default function AdminDashboard() {
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState('');
  const [retrying, setRetrying] = useState(null);

  useEffect(() => {
    Promise.all([
      api.admin.stats(),
      api.admin.notificationQueue({ limit: 20 }),
    ]).then(([s, j]) => {
      setStats(s.data);
      setJobs(j.data.jobs || []);
    }).catch(() => addToast('Failed to load admin data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleRetry = async (jobId) => {
    setRetrying(jobId);
    try {
      await api.admin.retryJob(jobId);
      setJobs(prev => prev.map(j => j._id === jobId ? { ...j, status: 'QUEUED', attempts: 0 } : j));
      addToast('Job queued for immediate retry', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setRetrying(null);
    }
  };

  const filteredJobs = jobFilter ? jobs.filter(j => j.status === jobFilter) : jobs;

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-20)' }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">
            <Shield size={28} style={{ display: 'inline', marginRight: 10, color: 'var(--color-accent-violet)' }} />
            Platform Dashboard
          </h1>
          <p className="text-secondary">Real-time system health, metrics, and notification queue management</p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div style={{ marginBottom: 'var(--space-10)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>Platform Metrics</h2>
            <div className="grid-4 stagger">
              {[
                { label: 'Total Users',   value: stats.users.total,                color: 'var(--color-accent-teal)',    icon: Users },
                { label: 'Doctors',       value: stats.users.doctors,              color: 'var(--color-accent-emerald)', icon: Activity },
                { label: 'Appointments',  value: stats.appointments.total,         color: 'var(--color-accent-sky)',     icon: Activity },
                { label: 'Completed',     value: stats.appointments.completed,     color: 'var(--color-accent-violet)',  icon: Activity },
                { label: 'Confirmed',     value: stats.appointments.confirmed,     color: 'var(--color-accent-amber)',   icon: Bell },
                { label: 'Cancelled',     value: stats.appointments.cancelled,     color: 'var(--color-accent-red)',     icon: AlertTriangle },
                { label: 'Pending Emails',value: stats.notifications.pending,      color: 'var(--color-accent-sky)',     icon: Bell },
                { label: 'Dead Letters',  value: stats.notifications.deadLetter,   color: 'var(--color-accent-red)',     icon: AlertTriangle },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="stat-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                    <Icon size={16} color={color} />
                  </div>
                  <p className="stat-value" style={{ color, fontSize: 'var(--text-3xl)' }}>{value}</p>
                  <p className="stat-label">{label}</p>
                </div>
              ))}
            </div>

            {/* AI Circuit Breaker Status */}
            <div className="card" style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-xl)', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={24} color="var(--color-accent-violet)" />
              </div>
              <div>
                <p className="text-xs text-muted font-semibold">AI CIRCUIT BREAKER STATE</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 4 }}>
                  <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                    {stats.aiEngine?.circuitBreakerState || 'CLOSED'}
                  </p>
                  <span className={`badge ${stats.aiEngine?.circuitBreakerState === 'CLOSED' ? 'badge-green' : stats.aiEngine?.circuitBreakerState === 'OPEN' ? 'badge-red' : 'badge-amber'}`}>
                    {stats.aiEngine?.circuitBreakerState === 'CLOSED' ? 'Healthy' : stats.aiEngine?.circuitBreakerState === 'OPEN' ? 'Degraded' : 'Recovery'}
                  </span>
                </div>
                <p className="text-xs text-muted">LLM API resilience state · CLOSED = fully operational</p>
              </div>
            </div>
          </div>
        )}

        {/* Notification Queue */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
              <Bell size={18} style={{ display: 'inline', marginRight: 8, color: 'var(--color-accent-sky)' }} />
              Notification Queue
            </h2>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {['', 'QUEUED', 'FAILED', 'DEAD_LETTER', 'SENT'].map((s) => (
                <button key={s} className={`btn btn-sm ${jobFilter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setJobFilter(s)}>
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Type', 'Recipient', 'Subject', 'Status', 'Attempts', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: 'var(--space-3) var(--space-5)', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No jobs found</td>
                    </tr>
                  ) : filteredJobs.map((job) => (
                    <tr key={job._id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: 'var(--space-3) var(--space-5)' }}><span className="badge badge-slate" style={{ fontSize: 10 }}>{job.type?.replace(/_/g, ' ')}</span></td>
                      <td style={{ padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{job.recipientEmail}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', maxWidth: 200 }} className="truncate">{job.subject}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-5)' }}><span className={`badge ${STATUS_BADGES[job.status] || 'badge-slate'}`} style={{ fontSize: 10 }}>{job.status}</span></td>
                      <td style={{ padding: 'var(--space-3) var(--space-5)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{job.attempts}/{job.maxAttempts || 4}</td>
                      <td style={{ padding: 'var(--space-3) var(--space-5)' }}>
                        {['FAILED', 'DEAD_LETTER'].includes(job.status) && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleRetry(job._id)} disabled={retrying === job._id}>
                            {retrying === job._id ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <RotateCcw size={12} />}
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

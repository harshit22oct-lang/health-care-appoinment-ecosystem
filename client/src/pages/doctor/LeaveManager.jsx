import React, { useState } from 'react';
import { Calendar, AlertTriangle, ChevronLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/NotificationToast';
import { useNavigate } from 'react-router-dom';

export default function LeaveManager() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handlePreview = async () => {
    if (!form.startDate || !form.endDate) { addToast('Please select start and end dates', 'error'); return; }
    setPreviewLoading(true);
    try {
      const res = await api.doctors.previewLeave(user._id, form);
      setPreview(res.data);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const res = await api.doctors.applyLeave(user._id, form);
      setSuccess(res.data);
      addToast(`Leave applied. ${res.data.affectedAppointments} appointment(s) cancelled and patients notified.`, 'info');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="page"><div className="container-sm">
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <CheckCircle size={56} color="var(--color-accent-emerald)" style={{ margin: '0 auto var(--space-6)' }} />
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>Leave Applied</h2>
        <p className="text-secondary" style={{ marginBottom: 'var(--space-6)' }}>{success.message}</p>
        <button className="btn btn-primary" onClick={() => navigate('/doctor')}>Return to Schedule</button>
      </div>
    </div></div>
  );

  return (
    <div className="page">
      <div className="container-sm">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 'var(--space-6)' }}><ChevronLeft size={16} /> Back</button>

        <div className="page-header">
          <h1 className="page-title">
            <Calendar size={28} style={{ display: 'inline', marginRight: 10, color: 'var(--color-accent-amber)' }} />
            Apply for Leave
          </h1>
          <p className="text-secondary">Scheduled leave will automatically cancel conflicting appointments and notify patients with priority rescheduling links.</p>
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input type="date" className="form-input" value={form.startDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => { setForm({ ...form, startDate: e.target.value }); setPreview(null); }} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input type="date" className="form-input" value={form.endDate} min={form.startDate || new Date().toISOString().split('T')[0]} onChange={(e) => { setForm({ ...form, endDate: e.target.value }); setPreview(null); }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reason</label>
              <input className="form-input" placeholder="e.g. Medical conference, Personal leave" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>

            <button className="btn btn-secondary" onClick={handlePreview} disabled={previewLoading || !form.startDate || !form.endDate}>
              {previewLoading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Checking conflicts...</> : '🔍 Preview Conflicts'}
            </button>
          </div>
        </div>

        {/* Conflict Preview */}
        {preview && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', borderLeft: `4px solid ${preview.affectedCount > 0 ? 'var(--color-accent-amber)' : 'var(--color-accent-emerald)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              {preview.affectedCount > 0
                ? <AlertTriangle size={20} color="var(--color-accent-amber)" />
                : <CheckCircle size={20} color="var(--color-accent-emerald)" />}
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                {preview.affectedCount > 0
                  ? `${preview.affectedCount} Appointment${preview.affectedCount !== 1 ? 's' : ''} Will Be Cancelled`
                  : 'No Conflicts Found'}
              </h2>
            </div>

            {preview.affectedCount > 0 ? (
              <>
                <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-4)' }}>
                  The following appointments will be cancelled and patients will receive priority rescheduling emails:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
                  {preview.appointments.map((a) => (
                    <div key={a.id} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', padding: 'var(--space-3)', background: 'rgba(245,158,11,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <Calendar size={14} color="var(--color-accent-amber)" />
                      <span className="text-sm">{a.patient?.firstName} {a.patient?.lastName}</span>
                      <span className="text-xs text-muted">—</span>
                      <span className="text-xs text-muted">{new Date(a.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-secondary text-sm">No confirmed appointments in this date range. You can safely apply leave.</p>
            )}

            <button className="btn btn-primary" onClick={handleApply} disabled={loading}>
              {loading
                ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Applying leave...</>
                : `Confirm & Apply Leave${preview.affectedCount > 0 ? ` (Cancel ${preview.affectedCount} appointment${preview.affectedCount !== 1 ? 's' : ''})` : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pill, Clock, AlertTriangle, Brain, ChevronLeft, Calendar, User, CheckCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/NotificationToast';

const TIMING_LABELS = {
  before_food: 'Before meals',
  after_food:  'After meals',
  with_food:   'With meals',
  any:         'Any time',
};

const TIME_COLOR = (time) => {
  const h = parseInt(time?.split(':')?.[0] || '9', 10);
  if (h < 12) return 'var(--color-accent-amber)';
  if (h < 18) return 'var(--color-accent-sky)';
  return 'var(--color-accent-violet)';
};

export default function PrescriptionFollowUp() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.appointments.getById(id)
      .then((d) => setAppt(d.data))
      .catch(() => addToast('Failed to load prescription', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-20)' }}>
      <div className="spinner spinner-lg" />
    </div>
  );

  if (!appt) return (
    <div style={{ textAlign: 'center', padding: 'var(--space-20)' }}>
      <p className="text-secondary">Appointment not found.</p>
    </div>
  );

  const { prescription, postVisitAI, preVisitAI, clinicalNotes, diagnosis, doctorId, scheduledAt } = appt;
  const meds = prescription?.medications || [];

  return (
    <div className="page">
      <div className="container-sm">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 'var(--space-6)' }}>
          <ChevronLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">
            <Pill size={28} style={{ display: 'inline', marginRight: 10, color: 'var(--color-accent-teal)' }} />
            Prescription & Follow-up
          </h1>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
            <span className="text-secondary text-sm"><User size={13} style={{ display: 'inline' }} /> Dr. {doctorId?.firstName} {doctorId?.lastName}</span>
            <span className="text-secondary text-sm"><Calendar size={13} style={{ display: 'inline' }} /> {new Date(scheduledAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</span>
          </div>
        </div>

        {/* AI Summary */}
        {postVisitAI?.patientFriendlySummary && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', borderLeft: '4px solid var(--color-accent-teal)', background: 'rgba(20,184,166,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <Brain size={20} color="var(--color-accent-teal)" />
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>AI Health Summary</h2>
              {postVisitAI.status === 'COMPLETED' && <span className="badge badge-teal" style={{ fontSize: 10 }}>AI Generated</span>}
              {postVisitAI.status === 'PENDING_RETRY' && <span className="badge badge-amber" style={{ fontSize: 10 }}>Fallback Mode</span>}
            </div>
            <p className="text-secondary" style={{ lineHeight: 1.7 }}>{postVisitAI.patientFriendlySummary}</p>
            {postVisitAI.nextCheckupDeadline && (
              <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: 'rgba(20,184,166,0.1)', borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Calendar size={14} color="var(--color-accent-teal)" />
                <span className="text-sm" style={{ color: 'var(--color-accent-teal)', fontWeight: 600 }}>
                  Next checkup: {postVisitAI.nextCheckupDeadline}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Diagnosis */}
        {diagnosis && (
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Diagnosis</h2>
            <p className="text-secondary">{diagnosis}</p>
          </div>
        )}

        {/* Medication Timetable */}
        {postVisitAI?.medicationTimetable?.length > 0 && (
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
              <Clock size={18} style={{ display: 'inline', marginRight: 8, color: 'var(--color-accent-amber)' }} />
              Daily Medication Schedule
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {postVisitAI.medicationTimetable.map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                  <div style={{ width: 80, textAlign: 'center', flexShrink: 0 }}>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: TIME_COLOR(entry.time) }}>{entry.time}</p>
                  </div>
                  <div style={{ flex: 1, borderLeft: `2px solid ${TIME_COLOR(entry.time)}`, paddingLeft: 'var(--space-4)' }}>
                    {entry.medications?.map((med, j) => (
                      <div key={j} className="med-card" style={{ marginBottom: 'var(--space-2)' }}>
                        <div className="med-icon"><Pill size={18} color="var(--color-accent-teal)" /></div>
                        <p className="text-sm font-semibold">{med}</p>
                      </div>
                    ))}
                    {entry.instructions && (
                      <p className="text-xs text-muted" style={{ marginTop: 'var(--space-2)' }}>{entry.instructions}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medications List */}
        {meds.length > 0 && (
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
              <Pill size={18} style={{ display: 'inline', marginRight: 8, color: 'var(--color-accent-emerald)' }} />
              Prescribed Medications
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {meds.map((med, i) => (
                <div key={i} style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                    <div>
                      <p className="font-semibold">{med.name}</p>
                      <p style={{ color: 'var(--color-accent-teal)', fontSize: 'var(--text-lg)', fontWeight: 700 }}>{med.dosage}</p>
                    </div>
                    {med.durationDays && <span className="badge badge-slate">{med.durationDays} days</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                    <span className="text-xs text-muted">🔄 {med.frequency}</span>
                    <span className="text-xs text-muted">🍽️ {TIMING_LABELS[med.timing] || med.timing}</span>
                    {med.reminderTimes?.length > 0 && (
                      <span className="text-xs text-muted">⏰ {med.reminderTimes.join(', ')}</span>
                    )}
                  </div>
                  {med.specialInstructions && (
                    <p className="text-xs" style={{ marginTop: 'var(--space-2)', color: 'var(--color-accent-amber)' }}>⚠️ {med.specialInstructions}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {(postVisitAI?.warningFlags?.length > 0 || prescription?.warnings?.length > 0) && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', borderLeft: '4px solid var(--color-accent-red)', background: 'rgba(239,68,68,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <AlertTriangle size={18} color="var(--color-accent-red)" />
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Important Warnings</h2>
            </div>
            {[...(postVisitAI?.warningFlags || []), ...(prescription?.warnings || [])].map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius-md)' }}>
                <AlertTriangle size={14} color="var(--color-accent-amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                <p className="text-sm">{w}</p>
              </div>
            ))}
          </div>
        )}

        {/* Dietary restrictions */}
        {prescription?.dietaryRestrictions?.length > 0 && (
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Dietary Guidelines</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {prescription.dietaryRestrictions.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <CheckCircle size={14} color="var(--color-accent-emerald)" />
                  <p className="text-sm">{r}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

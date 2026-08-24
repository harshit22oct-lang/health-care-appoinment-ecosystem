import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle, XCircle, Activity, Pill, ChevronRight, User, Sparkles, MapPin, FileText, ArrowRight, ShieldCheck, Heart, AlertTriangle, Brain } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/NotificationToast';

const STATUS_CONFIG = {
  CONFIRMED:              { badge: 'badge-green',  label: 'Confirmed', color: 'var(--color-accent-emerald)' },
  COMPLETED:              { badge: 'badge-teal',   label: 'Completed', color: 'var(--color-accent-teal)' },
  CANCELLED_BY_PATIENT:   { badge: 'badge-red',    label: 'Cancelled', color: 'var(--color-accent-red)' },
  CANCELLED_BY_DOCTOR:    { badge: 'badge-red',    label: 'Cancelled', color: 'var(--color-accent-red)' },
  CANCELLED_DOCTOR_LEAVE: { badge: 'badge-amber',  label: 'Doctor On Leave · Rebook with Priority', color: 'var(--color-accent-amber)' },
  NEEDS_RESCHEDULE:       { badge: 'badge-amber',  label: 'Reschedule Needed', color: 'var(--color-accent-amber)' },
  IN_PROGRESS:            { badge: 'badge-sky',    label: 'In Consultation', color: 'var(--color-accent-sky)' },
  NO_SHOW:                { badge: 'badge-slate',  label: 'No Show',   color: 'var(--color-text-muted)' },
};

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.appointments.list()
      .then((d) => {
        const list = Array.isArray(d.data) ? d.data : d.data?.appointments || [];
        setAppointments(list);
      })
      .catch(() => addToast('Failed to load your appointments', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = appointments.filter((a) => ['CONFIRMED', 'IN_PROGRESS', 'CANCELLED_DOCTOR_LEAVE', 'NEEDS_RESCHEDULE'].includes(a.status));
  const completed = appointments.filter((a) => a.status === 'COMPLETED');
  const nextAppt = upcoming[0];
  const recentCompleted = completed[0];

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="page" style={{ paddingTop: 'var(--space-6)' }}>
      <div className="container">

        {/* 1. TOP GREETING */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <span className="badge badge-teal" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
            Patient Portal
          </span>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Good day, <span className="text-gradient-teal">{user?.firstName || 'Patient'}</span>
          </h1>
          <p className="text-secondary text-sm" style={{ marginTop: 'var(--space-1)' }}>
            Here is your active health overview, upcoming consultations, and clinical prescriptions.
          </p>
        </div>

        {/* 2. UPCOMING APPOINTMENT HERO CARD */}
        {nextAppt ? (
          <div
            className="card"
            style={{
              marginBottom: 'var(--space-8)',
              padding: 'var(--space-6) var(--space-8)',
              background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(14, 165, 233, 0.05) 100%)',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              borderRadius: 'var(--radius-2xl)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div
                  className="doctor-avatar"
                  style={{ width: 52, height: 52, fontSize: '20px', background: 'linear-gradient(135deg, var(--color-accent-teal), var(--color-accent-sky))' }}
                >
                  {nextAppt.doctorId?.firstName?.[0] || 'D'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                      Dr. {nextAppt.doctorId?.firstName} {nextAppt.doctorId?.lastName}
                    </h3>
                    <span className={`badge ${STATUS_CONFIG[nextAppt.status]?.badge || 'badge-green'}`}>
                      {STATUS_CONFIG[nextAppt.status]?.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted">Confirmed Outpatient Consultation</p>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p className="text-xs text-muted font-semibold">SCHEDULED TIME</p>
                <p style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  {formatDate(nextAppt.scheduledAt)}
                </p>
                <p className="text-xs text-teal font-semibold">
                  <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                  {formatTime(nextAppt.scheduledAt)}
                </p>
              </div>
            </div>

            {/* Symptoms summary */}
            {nextAppt.symptoms && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)' }}>
                <p className="text-xs text-muted font-semibold">Reported Chief Complaint:</p>
                <p className="text-xs text-secondary" style={{ marginTop: 2 }}>{nextAppt.symptoms}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <MapPin size={13} color="var(--color-accent-teal)" />
                <span className="text-xs text-muted">HealthSync Verified Medical Center</span>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {nextAppt.status === 'CANCELLED_DOCTOR_LEAVE' && (
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => navigate('/patient/doctors')}
                  >
                    Priority Rebook
                  </button>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/patient/prescription/${nextAppt._id}`)}
                >
                  View Details & AI Brief
                </button>
              </div>
            </div>
          </div>
        ) : !loading && (
          <div
            className="card"
            style={{
              marginBottom: 'var(--space-8)',
              padding: 'var(--space-6)',
              textAlign: 'center',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <Calendar size={36} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} />
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>No upcoming appointments scheduled</h3>
            <p className="text-secondary text-xs" style={{ marginTop: '2px', marginBottom: 'var(--space-4)' }}>
              Need care? Book a 30-minute consultation with verified specialists in your city.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/patient/doctors')}>
              Book an Appointment
            </button>
          </div>
        )}

        {/* 3. QUICK ACTIONS GRID */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
            <div
              className="card"
              style={{ padding: 'var(--space-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
              onClick={() => navigate('/patient/doctors')}
            >
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(20, 184, 166, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={18} color="var(--color-accent-teal)" />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Find a Doctor</h4>
                <p className="text-xs text-muted">Browse 12 demo & reference specialists</p>
              </div>
              <ChevronRight size={16} color="var(--color-text-muted)" />
            </div>

            <div
              className="card"
              style={{ padding: 'var(--space-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
              onClick={() => {
                if (recentCompleted) navigate(`/patient/prescription/${recentCompleted._id}`);
                else addToast('No past completed prescriptions found yet.', 'info');
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pill size={18} color="var(--color-accent-sky)" />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>My Prescriptions</h4>
                <p className="text-xs text-muted">Medication timetables & advice</p>
              </div>
              <ChevronRight size={16} color="var(--color-text-muted)" />
            </div>

            <div
              className="card"
              style={{ padding: 'var(--space-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
              onClick={() => navigate('/patient/doctors')}
            >
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} color="var(--color-accent-violet)" />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>AI Symptom Triage</h4>
                <p className="text-xs text-muted">Instant clinical matching</p>
              </div>
              <ChevronRight size={16} color="var(--color-text-muted)" />
            </div>
          </div>
        </div>

        {/* 4. RECENT CONSULTATION & AI DAILY WELLNESS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>

          {/* Recent Consultation Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Recent Consultation</h3>
              {recentCompleted && (
                <span className="badge badge-teal" style={{ fontSize: '10px' }}>✓ Completed</span>
              )}
            </div>

            {recentCompleted ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div className="doctor-avatar" style={{ width: 40, height: 40, fontSize: '14px', background: 'linear-gradient(135deg, var(--color-accent-red), var(--color-accent-sky))' }}>
                    {recentCompleted.doctorId?.firstName?.[0] || 'D'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                      Dr. {recentCompleted.doctorId?.firstName} {recentCompleted.doctorId?.lastName}
                    </h4>
                    <p className="text-xs text-muted">{formatDate(recentCompleted.scheduledAt)}</p>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
                  <p className="text-xs text-muted font-semibold">Diagnosis:</p>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-accent-teal)', marginTop: 2 }}>
                    {recentCompleted.diagnosis || 'Cardiovascular Evaluation'}
                  </p>
                  {recentCompleted.clinicalNotes && (
                    <p className="text-xs text-secondary" style={{ marginTop: 4, lineHeight: 1.5 }}>
                      {recentCompleted.clinicalNotes}
                    </p>
                  )}
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => navigate(`/patient/prescription/${recentCompleted._id}`)}
                >
                  <Pill size={14} /> Open Medication Schedule
                </button>
              </div>
            ) : (
              <p className="text-secondary text-xs">No completed consultations yet.</p>
            )}
          </div>

          {/* AI Concise Health Insight */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(20, 184, 166, 0.05) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <Brain size={18} color="var(--color-accent-violet)" />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>AI Clinical Wellness Insight</h3>
            </div>

            <p className="text-secondary text-xs" style={{ lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
              {recentCompleted?.postVisitAI?.patientFriendlySummary
                ? recentCompleted.postVisitAI.patientFriendlySummary.substring(0, 220) + '...'
                : 'Staying hydrated and maintaining regular 30-minute cardiovascular exercise improves heart rate variability and blood pressure regulation. Remember to complete your annual preventive health checkups.'}
            </p>

            <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <ShieldCheck size={14} color="var(--color-accent-teal)" />
                <span style={{ fontSize: '11px', fontWeight: 600 }}>Gemini 3.6 Flash Health Engine Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

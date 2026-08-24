import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Brain, User, Pill, ChevronLeft, Plus, Trash2, CheckCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/NotificationToast';

const URGENCY_CONFIG = {
  Low:      { badge: 'badge-green',  border: 'var(--color-accent-emerald)' },
  Medium:   { badge: 'badge-sky',    border: 'var(--color-accent-sky)' },
  High:     { badge: 'badge-amber',  border: 'var(--color-accent-amber)' },
  Critical: { badge: 'badge-red',    border: 'var(--color-accent-red)' },
};

const EMPTY_MED = { name: '', dosage: '', frequency: '', durationDays: 14, timing: 'after_food', specialInstructions: '' };

export default function ConsultationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState({ clinicalNotes: '', diagnosis: '' });
  const [vitals, setVitals] = useState({ bloodPressure: '', heartRate: '', temperature: '', oxygenSaturation: '', weight: '' });
  const [medications, setMedications] = useState([{ ...EMPTY_MED }]);
  const [warnings, setWarnings] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.appointments.getById(id)
      .then((d) => setAppt(d.data))
      .catch(() => addToast('Failed to load appointment', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const addMed = () => setMedications([...medications, { ...EMPTY_MED }]);
  const removeMed = (i) => setMedications(medications.filter((_, idx) => idx !== i));
  const updateMed = (i, field, val) => setMedications(medications.map((m, idx) => idx === i ? { ...m, [field]: val } : m));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.appointments.submitNotes(id, {
        ...notes,
        vitalSigns: vitals,
        prescription: {
          medications,
          followUpDays: 14,
          warnings: warnings ? warnings.split('\n').filter(Boolean) : [],
        },
      });
      setSubmitted(true);
      addToast('Clinical notes saved. AI prescription summary is being generated.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-20)' }}><div className="spinner spinner-lg" /></div>;
  if (!appt) return <div style={{ textAlign: 'center', padding: 'var(--space-20)' }}><p className="text-secondary">Appointment not found.</p></div>;

  const { preVisitAI, patientId } = appt;
  const urgencyConf = URGENCY_CONFIG[preVisitAI?.urgencyLevel] || URGENCY_CONFIG.Low;

  if (submitted) return (
    <div className="page"><div className="container-sm">
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
          <CheckCircle size={40} color="var(--color-accent-emerald)" />
        </div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>Consultation Complete</h2>
        <p className="text-secondary" style={{ marginBottom: 'var(--space-6)' }}>Clinical notes saved. AI is generating a patient-friendly prescription summary.</p>
        <button className="btn btn-primary" onClick={() => navigate('/doctor')}>Return to Schedule</button>
      </div>
    </div></div>
  );

  return (
    <div className="page">
      <div className="container-sm">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 'var(--space-6)' }}><ChevronLeft size={16} /> Back</button>

        <div className="page-header">
          <h1 className="page-title">Consultation</h1>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
            <span><User size={14} style={{ display: 'inline' }} /> {patientId?.firstName} {patientId?.lastName}</span>
            <span className="text-muted text-sm">{patientId?.email}</span>
          </div>
        </div>

        {/* AI Pre-visit Insights */}
        {preVisitAI?.chiefComplaint && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', borderLeft: `4px solid ${urgencyConf.border}`, background: 'rgba(139,92,246,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <Brain size={20} color="var(--color-accent-violet)" />
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>AI Pre-Visit Briefing</h2>
              <span className={`badge ${urgencyConf.badge}`}>{preVisitAI.urgencyLevel} Priority</span>
            </div>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <p className="text-xs text-muted font-semibold" style={{ marginBottom: 4 }}>CHIEF COMPLAINT</p>
              <p className="text-sm">{preVisitAI.chiefComplaint}</p>
            </div>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <p className="text-xs text-muted font-semibold" style={{ marginBottom: 8 }}>PATIENT'S SYMPTOMS</p>
              <p className="text-sm" style={{ padding: 'var(--space-3)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>{appt.symptoms}</p>
            </div>
            {preVisitAI.suggestedDoctorQuestions?.length > 0 && (
              <div>
                <p className="text-xs text-muted font-semibold" style={{ marginBottom: 8 }}>SUGGESTED QUESTIONS</p>
                {preVisitAI.suggestedDoctorQuestions.map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', padding: 'var(--space-3)', background: 'rgba(139,92,246,0.05)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-accent-violet)', minWidth: 20 }}>Q{i+1}</span>
                    <p className="text-sm">{q}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clinical Notes Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Vitals */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>Vital Signs</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
              {[
                ['bloodPressure', 'Blood Pressure', '120/80 mmHg'],
                ['heartRate', 'Heart Rate (bpm)', '72'],
                ['temperature', 'Temperature (°C)', '37.0'],
                ['oxygenSaturation', 'SpO2 (%)', '98'],
                ['weight', 'Weight (kg)', '70'],
              ].map(([key, label, placeholder]) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <input className="form-input" placeholder={placeholder} value={vitals[key]} onChange={(e) => setVitals({ ...vitals, [key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Notes */}
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>Clinical Notes & Diagnosis</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Diagnosis *</label>
                <input className="form-input" placeholder="e.g. Stable Angina Pectoris" value={notes.diagnosis} onChange={(e) => setNotes({ ...notes, diagnosis: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Clinical Notes *</label>
                <textarea className="form-input form-textarea" style={{ minHeight: 150 }} placeholder="Detailed clinical findings, examination notes, and recommendations..." value={notes.clinicalNotes} onChange={(e) => setNotes({ ...notes, clinicalNotes: e.target.value })} required />
              </div>
            </div>
          </div>

          {/* Prescription */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                <Pill size={18} style={{ display: 'inline', marginRight: 8, color: 'var(--color-accent-emerald)' }} />
                Prescription
              </h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addMed}><Plus size={14} /> Add Medication</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {medications.map((med, i) => (
                <div key={i} style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid var(--color-border)', position: 'relative' }}>
                  {medications.length > 1 && (
                    <button type="button" className="btn btn-danger btn-icon btn-sm" onClick={() => removeMed(i)} style={{ position: 'absolute', top: 12, right: 12 }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                    {[
                      ['name', 'Medication Name', 'e.g. Atorvastatin'],
                      ['dosage', 'Dosage', 'e.g. 40mg'],
                      ['frequency', 'Frequency', 'e.g. Once at bedtime'],
                      ['durationDays', 'Duration (days)', '30'],
                    ].map(([field, label, ph]) => (
                      <div key={field} className="form-group">
                        <label className="form-label">{label}</label>
                        <input className="form-input" placeholder={ph} type={field === 'durationDays' ? 'number' : 'text'} value={med[field]} onChange={(e) => updateMed(i, field, e.target.value)} required />
                      </div>
                    ))}
                    <div className="form-group">
                      <label className="form-label">Timing</label>
                      <select className="form-input form-select" value={med.timing} onChange={(e) => updateMed(i, 'timing', e.target.value)}>
                        <option value="before_food">Before meals</option>
                        <option value="after_food">After meals</option>
                        <option value="with_food">With meals</option>
                        <option value="any">Any time</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Special Instructions</label>
                      <input className="form-input" placeholder="Optional" value={med.specialInstructions} onChange={(e) => updateMed(i, 'specialInstructions', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group" style={{ marginTop: 'var(--space-5)' }}>
              <label className="form-label">Warnings & Special Instructions (one per line)</label>
              <textarea className="form-input form-textarea" style={{ minHeight: 80 }} placeholder="e.g. Seek emergency care if chest pain worsens..." value={warnings} onChange={(e) => setWarnings(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting
              ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Saving & Generating AI Summary...</>
              : <><CheckCircle size={20} /> Complete Consultation</>}
          </button>
        </form>
      </div>
    </div>
  );
}

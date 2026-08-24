import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, CheckCircle, Brain, AlertTriangle, Calendar, Loader2, ChevronLeft, Clock, MapPin, ShieldCheck, Download, Share2 } from 'lucide-react';
import SlotGrid from '../../components/slots/SlotGrid';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/NotificationToast';

const STEPS = ['Select Slot', 'Symptoms & Intake', 'AI Pre-Visit Triage', 'Confirmation'];

const URGENCY_CONFIG = {
  Low:      { cls: 'urgency-low',      badge: 'badge-green',  label: 'Low Priority' },
  Medium:   { cls: 'urgency-medium',   badge: 'badge-sky',    label: 'Moderate' },
  High:     { cls: 'urgency-high',     badge: 'badge-amber',  label: 'High Priority' },
  Critical: { cls: 'urgency-critical', badge: 'badge-red',    label: 'Critical / Urgent' },
};

export default function BookingFlow() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [step, setStep] = useState(0);
  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [holdToken, setHoldToken] = useState(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [holdCountdown, setHoldCountdown] = useState(300);

  const [symptoms, setSymptoms] = useState({
    symptoms: '',
    symptomDuration: '',
    severity: 'mild',
    previousConditions: '',
    currentMedications: '',
  });

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    api.doctors.getById(doctorId)
      .then((d) => {
        setDoctor(d.data);
        if (d.data.isBookable === false) {
          addToast('This doctor profile is a reference listing and cannot be booked directly.', 'error');
          navigate('/patient/doctors');
        }
      })
      .catch(() => addToast('Doctor not found', 'error'));
  }, [doctorId, navigate]);

  useEffect(() => {
    if (!doctorId || !selectedDate) return;
    setSlotsLoading(true);
    api.doctors.getSlots(doctorId, selectedDate)
      .then((d) => setSlots(d.data || []))
      .catch(() => addToast('Failed to load slots', 'error'))
      .finally(() => setSlotsLoading(false));
  }, [doctorId, selectedDate]);

  // 5-minute Hold countdown
  useEffect(() => {
    if (!holdExpiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((new Date(holdExpiresAt) - new Date()) / 1000));
      setHoldCountdown(remaining);
      if (remaining === 0 && step < 3) {
        addToast('Your 5-minute reservation hold has expired. Please select a slot again.', 'error');
        setHoldToken(null);
        setSelectedSlot(null);
        setStep(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt, step]);

  const handleSlotSelect = async (slot) => {
    if (holdToken && selectedSlot?._id !== slot._id) {
      try { await api.slots.release(selectedSlot._id); } catch {}
    }
    setLoading(true);
    try {
      const res = await api.slots.hold(slot._id);
      setSelectedSlot(slot);
      setHoldToken(res.data.holdToken);
      setHoldExpiresAt(res.data.expiresAt);
      addToast('Slot reserved! You have 5 minutes to complete your booking.', 'info');
      setStep(1);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSymptomSubmit = async (e) => {
    e.preventDefault();
    if (!holdToken) {
      addToast('Please select a slot first', 'error');
      setStep(0);
      return;
    }
    setLoading(true);
    try {
      setStep(2); // Show AI loading screen
      const res = await api.appointments.create({
        slotId: selectedSlot._id,
        holdToken,
        ...symptoms,
        previousConditions: symptoms.previousConditions ? symptoms.previousConditions.split(',').map(s => s.trim()) : [],
        currentMedications: symptoms.currentMedications ? symptoms.currentMedications.split(',').map(s => s.trim()) : [],
      });
      setAiAnalysis(res.data.preVisitAI);
      setConfirmedBooking(res.data);
      setTimeout(() => setStep(3), 900); // Smooth transition to confirmation
    } catch (err) {
      addToast(err.message, 'error');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const doctorName = doctor?.userId ? `Dr. ${doctor.userId.firstName} ${doctor.userId.lastName}` : 'Specialist';

  return (
    <div className="page" style={{ paddingTop: 'var(--space-6)' }}>
      <div className="container-sm">

        {/* Doctor Summary Header Card */}
        {doctor && (
          <div
            className="card"
            style={{
              marginBottom: 'var(--space-6)',
              padding: 'var(--space-4) var(--space-6)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                className="doctor-avatar"
                style={{ width: 48, height: 48, fontSize: '18px', background: 'linear-gradient(135deg, var(--color-accent-teal), var(--color-accent-sky))' }}
              >
                {doctor.userId?.firstName?.[0] || 'D'}
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>{doctorName}</h3>
                <p className="text-xs text-muted">
                  {doctor.specialization} · {doctor.hospitalAffiliation || doctor.city}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ textAlign: 'right' }}>
                <p className="text-xs text-muted">Consultation Fee</p>
                <p style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-accent-teal)' }}>
                  ₹{doctor.consultationFee}
                </p>
              </div>

              {holdExpiresAt && step > 0 && step < 3 && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: holdCountdown < 60 ? 'rgba(239,68,68,0.15)' : 'rgba(20,184,166,0.15)',
                    border: `1px solid ${holdCountdown < 60 ? 'var(--color-accent-red)' : 'var(--color-accent-teal)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: holdCountdown < 60 ? 'var(--color-accent-red)' : 'var(--color-accent-teal)',
                  }}
                >
                  <Clock size={13} />
                  <span>Slot Held: {formatCountdown(holdCountdown)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="step-indicator" style={{ marginBottom: 'var(--space-8)' }}>
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div className={`step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
                <div className="step-circle">{i < step ? '✓' : i + 1}</div>
                <span className="step-label">{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`step-line ${i < step ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* STEP 0: SLOT SELECTION */}
        {step === 0 && (
          <div className="animate-fadeIn card">
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>Select Date & Time</h3>
            <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-5)' }}>
              Choose an available 30-minute consultation window for your appointment.
            </p>

            <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
              <label className="form-label">Consultation Date</label>
              <input
                type="date"
                className="form-input"
                style={{ maxWidth: 220 }}
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {slotsLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                <div className="spinner spinner-lg" style={{ margin: '0 auto var(--space-3)' }} />
                <p className="text-secondary text-sm">Loading live calendar availability...</p>
              </div>
            ) : (
              <SlotGrid
                slots={slots}
                selectedSlot={selectedSlot}
                onSelectSlot={handleSlotSelect}
                loading={loading}
              />
            )}
          </div>
        )}

        {/* STEP 1: CLINICAL INTAKE FORM */}
        {step === 1 && (
          <form onSubmit={handleSymptomSubmit} className="animate-slideUp card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>Clinical Pre-Visit Intake</h3>
              <p className="text-xs text-muted">
                Describe what you are experiencing. Gemini AI will prepare a clinical pre-visit summary for Dr. {doctor?.userId?.lastName}.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Primary Symptoms *</label>
              <textarea
                id="symptoms-input"
                className="form-input form-textarea"
                style={{ minHeight: 110 }}
                placeholder="e.g. Mild chest discomfort after climbing stairs, feeling dizzy in the morning..."
                value={symptoms.symptoms}
                onChange={(e) => setSymptoms({ ...symptoms, symptoms: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <input
                  className="form-input"
                  placeholder="e.g. 3 days, 2 weeks"
                  value={symptoms.symptomDuration}
                  onChange={(e) => setSymptoms({ ...symptoms, symptomDuration: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Perceived Severity</label>
                <select
                  className="form-input form-select"
                  value={symptoms.severity}
                  onChange={(e) => setSymptoms({ ...symptoms, severity: e.target.value })}
                >
                  <option value="mild">Mild (Manageable discomfort)</option>
                  <option value="moderate">Moderate (Affecting daily routine)</option>
                  <option value="severe">Severe (Persistent or acute pain)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Existing Medical Conditions (comma-separated)</label>
              <input
                className="form-input"
                placeholder="e.g. Hypertension, Type-2 Diabetes, Asthma (or leave empty)"
                value={symptoms.previousConditions}
                onChange={(e) => setSymptoms({ ...symptoms, previousConditions: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Medications (comma-separated)</label>
              <input
                className="form-input"
                placeholder="e.g. Metformin 500mg, Amlodipine 5mg (or leave empty)"
                value={symptoms.currentMedications}
                onChange={(e) => setSymptoms({ ...symptoms, currentMedications: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(0)}>
                <ChevronLeft size={16} /> Back to Slots
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !symptoms.symptoms.trim()}
                style={{ flex: 1 }}
              >
                {loading ? 'Processing...' : <><Brain size={16} /> Analyse with AI & Confirm Booking</>}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: AI CLINICAL ENGINE LOADING */}
        {step === 2 && (
          <div className="card animate-scaleIn" style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto var(--space-6)' }}>
              <div className="spinner spinner-lg" style={{ position: 'absolute', inset: 0 }} />
              <Brain size={32} color="var(--color-accent-teal)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
            </div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Gemini AI Clinical Engine Running</h2>
            <p className="text-secondary text-sm" style={{ maxWidth: 400, marginInline: 'auto' }}>
              Synthesizing your symptoms, estimating triage urgency, and formulating structured clinical briefing notes for the doctor...
            </p>
          </div>
        )}

        {/* STEP 3: POLISHED CONFIRMATION SCREEN */}
        {step === 3 && (
          <div className="animate-slideUp" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

            {/* AI Analysis Summary Card */}
            {aiAnalysis && (
              <div
                className="card"
                style={{
                  padding: 'var(--space-6)',
                  borderLeft: `4px solid ${URGENCY_CONFIG[aiAnalysis.urgencyLevel]?.badge === 'badge-red' ? 'var(--color-accent-red)' : 'var(--color-accent-teal)'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Brain size={20} color="var(--color-accent-teal)" />
                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>AI Pre-Visit Clinical Briefing</h3>
                  </div>
                  <span className={`badge ${URGENCY_CONFIG[aiAnalysis.urgencyLevel]?.badge || 'badge-green'}`}>
                    {aiAnalysis.urgencyLevel} Priority
                  </span>
                </div>

                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <p className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Chief Complaint Formulated
                  </p>
                  <p className="text-sm" style={{ marginTop: 2, fontWeight: 600 }}>{aiAnalysis.chiefComplaint}</p>
                </div>

                {aiAnalysis.suggestedDoctorQuestions?.length > 0 && (
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <p className="text-xs text-muted font-semibold" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Recommended Questions To Ask Your Doctor
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {aiAnalysis.suggestedDoctorQuestions.map((q, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(255,255,255,0.03)',
                            fontSize: '12px',
                            display: 'flex',
                            gap: 'var(--space-2)',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: 'var(--color-accent-teal)' }}>Q{idx + 1}:</span>
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Official Confirmation Card */}
            <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '2px solid rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-4)',
                }}
              >
                <CheckCircle size={32} color="var(--color-accent-emerald)" />
              </div>

              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>Appointment Confirmed!</h2>
              <p className="text-secondary text-sm" style={{ marginTop: 'var(--space-1)', marginBottom: 'var(--space-6)' }}>
                Your appointment ID is <strong style={{ color: 'var(--color-text-primary)' }}>{confirmedBooking?._id || 'HS-74829'}</strong>. A confirmation has been added to your HealthSync records.
              </p>

              {/* Itinerary Details Box */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 'var(--space-5)',
                  textAlign: 'left',
                  marginBottom: 'var(--space-6)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-4)',
                }}
              >
                <div>
                  <p className="text-xs text-muted">Consulting Specialist</p>
                  <p className="text-sm font-bold" style={{ marginTop: 2 }}>{doctorName}</p>
                  <p className="text-xs text-secondary">{doctor?.specialization}</p>
                </div>

                <div>
                  <p className="text-xs text-muted">Date & Time</p>
                  <p className="text-sm font-bold" style={{ marginTop: 2 }}>
                    {selectedSlot ? new Date(selectedSlot.startTime).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) : selectedDate}
                  </p>
                  <p className="text-xs text-teal font-semibold">
                    {selectedSlot ? new Date(selectedSlot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '3:30 PM'}
                  </p>
                </div>

                <div style={{ gridColumn: '1/-1', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 'var(--space-3)' }}>
                  <p className="text-xs text-muted">Clinic / Center Location</p>
                  <p className="text-sm" style={{ marginTop: 2 }}>
                    📍 {doctor?.hospitalAffiliation || 'HealthSync Medical Hub'} · {doctor?.clinicAddress || doctor?.city}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => navigate('/patient')}>
                  Go to Patient Dashboard
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const title = `Consultation with ${doctorName}`;
                    const details = `Specialty: ${doctor?.specialization}\nLocation: ${doctor?.clinicAddress || doctor?.city}`;
                    const startIso = selectedSlot ? new Date(selectedSlot.startTime).toISOString().replace(/-|:|\.\d\d\d/g, '') : '';
                    const endIso = selectedSlot ? new Date(selectedSlot.endTime).toISOString().replace(/-|:|\.\d\d\d/g, '') : '';
                    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&dates=${startIso}/${endIso}`, '_blank');
                  }}
                >
                  <Calendar size={15} /> Add to Google Calendar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

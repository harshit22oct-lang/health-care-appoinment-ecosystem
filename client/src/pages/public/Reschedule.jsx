import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, AlertTriangle, CheckCircle, Brain, User, ArrowRight, ShieldCheck } from 'lucide-react';
import SlotGrid from '../../components/slots/SlotGrid';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/NotificationToast';

export default function Reschedule() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [holdToken, setHoldToken] = useState(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [completed, setCompleted] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('No reschedule token provided in the link.');
      setLoading(false);
      return;
    }

    api.appointments.verifyReschedule(token)
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        setError(err.message || 'Invalid or expired reschedule token.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!data?.appointment?.doctorId?._id || !selectedDate) return;
    const doctorId = data.appointment.doctorId._id;
    setSlotsLoading(true);
    api.doctors.getSlots(doctorId, selectedDate)
      .then((res) => setSlots(res.data || []))
      .catch(() => addToast('Failed to load slots for selected date.', 'error'))
      .finally(() => setSlotsLoading(false));
  }, [data, selectedDate]);

  const handleSlotSelect = async (slot) => {
    if (holdToken && selectedSlot?._id !== slot._id) {
      try { await api.slots.release(selectedSlot._id); } catch {}
    }
    try {
      const res = await api.slots.hold(slot._id);
      setSelectedSlot(slot);
      setHoldToken(res.data.holdToken);
      setHoldExpiresAt(res.data.expiresAt);
      addToast('Slot reserved for priority booking (5-minute hold).', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedSlot || !holdToken) {
      addToast('Please select an available slot first.', 'error');
      return;
    }

    setRescheduling(true);
    try {
      const res = await api.appointments.reschedule({
        token,
        newSlotId: selectedSlot._id,
        holdToken,
      });
      setCompleted(res.data);
      addToast('Appointment rescheduled successfully with priority confirmed!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="container-sm" style={{ textAlign: 'center', padding: 'var(--space-20)' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto var(--space-4)' }} />
          <p className="text-secondary">Verifying your priority reschedule pass...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="container-sm">
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)', borderLeft: '4px solid var(--color-accent-red)' }}>
            <AlertTriangle size={48} color="var(--color-accent-red)" style={{ margin: '0 auto var(--space-4)' }} />
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>Invalid or Expired Pass</h2>
            <p className="text-secondary" style={{ marginBottom: 'var(--space-6)' }}>{error}</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate('/patient/doctors')}>Browse All Doctors</button>
              <button className="btn btn-secondary" onClick={() => navigate('/login')}>Sign In to Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="page">
        <div className="container-sm">
          <div className="card animate-scaleIn" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.15)',
              border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto var(--space-6)'
            }}>
              <CheckCircle size={36} color="var(--color-accent-emerald)" />
            </div>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
              Appointment Rescheduled!
            </h2>
            <p className="text-secondary" style={{ marginBottom: 'var(--space-6)' }}>
              Your appointment has been booked for <strong>{new Date(completed.scheduledAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</strong>. A confirmation email has been dispatched.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/patient')}>
              Go to Patient Dashboard <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { appointment, doctorProfile } = data;
  const doctor = appointment?.doctorId;

  return (
    <div className="page">
      <div className="container-sm">
        {/* Priority Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(20,184,166,0.1))',
          border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-5) var(--space-6)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          gap: 'var(--space-4)',
          alignItems: 'center',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-lg)',
            background: 'var(--color-accent-amber)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0, color: 'var(--color-bg-primary)'
          }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <span className="badge badge-amber" style={{ fontSize: '10px', marginBottom: '4px' }}>Priority Access Granted</span>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Reschedule with Dr. {doctor?.firstName} {doctor?.lastName}</h3>
            <p className="text-secondary text-xs" style={{ marginTop: 2 }}>
              Original appointment cancelled due to doctor leave. Your clinical notes & symptoms have been preserved.
            </p>
          </div>
        </div>

        {/* Original Details */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
            Original Booking Details
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
            <div>
              <span className="text-muted">Doctor: </span>
              <span className="font-semibold">Dr. {doctor?.firstName} {doctor?.lastName} ({doctorProfile?.specialization || 'General'})</span>
            </div>
            <div>
              <span className="text-muted">Patient: </span>
              <span className="font-semibold">{appointment?.patientId?.firstName} {appointment?.patientId?.lastName}</span>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <span className="text-muted">Preserved Symptoms: </span>
              <span className="text-secondary">{appointment?.symptoms}</span>
            </div>
          </div>
        </div>

        {/* Slot Selector */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
            <Calendar size={18} style={{ display: 'inline', marginRight: 8, color: 'var(--color-accent-teal)' }} />
            Select Your New Date & Time
          </h2>

          <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="form-label">Choose Date</label>
            <input
              type="date"
              className="form-input"
              style={{ width: 'auto' }}
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {slotsLoading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
            </div>
          ) : (
            <SlotGrid
              slots={slots}
              onSelect={handleSlotSelect}
              selectedSlotId={selectedSlot?._id}
              holdExpiresAt={holdExpiresAt}
            />
          )}
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/patient/doctors')}>
            Choose Another Doctor
          </button>
          <button
            className="btn btn-primary btn-lg"
            disabled={!selectedSlot || rescheduling}
            onClick={handleConfirmReschedule}
          >
            {rescheduling ? (
              <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Confirming Reschedule...</>
            ) : (
              <>Confirm Priority Reschedule <CheckCircle size={18} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Clock, Check } from 'lucide-react';

const CIRCUMFERENCE = 2 * Math.PI * 14; // r=14

export default function SlotGrid({ slots, onSelect, onSelectSlot, selectedSlot, selectedSlotId, holdExpiresAt, loading }) {
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef(null);

  const handleSelect = onSelect || onSelectSlot;
  const currentSelectedId = selectedSlotId || selectedSlot?._id;

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (iso) => {
    if (!iso) return '09:00 AM';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getRemainingSeconds = () => {
    if (!holdExpiresAt) return 0;
    return Math.max(0, Math.floor((new Date(holdExpiresAt) - now) / 1000));
  };

  const remaining = getRemainingSeconds();
  const totalSeconds = 5 * 60;
  const progress = holdExpiresAt ? Math.max(0, remaining / totalSeconds) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const isSelected = (slot) => slot._id === currentSelectedId;

  const isClickable = (slot) =>
    !loading && (slot.status === 'AVAILABLE' || isSelected(slot) || !slot.status);

  if (!slots?.length) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: '#64748B', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
        <Clock size={36} style={{ margin: '0 auto var(--space-3)', opacity: 0.5, color: '#0284C7' }} />
        <p style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A' }}>No slots available for this date.</p>
        <p style={{ fontSize: '12px', marginTop: '4px' }}>Please pick another date from the selector above.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Hold countdown timer */}
      {holdExpiresAt && remaining > 0 && (
        <div className="hold-timer" style={{ marginBottom: 'var(--space-4)', background: '#FEF3C7', border: '1px solid #FCD34D', padding: '10px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', width: 32, height: 32 }}>
            <svg width="32" height="32" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="none" stroke="#FDE68A" strokeWidth="3" />
              <circle
                cx="16" cy="16" r="14" fill="none" stroke="#D97706" strokeWidth="3"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 16 16)"
              />
            </svg>
            <span style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 800, color: '#92400E'
            }}>
              {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
            </span>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '13px', color: '#92400E', margin: 0 }}>5-Minute Reservation Active</p>
            <p style={{ fontSize: '11px', color: '#B45309', margin: 0 }}>
              Complete intake in {Math.floor(remaining / 60)}m {String(remaining % 60).padStart(2, '0')}s to confirm your booking.
            </p>
          </div>
        </div>
      )}

      {/* Slot legend */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        {[
          { color: '#E0F2FE', border: '#38BDF8', text: '#0369A1', label: 'Available' },
          { color: '#0284C7', border: '#0284C7', text: '#FFFFFF', label: 'Selected' },
          { color: '#FEF3C7', border: '#FCD34D', text: '#B45309', label: 'Held' },
          { color: '#F1F5F9', border: '#E2E8F0', text: '#94A3B8', label: 'Booked' },
        ].map(({ color, border, text, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '16px', background: color, border: `1px solid ${border}`, borderRadius: '4px' }} />
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
        {slots.map((slot) => {
          const selected = isSelected(slot);
          const isHeld = slot.status === 'HELD' && !selected;
          const isBooked = slot.status === 'BOOKED' || slot.status === 'BLOCKED_LEAVE';

          let bg = '#F0F9FF';
          let border = '#BAE6FD';
          let color = '#0369A1';

          if (selected) {
            bg = '#0284C7';
            border = '#0284C7';
            color = '#FFFFFF';
          } else if (isHeld) {
            bg = '#FEF3C7';
            border = '#FCD34D';
            color = '#92400E';
          } else if (isBooked) {
            bg = '#F1F5F9';
            border = '#E2E8F0';
            color = '#94A3B8';
          }

          return (
            <button
              key={slot._id}
              id={`slot-${slot._id}`}
              type="button"
              onClick={() => handleSelect && handleSelect(slot)}
              disabled={!isClickable(slot)}
              style={{
                background: bg,
                border: `1.5px solid ${border}`,
                color: color,
                padding: '10px 8px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isClickable(slot) ? 'pointer' : 'not-allowed',
                transition: 'all 0.18s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: selected ? '0 4px 12px rgba(2,132,199,0.3)' : 'none',
                transform: selected ? 'scale(1.02)' : 'none',
              }}
              title={slot.status === 'BLOCKED_LEAVE' ? 'Doctor is on leave' : ''}
            >
              {selected && <Check size={13} />}
              <span>{formatTime(slot.startTime)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

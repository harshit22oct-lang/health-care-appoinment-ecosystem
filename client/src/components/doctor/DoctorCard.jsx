import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Languages, Clock, Award, ShieldCheck, Info, X, Phone, Building2 } from 'lucide-react';

const DOCTOR_AVATARS = [
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1594824813627-ef3d76e73c38?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80',
];

export default function DoctorCard({ doctor }) {
  const navigate = useNavigate();
  const [showRefModal, setShowRefModal] = useState(false);

  const user = doctor.userId;
  let name = 'Medical Specialist';
  if (user) {
    const raw = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    if (raw.startsWith('Dr.') || raw.startsWith('Department') || raw.startsWith('AIIMS') || raw.startsWith('Bansal') || raw.startsWith('Chirayu') || raw.startsWith('City') || raw.includes('Hospital') || raw.includes('Institute')) {
      name = raw;
    } else {
      name = `Dr. ${raw}`;
    }
  }

  const isBookable = doctor.isBookable !== false && doctor.doctorType !== 'REFERENCE';
  const isReference = !isBookable;

  // Stable avatar index based on doctor ID
  const avatarIdx = Math.abs((doctor._id || '0').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % DOCTOR_AVATARS.length;
  const avatarUrl = doctor.imageUrl || DOCTOR_AVATARS[avatarIdx];

  const handleCardClick = () => {
    if (isBookable) {
      navigate(`/patient/book/${user?._id || doctor._id}`);
    } else {
      setShowRefModal(true);
    }
  };

  return (
    <>
      <div
        id={`doctor-card-${doctor._id}`}
        className={`doctor-card ${isReference ? 'doctor-card-reference' : ''}`}
        onClick={handleCardClick}
      >
        {/* Doctor Photo Section (Apollo Style) */}
        <div className="doctor-photo-container">
          {!name.startsWith('Department') && !name.includes('Hospital') && !name.includes('Institute') ? (
            <img
              src={avatarUrl}
              alt={name}
              className="doctor-photo-img"
              loading="lazy"
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #005E83, #0284C7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: 'var(--space-4)', textAlign: 'center' }}>
              <Building2 size={44} style={{ marginBottom: '6px', opacity: 0.9 }} />
              <p style={{ fontSize: '13px', fontWeight: 800 }}>{doctor.hospitalAffiliation || 'Public Medical Institute'}</p>
              <span className="badge badge-slate" style={{ marginTop: '6px', fontSize: '10px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}>
                Verified OPD Center
              </span>
            </div>
          )}

          {/* Rating Badge at top right */}
          <div
            style={{
              position: 'absolute', top: 12, right: 12,
              background: '#FFFFFF', padding: '3px 8px',
              borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: 4,
              boxShadow: 'var(--shadow-sm)', fontSize: '11px', fontWeight: 700, color: '#0F172A'
            }}
          >
            <Star size={12} fill="#F59E0B" color="#F59E0B" />
            <span>{doctor.averageRating?.toFixed(1) || '4.8'}</span>
            <span style={{ color: '#64748B', fontWeight: 500 }}>({doctor.totalReviews || 120})</span>
          </div>

          {/* Type Badge at top left */}
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            {isBookable ? (
              <span className="badge badge-teal" style={{ fontSize: '10px', boxShadow: 'var(--shadow-sm)' }}>
                <ShieldCheck size={11} /> Verified · Bookable
              </span>
            ) : (
              <span className="badge badge-slate" style={{ fontSize: '10px', background: '#FFFFFF', color: '#475569', boxShadow: 'var(--shadow-sm)' }}>
                <Info size={11} /> Directory Listing
              </span>
            )}
          </div>
        </div>

        {/* Doctor Details Body */}
        <div className="doctor-card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: '4px' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>
              {name}
            </h3>
          </div>

          <p style={{ fontSize: '12px', fontWeight: 700, color: '#0284C7', marginBottom: '4px' }}>
            {doctor.specialization}
          </p>

          <p className="text-secondary text-xs" style={{ marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
            <Award size={12} style={{ display: 'inline', marginRight: 4, color: '#0284C7' }} />
            {doctor.yearsOfExperience} Years Exp · {doctor.hospitalAffiliation || doctor.clinicAddress || doctor.city}
          </p>

          {doctor.bio && (
            <p
              className="text-secondary text-xs"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.5,
                marginBottom: 'var(--space-3)',
                color: '#64748B',
              }}
            >
              {doctor.bio}
            </p>
          )}

          {/* Bottom Card Footer */}
          <div style={{ marginTop: 'auto', paddingTop: 'var(--space-3)', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p className="text-muted" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Consultation Fee</p>
              <p style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                ₹{doctor.consultationFee}
              </p>
            </div>

            {isBookable ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={(e) => { e.stopPropagation(); navigate(`/patient/book/${user?._id || doctor._id}`); }}
                style={{ padding: '6px 14px' }}
              >
                Book Consultation
              </button>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                onClick={(e) => { e.stopPropagation(); setShowRefModal(true); }}
                style={{ padding: '6px 14px', border: '1px solid #CBD5E1' }}
              >
                View Clinic Info
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reference Doctor Informational Modal */}
      {showRefModal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999, padding: 'var(--space-4)',
          }}
          onClick={() => setShowRefModal(false)}
        >
          <div
            className="animate-scaleIn"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 'var(--radius-2xl)',
              padding: 'var(--space-8)',
              maxWidth: 520, width: '100%',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <span className="badge badge-slate" style={{ fontSize: '11px' }}>
                Sourced Public Healthcare Directory
              </span>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowRefModal(false)}>
                <X size={18} />
              </button>
            </div>

            <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
              {name}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#0284C7', marginBottom: 'var(--space-3)' }}>
              {doctor.specialization} · {doctor.hospitalAffiliation}
            </p>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <MapPin size={15} color="#0284C7" />
                <span className="text-xs text-secondary"><strong>Location:</strong> {doctor.clinicAddress || doctor.city}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Clock size={15} color="#0284C7" />
                <span className="text-xs text-secondary"><strong>OPD Timings:</strong> {doctor.timings || '10:00 AM - 05:00 PM'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Phone size={15} color="#0284C7" />
                <span className="text-xs text-secondary"><strong>Hospital Helpline:</strong> {doctor.phone || '+91 755 408 6000'}</span>
              </div>
            </div>

            <p className="text-secondary text-xs" style={{ lineHeight: 1.6, marginBottom: 'var(--space-6)' }}>
              {doctor.bio}
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
                onClick={() => setShowRefModal(false)}
              >
                Close
              </button>
              <button
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
                onClick={() => { setShowRefModal(false); navigate('/patient/doctors'); }}
              >
                Browse Bookable Specialists
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

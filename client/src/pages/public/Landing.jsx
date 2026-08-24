import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity, Shield, Brain, Calendar, Clock, ChevronRight, Star,
  Zap, Lock, Bell, MapPin, Search, Sparkles, CheckCircle2, Phone,
  Award, Heart, Stethoscope, Building2, UserCheck, ArrowRight, FileText, FlaskConical, Check
} from 'lucide-react';
import { POPULAR_CITIES, setStoredCity, getStoredCity } from '../../components/common/LocationSelector';
import { useToast } from '../../components/ui/NotificationToast';

const REAL_DOCTORS_PREVIEW = [
  {
    name: 'Dr. Vipul Worah',
    specialty: 'Gastroenterology & Hepatology',
    experience: '26+ Years Experience',
    hospital: 'Apollo Hospitals & Medical Center',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
    rating: 4.9,
    fee: '₹800',
    isBookable: true,
  },
  {
    name: 'Dr. Shravan Bohra',
    specialty: 'Gastroenterology & Liver Care',
    experience: '25+ Years Experience',
    hospital: 'Apollo Hospitals & Research Institute',
    image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80',
    rating: 4.95,
    fee: '₹900',
    isBookable: true,
  },
  {
    name: 'Dr. Surabhi Dogra Jani',
    specialty: 'Gastroenterology & Clinical Nutrition',
    experience: '12+ Years Experience',
    hospital: 'Apollo Multi-Specialty Clinic',
    image: 'https://images.unsplash.com/photo-1594824813627-ef3d76e73c38?w=400&auto=format&fit=crop&q=80',
    rating: 4.85,
    fee: '₹750',
    isBookable: true,
  },
  {
    name: 'Dr. Chirag Desai',
    specialty: 'Surgical Gastroenterology & GI Oncology',
    experience: '19+ Years Experience',
    hospital: 'Apollo Hospital & Cancer Center',
    image: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&auto=format&fit=crop&q=80',
    rating: 4.9,
    fee: '₹1000',
    isBookable: true,
  },
];

const CORE_SPECIALTIES = [
  { id: 'Cardiology', label: 'Cardiology', icon: '❤️', desc: 'Heart care, ECG, bypass & angioplasty' },
  { id: 'Dentistry', label: 'Dentistry', icon: '🦷', desc: 'Root canal, implants, teeth scaling & braces' },
  { id: 'Neurology', label: 'Neurology', icon: '🧠', desc: 'Headache, stroke, brain & spine care' },
  { id: 'Dermatology', label: 'Dermatology', icon: '🧴', desc: 'Skin allergies, acne, hair & laser' },
  { id: 'Orthopaedics', label: 'Orthopaedics', icon: '🦴', desc: 'Joint replacement, fracture & spine' },
  { id: 'General Medicine', label: 'General Medicine', icon: '👨‍⚕️', desc: 'Fever, diabetes, BP & OPD consultations' },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [selectedCity, setSelectedCity] = useState(getStoredCity() || 'Bhopal');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      navigate('/patient/doctors');
      return;
    }
    const qLower = q.toLowerCase();
    let detected = '';
    if (qLower.includes('bhopal') || qLower.includes('bpl')) detected = 'Bhopal';
    else if (qLower.includes('indore') || qLower.includes('ind')) detected = 'Indore';
    else if (qLower.includes('bangalore') || qLower.includes('banglore') || qLower.includes('bengaluru') || qLower.includes('bengalore') || qLower.includes('blr')) detected = 'Bengaluru';
    else if (qLower.includes('mumbai') || qLower.includes('bombay') || qLower.includes('bom')) detected = 'Mumbai';
    else if (qLower.includes('delhi') || qLower.includes('noida') || qLower.includes('gurgaon') || qLower.includes('gurugram') || qLower.includes('ncr')) detected = 'Delhi';
    else if (qLower.includes('pune')) detected = 'Pune';
    else if (qLower.includes('hyderabad') || qLower.includes('hyd') || qLower.includes('secunderabad')) detected = 'Hyderabad';
    else if (qLower.includes('chennai') || qLower.includes('madras')) detected = 'Chennai';
    else if (qLower.includes('ahmedabad') || qLower.includes('amd')) detected = 'Ahmedabad';
    else if (qLower.includes('jaipur')) detected = 'Jaipur';
    else if (qLower.includes('kolkata') || qLower.includes('calcutta')) detected = 'Kolkata';
    else if (qLower.includes('lucknow')) detected = 'Lucknow';
    else if (qLower.includes('chandigarh')) detected = 'Chandigarh';

    if (detected) {
      setSelectedCity(detected);
      setStoredCity(detected);
    }
    navigate(`/patient/doctors?q=${encodeURIComponent(q)}&ai=true`);
  };

  const handleCitySelect = (c) => {
    setSelectedCity(c);
    setStoredCity(c);
    navigate('/patient/doctors');
  };

  const handleSpecialtyClick = (specId) => {
    navigate(`/patient/doctors?specialization=${encodeURIComponent(specId)}`);
  };

  const handleQuickDemoLogin = async (email, password) => {
    try {
      const data = await login(email, password);
      addToast(`Welcome to HealthSync, ${data.user.firstName}!`, 'success');
      navigate(`/${data.user.role}`, { replace: true });
    } catch (err) {
      navigate('/login');
    }
  };

  const userDashboardRoute = user?.role === 'doctor' ? '/doctor' : user?.role === 'admin' ? '/admin' : '/patient';

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100vh' }}>

      {/* ── 1. CLEAN SILICON VALLEY HERO BANNER ── */}
      <section className="apollo-hero-banner" style={{ position: 'relative', overflow: 'hidden', padding: '48px 0 56px 0' }}>
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '44px', alignItems: 'center' }}>

            {/* Left Hero Details */}
            <div>
              {/* Beta Pill & 24/7 Helpline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 12px', borderRadius: '20px',
                  background: 'rgba(254, 240, 138, 0.2)', border: '1px solid #FDE047',
                  color: '#FEF08A', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em'
                }}>
                  <FlaskConical size={13} color="#FDE047" />
                  <span>Beta Testing Phase · Healthcare Platform v1.2</span>
                </div>

                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 12px', borderRadius: '20px',
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                  color: '#FFFFFF', fontSize: '11px', fontWeight: 700
                }}>
                  <Phone size={12} color="#FDE047" />
                  <span>24/7 Helpline: 1800-419-7979</span>
                </div>
              </div>

              <h1 className="hero-title" style={{ fontSize: '36px', lineHeight: 1.2, margin: '0 0 14px 0' }}>
                Book Verified Doctor Appointments & Clinical AI in <span style={{ color: '#FDE047' }}>{selectedCity}</span>
              </h1>

              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.92)', lineHeight: 1.5, margin: '0 0 24px 0' }}>
                Connect with board-certified doctors and top hospital departments across {selectedCity}. Instant 5-minute reservation holds with Gemini AI pre-visit intake briefs.
              </p>

              {/* Direct Deep AI Search Bar */}
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '24px', maxWidth: '560px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Sparkles size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#0284C7' }} />
                  <input
                    className="form-input"
                    style={{
                      paddingLeft: '42px',
                      height: '48px',
                      fontSize: '13px',
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#0F172A',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    }}
                    placeholder="✨ Ask AI: 'animal doc in bangalore', 'cardiologist in indore', 'skin rash in bhopal'..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-amber"
                  style={{
                    height: '48px',
                    padding: '0 20px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Search AI</span>
                  <ArrowRight size={15} />
                </button>
              </form>

              {/* Trust Badges */}
              <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                {[
                  'Zero Overbooking',
                  '5-Minute Slot Hold',
                  'Jan Aushadhi Generic Prices',
                  'Gemini AI Clinical Triage'
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={15} color="#FDE047" strokeWidth={2.5} />
                    <span style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 600 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Hero: Dedicated Healthcare Portal Login & Access System */}
            <div>
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
                  border: '1px solid #E2E8F0',
                  color: '#0F172A',
                }}
              >
                {user ? (
                  /* ── Logged In State: Portal Launcher ── */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)' }} />
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Active Portal Session
                        </span>
                      </div>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                        background: user.role === 'doctor' ? '#ECFDF5' : user.role === 'admin' ? '#F5F3FF' : '#E0F2FE',
                        color: user.role === 'doctor' ? '#059669' : user.role === 'admin' ? '#7C3AED' : '#0284C7',
                      }}>
                        {user.role.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', padding: '12px', background: '#F8FAFC', borderRadius: '12px' }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0284C7, #0D9488)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#FFFFFF', fontSize: '16px', fontWeight: 800
                      }}>
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                          {user.firstName} {user.lastName}
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => navigate(userDashboardRoute)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginBottom: '10px',
                      }}
                    >
                      <span>Open {user.role === 'doctor' ? 'Doctor Clinical Portal' : user.role === 'admin' ? 'Admin Dashboard' : 'Patient Portal'}</span>
                      <ArrowRight size={16} />
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate('/patient/doctors')}
                        style={{ padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, border: '1px solid #CBD5E1' }}
                      >
                        Browse Doctors
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate('/login')}
                        style={{ padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, border: '1px solid #CBD5E1' }}
                      >
                        Switch Account
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Logged Out State: Clean Portal Access & Quick Sign In ── */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Lock size={14} color="#0284C7" />
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          HealthSync Portal Sign In
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 800, background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: '4px' }}>
                        Beta Access
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                      Sign in to manage appointments, view clinical prescriptions, or access provider schedules.
                    </p>

                    {/* Standard Sign In & Register Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => navigate('/login')}
                        style={{
                          width: '100%',
                          padding: '11px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>Sign In with Email & Password</span>
                        <ArrowRight size={15} />
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate('/register')}
                        style={{
                          width: '100%',
                          padding: '9px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          border: '1px solid #CBD5E1',
                        }}
                      >
                        Create New Patient Account
                      </button>
                    </div>

                    {/* 🧪 Beta Demo Quick Access Box */}
                    <div style={{
                      background: '#F8FAFC',
                      border: '1px dashed #CBD5E1',
                      borderRadius: '12px',
                      padding: '10px 12px',
                    }}>
                      <p style={{ fontSize: '10px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px 0' }}>
                        ⚡ Beta Preview — Instant Demo Logins
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {[
                          { role: 'Patient', email: 'rohan@patient.demo', pass: 'Patient@123456', icon: '👤', color: '#0284C7' },
                          { role: 'Doctor', email: 'dr.priya@healthsync.demo', pass: 'Doctor@123456', icon: '🩺', color: '#059669' },
                          { role: 'Admin', email: 'admin@healthsync.demo', pass: 'Admin@123456', icon: '🛡️', color: '#7C3AED' },
                        ].map((d) => (
                          <button
                            key={d.role}
                            type="button"
                            onClick={() => handleQuickDemoLogin(d.email, d.pass)}
                            style={{
                              padding: '6px 4px',
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              textAlign: 'center',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '2px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#0F172A',
                            }}
                          >
                            <span>{d.icon}</span>
                            <span>{d.role}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. "WHY CHOOSE HEALTHSYNC?" 4-FEATURE ICONS BAR (MATCHING APOLLO SCREENSHOT 1) ── */}
      <section style={{ padding: 'var(--space-12) 0', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: '#0F172A' }}>
              Why Choose HealthSync Hospitals?
            </h2>
            <p className="text-secondary text-sm" style={{ marginTop: 4 }}>
              Delivering international healthcare excellence across India with certified clinical specialists.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-5)' }}>
            {[
              {
                icon: Stethoscope,
                title: 'Senior Clinical Specialists',
                desc: '20+ years experienced doctors, surgeons and superspecialists in your city.',
              },
              {
                icon: Heart,
                title: '50,000+ Surgeries & OPDs',
                desc: 'Proven track record of high clinical success and compassionate post-care.',
              },
              {
                icon: Shield,
                title: 'Laser & Robotic Technology',
                desc: 'Minimally invasive diagnostic tools, laparoscopic suites, and 24/7 labs.',
              },
              {
                icon: Building2,
                title: 'NABH / NABL Accredited',
                desc: 'Tier-1 hospital standards, infection control, and sterile critical care units.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="card card-hover"
                style={{ textAlign: 'center', padding: 'var(--space-6)' }}
              >
                <div
                  style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: '#E0F2FE', color: '#0284C7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto var(--space-4)',
                  }}
                >
                  <item.icon size={28} />
                </div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>{item.title}</h3>
                <p className="text-secondary text-xs" style={{ lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. REAL DOCTORS PORTRAITS (MATCHING APOLLO SCREENSHOT 2) ── */}
      <section style={{ padding: 'var(--space-16) 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-8)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div>
              <span className="badge badge-teal" style={{ marginBottom: '6px' }}>Verified Medical Faculty</span>
              <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: '#0F172A' }}>
                Best Specialists & Doctors in {selectedCity}
              </h2>
              <p className="text-secondary text-sm" style={{ marginTop: 2 }}>
                Consult highly experienced specialists for in-clinic and video appointments.
              </p>
            </div>

            {/* City Selector Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {POPULAR_CITIES.slice(0, 6).map((c) => (
                <button
                  key={c}
                  className={`btn btn-sm ${selectedCity === c ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleCitySelect(c)}
                  style={{ borderRadius: 'var(--radius-full)' }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Real Doctor Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
            {REAL_DOCTORS_PREVIEW.map((doc, idx) => (
              <div
                key={idx}
                className="doctor-card"
                onClick={() => navigate('/patient/doctors')}
              >
                {/* Doctor Portrait Photo Container */}
                <div className="doctor-photo-container">
                  <img
                    src={doc.image}
                    alt={doc.name}
                    className="doctor-photo-img"
                  />
                  <div
                    style={{
                      position: 'absolute', top: 12, right: 12,
                      background: 'rgba(255,255,255,0.95)', padding: '3px 8px',
                      borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: 4,
                      boxShadow: 'var(--shadow-sm)', fontSize: '11px', fontWeight: 700, color: '#0F172A'
                    }}
                  >
                    <Star size={12} fill="#F59E0B" color="#F59E0B" /> {doc.rating}
                  </div>
                </div>

                {/* Doctor Details Body */}
                <div className="doctor-card-body">
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
                    {doc.name}
                  </h3>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#0284C7', marginBottom: '4px' }}>
                    {doc.specialty}
                  </p>
                  <p className="text-secondary text-xs" style={{ marginBottom: 'var(--space-3)' }}>
                    ⏱️ {doc.experience} · {doc.hospital}
                  </p>

                  <div style={{ marginTop: 'auto', paddingTop: 'var(--space-3)', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p className="text-muted" style={{ fontSize: '10px' }}>Consultation Fee</p>
                      <p style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{doc.fee}</p>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => { e.stopPropagation(); navigate('/patient/doctors'); }}
                    >
                      Book Consultation
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              className="btn btn-amber btn-lg"
              onClick={() => navigate('/patient/doctors')}
              style={{ padding: '12px 32px', fontSize: '16px' }}
            >
              Book Your Appointment Now <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── 4. 6 CORE MEDICAL DEPARTMENTS ── */}
      <section style={{ padding: 'var(--space-16) 0', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
            <span className="badge badge-teal" style={{ marginBottom: '6px' }}>Comprehensive Medical Specialties</span>
            <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>Explore Care by Department</h2>
            <p className="text-secondary text-sm" style={{ marginTop: 2 }}>
              Choose your specialty to see verified hospital doctors and available appointment slots.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'var(--space-4)' }}>
            {CORE_SPECIALTIES.map((spec) => (
              <div
                key={spec.id}
                className="card card-hover"
                style={{ padding: 'var(--space-5)', cursor: 'pointer', textAlign: 'center' }}
                onClick={() => handleSpecialtyClick(spec.id)}
              >
                <div style={{ fontSize: '32px', marginBottom: 'var(--space-2)' }}>{spec.icon}</div>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                  {spec.label}
                </h4>
                <p className="text-secondary" style={{ fontSize: '11px', lineHeight: 1.4 }}>
                  {spec.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. EMERGENCY CONTACT & TRUST BANNER ── */}
      <section style={{ background: '#005E83', color: 'white', padding: 'var(--space-12) 0', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: '#FFFFFF', marginBottom: 'var(--space-2)' }}>
            Need Immediate Medical Assistance?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--text-base)', maxWidth: 600, margin: '0 auto var(--space-6)' }}>
            Our 24/7 critical care helpline connects you directly with ambulance dispatch and emergency OPDs across {selectedCity}.
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="tel:18004197979"
              className="btn btn-amber btn-lg"
              style={{ fontSize: '17px', padding: '14px 28px' }}
            >
              <Phone size={20} /> Call 1800-419-7979 (Toll Free)
            </a>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => navigate('/patient/doctors')}
              style={{ background: 'white', color: '#005E83', fontWeight: 700 }}
            >
              Book In-Clinic Appointment
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}

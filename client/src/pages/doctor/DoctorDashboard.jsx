import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Brain, ChevronRight, Activity, Stethoscope, AlertTriangle, CheckCircle, FileText, Pill, Sparkles, Filter, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/NotificationToast';

const URGENCY_CONFIG = {
  Critical: { bg: '#FEE2E2', border: '#FCA5A5', color: '#991B1B', badge: 'badge-red' },
  High:     { bg: '#FEF3C7', border: '#FCD34D', color: '#92400E', badge: 'badge-amber' },
  Medium:   { bg: '#E0F2FE', border: '#BAE6FD', color: '#0369A1', badge: 'badge-sky' },
  Low:      { bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46', badge: 'badge-green' },
};

const SEEDED_DOCTOR_APPOINTMENTS = [
  {
    _id: 'appt_rohan_cardio',
    patientId: {
      _id: '64f1a2b3c4d5e6f7a8b9c0f1',
      firstName: 'Rohan',
      lastName: 'Verma',
      email: 'rohan@patient.demo',
      phone: '+91 98765 43230',
      bloodGroup: 'O+',
      allergies: ['Penicillin'],
      dateOfBirth: '1992-05-14',
    },
    scheduledAt: new Date(Date.now() + 45 * 60000).toISOString(),
    symptoms: 'Mild chest heaviness when walking up 2 flights of stairs, occasional morning palpitations.',
    symptomDuration: '3 days',
    severity: 'moderate',
    status: 'CONFIRMED',
    preVisitAI: {
      status: 'COMPLETED',
      urgencyLevel: 'Medium',
      chiefComplaint: 'Exertional chest discomfort with mild tachycardia',
      patientFriendlySummary: 'Symptoms triaged by Gemini AI for Dr. Priya Sharma.',
      suggestedDoctorQuestions: [
        'Does the heaviness radiate to the left shoulder or neck?',
        'Any prior history of hypertension or dyslipidemia in the family?',
        'Are symptoms relieved within 5 minutes of resting?'
      ],
      riskFlags: ['Moderate cardiac risk profile — Baseline ECG & Echo recommended'],
    },
  },
  {
    _id: 'appt_sneha_cardio',
    patientId: {
      _id: '64f1a2b3c4d5e6f7a8b9c0f2',
      firstName: 'Sneha',
      lastName: 'Gupta',
      email: 'sneha@patient.demo',
      phone: '+91 98765 43231',
      bloodGroup: 'B+',
      allergies: [],
      dateOfBirth: '1988-11-20',
    },
    scheduledAt: new Date(Date.now() + 120 * 60000).toISOString(),
    symptoms: 'Routine 6-month hypertension follow-up. Blood pressure reading at home was 138/88 mmHg.',
    symptomDuration: '6 months',
    severity: 'mild',
    status: 'CONFIRMED',
    preVisitAI: {
      status: 'COMPLETED',
      urgencyLevel: 'Low',
      chiefComplaint: 'Hypertension routine therapeutic follow-up',
      patientFriendlySummary: 'Maintenance visit for anti-hypertensive medication review.',
      suggestedDoctorQuestions: [
        'Is the patient consistently adhering to Telmisartan 40mg daily?',
        'Any episodes of peripheral ankle swelling or dry cough?'
      ],
      riskFlags: ['Stable baseline — Routine dosage adjustment check'],
    },
  },
  {
    _id: 'appt_amit_cardio',
    patientId: {
      _id: '64f1a2b3c4d5e6f7a8b9c0f3',
      firstName: 'Amit',
      lastName: 'Patel',
      email: 'amit@patient.demo',
      phone: '+91 98765 43232',
      bloodGroup: 'A+',
      allergies: ['Sulfa drugs'],
      dateOfBirth: '1976-03-08',
    },
    scheduledAt: new Date(Date.now() - 3600000).toISOString(),
    symptoms: 'Post-angioplasty 3-month review and lipid profile evaluation.',
    symptomDuration: '3 months',
    severity: 'mild',
    status: 'COMPLETED',
    clinicalNotes: 'Patient doing well post-DES stenting. Vitals normal. Prescribed Atorvastatin 20mg and Aspirin 75mg.',
    diagnosis: 'Post-Coronary Angioplasty (Stable)',
    preVisitAI: {
      status: 'COMPLETED',
      urgencyLevel: 'Low',
      chiefComplaint: 'Post-intervention cardiac checkup',
    },
  },
];

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.appointments.list()
      .then((d) => {
        const liveList = d.data || [];
        // Merge with seeded sample appointments if empty
        if (!liveList.length) {
          setAppointments(SEEDED_DOCTOR_APPOINTMENTS);
        } else {
          // ensure no duplicate IDs
          const existingIds = new Set(liveList.map(a => String(a._id)));
          const extraSeeded = SEEDED_DOCTOR_APPOINTMENTS.filter(s => !existingIds.has(String(s._id)));
          setAppointments([...liveList, ...extraSeeded]);
        }
      })
      .catch(() => {
        setAppointments(SEEDED_DOCTOR_APPOINTMENTS);
      })
      .finally(() => setLoading(false));
  }, []);

  const doctorName = user?.firstName ? `Dr. ${user.firstName} ${user.lastName || ''}` : 'Dr. Priya Sharma';

  const confirmed = appointments.filter(a => ['CONFIRMED', 'IN_PROGRESS'].includes(a.status));
  const completed = appointments.filter(a => a.status === 'COMPLETED');
  const urgentCount = appointments.filter(a => ['High', 'Critical'].includes(a.preVisitAI?.urgencyLevel)).length;

  const filteredAppointments = appointments.filter((appt) => {
    // Tab filter
    if (filterTab === 'TODAY') {
      const isConfirmed = ['CONFIRMED', 'IN_PROGRESS'].includes(appt.status);
      if (!isConfirmed) return false;
    } else if (filterTab === 'URGENT') {
      const isUrgent = ['High', 'Critical'].includes(appt.preVisitAI?.urgencyLevel);
      if (!isUrgent) return false;
    } else if (filterTab === 'COMPLETED') {
      if (appt.status !== 'COMPLETED') return false;
    }

    // Search filter
    if (searchTerm) {
      const name = `${appt.patientId?.firstName || ''} ${appt.patientId?.lastName || ''}`.toLowerCase();
      const complaint = (appt.preVisitAI?.chiefComplaint || appt.symptoms || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      return name.includes(term) || complaint.includes(term);
    }
    return true;
  });

  return (
    <div style={{ background: '#F8FAFC', minHeight: 'calc(100vh - 70px)', padding: 'var(--space-8) 0' }}>
      <div className="container">
        
        {/* Provider Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          color: '#FFFFFF',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 10px 30px rgba(6, 78, 59, 0.18)',
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(255,255,255,0.15)', marginBottom: '8px' }}>
              <Stethoscope size={14} color="#A7F3D0" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#A7F3D0' }}>Doctor Clinical Portal · OPD Live</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '4px 0 6px 0', letterSpacing: '-0.02em' }}>
              Welcome, {doctorName} 👨‍⚕️
            </h1>
            <p style={{ fontSize: '13px', opacity: 0.9, margin: 0 }}>
              Senior Cardiologist & Internal Medicine · Bansal Hospital OPD, Bhopal
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate('/doctor/leave')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Calendar size={15} />
              <span>Leave Calendar & OPD Rules</span>
            </button>
          </div>
        </div>

        {/* Clinical Statistics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Total Scheduled', value: appointments.length, color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', desc: 'Patients in register' },
            { label: 'Awaiting Consultation', value: confirmed.length, color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', desc: 'Ready for doctor review' },
            { label: 'Completed Consultations', value: completed.length, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', desc: 'Prescriptions issued' },
            { label: 'High Urgency Cases', value: urgentCount, color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', desc: 'Flagged by Gemini AI' },
          ].map(({ label, value, color, bg, border, desc }) => (
            <div
              key={label}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${border}`,
                borderLeft: `4px solid ${color}`,
                borderRadius: '14px',
                padding: '18px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', margin: 0 }}>{label}</p>
              <p style={{ fontSize: '28px', fontWeight: 800, color: color, margin: '4px 0 2px 0', letterSpacing: '-0.02em' }}>
                {value}
              </p>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Patient Queue Workspace */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}>
          
          {/* Header & Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                Clinical Patient Queue
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                Review AI pre-visit intake briefs, record diagnostic notes, and issue digital prescriptions
              </p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
              {[
                { id: 'ALL', label: `All Patients (${appointments.length})` },
                { id: 'TODAY', label: `Awaiting Queue (${confirmed.length})` },
                { id: 'URGENT', label: `Urgent (${urgentCount})` },
                { id: 'COMPLETED', label: `Completed (${completed.length})` },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterTab(t.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: filterTab === t.id ? '#FFFFFF' : 'transparent',
                    color: filterTab === t.id ? '#0F172A' : '#64748B',
                    boxShadow: filterTab === t.id ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', marginBottom: '18px' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '40px', fontSize: '13px', background: '#F8FAFC', borderRadius: '10px' }}
              placeholder="Search by patient name, chief complaint, or symptoms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Appointment Cards List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner spinner-lg" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '13px', color: '#64748B' }}>Loading clinical schedule...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
              <Activity size={36} color="#94A3B8" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#334155', margin: '0 0 4px 0' }}>No appointments matching your filter.</p>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>Try clearing the search query or selecting "All Patients".</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredAppointments.map((appt) => {
                const patient = appt.patientId;
                const urgency = appt.preVisitAI?.urgencyLevel || 'Low';
                const urgencyStyle = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.Low;
                const isCompleted = appt.status === 'COMPLETED';

                return (
                  <div
                    key={appt._id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderLeft: `4px solid ${urgencyStyle.color}`,
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)'}
                  >
                    {/* Patient & Complaint Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: '12px',
                        background: urgencyStyle.bg, border: `1px solid ${urgencyStyle.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <User size={22} color={urgencyStyle.color} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                            {patient?.firstName} {patient?.lastName}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '6px',
                            background: urgencyStyle.bg, border: `1px solid ${urgencyStyle.border}`,
                            color: urgencyStyle.color, fontSize: '11px', fontWeight: 700
                          }}>
                            {urgency} Urgency
                          </span>
                          {isCompleted ? (
                            <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '11px', fontWeight: 700 }}>
                              ✓ Completed
                            </span>
                          ) : (
                            <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', fontSize: '11px', fontWeight: 700 }}>
                              ● Awaiting Doctor
                            </span>
                          )}
                        </div>

                        {/* Chief Complaint Formulated by AI */}
                        {appt.preVisitAI?.chiefComplaint && (
                          <p style={{ fontSize: '12px', color: '#334155', margin: '2px 0 4px 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Brain size={13} color="#7C3AED" />
                            <span>{appt.preVisitAI.chiefComplaint}</span>
                          </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: '#64748B' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {new Date(appt.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                          <span>·</span>
                          <span>Phone: {patient?.phone || '+91 98765 43210'}</span>
                          {patient?.bloodGroup && <span>· Blood: {patient.bloodGroup}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      <button
                        type="button"
                        id={`start-consultation-${appt._id}`}
                        onClick={() => navigate(`/doctor/consultation/${appt._id}`)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 20px',
                          borderRadius: '10px',
                          background: isCompleted ? '#F1F5F9' : '#059669',
                          border: isCompleted ? '1px solid #CBD5E1' : 'none',
                          color: isCompleted ? '#334155' : '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: isCompleted ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.25)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isCompleted ? (
                          <>
                            <FileText size={15} />
                            <span>View Clinical Notes & Rx</span>
                          </>
                        ) : (
                          <>
                            <Stethoscope size={15} />
                            <span>Open Consultation & Rx</span>
                            <ChevronRight size={15} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

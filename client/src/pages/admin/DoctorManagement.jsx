import React, { useState } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/NotificationToast';

const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', phone: '', specialization: '', city: 'Bhopal', clinicAddress: '', qualifications: '', bio: '', consultationFee: '', yearsOfExperience: '', hospitalAffiliation: '', languages: '', slotDurationMinutes: 30 };
const SPECIALIZATIONS = ['Dentistry', 'Cardiology', 'Neurology', 'Dermatology', 'Orthopaedics', 'Paediatrics', 'General Medicine', 'Gynaecology', 'Psychiatry', 'ENT', 'Ophthalmology', 'Gastroenterology', 'Endocrinology'];

export default function DoctorManagement() {
  const { addToast } = useToast();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        consultationFee: Number(form.consultationFee),
        yearsOfExperience: Number(form.yearsOfExperience),
        qualifications: form.qualifications.split(',').map(s => s.trim()).filter(Boolean),
        languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
      };
      const res = await api.doctors.create(payload);
      setSuccess(res.data);
      setForm({ ...EMPTY_FORM });
      addToast(`Dr. ${form.firstName} ${form.lastName} created successfully!`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const f = (id, label, type = 'text', placeholder = '') => (
    <div className="form-group" key={id}>
      <label className="form-label">{label}</label>
      <input id={`doctor-${id}`} type={type} className="form-input" placeholder={placeholder} value={form[id] || ''} onChange={(e) => setForm({ ...form, [id]: e.target.value })} required={!['phone', 'bio', 'qualifications', 'hospitalAffiliation', 'languages'].includes(id)} />
    </div>
  );

  return (
    <div className="page">
      <div className="container-sm">
        <div className="page-header">
          <h1 className="page-title"><Plus size={28} style={{ display: 'inline', marginRight: 10, color: 'var(--color-accent-violet)' }} />Add New Doctor</h1>
          <p className="text-secondary">Create a verified doctor account and profile on the platform</p>
        </div>

        {success && (
          <div className="alert alert-success" style={{ marginBottom: 'var(--space-6)' }}>
            <CheckCircle size={18} />
            Dr. {success.user?.firstName} {success.user?.lastName} ({success.profile?.specialization}) created successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="card">
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>Account Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              {f('firstName', 'First Name', 'text', 'Priya')}
              {f('lastName',  'Last Name',  'text', 'Sharma')}
              {f('email',    'Email', 'email', 'dr.priya@hospital.com')}
              {f('password', 'Temporary Password', 'password', 'Min 8 chars')}
              {f('phone',    'Phone', 'tel', '+91 98765 43210')}
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>Professional Profile</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Specialization *</label>
                <select id="doctor-specialization" className="form-input form-select" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} required>
                  <option value="">Select specialization</option>
                  {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                {f('city', 'City', 'text', 'e.g. Bhopal')}
                {f('clinicAddress', 'Clinic / Area Address', 'text', 'e.g. Arera Colony, Bhopal')}
              </div>
              {f('qualifications', 'Qualifications (comma-separated)', 'text', 'BDS, MDS - Oral & Maxillofacial Surgery')}
              {f('hospitalAffiliation', 'Hospital / Clinic Affiliation', 'text', 'Apollo Hospitals / AIIMS Bhopal')}
              {f('languages', 'Languages (comma-separated)', 'text', 'English, Hindi')}
              <div className="form-group">
                <label className="form-label">Biography</label>
                <textarea className="form-input form-textarea" style={{ minHeight: 100 }} placeholder="Doctor's bio and expertise..." value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                {f('consultationFee', 'Consultation Fee (₹)', 'number', '800')}
                {f('yearsOfExperience', 'Years of Experience', 'number', '10')}
                <div className="form-group">
                  <label className="form-label">Slot Duration</label>
                  <select className="form-input form-select" value={form.slotDurationMinutes} onChange={(e) => setForm({ ...form, slotDurationMinutes: Number(e.target.value) })}>
                    {[15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Creating doctor...</> : <><Plus size={20} /> Create Doctor Account</>}
          </button>
        </form>
      </div>
    </div>
  );
}

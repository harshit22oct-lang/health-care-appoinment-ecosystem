import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Sparkles, X, MapPin,
} from 'lucide-react';
import DoctorCard from '../../components/doctor/DoctorCard';
import LocationSelector, { getStoredCity, setStoredCity, POPULAR_CITIES } from '../../components/common/LocationSelector';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/NotificationToast';

const CORE_DEPARTMENTS = [
  'All',
  'General Medicine',
  'Cardiology',
  'Dermatology',
  'Dentistry',
  'Neurology',
  'Orthopaedics',
  'Paediatrics',
  'Gastroenterology',
  'Veterinary & Animal Care',
  'Ophthalmology',
  'ENT',
  'Gynecology',
];

const SkeletonCard = () => (
  <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px' }}>
    <div className="skeleton skeleton-circle" style={{ width: 60, height: 60, flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <div className="skeleton skeleton-title" style={{ width: '50%', height: '18px', marginBottom: '8px' }} />
      <div className="skeleton skeleton-text" style={{ width: '30%', height: '14px', marginBottom: '12px' }} />
      <div className="skeleton skeleton-text" style={{ width: '80%', height: '12px' }} />
    </div>
  </div>
);

export default function DoctorDiscovery() {
  const [selectedCity, setSelectedCity] = useState(getStoredCity());
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState('all'); // 'all' | 'bookable' | 'reference'

  // AI Triage state
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { addToast } = useToast();

  const fetchDoctors = useCallback(async (cityToUse, specToUse) => {
    setLoading(true);
    try {
      const currentCity = cityToUse !== undefined ? cityToUse : selectedCity;
      const currentSpec = specToUse !== undefined ? specToUse : specialty;

      const params = { limit: 30 };
      if (currentSpec && currentSpec !== 'All') params.specialization = currentSpec;
      if (currentCity && currentCity !== 'All Cities') params.city = currentCity;

      const data = await api.doctors.search(params);
      setDoctors(data.data.doctors || []);
    } catch {
      addToast('Failed to load doctor directory. Please check network connection.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedCity, specialty]);

  // Deep Natural Language Search
  const executeSearch = async (textQuery) => {
    const q = textQuery !== undefined ? textQuery : searchQuery;
    if (!q || !q.trim()) {
      fetchDoctors(selectedCity, 'All');
      return;
    }

    setAiLoading(true);
    setLoading(true);

    try {
      const data = await api.doctors.aiSearch(q);
      const { aiMatch, doctors: matchedDocs } = data.data;
      setAiResult(aiMatch);

      if (aiMatch.primarySpecialty) {
        setSpecialty(aiMatch.primarySpecialty);
      }

      if (aiMatch.detectedCity) {
        setSelectedCity(aiMatch.detectedCity);
        setStoredCity(aiMatch.detectedCity);
      }

      if (matchedDocs && matchedDocs.length > 0) {
        setDoctors(matchedDocs);
        addToast(`Found ${matchedDocs.length} specialists for '${aiMatch.primarySpecialty}' in ${aiMatch.detectedCity || selectedCity}`, 'success');
      } else {
        fetchDoctors(aiMatch.detectedCity || selectedCity, aiMatch.primarySpecialty || 'All');
      }
    } catch (err) {
      fetchDoctors(selectedCity, 'All');
    } finally {
      setAiLoading(false);
      setLoading(false);
    }
  };

  // URL Query on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const spec = params.get('specialization');
    if (spec) {
      setSpecialty(spec);
    }
    if (q) {
      setSearchQuery(q);
      executeSearch(q);
    } else {
      fetchDoctors();
    }
  }, []);

  // Listen to city change events
  useEffect(() => {
    const handleCityChange = (e) => {
      if (e.detail && e.detail !== selectedCity) {
        setSelectedCity(e.detail);
        fetchDoctors(e.detail, specialty);
      }
    };
    window.addEventListener('healthsync_city_changed', handleCityChange);
    return () => window.removeEventListener('healthsync_city_changed', handleCityChange);
  }, [selectedCity, specialty, fetchDoctors]);

  const handleCitySelect = (c) => {
    setSelectedCity(c);
    setStoredCity(c);
    setAiResult(null);
    fetchDoctors(c, specialty);
  };

  const handleSpecialtyClick = (dept) => {
    setSpecialty(dept);
    setAiResult(null);
    fetchDoctors(selectedCity, dept);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setAiResult(null);
    setSpecialty('All');
    fetchDoctors(selectedCity, 'All');
  };

  // Filter based on active tab ('all', 'bookable', 'reference')
  const bookableDoctors = doctors.filter(d => d.isBookable !== false && d.doctorType !== 'REFERENCE');
  const referenceDoctors = doctors.filter(d => d.isBookable === false || d.doctorType === 'REFERENCE');

  const displayedDoctors = doctors.filter((doc) => {
    if (viewTab === 'bookable') return doc.isBookable !== false && doc.doctorType !== 'REFERENCE';
    if (viewTab === 'reference') return doc.isBookable === false || doc.doctorType === 'REFERENCE';
    return true;
  });

  const bookableCount = bookableDoctors.length;
  const referenceCount = referenceDoctors.length;

  return (
    <div style={{ background: '#F8FAFC', minHeight: 'calc(100vh - 70px)', padding: '24px 0 48px 0' }}>
      <div className="container">

        {/* ── 1. CLEAN APOLLO-STYLE DIRECTORY HEADER ── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Verified Specialist Network
                </span>
                <span style={{ color: '#94A3B8' }}>·</span>
                <LocationSelector currentCity={selectedCity} onCityChange={handleCitySelect} />
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Top Doctors & Clinics in <span style={{ color: '#0284C7' }}>{selectedCity}</span>
              </h1>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                Showing verified doctors, hospital departments, and clinics with live booking & walk-in OPD.
              </p>
            </div>

            {/* Quick Popular City Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Quick Cities:</span>
              {POPULAR_CITIES.slice(0, 6).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCitySelect(c)}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: selectedCity === c ? '1.5px solid #0284C7' : '1px solid #E2E8F0',
                    background: selectedCity === c ? '#0284C7' : '#F8FAFC',
                    color: selectedCity === c ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 2. SINGLE UNIVERSAL AI SEARCH BAR ── */}
        <div style={{ marginBottom: '16px' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                className="form-input"
                style={{
                  height: '50px',
                  paddingLeft: '46px',
                  paddingRight: searchQuery ? '40px' : '16px',
                  fontSize: '14px',
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
                placeholder="Search any doctor, specialty, symptom or city (e.g. 'Dr. Priya', 'Cardiologist in Indore', 'Animal doc in Bangalore')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8',
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={aiLoading}
              style={{
                height: '50px',
                padding: '0 24px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              {aiLoading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  <span>Searching AI...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Search Care</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── 3. AI TRIAGE BANNER (If Active) ── */}
        {aiResult && (
          <div className="animate-slideDown" style={{
            background: '#F0FDF4',
            border: '1.5px solid #BBF7D0',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', background: '#DCFCE7', color: '#166534', textTransform: 'uppercase' }}>
                  ✨ Gemini AI Match
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                  {aiResult.primarySpecialty} {aiResult.detectedCity ? `in ${aiResult.detectedCity}` : ''}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#334155', margin: 0 }}>
                {aiResult.reasoning}
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px',
                padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#475569', cursor: 'pointer'
              }}
            >
              Clear Filter ✕
            </button>
          </div>
        )}

        {/* ── 4. SPECIALTY FILTER PILLS ── */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '16px', scrollbarWidth: 'none' }}>
          {CORE_DEPARTMENTS.map((dept) => {
            const isSelected = specialty.toLowerCase() === dept.toLowerCase();
            return (
              <button
                key={dept}
                type="button"
                onClick={() => handleSpecialtyClick(dept)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '20px',
                  border: isSelected ? '1.5px solid #0284C7' : '1px solid #E2E8F0',
                  background: isSelected ? '#0284C7' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#334155',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {dept}
              </button>
            );
          })}
        </div>

        {/* ── 5. DIRECTORY TABS (ALL / BOOKABLE / HOSPITAL DIRECTORY) ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1.5px solid #E2E8F0',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button
              type="button"
              onClick={() => setViewTab('all')}
              style={{
                background: 'none', border: 'none', padding: '10px 0',
                borderBottom: viewTab === 'all' ? '2.5px solid #0284C7' : '2.5px solid transparent',
                color: viewTab === 'all' ? '#0284C7' : '#64748B',
                fontSize: '13px', fontWeight: 800, cursor: 'pointer',
              }}
            >
              All Doctors ({doctors.length})
            </button>

            <button
              type="button"
              onClick={() => setViewTab('bookable')}
              style={{
                background: 'none', border: 'none', padding: '10px 0',
                borderBottom: viewTab === 'bookable' ? '2.5px solid #0284C7' : '2.5px solid transparent',
                color: viewTab === 'bookable' ? '#0284C7' : '#64748B',
                fontSize: '13px', fontWeight: 800, cursor: 'pointer',
              }}
            >
              ⚡ Instant Bookable Online ({bookableCount})
            </button>

            <button
              type="button"
              onClick={() => setViewTab('reference')}
              style={{
                background: 'none', border: 'none', padding: '10px 0',
                borderBottom: viewTab === 'reference' ? '2.5px solid #0284C7' : '2.5px solid transparent',
                color: viewTab === 'reference' ? '#0284C7' : '#64748B',
                fontSize: '13px', fontWeight: 800, cursor: 'pointer',
              }}
            >
              🏥 Verified Hospital Directory ({referenceCount})
            </button>
          </div>

          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
            Showing {displayedDoctors.length} results in {selectedCity}
          </span>
        </div>

        {/* ── 6. DOCTOR & CLINIC CARDS GRID ── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : displayedDoctors.length === 0 ? (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏥</div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              No doctors found matching '{searchQuery || specialty}' in {selectedCity}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '6px 0 16px 0' }}>
              Try searching a different specialty or browse all specialties in {selectedCity}.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleClearSearch}
            >
              View All Doctors in {selectedCity}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Section A: Bookable Specialists */}
            {(viewTab === 'all' || viewTab === 'bookable') && bookableDoctors.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <ShieldCheck size={18} color="#0284C7" />
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    HealthSync Verified Specialists · Available for Online Booking ({bookableDoctors.length})
                  </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
                  {bookableDoctors.map((doc) => (
                    <DoctorCard key={doc._id} doctor={doc} />
                  ))}
                </div>
              </div>
            )}

            {/* Section B: Public Medical Directory (Reference Profiles) */}
            {(viewTab === 'all' || viewTab === 'reference') && referenceDoctors.length > 0 && (
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <Info size={18} color="#0284C7" />
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Verified Hospital & Clinic Directory in {selectedCity} ({referenceDoctors.length})
                    </h3>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                    Verified hospital departments & specialists for direct walk-in / hospital consultation.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
                  {referenceDoctors.map((doc) => (
                    <DoctorCard key={doc._id} doctor={doc} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

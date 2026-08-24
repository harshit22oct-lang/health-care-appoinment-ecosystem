import React, { useState, useEffect } from 'react';
import { MapPin, Search, ChevronDown, Check, Building2, Sparkles, Navigation, X } from 'lucide-react';

export const POPULAR_CITIES = [
  'Bhopal',
  'Indore',
  'Bengaluru',
  'Delhi',
  'Mumbai',
  'Pune',
  'Hyderabad',
  'Chennai',
];

export const CITY_METADATA = [
  { city: 'All Cities', state: 'Pan-India Directory', hospitals: '150+ Hospitals' },
  { city: 'Bhopal', state: 'Madhya Pradesh', hospitals: 'AIIMS, Bansal, Apollo Sage' },
  { city: 'Indore', state: 'Madhya Pradesh', hospitals: 'Medanta, Bombay Hospital, CHL' },
  { city: 'Bengaluru', state: 'Karnataka', hospitals: 'Manipal, Narayana, Aster CMI' },
  { city: 'Delhi', state: 'Delhi NCR', hospitals: 'AIIMS, Fortis, Max Healthcare' },
  { city: 'Mumbai', state: 'Maharashtra', hospitals: 'Lilavati, Kokilaben, Hinduja' },
  { city: 'Pune', state: 'Maharashtra', hospitals: 'Ruby Hall, Jupiter, Sahyadri' },
  { city: 'Hyderabad', state: 'Telangana', hospitals: 'Apollo Jubilee, Yashoda, KIMS' },
  { city: 'Chennai', state: 'Tamil Nadu', hospitals: 'Apollo Greams, Fortis Malar, MGM' },
  { city: 'Ahmedabad', state: 'Gujarat', hospitals: 'Apollo Gandhinagar, Zydus, Sterling' },
  { city: 'Jaipur', state: 'Rajasthan', hospitals: 'Fortis Escorts, Manipal, EHCC' },
  { city: 'Kolkata', state: 'West Bengal', hospitals: 'Apollo Gleneagles, Fortis, AMRI' },
  { city: 'Lucknow', state: 'Uttar Pradesh', hospitals: 'Medanta, Apollomedics, SGPGI' },
];

export const ALL_SUPPORTED_CITIES = CITY_METADATA.map(c => c.city);

export function getStoredCity() {
  try {
    return localStorage.getItem('healthsync_selected_city') || 'Bhopal';
  } catch {
    return 'Bhopal';
  }
}

export function setStoredCity(city) {
  try {
    localStorage.setItem('healthsync_selected_city', city);
    window.dispatchEvent(new CustomEvent('healthsync_city_changed', { detail: city }));
  } catch {}
}

export default function LocationSelector({ onCityChange, currentCity }) {
  const [isOpen, setIsOpen] = useState(false);
  const [city, setCity] = useState(currentCity || getStoredCity());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (currentCity) setCity(currentCity);
  }, [currentCity]);

  useEffect(() => {
    const handleCityChange = (e) => {
      if (e.detail) setCity(e.detail);
    };
    window.addEventListener('healthsync_city_changed', handleCityChange);
    return () => window.removeEventListener('healthsync_city_changed', handleCityChange);
  }, []);

  const handleSelectCity = (selected) => {
    setCity(selected);
    setStoredCity(selected);
    if (onCityChange) onCityChange(selected);
    setIsOpen(false);
    setSearch('');
  };

  const filteredMetadata = CITY_METADATA.filter((item) =>
    item.city.toLowerCase().includes(search.toLowerCase()) ||
    item.state.toLowerCase().includes(search.toLowerCase()) ||
    item.hospitals.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Trigger Pill Button */}
      <button
        type="button"
        id="location-selector-trigger"
        onClick={() => setIsOpen(true)}
        title="Change current healthcare location"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#F0F9FF',
          border: '1.5px solid #BAE6FD',
          borderRadius: '24px',
          padding: '6px 14px',
          color: '#0369A1',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0284C7'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#BAE6FD'}
      >
        <MapPin size={13} color="#0284C7" />
        <span>{city === 'All Cities' ? 'All Locations' : `Doctors in ${city}`}</span>
        <ChevronDown size={12} color="#0284C7" style={{ opacity: 0.8 }} />
      </button>

      {/* Modern Silicon Valley City Modal */}
      {isOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            className="animate-scaleIn"
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <MapPin size={16} color="#0284C7" />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
                    Select Your City
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  HealthSync connects you with live bookable doctors & real hospitals in your city
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                id="city-search-input"
                autoFocus
                className="form-input"
                style={{
                  paddingLeft: '40px',
                  fontSize: '13px',
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1.5px solid #E2E8F0',
                }}
                placeholder="Search city, state or hospital (e.g. Bhopal, Indore, AIIMS)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Popular City Chips */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>
                ⭐ Popular Healthcare Cities
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {POPULAR_CITIES.map((c) => {
                  const isSelected = city === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleSelectCity(c)}
                      style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: isSelected ? '1.5px solid #0284C7' : '1px solid #E2E8F0',
                        background: isSelected ? '#0284C7' : '#F8FAFC',
                        color: isSelected ? '#FFFFFF' : '#334155',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected && <Check size={12} />}
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full City List */}
            <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>
                All Supported Cities & Medical Hubs ({filteredMetadata.length})
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredMetadata.map((item) => {
                  const isSelected = city === item.city;
                  return (
                    <button
                      key={item.city}
                      type="button"
                      onClick={() => handleSelectCity(item.city)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: isSelected ? '#F0F9FF' : '#FFFFFF',
                        border: isSelected ? '1.5px solid #0284C7' : '1px solid #F1F5F9',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#FFFFFF';
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#0284C7' : '#0F172A' }}>
                            {item.city}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            · {item.state}
                          </span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0 0' }}>
                          🏥 {item.hospitals}
                        </p>
                      </div>

                      {isSelected ? (
                        <span style={{
                          padding: '3px 8px', borderRadius: '6px',
                          background: '#0284C7', color: '#FFFFFF',
                          fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px'
                        }}>
                          <Check size={11} /> Selected
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#0284C7', fontWeight: 700 }}>
                          Select →
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

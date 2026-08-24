import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity, LogOut, User, Menu, X,
  Stethoscope, Calendar, Shield, ChevronDown, Home, Sparkles
} from 'lucide-react';
import LocationSelector from '../common/LocationSelector';

const ROLE_CONFIG = {
  patient: {
    color: 'var(--color-accent-teal)',
    label: 'Patient',
    links: [
      { to: '/patient', label: 'Dashboard', icon: Home, end: true },
      { to: '/patient/doctors', label: 'Find Doctors', icon: Stethoscope },
    ],
  },
  doctor: {
    color: 'var(--color-accent-emerald)',
    label: 'Doctor',
    links: [
      { to: '/doctor', label: 'My Schedule', icon: Calendar, end: true },
      { to: '/doctor/leave', label: 'Manage Leave', icon: Activity },
    ],
  },
  admin: {
    color: 'var(--color-accent-violet)',
    label: 'Admin',
    links: [
      { to: '/admin', label: 'Dashboard', icon: Shield, end: true },
      { to: '/admin/doctors', label: 'Doctors', icon: Stethoscope },
    ],
  },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const config = user ? ROLE_CONFIG[user.role] : null;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 1000, background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
      <div className="navbar-inner">
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="navbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <Activity size={24} color="#0284C7" strokeWidth={2.5} />
            <span>
              <span style={{ color: '#0284C7', fontWeight: 800 }}>Health</span>
              <span style={{ color: '#0F172A', fontWeight: 800 }}>Sync</span>
            </span>
          </div>

          <span style={{
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '4px',
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            color: '#92400E',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            Beta v1.2
          </span>
        </div>

        {/* Location selector on navbar */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <LocationSelector onCityChange={(c) => {
            if (window.location.pathname !== '/patient/doctors') {
              navigate('/patient/doctors');
            }
          }} />
        </div>

        {/* Desktop Links */}
        <div className="navbar-links" style={{ display: 'flex', gap: '4px' }}>
          {config ? (
            config.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                <link.icon size={15} strokeWidth={2} style={{ display: 'inline', marginRight: '6px' }} />
                {link.label}
              </NavLink>
            ))
          ) : (
            <>
              <NavLink
                to="/patient/doctors"
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                <Stethoscope size={15} strokeWidth={2} style={{ display: 'inline', marginRight: '6px' }} />
                Find Doctors
              </NavLink>
              <NavLink
                to="/"
                end
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                <Home size={15} strokeWidth={2} style={{ display: 'inline', marginRight: '6px' }} />
                Home
              </NavLink>
            </>
          )}
        </div>

        {/* Right section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href="tel:18004197979"
            className="btn btn-amber btn-sm"
            style={{ borderRadius: '20px', padding: '6px 14px', fontSize: '12px' }}
          >
            📞 24/7 Helpline
          </a>

          {user ? (
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setProfileOpen(!profileOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #CBD5E1' }}
              >
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284C7, #0D9488)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '700', color: 'white',
                }}>
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
                <span className="text-xs font-semibold" style={{ color: '#0F172A' }}>{user.firstName}</span>
                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#E0F2FE', color: '#0369A1', fontWeight: 700 }}>
                  {config?.label}
                </span>
                <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: profileOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {profileOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: '#FFFFFF', border: '1px solid #E2E8F0',
                  borderRadius: '12px', padding: '8px',
                  minWidth: '220px', zIndex: 1000, boxShadow: '0 15px 30px rgba(0,0,0,0.12)',
                }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', marginBottom: '6px' }}>
                    <p className="text-xs font-bold" style={{ color: '#0F172A', margin: 0 }}>{user.firstName} {user.lastName}</p>
                    <p className="text-xs" style={{ color: '#64748B', margin: '2px 0 0 0' }}>{user.email}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ justifyContent: 'flex-start', color: '#EF4444', width: '100%' }}
                    onClick={handleLogout}
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/register')}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

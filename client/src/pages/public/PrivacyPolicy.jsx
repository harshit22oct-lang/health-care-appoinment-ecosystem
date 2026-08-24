import React from 'react';
import { Shield, Lock, Eye, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="page" style={{ padding: '36px 0 60px 0', background: '#F8FAFC', minHeight: 'calc(100vh - 70px)' }}>
      <div className="container-sm">
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0284C7', textDecoration: 'none', marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Back to HealthSync Home
        </Link>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '36px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Shield size={26} color="#0284C7" />
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Privacy Policy</h1>
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '24px' }}>
            Last Updated: August 2026 · Compliant with Digital Personal Data Protection (DPDP) Act & Healthcare Privacy Standards
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#334155', fontSize: '14px', lineHeight: 1.6 }}>
            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>1. Information We Collect</h2>
              <p style={{ margin: 0 }}>
                HealthSync collects patient intake information, symptom descriptions, appointment schedules, and contact details (email and phone number) strictly for coordinating healthcare appointments and medical triage.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>2. Use of Google User Data</h2>
              <p style={{ margin: 0 }}>
                When you sign in using Google OAuth or connect Google Calendar, HealthSync accesses your basic Google profile (name, email) to authenticate your account, and uses Google Calendar API to create, update, or remove confirmed consultation events. <strong>We never sell, rent, or share your Google user data with third-party advertisers.</strong>
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>3. AI & Clinical Triage Privacy</h2>
              <p style={{ margin: 0 }}>
                Symptom disclosures processed by the Google Gemini AI clinical triage engine are evaluated in stateless, encrypted sessions solely to formulate doctor briefing questions and estimated urgency levels.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>4. Data Security & Encryption</h2>
              <p style={{ margin: 0 }}>
                All network transmissions utilize TLS/HTTPS 256-bit encryption. Access tokens are cryptographically signed using JWT standards with automated expiration policies.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>5. Contact & Data Deletion Requests</h2>
              <p style={{ margin: 0 }}>
                For inquiries or to request permanent deletion of your healthcare profile, email our privacy officer at: <code style={{ color: '#0284C7', background: '#F0F9FF', padding: '2px 6px', borderRadius: '4px' }}>privacy@healthsync.com</code>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

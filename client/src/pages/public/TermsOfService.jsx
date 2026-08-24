import React from 'react';
import { FileText, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="page" style={{ padding: '36px 0 60px 0', background: '#F8FAFC', minHeight: 'calc(100vh - 70px)' }}>
      <div className="container-sm">
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0284C7', textDecoration: 'none', marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Back to HealthSync Home
        </Link>

        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '20px', padding: '36px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <FileText size={26} color="#0284C7" />
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Terms of Service</h1>
          </div>
          <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '24px' }}>
            Last Updated: August 2026 · HealthSync Healthcare Ecosystem
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#334155', fontSize: '14px', lineHeight: 1.6 }}>
            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>1. Platform Purpose & Scope</h2>
              <p style={{ margin: 0 }}>
                HealthSync is an intelligent healthcare appointment booking, doctor directory, and clinical follow-up platform connecting patients with verified medical practitioners.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>2. Medical Disclaimer</h2>
              <p style={{ margin: 0 }}>
                HealthSync and its AI symptom summary tools provide administrative support and clinical triage assistance. <strong>AI summaries do not constitute formal medical diagnosis.</strong> In life-threatening emergencies, patients must immediately contact local emergency services or visit the nearest hospital.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>3. Slot Reservation & Cancellation Policies</h2>
              <p style={{ margin: 0 }}>
                Temporary slot holds are active for 5 minutes during intake completion. If a physician registers leave, patients receive automatic notification and priority reschedule access.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>4. Governing Law</h2>
              <p style={{ margin: 0 }}>
                These terms are governed by the applicable laws of India and standard digital healthcare operating regulations.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

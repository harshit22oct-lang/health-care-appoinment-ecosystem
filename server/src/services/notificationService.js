// ============================================================
// SERVICE — Notification (Email + Queue Management)
// ============================================================
'use strict';

const nodemailer = require('nodemailer');
const NotificationJob = require('../models/NotificationJob');
const { JOB_TYPE, JOB_STATUS } = require('../models/NotificationJob');
const env = require('../config/env');
const logger = require('../utils/logger');

// ── Transporter (lazy init) ───────────────────────────────────
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!env.SMTP_HOST || !env.SMTP_USER) {
    // Console-logger fallback: pretty-print emails in development
    transporter = {
      sendMail: async (opts) => {
        logger.info('[Email:CONSOLE_MOCK] ─────────────────────────────────');
        logger.info(`  To:      ${opts.to}`);
        logger.info(`  Subject: ${opts.subject}`);
        logger.info(`  Body:    ${opts.html?.substring(0, 200)}...`);
        logger.info('[Email:CONSOLE_MOCK] ─────────────────────────────────');
        return { messageId: `mock-${Date.now()}` };
      },
    };
    logger.warn('[NotificationService] SMTP not configured — using console logger for emails.');
  } else {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
    logger.info('[NotificationService] SMTP transporter initialised.');
  }

  return transporter;
};

/**
 * Send an email directly (supports Resend API & SMTP Transporter)
 */
const sendEmail = async ({ to, subject, html }) => {
  const resendKey = (env.RESEND_API_KEY || process.env.RESEND_API_KEY || '').trim();

  // 1. Direct Resend API (High deliverability, no SMTP port blockage)
  if (resendKey) {
    try {
      const fromAddress = env.EMAIL_FROM_ADDRESS && env.EMAIL_FROM_ADDRESS.includes('@')
        ? `"${env.EMAIL_FROM_NAME || 'HealthSync Platform'}" <${env.EMAIL_FROM_ADDRESS}>`
        : `"${env.EMAIL_FROM_NAME || 'HealthSync Platform'}" <onboarding@resend.dev>`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject,
          html,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Resend API returned status ${res.status}`);
      }
      logger.info(`[NotificationService:Resend] Email delivered to ${to}, ID: ${data.id}`);
      return { messageId: data.id, resend: true };
    } catch (err) {
      logger.error(`[NotificationService:Resend] Failed: ${err.message}`);
      throw err;
    }
  }

  // 2. SMTP Transporter fallback
  const mailer = getTransporter();
  const result = await mailer.sendMail({
    from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html,
  });
  return result;
};

/**
 * Queue a notification job for async delivery (with immediate background dispatch)
 */
const queueNotification = async ({
  type,
  recipientId,
  recipientEmail,
  subject,
  htmlBody,
  appointmentId = null,
  scheduledAt = new Date(),
  metadata = {},
}) => {
  let job = null;
  try {
    job = await NotificationJob.create({
      type,
      recipientId,
      recipientEmail,
      subject,
      htmlBody,
      appointmentId,
      scheduledAt,
      metadata,
      status: JOB_STATUS.QUEUED,
      nextRetryAt: scheduledAt,
    });
    logger.info(`[NotificationService] Queued ${type} for ${recipientEmail}`);
  } catch (err) {
    logger.warn(`[NotificationService] DB job creation skipped: ${err.message}`);
  }

  // Trigger IMMEDIATE background dispatch
  if (recipientEmail) {
    setImmediate(async () => {
      try {
        const result = await sendEmail({ to: recipientEmail, subject, html: htmlBody });
        if (job) {
          try {
            await NotificationJob.findByIdAndUpdate(job._id, {
              status: JOB_STATUS.SENT,
              sentAt: new Date(),
              externalMessageId: result?.messageId || result?.id,
            });
          } catch {}
        }
        logger.info(`[NotificationService] Email dispatched immediately to ${recipientEmail}`);
      } catch (sendErr) {
        logger.error(`[NotificationService] Immediate email failed for ${recipientEmail}: ${sendErr.message}`);
      }
    });
  }

  return job;
};

// ── Email Templates ───────────────────────────────────────────

const templates = {
  appointmentConfirmed: ({
    patientName,
    doctorName,
    specialization = 'Specialist',
    scheduledAt,
    appointmentId = 'HS-74829',
    consultationFee = 750,
    clinicAddress = 'Bansal Hospital & Heart Institute, Shahpura, Bhopal',
    chiefComplaint = 'General Clinical Consultation',
    urgencyLevel = 'Low',
    suggestedDoctorQuestions = [
      'How long have you noticed these specific symptoms?',
      'Are you currently taking any OTC or prescribed medications?',
      'Do you have any related allergies or past medical history?'
    ],
  }) => {
    const formattedDate = new Date(scheduledAt).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const startIso = new Date(scheduledAt).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endIso = new Date(new Date(scheduledAt).getTime() + 30 * 60000).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const calTitle = encodeURIComponent(`Consultation with Dr. ${doctorName}`);
    const calDetails = encodeURIComponent(`HealthSync Appointment ID: ${appointmentId}\nDoctor: Dr. ${doctorName} (${specialization})\nLocation: ${clinicAddress}`);
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&details=${calDetails}&dates=${startIso}/${endIso}`;

    return {
      subject: `✅ Appointment Confirmed (ID: ${appointmentId}) — Dr. ${doctorName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Confirmation</title>
        </head>
        <body style="margin: 0; padding: 24px 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; margin: 0 auto; background-color: #FFFFFF; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
            
            <!-- ── HEADER WITH HEALTHSYNC LOGO & BETA BADGE ── -->
            <tr>
              <td style="padding: 28px 36px; background-color: #FFFFFF; border-bottom: 1.5px solid #F1F5F9;">
                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left">
                      <div style="display: inline-flex; align-items: center;">
                        <span style="font-size: 24px; color: #0284C7; font-weight: 900; letter-spacing: -0.5px;">⚡ Health<span style="color: #0F172A;">Sync</span></span>
                        <span style="margin-left: 10px; background-color: #FEF3C7; color: #92400E; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px; border: 1px solid #FDE68A; text-transform: uppercase;">BETA V1.2</span>
                      </div>
                    </td>
                    <td align="right">
                      <span style="background-color: #ECFDF5; color: #059669; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; border: 1px solid #A7F3D0;">
                        ● CONFIRMED
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ── HERO BANNER ── -->
            <tr>
              <td style="padding: 32px 36px 20px 36px; background: linear-gradient(135deg, #0284C7 0%, #0D9488 100%); color: #FFFFFF;">
                <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #FFFFFF;">Appointment Confirmed! 🎉</h1>
                <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9); line-height: 1.5;">
                  Dear <strong>${patientName}</strong>, your in-clinic consultation has been successfully scheduled and reserved in the hospital queue.
                </p>
              </td>
            </tr>

            <!-- ── ITINERARY & FINANCIAL BREAKDOWN ── -->
            <tr>
              <td style="padding: 28px 36px;">
                
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                  <tr>
                    <td width="50%" style="vertical-align: top; padding-bottom: 16px;">
                      <p style="margin: 0; font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase;">Appointment Reference ID</p>
                      <p style="margin: 3px 0 0 0; font-size: 15px; font-weight: 800; color: #0284C7;">${appointmentId}</p>
                    </td>
                    <td width="50%" style="vertical-align: top; padding-bottom: 16px;">
                      <p style="margin: 0; font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase;">Consultation Fee</p>
                      <p style="margin: 3px 0 0 0; font-size: 15px; font-weight: 800; color: #0F172A;">₹${consultationFee} <span style="font-size: 11px; color: #059669; font-weight: 700;">(OPD Billed)</span></p>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" style="vertical-align: top; border-top: 1px solid #E2E8F0; padding-top: 14px;">
                      <p style="margin: 0; font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase;">Consulting Specialist</p>
                      <p style="margin: 3px 0 0 0; font-size: 14px; font-weight: 800; color: #0F172A;">Dr. ${doctorName}</p>
                      <p style="margin: 1px 0 0 0; font-size: 12px; color: #64748B;">${specialization}</p>
                    </td>
                    <td width="50%" style="vertical-align: top; border-top: 1px solid #E2E8F0; padding-top: 14px;">
                      <p style="margin: 0; font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase;">Date & Scheduled Time</p>
                      <p style="margin: 3px 0 0 0; font-size: 13px; font-weight: 800; color: #0F172A;">${formattedDate}</p>
                      <p style="margin: 1px 0 0 0; font-size: 11px; color: #0284C7; font-weight: 700;">30 Min Duration</p>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="border-top: 1px solid #E2E8F0; padding-top: 14px;">
                      <p style="margin: 0; font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase;">Clinic / Center Location</p>
                      <p style="margin: 3px 0 0 0; font-size: 13px; color: #334155; font-weight: 600;">📍 ${clinicAddress}</p>
                    </td>
                  </tr>
                </table>

                <!-- ── GEMINI AI CLINICAL PRE-VISIT BRIEFING ── -->
                <div style="background-color: #F0F9FF; border: 1.5px solid #BAE6FD; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
                    <tr>
                      <td align="left">
                        <span style="font-size: 13px; font-weight: 800; color: #0369A1;">✨ Gemini AI Pre-Visit Clinical Briefing</span>
                      </td>
                      <td align="right">
                        <span style="background-color: #E0F2FE; color: #0284C7; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 4px; text-transform: uppercase;">
                          ${urgencyLevel} Priority
                        </span>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #0369A1; font-weight: 700;">Chief Complaint Summary:</p>
                  <p style="margin: 0 0 14px 0; font-size: 13px; color: #334155; line-height: 1.4;">${chiefComplaint}</p>

                  <p style="margin: 0 0 6px 0; font-size: 12px; color: #0369A1; font-weight: 700;">Suggested Questions To Ask Dr. ${doctorName}:</p>
                  <ul style="margin: 0; padding-left: 18px; color: #334155; font-size: 12px; line-height: 1.6;">
                    ${suggestedDoctorQuestions.map(q => `<li style="margin-bottom: 4px;">${q}</li>`).join('')}
                  </ul>
                </div>

                <!-- ── CALL TO ACTION BUTTONS ── -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                  <tr>
                    <td align="center" style="padding-right: 6px;">
                      <a href="${googleCalUrl}" target="_blank" style="display: block; background-color: #0284C7; color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 20px; border-radius: 10px; text-align: center;">
                        📅 Add to Google Calendar
                      </a>
                    </td>
                    <td align="center" style="padding-left: 6px;">
                      <a href="https://health-care-appoinment-ecosystem.vercel.app/patient" target="_blank" style="display: block; background-color: #F8FAFC; color: #0F172A; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 20px; border-radius: 10px; text-align: center; border: 1.5px solid #CBD5E1;">
                        🏥 Open Patient Portal
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- ── IMPORTANT PATIENT GUIDELINES ── -->
                <div style="border-top: 1px solid #E2E8F0; padding-top: 18px;">
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: #0F172A; font-weight: 700;">Important Visit Checklist:</p>
                  <p style="margin: 0; font-size: 11px; color: #64748B; line-height: 1.6;">
                    • Please arrive 10 minutes prior to your scheduled slot for vital checks.<br>
                    • Bring valid Government Photo ID and previous medical reports or prescription history.<br>
                    • For 24/7 hospital ambulance or emergency inquiries, call our toll-free helpline at <strong>1800-419-7979</strong>.
                  </p>
                </div>

              </td>
            </tr>

            <!-- ── FOOTER ── -->
            <tr>
              <td style="padding: 20px 36px; background-color: #0F172A; text-align: center; color: #94A3B8; font-size: 11px; line-height: 1.5;">
                <p style="margin: 0; font-weight: 600; color: #E2E8F0;">HealthSync Intelligent Healthcare Platform</p>
                <p style="margin: 4px 0 0 0; color: #64748B;">© 2026 HealthSync Inc. All rights reserved. · HIPAA & DPDP Compliant</p>
              </td>
            </tr>

          </table>
        </body>
        </html>
      `,
    };
  },

  doctorLeaveNotice: ({ patientName, doctorName, originalDate, rescheduleToken, rescheduleLink }) => ({
    subject: `⚠️ Appointment Cancelled — Dr. ${doctorName} is on Leave`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px 40px;">
          <h1 style="margin: 0; color: white; font-size: 24px;">HealthSync</h1>
        </div>
        <div style="padding: 36px 40px;">
          <h2 style="color: #f59e0b; margin-top: 0;">Important: Appointment Update</h2>
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>We regret to inform you that your appointment with <strong>Dr. ${doctorName}</strong> on <strong>${new Date(originalDate).toLocaleDateString('en-IN')}</strong> has been cancelled due to the doctor being on scheduled leave.</p>
          <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 12px;"><strong>Priority Rescheduling Available</strong></p>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">You have been given priority access to reschedule with another doctor or a later date.</p>
          </div>
          <a href="${rescheduleLink}" style="display: inline-block; background: linear-gradient(135deg, #14b8a6, #0891b2); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
            Reschedule Now (Priority Access)
          </a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">This rescheduling link is valid for 7 days.</p>
        </div>
      </div>
    `,
  }),

  medicationReminder: ({ patientName, medicationName, dosage, instructions, time }) => ({
    subject: `💊 Medication Reminder — ${medicationName} at ${time}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #14b8a6, #10b981); padding: 32px 40px;">
          <h1 style="margin: 0; color: white; font-size: 24px;">💊 Medication Reminder</h1>
        </div>
        <div style="padding: 36px 40px;">
          <p>Hi <strong>${patientName}</strong>,</p>
          <p>This is a reminder to take your medication:</p>
          <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 8px 0; font-size: 18px;"><strong>${medicationName}</strong> — ${dosage}</p>
            <p style="margin: 8px 0; color: #94a3b8;">${instructions}</p>
            <p style="margin: 8px 0;"><strong>Time:</strong> ${time}</p>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">Stay consistent with your medication schedule for optimal recovery.</p>
        </div>
      </div>
    `,
  }),
};

module.exports = { sendEmail, queueNotification, templates, JOB_TYPE };

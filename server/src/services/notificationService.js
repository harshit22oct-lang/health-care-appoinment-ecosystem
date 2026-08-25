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
      month: 'short',
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
      subject: `Confirmed: Consultation with Dr. ${doctorName} (${appointmentId})`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Confirmation</title>
        </head>
        <body style="margin: 0; padding: 40px 16px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1E293B;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden;">
            
            <!-- ── MINIMAL STRIPE-STYLE BRAND BAR ── -->
            <tr>
              <td style="padding: 32px 40px 24px 40px; border-bottom: 1px solid #F1F5F9;">
                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" style="vertical-align: middle;">
                      <span style="font-size: 18px; font-weight: 800; color: #0F172A; letter-spacing: -0.4px;">
                        Health<span style="color: #0284C7;">Sync</span>
                      </span>
                      <span style="display: inline-block; margin-left: 8px; vertical-align: middle; font-size: 10px; font-weight: 700; background: #F1F5F9; color: #475569; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.04em;">BETA V1.2</span>
                    </td>
                    <td align="right" style="vertical-align: middle;">
                      <span style="font-size: 12px; font-weight: 600; color: #059669; background: #ECFDF5; padding: 4px 10px; border-radius: 20px; border: 1px solid #A7F3D0;">
                        Confirmed
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ── BODY CONTENT ── -->
            <tr>
              <td style="padding: 36px 40px 28px 40px;">
                
                <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px; line-height: 1.3;">
                  Your appointment is confirmed.
                </h1>
                <p style="margin: 0 0 28px 0; font-size: 14px; color: #475569; line-height: 1.5;">
                  Hi ${patientName}, you are confirmed for an in-clinic medical consultation with <strong>Dr. ${doctorName}</strong>. A summary and calendar invitation are provided below.
                </p>

                <!-- ── STRIPE-STYLE RECEIPT & SCHEDULE CARD ── -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 28px;">
                  <tr>
                    <td style="padding: 20px;">
                      
                      <!-- Row 1: Doctor & Date -->
                      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                        <tr>
                          <td width="50%" style="vertical-align: top;">
                            <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">Doctor</div>
                            <div style="font-size: 14px; font-weight: 700; color: #0F172A; margin-top: 3px;">Dr. ${doctorName}</div>
                            <div style="font-size: 12px; color: #64748B; margin-top: 1px;">${specialization}</div>
                          </td>
                          <td width="50%" style="vertical-align: top;">
                            <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">Date & Time</div>
                            <div style="font-size: 14px; font-weight: 700; color: #0F172A; margin-top: 3px;">${formattedDate}</div>
                            <div style="font-size: 12px; color: #0284C7; font-weight: 600; margin-top: 1px;">30 min consultation</div>
                          </td>
                        </tr>
                      </table>

                      <!-- Divider -->
                      <div style="border-top: 1px solid #E2E8F0; margin-bottom: 16px;"></div>

                      <!-- Row 2: Location & Amount -->
                      <table width="100%" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50%" style="vertical-align: top;">
                            <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">Location</div>
                            <div style="font-size: 12px; font-weight: 500; color: #334155; margin-top: 3px; line-height: 1.4;">${clinicAddress}</div>
                          </td>
                          <td width="50%" style="vertical-align: top;">
                            <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">Amount & Ref</div>
                            <div style="font-size: 14px; font-weight: 700; color: #0F172A; margin-top: 3px;">₹${consultationFee}.00</div>
                            <div style="font-size: 11px; color: #64748B; margin-top: 1px;">Ref: ${appointmentId}</div>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>
                </table>

                <!-- ── LINEAR-STYLE AI CLINICAL NOTE ── -->
                <div style="border-left: 2px solid #0284C7; padding-left: 16px; margin-bottom: 32px;">
                  <div style="font-size: 12px; font-weight: 700; color: #0F172A; margin-bottom: 4px; display: flex; align-items: center;">
                    Gemini AI Clinical Summary · <span style="font-weight: 500; color: #64748B; margin-left: 4px;">${urgencyLevel} Urgency</span>
                  </div>
                  <div style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 8px;">
                    ${chiefComplaint}
                  </div>
                  <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;">Suggested Briefing Points:</div>
                  <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #475569; line-height: 1.6;">
                    ${suggestedDoctorQuestions.map(q => `<li>${q}</li>`).join('')}
                  </ul>
                </div>

                <!-- ── STRIPE / APPLE CLEAN ACTION BUTTONS ── -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                  <tr>
                    <td>
                      <a href="${googleCalUrl}" target="_blank" style="display: block; background-color: #0F172A; color: #FFFFFF; font-size: 13px; font-weight: 600; text-align: center; text-decoration: none; padding: 12px 24px; border-radius: 8px; letter-spacing: -0.1px;">
                        Add to Google Calendar
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 10px; text-align: center;">
                      <a href="https://health-care-appoinment-ecosystem.vercel.app/patient" target="_blank" style="font-size: 12px; font-weight: 600; color: #0284C7; text-decoration: none;">
                        Manage in HealthSync Dashboard &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- ── MINIMAL CLASSIC FOOTER ── -->
            <tr>
              <td style="padding: 24px 40px; background-color: #F8FAFC; border-top: 1px solid #F1F5F9; font-size: 11px; color: #64748B; line-height: 1.6;">
                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left">
                      <strong>HealthSync Technologies, Inc.</strong><br>
                      Encrypted & HIPAA Compliant Healthcare Delivery<br>
                      Need assistance? 24/7 Helpline: 1800-419-7979
                    </td>
                  </tr>
                </table>
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

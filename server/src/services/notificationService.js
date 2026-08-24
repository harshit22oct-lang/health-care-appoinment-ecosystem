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
 * Send an email directly (used by retry worker)
 */
const sendEmail = async ({ to, subject, html }) => {
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
 * Queue a notification job for async delivery
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
  const job = await NotificationJob.create({
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
  logger.debug(`[NotificationService] Queued ${type} for ${recipientEmail} (job: ${job._id})`);
  return job;
};

// ── Email Templates ───────────────────────────────────────────

const templates = {
  appointmentConfirmed: ({ patientName, doctorName, specialization, scheduledAt, appointmentId }) => ({
    subject: `✅ Appointment Confirmed — Dr. ${doctorName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #14b8a6, #0891b2); padding: 32px 40px;">
          <h1 style="margin: 0; color: white; font-size: 24px;">HealthSync</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Your health, our priority</p>
        </div>
        <div style="padding: 36px 40px;">
          <h2 style="color: #10b981; margin-top: 0;">Appointment Confirmed! 🎉</h2>
          <p>Dear <strong>${patientName}</strong>,</p>
          <p>Your appointment has been successfully booked. Here are your details:</p>
          <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #14b8a6;">
            <p style="margin: 8px 0;"><strong>Doctor:</strong> Dr. ${doctorName} (${specialization})</p>
            <p style="margin: 8px 0;"><strong>Date & Time:</strong> ${new Date(scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })}</p>
            <p style="margin: 8px 0;"><strong>Reference ID:</strong> ${appointmentId}</p>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">Please arrive 10 minutes early. Bring any previous medical records or reports.</p>
        </div>
        <div style="padding: 20px 40px; background: #0f172a; border-top: 1px solid #1e293b; text-align: center; color: #64748b; font-size: 12px;">
          <p>HealthSync Platform · Secure Healthcare Management</p>
        </div>
      </div>
    `,
  }),

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

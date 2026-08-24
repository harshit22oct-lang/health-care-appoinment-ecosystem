// ============================================================
// MODEL — NotificationJob (Retry Queue)
// ============================================================
'use strict';

const mongoose = require('mongoose');

const JOB_TYPE = {
  APPOINTMENT_CONFIRMED:   'APPOINTMENT_CONFIRMED',
  APPOINTMENT_CANCELLED:   'APPOINTMENT_CANCELLED',
  MEDICATION_REMINDER:     'MEDICATION_REMINDER',
  RESCHEDULE_INVITATION:   'RESCHEDULE_INVITATION',
  DOCTOR_LEAVE_NOTICE:     'DOCTOR_LEAVE_NOTICE',
  FOLLOW_UP_REMINDER:      'FOLLOW_UP_REMINDER',
  AI_ANALYSIS_READY:       'AI_ANALYSIS_READY',
};

const JOB_STATUS = {
  QUEUED:      'QUEUED',
  PROCESSING:  'PROCESSING',
  SENT:        'SENT',
  FAILED:      'FAILED',
  DEAD_LETTER: 'DEAD_LETTER',
};

const errorLogEntrySchema = new mongoose.Schema({
  attemptAt: { type: Date, default: Date.now },
  error:     { type: String },
}, { _id: false });

const notificationJobSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: Object.values(JOB_TYPE),
    required: true,
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  recipientEmail: {
    type: String,
    required: true,
    lowercase: true,
  },
  subject:  { type: String, required: true },
  htmlBody: { type: String, required: true },

  scheduledAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: Object.values(JOB_STATUS),
    default: JOB_STATUS.QUEUED,
  },

  // Retry mechanics
  attempts:    { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  lastAttemptAt: { type: Date },
  nextRetryAt: { type: Date, default: Date.now },

  errorLog: { type: [errorLogEntrySchema], default: [] },
  sentAt:   { type: Date },

  // References
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────
notificationJobSchema.index({ status: 1, nextRetryAt: 1 });
notificationJobSchema.index({ recipientId: 1 });
notificationJobSchema.index({ appointmentId: 1 }, { sparse: true });
notificationJobSchema.index({ type: 1, scheduledAt: 1 });

/**
 * Calculate next retry time using exponential backoff:
 * Attempt 1 → +1min, 2 → +5min, 3 → +15min, 4 → +1hr, 5+ → DEAD_LETTER
 */
notificationJobSchema.methods.calculateNextRetry = function () {
  const BACKOFF_MS = [
    1   * 60 * 1000,  // 1 minute
    5   * 60 * 1000,  // 5 minutes
    15  * 60 * 1000,  // 15 minutes
    60  * 60 * 1000,  // 1 hour
  ];
  const idx = Math.min(this.attempts - 1, BACKOFF_MS.length - 1);
  return new Date(Date.now() + BACKOFF_MS[idx]);
};

module.exports = mongoose.model('NotificationJob', notificationJobSchema);
module.exports.JOB_TYPE = JOB_TYPE;
module.exports.JOB_STATUS = JOB_STATUS;

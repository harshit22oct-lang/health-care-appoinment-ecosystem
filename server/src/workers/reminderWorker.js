// ============================================================
// WORKER — Medication Reminder Scheduler (runs every 5 minutes)
// Queues reminder emails for medications due in the next window
// ============================================================
'use strict';

const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const { APPOINTMENT_STATUS } = require('../models/Appointment');
const User = require('../models/User');
const { queueNotification, templates, JOB_TYPE } = require('../services/notificationService');
const { formatTime12h } = require('../utils/reminderTimeParser');
const logger = require('../utils/logger');

/**
 * Check if current time matches a reminder time (within a 5-minute window)
 */
const isReminderDue = (reminderTime) => {
  const now = new Date();
  const [h, m] = reminderTime.split(':').map(Number);
  const reminderMs = h * 60 * 60 * 1000 + m * 60 * 1000;
  const nowMs = (now.getUTCHours() * 60 + now.getUTCMinutes()) * 60 * 1000;
  const diff = Math.abs(nowMs - reminderMs);
  return diff < 5 * 60 * 1000; // within 5 minutes
};

const processReminders = async () => {
  try {
    // Find all completed appointments with active prescriptions
    // (within the last 30 days — medication duration)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const appointments = await Appointment.find({
      status: APPOINTMENT_STATUS.COMPLETED,
      'prescription.medications': { $exists: true, $ne: [] },
      updatedAt: { $gte: thirtyDaysAgo },
    }).populate('patientId', 'firstName lastName email');

    let remindersQueued = 0;

    for (const appt of appointments) {
      const patient = appt.patientId;
      if (!patient) continue;

      for (const med of (appt.prescription?.medications || [])) {
        if (!med.reminderTimes?.length) continue;

        for (const time of med.reminderTimes) {
          if (isReminderDue(time)) {
            // Check medication is still active (within durationDays)
            const prescriptionDate = appt.updatedAt;
            const daysSincePrescription = Math.floor(
              (Date.now() - prescriptionDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (med.durationDays && daysSincePrescription >= med.durationDays) continue;

            const { subject, html } = templates.medicationReminder({
              patientName: `${patient.firstName} ${patient.lastName}`,
              medicationName: med.name,
              dosage: med.dosage || '',
              instructions: med.timing === 'after_food'
                ? 'Take after meals'
                : med.specialInstructions || 'As prescribed',
              time: formatTime12h(time),
            });

            await queueNotification({
              type: JOB_TYPE.MEDICATION_REMINDER,
              recipientId: patient._id,
              recipientEmail: patient.email,
              subject,
              htmlBody: html,
              appointmentId: appt._id,
              scheduledAt: new Date(),
              metadata: { medicationName: med.name, reminderTime: time },
            });

            remindersQueued++;
          }
        }
      }
    }

    if (remindersQueued > 0) {
      logger.info(`[ReminderWorker] Queued ${remindersQueued} medication reminder(s).`);
    }
  } catch (err) {
    logger.error(`[ReminderWorker] Error: ${err.message}`);
  }
};

const startReminderWorker = () => {
  cron.schedule('*/5 * * * *', processReminders, { name: 'medication-reminder' });
  logger.info('[ReminderWorker] Started — runs every 5 minutes.');
};

module.exports = { startReminderWorker };

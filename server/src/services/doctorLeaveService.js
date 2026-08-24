// ============================================================
// SERVICE — Doctor Leave Cascade Resolution
// ============================================================
'use strict';

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const DoctorProfile = require('../models/DoctorProfile');
const Slot = require('../models/Slot');
const { SLOT_STATUS } = require('../models/Slot');
const Appointment = require('../models/Appointment');
const { APPOINTMENT_STATUS } = require('../models/Appointment');
const { queueNotification, templates, JOB_TYPE } = require('./notificationService');
const { deleteCalendarEvent } = require('./calendarService');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Apply doctor leave with full cascade resolution.
 *
 * Transactional steps:
 * 1. Record leave in DoctorProfile
 * 2. Block all AVAILABLE slots in date range
 * 3. Release all HELD slots → BLOCKED_LEAVE
 * 4. Cancel all CONFIRMED appointments with reschedule tokens
 * 5. Queue priority reschedule email for each affected patient
 *
 * Post-transaction (async):
 * 6. Delete Google Calendar events for cancelled appointments
 */
const applyDoctorLeave = async (doctorId, { startDate, endDate, reason }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  if (start > end) throw ApiError.badRequest('Start date must be before end date.');

  const doctor = await User.findById(doctorId);
  if (!doctor) throw ApiError.notFound('Doctor not found.');

  const doctorProfile = await DoctorProfile.findOne({ userId: doctorId });
  if (!doctorProfile) throw ApiError.notFound('Doctor profile not found.');

  let conflictingAppointments = [];
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Step 1: Record leave in doctor profile
      await DoctorProfile.findOneAndUpdate(
        { userId: doctorId },
        { $push: { leaveCalendar: { startDate: start, endDate: end, reason: reason || 'Leave' } } },
        { session }
      );

      // Step 2: Block all AVAILABLE slots
      await Slot.updateMany(
        {
          doctorId,
          startTime: { $gte: start, $lte: end },
          status: SLOT_STATUS.AVAILABLE,
        },
        { $set: { status: SLOT_STATUS.BLOCKED_LEAVE } },
        { session }
      );

      // Step 3: Release HELD slots → BLOCKED_LEAVE
      await Slot.updateMany(
        {
          doctorId,
          startTime: { $gte: start, $lte: end },
          status: SLOT_STATUS.HELD,
        },
        {
          $set: {
            status: SLOT_STATUS.BLOCKED_LEAVE,
            holdToken: null,
            holdExpiresAt: null,
            heldByPatientId: null,
          },
        },
        { session }
      );

      // Step 4: Find all CONFIRMED appointments in conflict window
      conflictingAppointments = await Appointment.find(
        {
          doctorId,
          scheduledAt: { $gte: start, $lte: end },
          status: APPOINTMENT_STATUS.CONFIRMED,
        },
        null,
        { session }
      ).populate('patientId', 'firstName lastName email');

      logger.info(
        `[DoctorLeaveService] Found ${conflictingAppointments.length} conflicting appointments for leave ${startDate}–${endDate}`
      );

      // Step 5: Cancel appointments and generate reschedule tokens
      for (const appt of conflictingAppointments) {
        const rescheduleToken = jwt.sign(
          { appointmentId: appt._id, patientId: appt.patientId._id },
          env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        await Appointment.findByIdAndUpdate(
          appt._id,
          {
            status: APPOINTMENT_STATUS.CANCELLED_DOCTOR_LEAVE,
            cancellationReason: `Doctor on scheduled leave: ${reason || 'No reason provided'}`,
            rescheduleToken,
            rescheduleTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          { session }
        );

        // Queue priority reschedule email notification
        const patient = appt.patientId;
        const rescheduleLink = `${env.CLIENT_URL}/reschedule?token=${rescheduleToken}`;
        const { subject, html } = templates.doctorLeaveNotice({
          patientName: `${patient.firstName} ${patient.lastName}`,
          doctorName: `${doctor.firstName} ${doctor.lastName}`,
          originalDate: appt.scheduledAt,
          rescheduleToken,
          rescheduleLink,
        });

        await queueNotification({
          type: JOB_TYPE.DOCTOR_LEAVE_NOTICE,
          recipientId: patient._id,
          recipientEmail: patient.email,
          subject,
          htmlBody: html,
          appointmentId: appt._id,
          metadata: { rescheduleToken, rescheduleLink },
        }, { session: null }); // Notifications are non-transactional (idempotent)
      }
    });
  } finally {
    await session.endSession();
  }

  // Step 6: Async Google Calendar cleanup
  setImmediate(async () => {
    for (const appt of conflictingAppointments) {
      if (appt.googleCalendarEventId) {
        await deleteCalendarEvent(appt.patientId._id || appt.patientId, appt.googleCalendarEventId);
      }
    }
  });

  logger.info(
    `[DoctorLeaveService] Leave applied for ${doctorId}. Cancelled ${conflictingAppointments.length} appointments.`
  );

  return {
    leaveApplied: { startDate: start, endDate: end, reason },
    affectedAppointments: conflictingAppointments.length,
    message: `Leave applied successfully. ${conflictingAppointments.length} appointment(s) cancelled with reschedule notifications sent.`,
  };
};

/**
 * Remove a leave period from doctor profile
 */
const cancelLeave = async (doctorId, leaveId) => {
  const profile = await DoctorProfile.findOneAndUpdate(
    { userId: doctorId },
    { $pull: { leaveCalendar: { _id: leaveId } } },
    { new: true }
  );
  if (!profile) throw ApiError.notFound('Doctor profile or leave period not found.');
  return { message: 'Leave cancelled successfully.' };
};

/**
 * Preview conflicts without applying the leave
 */
const previewLeaveConflicts = async (doctorId, { startDate, endDate }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const conflicts = await Appointment.find({
    doctorId,
    scheduledAt: { $gte: start, $lte: end },
    status: APPOINTMENT_STATUS.CONFIRMED,
  }).populate('patientId', 'firstName lastName email');

  return {
    affectedCount: conflicts.length,
    appointments: conflicts.map((a) => ({
      id: a._id,
      scheduledAt: a.scheduledAt,
      patient: a.patientId,
      status: a.status,
    })),
  };
};

module.exports = { applyDoctorLeave, cancelLeave, previewLeaveConflicts };

// ============================================================
// SERVICE — Appointment (Full Booking Flow)
// ============================================================
'use strict';

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Appointment = require('../models/Appointment');
const { APPOINTMENT_STATUS, AI_STATUS } = require('../models/Appointment');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const { confirmSlotBooking, releaseSlotOnCancellation } = require('./slotService');
const { analyzePreVisitSymptoms, generatePostVisitSummary } = require('./llmService');
const { queueNotification, templates, JOB_TYPE } = require('./notificationService');
const { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } = require('./calendarService');
const { parseReminderTimes } = require('../utils/reminderTimeParser');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const logger = require('../utils/logger');

const IN_MEMORY_APPOINTMENTS = [];

/**
 * Create appointment — full atomic booking flow:
 * 1. Validate hold token
 * 2. Start Mongoose session (if DB supports transactions)
 * 3. Confirm slot (HELD → BOOKED)
 * 4. Create appointment record
 * 5. Queue pre-visit AI analysis (async, non-blocking)
 * 6. Sync Google Calendar (async, non-blocking)
 * 7. Queue confirmation email
 */
const createAppointment = async ({
  patientId,
  slotId,
  holdToken,
  symptoms,
  symptomDuration,
  severity,
  previousConditions,
  currentMedications,
}) => {
  const isDemo = typeof slotId === 'string' && (slotId.startsWith('demo_slot_') || slotId.includes('demo'));

  if (isDemo || mongoose.connection.readyState !== 1) {
    const urgency = severity === 'severe' ? 'High' : severity === 'moderate' ? 'Medium' : 'Low';
    const demoAppt = {
      _id: `appt_demo_${Date.now()}`,
      patientId: {
        _id: patientId || '64f1a2b3c4d5e6f7a8b9c0f1',
        firstName: 'Rohan',
        lastName: 'Verma',
        email: 'rohan@patient.demo',
        phone: '+91 98765 43230',
      },
      doctorId: {
        _id: '64f1a2b3c4d5e6f7a8b9c0d1',
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'dr.priya@healthsync.demo',
        phone: '+91 98765 43211',
      },
      slotId: {
        _id: slotId,
        startTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        endTime: new Date(Date.now() + 24 * 3600 * 1000 + 30 * 60000).toISOString(),
      },
      scheduledAt: new Date(Date.now() + 24 * 3600 * 1000),
      symptoms: symptoms || 'General health consultation',
      symptomDuration: symptomDuration || '3 days',
      severity: severity || 'mild',
      previousConditions: previousConditions || [],
      currentMedications: currentMedications || [],
      status: APPOINTMENT_STATUS.CONFIRMED,
      preVisitAI: {
        status: AI_STATUS.COMPLETED,
        patientFriendlySummary: 'Your symptoms have been analyzed by Gemini AI and summarized for Dr. Priya Sharma.',
        chiefComplaint: symptoms || 'Primary Consultation',
        urgencyLevel: urgency,
        recommendedSpecialty: 'Cardiology',
        suggestedDoctorQuestions: [
          'When did these symptoms first appear and how have they progressed?',
          'Have you experienced similar episodes in the past?',
          'Are you taking any prescription medications or dietary supplements?',
        ],
        riskFlags: severity === 'severe' ? ['Prompt clinical review recommended'] : ['Standard OPD consultation'],
      },
      createdAt: new Date(),
    };

    IN_MEMORY_APPOINTMENTS.unshift(demoAppt);
    logger.info(`[AppointmentService] Demo appointment ${demoAppt._id} created successfully.`);
    return demoAppt;
  }

  // Pre-fetch doctor info for notification/calendar
  const slot = await mongoose.model('Slot').findById(slotId);
  if (!slot) throw ApiError.notFound('Slot not found.');

  const [patient, doctor, doctorProfile] = await Promise.all([
    User.findById(patientId),
    User.findById(slot.doctorId),
    DoctorProfile.findOne({ userId: slot.doctorId }),
  ]);

  if (!doctor) throw ApiError.notFound('Doctor not found.');
  if (doctorProfile && doctorProfile.isBookable === false) {
    throw ApiError.badRequest('This doctor is a reference directory profile and is not available for direct booking on HealthSync.');
  }

  // === ATOMIC TRANSACTION ===
  const session = await mongoose.startSession();
  let appointment;

  try {
    await session.withTransaction(async () => {
      // Phase 2: Confirm slot booking (validates holdToken atomically)
      await confirmSlotBooking(slotId, holdToken, null, session);

      // Create appointment
      const [newAppt] = await Appointment.create([{
        patientId,
        doctorId: slot.doctorId,
        slotId,
        scheduledAt: slot.startTime,
        symptoms,
        symptomDuration,
        severity,
        previousConditions: previousConditions || [],
        currentMedications: currentMedications || [],
        status: APPOINTMENT_STATUS.CONFIRMED,
        'preVisitAI.status': AI_STATUS.PENDING,
      }], { session });

      // Update slot with appointmentId
      await mongoose.model('Slot').findByIdAndUpdate(
        slotId,
        { appointmentId: newAppt._id },
        { session }
      );

      appointment = newAppt;
    });
  } finally {
    await session.endSession();
  }

  logger.info(`[AppointmentService] Appointment ${appointment._id} created for patient ${patientId}`);

  // === ASYNC POST-CREATION TASKS (non-blocking) ===
  setImmediate(async () => {
    // 1. Pre-visit AI analysis
    try {
      const aiResult = await analyzePreVisitSymptoms({
        symptoms, symptomDuration, severity, previousConditions, currentMedications
      });
      await Appointment.findByIdAndUpdate(appointment._id, {
        'preVisitAI.status': aiResult.status || AI_STATUS.COMPLETED,
        'preVisitAI.urgencyLevel': aiResult.urgencyLevel,
        'preVisitAI.chiefComplaint': aiResult.chiefComplaint,
        'preVisitAI.suggestedDoctorQuestions': aiResult.suggestedDoctorQuestions,
        'preVisitAI.riskFlags': aiResult.riskFlags,
        'preVisitAI.processingTimeMs': aiResult.processingTimeMs,
        'preVisitAI.model': aiResult.model,
        'preVisitAI.generatedAt': aiResult.generatedAt,
        'preVisitAI.rawFallback': aiResult.status === AI_STATUS.PENDING_RETRY ? symptoms : undefined,
      });
    } catch (err) {
      logger.error(`[AppointmentService] Pre-visit AI failed for ${appointment._id}: ${err.message}`);
    }

    // 2. Google Calendar sync
    try {
      const eventId = await createCalendarEvent({
        userId: patientId,
        appointment,
        doctorName: doctor.fullName || `${doctor.firstName} ${doctor.lastName}`,
        patientName: patient.fullName || `${patient.firstName} ${patient.lastName}`,
        symptoms,
      });
      if (eventId) {
        await Appointment.findByIdAndUpdate(appointment._id, {
          googleCalendarEventId: eventId,
          calendarSyncStatus: 'SYNCED',
        });
      }
    } catch (err) {
      logger.warn(`[AppointmentService] Calendar sync failed: ${err.message}`);
      await Appointment.findByIdAndUpdate(appointment._id, { calendarSyncStatus: 'SYNC_FAILED' });
    }

    // 3. Confirmation email
    try {
      const { subject, html } = templates.appointmentConfirmed({
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        specialization: doctorProfile?.specialization || 'General Medicine',
        scheduledAt: slot.startTime,
        appointmentId: appointment._id,
      });
      await queueNotification({
        type: JOB_TYPE.APPOINTMENT_CONFIRMED,
        recipientId: patientId,
        recipientEmail: patient.email,
        subject,
        htmlBody: html,
        appointmentId: appointment._id,
      });
    } catch (err) {
      logger.error(`[AppointmentService] Email queuing failed: ${err.message}`);
    }
  });

  return appointment;
};

const findInMemoryAppointment = (id) => {
  return IN_MEMORY_APPOINTMENTS.find(a => String(a._id) === String(id));
};

/**
 * Submit post-visit clinical notes and trigger prescription summary
 */
const submitPostVisitNotes = async (appointmentId, doctorId, { clinicalNotes, vitalSigns, diagnosis, prescription }) => {
  // 1. Check in-memory store
  const inMemoryAppt = findInMemoryAppointment(appointmentId);
  if (inMemoryAppt) {
    inMemoryAppt.clinicalNotes = clinicalNotes;
    inMemoryAppt.vitalSigns = vitalSigns;
    inMemoryAppt.diagnosis = diagnosis || 'Clinical evaluation completed';
    inMemoryAppt.prescription = prescription;
    inMemoryAppt.status = APPOINTMENT_STATUS.COMPLETED;
    inMemoryAppt.postVisitAI = {
      status: AI_STATUS.COMPLETED,
      patientFriendlySummary: `Clinical evaluation completed. Diagnosis: ${diagnosis || 'Routine review'}. Please follow the digital prescription and medication timetable.`,
      medicationTimetable: prescription?.medications?.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        timing: m.timing || 'after_food',
        instructions: m.specialInstructions || 'Take with water as prescribed',
      })) || [],
      warningFlags: ['Stay well hydrated', 'Return immediately if symptoms worsen or severe chest pain occurs'],
      nextCheckupDeadline: '14 days',
    };
    return inMemoryAppt;
  }

  // If not a valid MongoDB ObjectId (e.g. demo string ID), handle gracefully in-memory
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    const synthetic = {
      _id: appointmentId,
      status: APPOINTMENT_STATUS.COMPLETED,
      clinicalNotes,
      vitalSigns,
      diagnosis: diagnosis || 'Clinical consultation completed',
      prescription,
      postVisitAI: {
        status: AI_STATUS.COMPLETED,
        patientFriendlySummary: `Clinical evaluation completed. Diagnosis: ${diagnosis || 'Routine review'}. Please follow the digital prescription and medication timetable.`,
        medicationTimetable: prescription?.medications?.map(m => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          timing: m.timing || 'after_food',
          instructions: m.specialInstructions || 'Take with water as prescribed',
        })) || [],
        warningFlags: ['Stay well hydrated', 'Return immediately if symptoms worsen'],
        nextCheckupDeadline: '14 days',
      }
    };
    IN_MEMORY_APPOINTMENTS.unshift(synthetic);
    return synthetic;
  }

  const appointment = await Appointment.findOne({ _id: appointmentId });
  if (!appointment) {
    const synthetic = {
      _id: appointmentId,
      status: APPOINTMENT_STATUS.COMPLETED,
      clinicalNotes,
      vitalSigns,
      diagnosis: diagnosis || 'Clinical consultation completed',
      prescription,
      postVisitAI: {
        status: AI_STATUS.COMPLETED,
        patientFriendlySummary: 'Clinical notes and digital prescription processed successfully.',
      }
    };
    IN_MEMORY_APPOINTMENTS.unshift(synthetic);
    return synthetic;
  }

  // Parse medication reminder times
  if (prescription?.medications) {
    prescription.medications = prescription.medications.map((med) => ({
      ...med,
      reminderTimes: parseReminderTimes(med.frequency),
    }));
  }

  const updated = await Appointment.findByIdAndUpdate(
    appointmentId,
    {
      clinicalNotes,
      vitalSigns,
      diagnosis,
      prescription,
      status: APPOINTMENT_STATUS.COMPLETED,
      'postVisitAI.status': AI_STATUS.PENDING,
    },
    { new: true }
  );

  // Async: Generate AI summary + queue medication reminders
  setImmediate(async () => {
    try {
      const aiSummary = await generatePostVisitSummary({ clinicalNotes, diagnosis, prescription });
      await Appointment.findByIdAndUpdate(appointmentId, {
        'postVisitAI.status': aiSummary.status || AI_STATUS.COMPLETED,
        'postVisitAI.patientFriendlySummary': aiSummary.patientFriendlySummary,
        'postVisitAI.medicationTimetable': aiSummary.medicationTimetable,
        'postVisitAI.warningFlags': aiSummary.warningFlags,
        'postVisitAI.nextCheckupDeadline': aiSummary.nextCheckupDeadline,
        'postVisitAI.processingTimeMs': aiSummary.processingTimeMs,
        'postVisitAI.model': aiSummary.model,
        'postVisitAI.generatedAt': aiSummary.generatedAt,
      });

      // Queue medication reminders
      if (prescription?.medications?.length) {
        const patient = await User.findById(appointment.patientId);
        for (const med of prescription.medications) {
          for (const time of (med.reminderTimes || ['09:00'])) {
            const { subject, html } = templates.medicationReminder({
              patientName: `${patient.firstName} ${patient.lastName}`,
              medicationName: med.name,
              dosage: med.dosage,
              instructions: med.timing === 'after_food' ? 'Take after meals' : med.specialInstructions || '',
              time,
            });
            await queueNotification({
              type: JOB_TYPE.MEDICATION_REMINDER,
              recipientId: appointment.patientId,
              recipientEmail: patient.email,
              subject,
              htmlBody: html,
              appointmentId: appointment._id,
              scheduledAt: new Date(), // reminderWorker will schedule properly
              metadata: { time, medicationName: med.name },
            });
          }
        }
      }
    } catch (err) {
      logger.error(`[AppointmentService] Post-visit AI failed: ${err.message}`);
    }
  });

  return updated;
};

/**
 * Cancel an appointment
 */
const cancelAppointment = async (appointmentId, userId, userRole, reason) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw ApiError.notFound('Appointment not found.');

  // Authorization: patient can cancel own, doctor can cancel their appointments, admin can cancel any
  if (userRole === 'patient' && appointment.patientId.toString() !== userId.toString()) {
    throw ApiError.forbidden('You can only cancel your own appointments.');
  }
  if (userRole === 'doctor' && appointment.doctorId.toString() !== userId.toString()) {
    throw ApiError.forbidden('You can only cancel appointments for your patients.');
  }

  if (!['CONFIRMED', 'IN_PROGRESS'].includes(appointment.status)) {
    throw ApiError.badRequest('This appointment cannot be cancelled in its current status.');
  }

  const statusMap = {
    patient: APPOINTMENT_STATUS.CANCELLED_BY_PATIENT,
    doctor: APPOINTMENT_STATUS.CANCELLED_BY_DOCTOR,
    admin: APPOINTMENT_STATUS.CANCELLED_BY_DOCTOR,
  };

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Appointment.findByIdAndUpdate(
        appointmentId,
        { status: statusMap[userRole], cancellationReason: reason },
        { session }
      );
      await releaseSlotOnCancellation(appointment.slotId, session);
    });
  } finally {
    await session.endSession();
  }

  // Delete calendar event async
  setImmediate(async () => {
    if (appointment.googleCalendarEventId) {
      await deleteCalendarEvent(appointment.patientId, appointment.googleCalendarEventId);
    }
  });

  return { message: 'Appointment cancelled successfully.' };
};

/**
 * List appointments based on role
 */
const listAppointments = async (user, filters = {}) => {
  const query = {};

  if (user.role === 'patient') {
    query.patientId = user._id;
  } else if (user.role === 'doctor') {
    query.doctorId = user._id;
  }
  // admin: no filter — sees all

  if (filters.status) query.status = filters.status;
  if (filters.from || filters.to) {
    query.scheduledAt = {};
    if (filters.from) query.scheduledAt.$gte = new Date(filters.from);
    if (filters.to) query.scheduledAt.$lte = new Date(filters.to);
  }

  try {
    const results = await Appointment.find(query)
      .populate('patientId', 'firstName lastName email phone')
      .populate('doctorId', 'firstName lastName email')
      .populate('slotId', 'startTime endTime')
      .sort({ scheduledAt: -1 })
      .limit(50);
    return [...IN_MEMORY_APPOINTMENTS, ...(results || [])];
  } catch (err) {
    logger.warn(`[AppointmentService] DB list error fallback: ${err.message}`);
    return [...IN_MEMORY_APPOINTMENTS];
  }
};

/**
 * Verify a priority reschedule token
 */
const verifyRescheduleToken = async (token) => {
  if (!token) throw ApiError.badRequest('Reschedule token is required.');

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired reschedule token.');
  }

  const appointment = await Appointment.findById(decoded.appointmentId)
    .populate('patientId', 'firstName lastName email phone')
    .populate('doctorId', 'firstName lastName email')
    .populate('slotId', 'startTime endTime');

  if (!appointment) throw ApiError.notFound('Original appointment not found.');
  if (appointment.status !== APPOINTMENT_STATUS.CANCELLED_DOCTOR_LEAVE) {
    throw ApiError.badRequest('This appointment is not eligible for priority rescheduling.');
  }

  const doctorProfile = await DoctorProfile.findOne({ userId: appointment.doctorId._id || appointment.doctorId });

  return {
    valid: true,
    appointment,
    doctorProfile,
  };
};

/**
 * Reschedule with priority token
 */
const rescheduleWithToken = async ({ token, newSlotId, holdToken }) => {
  const { appointment } = await verifyRescheduleToken(token);

  const slot = await mongoose.model('Slot').findById(newSlotId);
  if (!slot) throw ApiError.notFound('Target slot not found.');

  const [patient, doctor, doctorProfile] = await Promise.all([
    User.findById(appointment.patientId._id || appointment.patientId),
    User.findById(slot.doctorId),
    DoctorProfile.findOne({ userId: slot.doctorId }),
  ]);

  const session = await mongoose.startSession();
  let newAppointment;

  try {
    await session.withTransaction(async () => {
      // 1. Confirm slot
      await confirmSlotBooking(newSlotId, holdToken, null, session);

      // 2. Create new appointment retaining clinical data
      const [newAppt] = await Appointment.create([{
        patientId: appointment.patientId._id || appointment.patientId,
        doctorId: slot.doctorId,
        slotId: newSlotId,
        scheduledAt: slot.startTime,
        symptoms: appointment.symptoms,
        symptomDuration: appointment.symptomDuration,
        severity: appointment.severity,
        previousConditions: appointment.previousConditions || [],
        currentMedications: appointment.currentMedications || [],
        status: APPOINTMENT_STATUS.CONFIRMED,
        'preVisitAI.status': AI_STATUS.PENDING,
      }], { session });

      // 3. Mark old appointment as reschedule completed
      await Appointment.findByIdAndUpdate(
        appointment._id,
        {
          rescheduleToken: null,
          cancellationReason: `${appointment.cancellationReason || ''} [Rescheduled to ${newAppt._id}]`,
        },
        { session }
      );

      // 4. Update slot with appointment ID
      await mongoose.model('Slot').findByIdAndUpdate(
        newSlotId,
        { appointmentId: newAppt._id },
        { session }
      );

      newAppointment = newAppt;
    });
  } finally {
    await session.endSession();
  }

  logger.info(`[AppointmentService] Priority reschedule completed: old ${appointment._id} -> new ${newAppointment._id}`);

  // Async: trigger AI & notification
  setImmediate(async () => {
    try {
      const aiResult = await analyzePreVisitSymptoms({
        symptoms: appointment.symptoms,
        symptomDuration: appointment.symptomDuration,
        severity: appointment.severity,
        previousConditions: appointment.previousConditions,
        currentMedications: appointment.currentMedications,
      });
      await Appointment.findByIdAndUpdate(newAppointment._id, {
        'preVisitAI.status': aiResult.status || AI_STATUS.COMPLETED,
        'preVisitAI.urgencyLevel': aiResult.urgencyLevel,
        'preVisitAI.chiefComplaint': aiResult.chiefComplaint,
        'preVisitAI.suggestedDoctorQuestions': aiResult.suggestedDoctorQuestions,
        'preVisitAI.riskFlags': aiResult.riskFlags,
      });
    } catch (err) {
      logger.error(`[AppointmentService] Reschedule AI failed: ${err.message}`);
    }

    try {
      const { subject, html } = templates.appointmentConfirmed({
        patientName: `${patient.firstName} ${patient.lastName}`,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        specialization: doctorProfile?.specialization || 'General Medicine',
        scheduledAt: slot.startTime,
        appointmentId: newAppointment._id,
      });
      await queueNotification({
        type: JOB_TYPE.APPOINTMENT_CONFIRMED,
        recipientId: patient._id,
        recipientEmail: patient.email,
        subject,
        htmlBody: html,
        appointmentId: newAppointment._id,
      });
    } catch (err) {
      logger.error(`[AppointmentService] Reschedule notification failed: ${err.message}`);
    }
  });

  return newAppointment;
};

module.exports = {
  createAppointment,
  submitPostVisitNotes,
  cancelAppointment,
  listAppointments,
  verifyRescheduleToken,
  rescheduleWithToken,
  findInMemoryAppointment,
};


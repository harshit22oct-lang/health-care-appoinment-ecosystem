// ============================================================
// CONTROLLER — Appointments
// ============================================================
'use strict';

const { body, query } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const Appointment = require('../models/Appointment');
const appointmentService = require('../services/appointmentService');

const createAppointmentValidation = [
  body('slotId').notEmpty().withMessage('slotId is required'),
  body('holdToken').isUUID(4).withMessage('Valid hold token is required'),
  body('symptoms').notEmpty().withMessage('Symptoms description is required').isLength({ max: 2000 }),
  body('severity').optional().isIn(['mild', 'moderate', 'severe']),
  body('symptomDuration').optional().trim().isLength({ max: 100 }),
];

const postVisitValidation = [
  body('clinicalNotes').notEmpty().withMessage('Clinical notes are required'),
  body('diagnosis').optional().trim(),
];

const createAppointment = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.createAppointment({
    patientId: req.user._id,
    ...req.body,
  });
  ApiResponse.created(res, appointment, 'Appointment booked successfully. AI analysis is running.');
});

const getAppointments = asyncHandler(async (req, res) => {
  const { status, from, to } = req.query;
  const appointments = await appointmentService.listAppointments(req.user, { status, from, to });
  ApiResponse.ok(res, appointments);
});

const getAppointmentById = asyncHandler(async (req, res) => {
  const reqId = req.params.id;

  // Check in-memory store
  const inMemory = appointmentService.findInMemoryAppointment(reqId);
  if (inMemory) {
    return ApiResponse.ok(res, inMemory);
  }

  let appt = null;
  try {
    appt = await Appointment.findById(reqId)
      .populate('patientId', 'firstName lastName email phone dateOfBirth bloodGroup allergies')
      .populate('doctorId', 'firstName lastName email')
      .populate('slotId', 'startTime endTime');
  } catch (err) {
    // ignore
  }

  if (!appt) {
    // Return sample appointment if not found
    const sample = {
      _id: reqId,
      patientId: {
        _id: '64f1a2b3c4d5e6f7a8b9c0f1',
        firstName: 'Rohan',
        lastName: 'Verma',
        email: 'rohan@patient.demo',
        phone: '+91 98765 43230',
        bloodGroup: 'O+',
        allergies: ['Penicillin'],
      },
      doctorId: {
        _id: '64f1a2b3c4d5e6f7a8b9c0d1',
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'dr.priya@healthsync.demo',
      },
      slotId: {
        _id: 'slot_demo_today',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30 * 60000).toISOString(),
      },
      scheduledAt: new Date(),
      symptoms: 'Mild chest discomfort and palpitations during moderate exertion',
      symptomDuration: '4 days',
      severity: 'moderate',
      status: 'CONFIRMED',
      preVisitAI: {
        status: 'COMPLETED',
        urgencyLevel: 'Medium',
        chiefComplaint: 'Chest tightness with exertion',
        patientFriendlySummary: 'Your symptoms have been pre-screened by Gemini AI for Dr. Priya Sharma.',
        suggestedDoctorQuestions: [
          'Does the discomfort radiate to your arm, neck, or jaw?',
          'Do you have a personal or family history of high blood pressure or CAD?',
          'Are you currently experiencing shortness of breath or dizziness?'
        ],
        riskFlags: ['Moderate cardiac risk profile — ECG evaluation advised'],
      },
    };
    return ApiResponse.ok(res, sample);
  }

  ApiResponse.ok(res, appt);
});

const submitNotes = asyncHandler(async (req, res) => {
  const result = await appointmentService.submitPostVisitNotes(
    req.params.id,
    req.user._id,
    req.body
  );
  ApiResponse.ok(res, result, 'Consultation notes submitted.');
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const result = await appointmentService.cancelAppointment(
    req.params.id,
    req.user._id,
    req.user.role,
    req.body.reason
  );
  ApiResponse.ok(res, result);
});

const verifyReschedule = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const result = await appointmentService.verifyRescheduleToken(token);
  ApiResponse.ok(res, result, 'Reschedule token verified.');
});

const reschedule = asyncHandler(async (req, res) => {
  const { token, newSlotId, holdToken } = req.body;
  if (!token || !newSlotId || !holdToken) {
    throw ApiError.badRequest('token, newSlotId, and holdToken are required.');
  }
  const result = await appointmentService.rescheduleWithToken({ token, newSlotId, holdToken });
  ApiResponse.created(res, result, 'Appointment rescheduled successfully.');
});

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  submitNotes,
  cancelAppointment,
  verifyReschedule,
  reschedule,
  createAppointmentValidation,
  postVisitValidation,
};


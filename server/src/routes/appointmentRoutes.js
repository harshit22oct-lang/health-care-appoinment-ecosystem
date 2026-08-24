// ============================================================
// ROUTES — Appointments
// ============================================================
'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createAppointment, getAppointments, getAppointmentById,
  submitNotes, cancelAppointment,
  verifyReschedule, reschedule,
  createAppointmentValidation, postVisitValidation,
} = require('../controllers/appointmentController');

// Public/Token-authorized Rescheduling
router.get('/reschedule/verify', verifyReschedule);
router.post('/reschedule', reschedule);

router.post('/', authenticate, authorize('patient'), createAppointmentValidation, validate, createAppointment);
router.get('/', authenticate, getAppointments);
router.get('/:id', authenticate, getAppointmentById);
router.put('/:id/notes', authenticate, authorize('doctor'), postVisitValidation, validate, submitNotes);
router.post('/:id/notes', authenticate, authorize('doctor'), postVisitValidation, validate, submitNotes);
router.put('/:id/cancel', authenticate, cancelAppointment);

module.exports = router;

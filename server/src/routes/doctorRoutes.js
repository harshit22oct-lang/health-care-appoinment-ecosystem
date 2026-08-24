// ============================================================
// ROUTES — Doctors
// ============================================================
'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  searchDoctors, getDoctorById, createDoctor, updateDoctorProfile,
  getDoctorSlots, applyLeave, removeLeave, previewConflicts,
  aiSearchDoctors,
  createDoctorValidation, leaveValidation,
} = require('../controllers/doctorController');

// Public
router.get('/', searchDoctors);
router.post('/ai-search', aiSearchDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/slots', getDoctorSlots);

// Admin only
router.post('/', authenticate, authorize('admin'), createDoctorValidation, validate, createDoctor);

// Doctor (own profile) or Admin
router.put('/:id', authenticate, authorize('doctor', 'admin'), updateDoctorProfile);
router.post('/:id/leave', authenticate, authorize('doctor', 'admin'), leaveValidation, validate, applyLeave);
router.post('/:id/leave/preview', authenticate, authorize('doctor', 'admin'), previewConflicts);
router.delete('/:id/leave/:leaveId', authenticate, authorize('doctor', 'admin'), removeLeave);

module.exports = router;

// ============================================================
// MODEL — Appointment
// ============================================================
'use strict';

const mongoose = require('mongoose');

const APPOINTMENT_STATUS = {
  PENDING_PAYMENT:        'PENDING_PAYMENT',
  CONFIRMED:              'CONFIRMED',
  IN_PROGRESS:            'IN_PROGRESS',
  COMPLETED:              'COMPLETED',
  CANCELLED_BY_PATIENT:   'CANCELLED_BY_PATIENT',
  CANCELLED_BY_DOCTOR:    'CANCELLED_BY_DOCTOR',
  CANCELLED_DOCTOR_LEAVE: 'CANCELLED_DOCTOR_LEAVE',
  NEEDS_RESCHEDULE:       'NEEDS_RESCHEDULE',
  NO_SHOW:                'NO_SHOW',
};

const AI_STATUS = {
  PENDING:       'PENDING',
  COMPLETED:     'COMPLETED',
  FAILED:        'FAILED',
  PENDING_RETRY: 'PENDING_RETRY',
};

// ── Sub-schemas ───────────────────────────────────────────────
const preVisitAISchema = new mongoose.Schema({
  status:                  { type: String, enum: Object.values(AI_STATUS), default: AI_STATUS.PENDING },
  urgencyLevel:            { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
  chiefComplaint:          { type: String, trim: true },
  suggestedDoctorQuestions:{ type: [String], default: [] },
  riskFlags:               { type: [String], default: [] },
  processingTimeMs:        { type: Number },
  model:                   { type: String },
  generatedAt:             { type: Date },
  rawFallback:             { type: String }, // filled when AI fails — preserves raw symptoms
}, { _id: false });

const medicationSchema = new mongoose.Schema({
  name:               { type: String, required: true, trim: true },
  dosage:             { type: String, trim: true },             // "500mg"
  frequency:          { type: String, trim: true },             // "Twice daily after meals"
  durationDays:       { type: Number },
  timing:             { type: String, enum: ['before_food', 'after_food', 'with_food', 'any'], default: 'any' },
  reminderTimes:      { type: [String], default: [] },          // ['09:00', '20:00']
  specialInstructions:{ type: String, trim: true },
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
  medications:          { type: [medicationSchema], default: [] },
  followUpDays:         { type: Number },
  dietaryRestrictions:  { type: [String], default: [] },
  warnings:             { type: [String], default: [] },
}, { _id: false });

const vitalSignsSchema = new mongoose.Schema({
  bloodPressure:    { type: String },   // "120/80 mmHg"
  heartRate:        { type: Number },   // bpm
  temperature:      { type: Number },   // Celsius
  oxygenSaturation: { type: Number },   // SpO2 %
  weight:           { type: Number },   // kg
  height:           { type: Number },   // cm
}, { _id: false });

const medicationTimetableEntrySchema = new mongoose.Schema({
  time:         { type: String },        // "9:00 AM"
  medications:  { type: [String] },
  instructions: { type: String },
}, { _id: false });

const postVisitAISchema = new mongoose.Schema({
  status:                  { type: String, enum: Object.values(AI_STATUS), default: AI_STATUS.PENDING },
  patientFriendlySummary:  { type: String, trim: true },
  medicationTimetable:     { type: [medicationTimetableEntrySchema], default: [] },
  warningFlags:            { type: [String], default: [] },
  nextCheckupDeadline:     { type: String },
  processingTimeMs:        { type: Number },
  model:                   { type: String },
  generatedAt:             { type: Date },
}, { _id: false });

// ── Main Schema ───────────────────────────────────────────────
const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slotId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  scheduledAt: { type: Date, required: true },

  // Pre-visit intake
  symptoms:            { type: String, trim: true },
  symptomDuration:     { type: String, trim: true },
  severity:            { type: String, enum: ['mild', 'moderate', 'severe'], default: 'mild' },
  previousConditions:  { type: [String], default: [] },
  currentMedications:  { type: [String], default: [] },

  // AI Pre-visit analysis
  preVisitAI: { type: preVisitAISchema, default: () => ({}) },

  // Doctor visit
  clinicalNotes: { type: String, trim: true },
  vitalSigns:    { type: vitalSignsSchema },
  diagnosis:     { type: String, trim: true },

  // Prescription
  prescription: { type: prescriptionSchema, default: () => ({}) },

  // AI Post-visit summary
  postVisitAI: { type: postVisitAISchema, default: () => ({}) },

  // Status lifecycle
  status: {
    type: String,
    enum: Object.values(APPOINTMENT_STATUS),
    default: APPOINTMENT_STATUS.CONFIRMED,
  },
  rescheduleToken:           { type: String },
  rescheduleTokenExpiresAt:  { type: Date },
  cancellationReason:        { type: String, trim: true },

  // Google Calendar integration
  googleCalendarEventId: { type: String, sparse: true },
  calendarSyncStatus: {
    type: String,
    enum: ['NOT_SYNCED', 'SYNCED', 'SYNC_FAILED'],
    default: 'NOT_SYNCED',
  },

}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────
appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, scheduledAt: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });
appointmentSchema.index({ rescheduleToken: 1 }, { sparse: true });
appointmentSchema.index({ scheduledAt: 1 });

// ── Virtual: is active ────────────────────────────────────────
appointmentSchema.virtual('isActive').get(function () {
  return ['CONFIRMED', 'IN_PROGRESS'].includes(this.status);
});

// ── Virtual: can be rescheduled ───────────────────────────────
appointmentSchema.virtual('canReschedule').get(function () {
  return this.rescheduleToken && this.rescheduleTokenExpiresAt > new Date();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
module.exports.APPOINTMENT_STATUS = APPOINTMENT_STATUS;
module.exports.AI_STATUS = AI_STATUS;

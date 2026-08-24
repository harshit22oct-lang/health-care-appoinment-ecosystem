// ============================================================
// MODEL — DoctorProfile
// ============================================================
'use strict';

const mongoose = require('mongoose');

const dayScheduleSchema = new mongoose.Schema({
  start: { type: String, default: '09:00' }, // HH:MM
  end:   { type: String, default: '17:00' },
  isOff: { type: Boolean, default: false },
}, { _id: false });

const leavePeriodSchema = new mongoose.Schema({
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },
  reason:    { type: String, trim: true, default: 'Personal leave' },
  createdAt: { type: Date, default: Date.now },
});

const doctorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true,
  },
  qualifications: [{ type: String, trim: true }], // ['MBBS', 'MD - Cardiology']
  bio: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  consultationFee: {
    type: Number,
    required: true,
    min: [0, 'Consultation fee cannot be negative'],
  },
  slotDurationMinutes: {
    type: Number,
    default: 30,
    enum: [15, 20, 30, 45, 60],
  },
  workingHours: {
    monday:    { type: dayScheduleSchema, default: () => ({ start: '09:00', end: '17:00', isOff: false }) },
    tuesday:   { type: dayScheduleSchema, default: () => ({ start: '09:00', end: '17:00', isOff: false }) },
    wednesday: { type: dayScheduleSchema, default: () => ({ start: '09:00', end: '17:00', isOff: false }) },
    thursday:  { type: dayScheduleSchema, default: () => ({ start: '09:00', end: '17:00', isOff: false }) },
    friday:    { type: dayScheduleSchema, default: () => ({ start: '09:00', end: '17:00', isOff: false }) },
    saturday:  { type: dayScheduleSchema, default: () => ({ start: '09:00', end: '13:00', isOff: false }) },
    sunday:    { type: dayScheduleSchema, default: () => ({ start: null,    end: null,     isOff: true  }) },
  },
  leaveCalendar: [leavePeriodSchema],
  averageRating:       { type: Number, default: 0, min: 0, max: 5 },
  totalReviews:        { type: Number, default: 0 },
  yearsOfExperience:   { type: Number, default: 0, min: 0 },
  city:                { type: String, trim: true, default: 'Bhopal' },
  state:               { type: String, trim: true, default: 'Madhya Pradesh' },
  clinicAddress:       { type: String, trim: true },
  hospitalAffiliation: { type: String, trim: true },
  languages:           [{ type: String, trim: true }],
  profileImageUrl:     { type: String, trim: true },
  isVerified:          { type: Boolean, default: false },
  doctorType:          { type: String, enum: ['DEMO', 'REFERENCE'], default: 'DEMO' },
  isBookable:          { type: Boolean, default: true },
  referenceNote:       { type: String, trim: true, default: '' },
  nextAvailableSlot:   { type: String, default: 'Today · 04:30 PM' },

}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────
doctorProfileSchema.index({ specialization: 1 });
doctorProfileSchema.index({ city: 1 });
doctorProfileSchema.index({ isBookable: 1 });
doctorProfileSchema.index({ doctorType: 1 });
doctorProfileSchema.index({ consultationFee: 1 });
doctorProfileSchema.index({ averageRating: -1 });

/**
 * Check if the doctor is on leave for a given date range
 */
doctorProfileSchema.methods.isOnLeaveForRange = function (startDate, endDate) {
  return this.leaveCalendar.some(
    (leave) => leave.startDate <= endDate && leave.endDate >= startDate
  );
};

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);

// ============================================================
// MODEL — Slot  (Concurrency core — Two-Phase Hold)
// ============================================================
'use strict';

const mongoose = require('mongoose');

const SLOT_STATUS = {
  AVAILABLE:    'AVAILABLE',
  HELD:         'HELD',
  BOOKED:       'BOOKED',
  BLOCKED_LEAVE:'BLOCKED_LEAVE',
};

const slotSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(SLOT_STATUS),
    default: SLOT_STATUS.AVAILABLE,
  },
  // Two-Phase Hold fields
  holdToken: {
    type: String,
    default: null,
  },
  holdExpiresAt: {
    type: Date,
    default: null,
  },
  heldByPatientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Booking reference
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    default: null,
  },
}, { timestamps: true });

// ── Compound unique index — prevents slot duplication ────────
slotSchema.index({ doctorId: 1, startTime: 1 }, { unique: true });
slotSchema.index({ holdToken: 1 }, { sparse: true });
slotSchema.index({ status: 1, doctorId: 1 });
slotSchema.index({ holdExpiresAt: 1 }, { sparse: true }); // for cleanup worker

/**
 * Check if this slot's hold has expired
 */
slotSchema.methods.isHoldExpired = function () {
  return this.status === SLOT_STATUS.HELD && this.holdExpiresAt && this.holdExpiresAt < new Date();
};

module.exports = mongoose.model('Slot', slotSchema);
module.exports.SLOT_STATUS = SLOT_STATUS;

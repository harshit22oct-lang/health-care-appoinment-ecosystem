// ============================================================
// SERVICE — Slot Management & Two-Phase Hold Engine
// ============================================================
'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Slot = require('../models/Slot');
const { SLOT_STATUS } = require('../models/Slot');
const DoctorProfile = require('../models/DoctorProfile');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const logger = require('../utils/logger');

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Generate slots for a doctor on a specific date if they don't exist yet.
 * Respects working hours and leave calendar.
 */
const generateSlotsForDate = async (doctorId, date) => {
  let profile = null;
  if (mongoose.Types.ObjectId.isValid(doctorId)) {
    profile = await DoctorProfile.findOne({ userId: doctorId }) || await DoctorProfile.findById(doctorId);
  }
  if (!profile) {
    // In-memory demo doctor fallback
    profile = {
      slotDurationMinutes: 30,
      workingHours: {
        monday: { start: '09:00', end: '17:00', isOff: false },
        tuesday: { start: '09:00', end: '17:00', isOff: false },
        wednesday: { start: '09:00', end: '17:00', isOff: false },
        thursday: { start: '09:00', end: '17:00', isOff: false },
        friday: { start: '09:00', end: '17:00', isOff: false },
        saturday: { start: '09:00', end: '14:00', isOff: false },
        sunday: { isOff: true },
      },
      isOnLeaveForRange: () => false,
    };
  }

  const targetDate = new Date(date);
  const dayName = DAY_NAMES[targetDate.getUTCDay()];
  const schedule = profile.workingHours?.[dayName];

  if (!schedule || schedule.isOff) {
    return []; // Doctor's day off
  }

  // Check if doctor is on leave
  const dayStart = new Date(targetDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setUTCHours(23, 59, 59, 999);

  if (profile.isOnLeaveForRange && profile.isOnLeaveForRange(dayStart, dayEnd)) {
    return []; // Doctor on leave
  }

  const [startH, startM] = (schedule.start || '09:00').split(':').map(Number);
  const [endH, endM] = (schedule.end || '17:00').split(':').map(Number);

  const slots = [];
  let current = new Date(targetDate);
  current.setUTCHours(startH, startM, 0, 0);

  const endTime = new Date(targetDate);
  endTime.setUTCHours(endH, endM, 0, 0);

  const slotDuration = profile.slotDurationMinutes || 30;
  const targetDoctorId = profile.userId || doctorId;

  while (current < endTime) {
    const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);
    if (slotEnd > endTime) break;

    slots.push({
      doctorId: targetDoctorId,
      startTime: new Date(current),
      endTime: new Date(slotEnd),
      status: SLOT_STATUS.AVAILABLE,
    });

    current = slotEnd;
  }

  // Bulk upsert — safe to call multiple times (idempotent)
  if (slots.length > 0 && mongoose.Types.ObjectId.isValid(targetDoctorId)) {
    try {
      await Slot.insertMany(slots, { ordered: false });
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }

  if (mongoose.Types.ObjectId.isValid(targetDoctorId)) {
    return Slot.find({
      doctorId: targetDoctorId,
      startTime: { $gte: dayStart, $lte: dayEnd },
    }).sort({ startTime: 1 });
  }

  return slots.map((s, idx) => ({
    _id: `demo_slot_${idx}_${date.replace(/-/g, '')}`,
    ...s,
  }));
};

/**
 * Get available slots for a doctor on a specific date.
 * Auto-generates slots if not yet created.
 */
const getAvailableSlots = async (doctorId, date) => {
  const slots = await generateSlotsForDate(doctorId, date);
  if (Array.isArray(slots) && slots.length > 0) {
    return slots;
  }

  const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
  return times.map((t, idx) => {
    const [h, m] = t.split(':').map(Number);
    const start = new Date(date + 'T00:00:00.000Z');
    start.setUTCHours(h, m);
    const end = new Date(start.getTime() + 30 * 60000);
    return {
      _id: `demo_slot_${idx}_${date.replace(/-/g, '')}`,
      doctorId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status: SLOT_STATUS.AVAILABLE,
      isLocked: false,
    };
  });
};

/**
 * ─────────────────────────────────────────────────────────────
 * TWO-PHASE SLOT HOLD — Phase 1
 *
 * Atomically transitions a slot from AVAILABLE → HELD.
 * Uses findOneAndUpdate with conditional match — if any other
 * concurrent request already changed the status, this returns
 * null and we respond with 409 Conflict.
 * ─────────────────────────────────────────────────────────────
 */
const holdSlot = async (slotId, patientId) => {
  const holdToken = uuidv4();
  const holdExpiresAt = new Date(Date.now() + (env.SLOT_HOLD_TTL_MINUTES || 5) * 60 * 1000);

  if (typeof slotId === 'string' && slotId.startsWith('demo_slot_')) {
    return {
      holdToken,
      holdExpiresAt,
      slot: {
        _id: slotId,
        status: SLOT_STATUS.HELD,
        holdToken,
        holdExpiresAt,
      },
    };
  }

  // ATOMIC CONDITIONAL UPDATE — the heart of double-booking prevention
  const slot = await Slot.findOneAndUpdate(
    {
      _id: slotId,
      status: SLOT_STATUS.AVAILABLE, // ← condition: only succeeds if still AVAILABLE
    },
    {
      $set: {
        status: SLOT_STATUS.HELD,
        holdToken,
        holdExpiresAt,
        heldByPatientId: patientId,
      },
    },
    { new: true }
  );

  if (!slot) {
    // Either slot doesn't exist or was taken by another request simultaneously
    const existing = await Slot.findById(slotId);
    if (!existing) throw ApiError.notFound('Slot not found.');
    if (existing.status === SLOT_STATUS.BOOKED) throw ApiError.conflict('This slot has already been booked.');
    if (existing.status === SLOT_STATUS.HELD) throw ApiError.conflict('This slot is currently being reserved by another patient. Please try another slot.');
    if (existing.status === SLOT_STATUS.BLOCKED_LEAVE) throw ApiError.conflict('This slot is blocked due to doctor leave.');
    throw ApiError.conflict('Slot is not available.');
  }

  logger.info(`[SlotService] Slot ${slotId} HELD by patient ${patientId} until ${holdExpiresAt.toISOString()}`);
  return { slot, holdToken, holdExpiresAt };
};

/**
 * ─────────────────────────────────────────────────────────────
 * TWO-PHASE SLOT HOLD — Release (patient abandons or timeout)
 * ─────────────────────────────────────────────────────────────
 */
const releaseHold = async (slotId, patientId) => {
  const slot = await Slot.findOneAndUpdate(
    {
      _id: slotId,
      heldByPatientId: patientId,
      status: SLOT_STATUS.HELD,
    },
    {
      $set: {
        status: SLOT_STATUS.AVAILABLE,
        holdToken: null,
        holdExpiresAt: null,
        heldByPatientId: null,
      },
    },
    { new: true }
  );

  if (!slot) {
    throw ApiError.badRequest('No active hold found for this slot or you do not own this hold.');
  }

  logger.info(`[SlotService] Hold released for slot ${slotId} by patient ${patientId}`);
  return slot;
};

/**
 * ─────────────────────────────────────────────────────────────
 * TWO-PHASE SLOT HOLD — Phase 2: Confirm Booking
 * Validates hold token and transitions HELD → BOOKED atomically.
 * ─────────────────────────────────────────────────────────────
 */
const confirmSlotBooking = async (slotId, holdToken, appointmentId, session = null) => {
  const query = Slot.findOneAndUpdate(
    {
      _id: slotId,
      status: SLOT_STATUS.HELD,
      holdToken,                               // must match the token issued at Phase 1
      holdExpiresAt: { $gt: new Date() },      // hold must not be expired
    },
    {
      $set: {
        status: SLOT_STATUS.BOOKED,
        appointmentId,
        holdToken: null,
        holdExpiresAt: null,
        heldByPatientId: null,
      },
    },
    { new: true }
  );

  if (session) query.session(session);
  const slot = await query;

  if (!slot) {
    const existing = await Slot.findById(slotId);
    if (!existing) throw ApiError.notFound('Slot not found.');
    if (existing.status === SLOT_STATUS.BOOKED) throw ApiError.conflict('Slot already confirmed by another booking.');
    throw ApiError.conflict('Hold token is invalid or has expired. Please restart the booking process.');
  }

  logger.info(`[SlotService] Slot ${slotId} BOOKED via hold token — appointment ${appointmentId}`);
  return slot;
};

/**
 * Release a slot back to AVAILABLE (used on appointment cancellation)
 */
const releaseSlotOnCancellation = async (slotId, session = null) => {
  const query = Slot.findByIdAndUpdate(
    slotId,
    {
      $set: {
        status: SLOT_STATUS.AVAILABLE,
        appointmentId: null,
        holdToken: null,
        holdExpiresAt: null,
        heldByPatientId: null,
      },
    },
    { new: true }
  );
  if (session) query.session(session);
  return query;
};

module.exports = {
  generateSlotsForDate,
  getAvailableSlots,
  holdSlot,
  releaseHold,
  confirmSlotBooking,
  releaseSlotOnCancellation,
};

// ============================================================
// CONTROLLER — Slot Hold
// ============================================================
'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { holdSlot, releaseHold } = require('../services/slotService');

const placeHold = asyncHandler(async (req, res) => {
  const result = await holdSlot(req.params.slotId, req.user._id);
  ApiResponse.ok(res, {
    holdToken: result.holdToken,
    expiresAt: result.holdExpiresAt,
    slot: result.slot,
  }, `Slot reserved. You have ${process.env.SLOT_HOLD_TTL_MINUTES || 5} minutes to complete booking.`);
});

const dropHold = asyncHandler(async (req, res) => {
  await releaseHold(req.params.slotId, req.user._id);
  ApiResponse.ok(res, null, 'Hold released successfully.');
});

module.exports = { placeHold, dropHold };

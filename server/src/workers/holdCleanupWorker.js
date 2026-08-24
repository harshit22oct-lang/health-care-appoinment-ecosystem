// ============================================================
// WORKER — Hold Cleanup (runs every 1 minute)
// Releases expired HELD slots back to AVAILABLE
// ============================================================
'use strict';

const cron = require('node-cron');
const Slot = require('../models/Slot');
const { SLOT_STATUS } = require('../models/Slot');
const logger = require('../utils/logger');

const runCleanup = async () => {
  try {
    const result = await Slot.updateMany(
      {
        status: SLOT_STATUS.HELD,
        holdExpiresAt: { $lt: new Date() },
      },
      {
        $set: {
          status: SLOT_STATUS.AVAILABLE,
          holdToken: null,
          holdExpiresAt: null,
          heldByPatientId: null,
        },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`[HoldCleanupWorker] Released ${result.modifiedCount} expired hold(s).`);
    }
  } catch (err) {
    logger.error(`[HoldCleanupWorker] Error: ${err.message}`);
  }
};

const startHoldCleanupWorker = () => {
  // Run every minute
  cron.schedule('* * * * *', runCleanup, { name: 'hold-cleanup' });
  logger.info('[HoldCleanupWorker] Started — runs every 1 minute.');
};

module.exports = { startHoldCleanupWorker };

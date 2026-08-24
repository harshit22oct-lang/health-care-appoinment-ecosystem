// ============================================================
// WORKER — Notification Retry Engine (runs every 2 minutes)
// Exponential backoff: 1m → 5m → 15m → 1hr → DEAD_LETTER
// ============================================================
'use strict';

const cron = require('node-cron');
const NotificationJob = require('../models/NotificationJob');
const { JOB_STATUS } = require('../models/NotificationJob');
const { sendEmail } = require('../services/notificationService');
const logger = require('../utils/logger');

const BATCH_SIZE = 50;
let isRunning = false;

const processRetryQueue = async () => {
  if (isRunning) return; // Prevent overlapping runs
  isRunning = true;

  try {
    const jobs = await NotificationJob.find({
      status: { $in: [JOB_STATUS.QUEUED, JOB_STATUS.FAILED] },
      nextRetryAt: { $lte: new Date() },
    })
      .sort({ nextRetryAt: 1 })
      .limit(BATCH_SIZE);

    if (jobs.length === 0) {
      isRunning = false;
      return;
    }

    logger.info(`[RetryWorker] Processing ${jobs.length} notification job(s)...`);

    for (const job of jobs) {
      // Mark as PROCESSING to prevent concurrent workers from picking it up
      await NotificationJob.findByIdAndUpdate(job._id, {
        status: JOB_STATUS.PROCESSING,
        lastAttemptAt: new Date(),
      });

      try {
        await sendEmail({
          to: job.recipientEmail,
          subject: job.subject,
          html: job.htmlBody,
        });

        await NotificationJob.findByIdAndUpdate(job._id, {
          status: JOB_STATUS.SENT,
          sentAt: new Date(),
          $inc: { attempts: 1 },
        });

        logger.info(`[RetryWorker] Sent job ${job._id} (${job.type}) to ${job.recipientEmail}`);
      } catch (err) {
        const newAttempts = job.attempts + 1;

        if (newAttempts >= job.maxAttempts) {
          // Move to dead letter
          await NotificationJob.findByIdAndUpdate(job._id, {
            status: JOB_STATUS.DEAD_LETTER,
            attempts: newAttempts,
            $push: { errorLog: { attemptAt: new Date(), error: err.message } },
          });
          logger.warn(`[RetryWorker] Job ${job._id} moved to DEAD_LETTER after ${newAttempts} attempts.`);
        } else {
          // Schedule next retry with exponential backoff
          const updatedJob = { ...job.toObject(), attempts: newAttempts };
          const nextRetry = job.calculateNextRetry();
          await NotificationJob.findByIdAndUpdate(job._id, {
            status: JOB_STATUS.FAILED,
            attempts: newAttempts,
            nextRetryAt: nextRetry,
            $push: { errorLog: { attemptAt: new Date(), error: err.message } },
          });
          logger.warn(
            `[RetryWorker] Job ${job._id} failed (attempt ${newAttempts}/${job.maxAttempts}). Next retry: ${nextRetry.toISOString()}`
          );
        }
      }
    }
  } catch (err) {
    logger.error(`[RetryWorker] Queue processing error: ${err.message}`);
  } finally {
    isRunning = false;
  }
};

const startRetryWorker = () => {
  // Run every 2 minutes
  cron.schedule('*/2 * * * *', processRetryQueue, { name: 'notification-retry' });
  logger.info('[RetryWorker] Started — runs every 2 minutes.');
};

module.exports = { startRetryWorker };

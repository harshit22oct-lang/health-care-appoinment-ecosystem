// ============================================================
// SERVER — HTTP Server + Worker Bootstrap
// ============================================================
'use strict';

require('dotenv').config();

const http = require('http');
const createApp = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const env = require('./config/env');
const logger = require('./utils/logger');

const { startHoldCleanupWorker } = require('./workers/holdCleanupWorker');
const { startRetryWorker } = require('./workers/retryWorker');
const { startReminderWorker } = require('./workers/reminderWorker');

const PORT = env.PORT || 5000;

const bootstrap = async () => {
  try {
    // 1. Create Express app
    const app = createApp();
    const server = http.createServer(app);

    // 2. Start HTTP server immediately
    server.listen(PORT, () => {
      logger.info('╔════════════════════════════════════════════╗');
      logger.info('║     HealthSync API Server — RUNNING        ║');
      logger.info(`║     Port: ${PORT}                                ║`);
      logger.info(`║     Env:  ${env.NODE_ENV}                            ║`);
      logger.info('╚════════════════════════════════════════════╝');
    });

    // 3. Connect to MongoDB in background
    connectDB().then(() => {
      startHoldCleanupWorker();
      startRetryWorker();
      startReminderWorker();
    }).catch(err => {
      logger.warn(`[DB] Background connection attempt: ${err.message}`);
    });

    // ── Graceful Shutdown ──────────────────────────────────
    const shutdown = async (signal) => {
      logger.info(`[Server] ${signal} received — shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        logger.info('[Server] HTTP server closed. Goodbye.');
        process.exit(0);
      });

      // Force kill after 10 seconds
      setTimeout(() => {
        logger.error('[Server] Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('[Server] Unhandled Promise Rejection:', { reason: String(reason) });
    });

    process.on('uncaughtException', (err) => {
      logger.error('[Server] Uncaught Exception:', { message: err.message, stack: err.stack });
      process.exit(1);
    });

  } catch (err) {
    logger.error(`[Server] Bootstrap failed: ${err.message}`);
    process.exit(1);
  }
};

bootstrap();

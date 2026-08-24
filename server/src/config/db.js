// ============================================================
// CONFIG — MongoDB connection with retry logic
// ============================================================
'use strict';

const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

const CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 15000,
  maxPoolSize: 10,
  family: 4,
};

let isConnected = false;

mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', true);

const connectDB = async () => {
  if (isConnected) return;

  const uri = env.MONGODB_URI;

  if (!uri) {
    logger.warn('[DB] MONGODB_URI not set. Running in OFFLINE mode — DB features disabled.');
    logger.warn('[DB] Set MONGODB_URI in your .env file to enable persistence.');
    return;
  }

  try {
    const conn = await mongoose.connect(uri, CONNECT_OPTIONS);
    isConnected = true;
    logger.info(`[DB] MongoDB connected → ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('[DB] MongoDB disconnected. Reconnecting...');
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`[DB] Connection error: ${err.message}`);
    });

  } catch (err) {
    logger.error(`[DB] Initial connection failed: ${err.message}`);
    logger.warn('[DB] Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('[DB] MongoDB disconnected gracefully.');
  }
};

module.exports = { connectDB, disconnectDB };

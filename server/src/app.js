// ============================================================
// APP — Express Application Factory
// ============================================================
'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const requestId = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');
const routes = require('./routes/index');

const createApp = () => {
  const app = express();

  // ── Security ──────────────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));

  // ── Rate Limiting ─────────────────────────────────────────
  app.use('/api', rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
  }));

  // ── Parsers ───────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Observability ─────────────────────────────────────────
  app.use(requestId);
  if (env.isDev) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // ── API Routes ────────────────────────────────────────────
  app.use('/api/v1', routes);

  // ── Root ─────────────────────────────────────────────────
  app.get('/', (req, res) => {
    res.json({
      name: 'HealthSync API',
      version: '1.0.0',
      status: 'operational',
      docs: '/api/v1/health',
    });
  });

  // ── 404 Handler ───────────────────────────────────────────
  app.use((req, res, next) => {
    next(ApiError.notFound(`Route '${req.method} ${req.originalUrl}' not found.`));
  });

  // ── Error Handler (must be last) ─────────────────────────
  app.use(errorHandler);

  return app;
};

module.exports = createApp;

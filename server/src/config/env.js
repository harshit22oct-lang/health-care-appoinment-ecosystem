// ============================================================
// CONFIG — Environment variable validation & defaults
// ============================================================
'use strict';

require('dotenv').config();

const required = (key) => {
  const val = process.env[key];
  if (!val && process.env.NODE_ENV === 'production') {
    throw new Error(`[Config] Missing required environment variable: ${key}`);
  }
  return val || '';
};

const optional = (key, defaultValue = '') => process.env[key] || defaultValue;

module.exports = {
  // Server
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '5000'), 10),
  CLIENT_URL: optional('CLIENT_URL', 'http://localhost:5173'),

  // MongoDB
  MONGODB_URI: optional('MONGODB_URI', ''),

  // JWT
  JWT_SECRET: optional('JWT_SECRET', 'healthcare-dev-secret-key-change-in-production-32chars'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),
  JWT_REFRESH_SECRET: optional('JWT_REFRESH_SECRET', 'healthcare-refresh-secret-key-change-in-production'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '30d'),

  // Google Gemini AI
  GEMINI_API_KEY: optional('GEMINI_API_KEY', ''),
  GEMINI_MODEL: optional('GEMINI_MODEL', 'gemini-1.5-flash'),
  LLM_TIMEOUT_MS: parseInt(optional('LLM_TIMEOUT_MS', '10000'), 10),
  LLM_CIRCUIT_BREAKER_THRESHOLD: parseInt(optional('LLM_CIRCUIT_BREAKER_THRESHOLD', '3'), 10),
  LLM_CIRCUIT_BREAKER_WINDOW_MS: parseInt(optional('LLM_CIRCUIT_BREAKER_WINDOW_MS', '60000'), 10),

  // Email
  SMTP_HOST: optional('SMTP_HOST', ''),
  SMTP_PORT: parseInt(optional('SMTP_PORT', '587'), 10),
  SMTP_SECURE: optional('SMTP_SECURE', 'false') === 'true',
  SMTP_USER: optional('SMTP_USER', ''),
  SMTP_PASS: optional('SMTP_PASS', ''),
  EMAIL_FROM_NAME: optional('EMAIL_FROM_NAME', 'HealthSync Platform'),
  EMAIL_FROM_ADDRESS: optional('EMAIL_FROM_ADDRESS', 'noreply@healthsync.com'),

  // Google Calendar
  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET', ''),
  GOOGLE_REDIRECT_URI: optional('GOOGLE_REDIRECT_URI', 'http://localhost:5000/api/v1/auth/google/callback'),

  // Slot Hold
  SLOT_HOLD_TTL_MINUTES: parseInt(optional('SLOT_HOLD_TTL_MINUTES', '5'), 10),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(optional('RATE_LIMIT_MAX_REQUESTS', '100'), 10),

  // Computed helpers
  get isDev() { return this.NODE_ENV === 'development'; },
  get isProd() { return this.NODE_ENV === 'production'; },
};

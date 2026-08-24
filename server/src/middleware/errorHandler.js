// ============================================================
// MIDDLEWARE — Centralised Error Handler
// ============================================================
'use strict';

const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const requestId = req.requestId || 'unknown';

  // Mongoose: duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : 'value';
    err = ApiError.conflict(`${field} '${value}' already exists.`);
  }

  // Mongoose: validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    err = ApiError.badRequest('Validation failed', errors);
  }

  // Mongoose: invalid ObjectId cast
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    err = ApiError.badRequest(`Invalid ID format: ${err.value}`);
  }

  // JWT errors (should be handled in authenticate middleware, but belt-and-suspenders)
  if (err.name === 'JsonWebTokenError') {
    err = ApiError.unauthorized('Invalid token.');
  }
  if (err.name === 'TokenExpiredError') {
    err = ApiError.unauthorized('Token expired.');
  }

  // Default to 500 for non-operational errors
  if (!err.isOperational) {
    logger.error(`[ErrorHandler][${requestId}] Unexpected error: ${err.message}`, {
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
    err = ApiError.internal('An unexpected error occurred. Please try again later.');
  } else {
    logger.warn(`[ErrorHandler][${requestId}] Operational error ${err.statusCode}: ${err.message}`);
  }

  const response = {
    success: false,
    message: err.message,
    requestId,
    ...(err.errors && err.errors.length > 0 && { errors: err.errors }),
    ...(env.isDev && { stack: err.stack }),
  };

  return res.status(err.statusCode || 500).json(response);
};

module.exports = errorHandler;

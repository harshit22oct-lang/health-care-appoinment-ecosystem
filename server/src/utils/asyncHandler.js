// ============================================================
// UTIL — Async handler (eliminates try/catch boilerplate)
// ============================================================
'use strict';

/**
 * Wraps async route handlers and forwards errors to Express error middleware.
 * @param {Function} fn  Async controller function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

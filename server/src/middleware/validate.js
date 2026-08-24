// ============================================================
// MIDDLEWARE — Validation runner (express-validator)
// ============================================================
'use strict';

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Run after express-validator chains to collect and format errors.
 * Short-circuits the request with a 400 if any validation fails.
 */
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
      value: e.value,
    }));
    return next(ApiError.badRequest('Validation failed', errors));
  }
  next();
};

module.exports = validate;

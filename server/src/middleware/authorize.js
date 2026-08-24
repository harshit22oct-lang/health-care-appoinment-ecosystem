// ============================================================
// MIDDLEWARE — RBAC Role Authorization (factory)
// ============================================================
'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Role-based access control middleware factory.
 * Call with the roles that are allowed to access the route.
 *
 * @param {...string} roles  Allowed roles ('patient', 'doctor', 'admin')
 * @returns {Function}       Express middleware
 *
 * @example
 *   router.post('/leave', authenticate, authorize('doctor', 'admin'), ...)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required before authorization.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role '${req.user.role}' is not authorized to access this resource. Required: [${roles.join(', ')}]`
        )
      );
    }

    next();
  };
};

module.exports = authorize;

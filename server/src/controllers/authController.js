// ============================================================
// CONTROLLER — Authentication
// ============================================================
'use strict';

const { body } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const authService = require('../services/authService');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');
const { getAuthUrl, handleOAuthCallback } = require('../services/calendarService');

// Validation chains
const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['patient', 'admin']).withMessage('Invalid role'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Handlers
const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  res.cookie('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  ApiResponse.created(res, result, 'Registered successfully.');
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser({ email, password });
  res.cookie('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  ApiResponse.ok(res, result, 'Logged in successfully.');
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  ApiResponse.ok(res, null, 'Logged out successfully.');
});

const getMe = asyncHandler(async (req, res) => {
  const result = await authService.getCurrentUser(req.user._id);
  ApiResponse.ok(res, result);
});

const updateProfile = asyncHandler(async (req, res) => {
  const result = await authService.updateProfile(req.user._id, req.body);
  ApiResponse.ok(res, result, 'Profile updated successfully.');
});

const googleLoginStart = asyncHandler(async (req, res) => {
  const authUrl = getAuthUrl('login');
  if (!authUrl) {
    return res.redirect(`${env.CLIENT_URL || 'https://health-care-appoinment-ecosystem.vercel.app'}/login?error=google_not_configured`);
  }
  res.redirect(authUrl);
});

const googleCalendarConnect = asyncHandler(async (req, res) => {
  const authUrl = getAuthUrl(req.user._id.toString());
  if (!authUrl) {
    return ApiResponse.ok(res, { configured: false }, 'Google Calendar is not configured on this server.');
  }
  res.redirect(authUrl);
});

const googleCalendarCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  let clientUrl = (env.CLIENT_URL || '').trim();
  if (!clientUrl || !clientUrl.startsWith('http') || clientUrl.includes('*') || clientUrl.includes('localhost')) {
    clientUrl = 'https://health-care-appoinment-ecosystem.vercel.app';
  }
  clientUrl = clientUrl.replace(/\/+$/, '');

  if (!code) {
    return res.redirect(`${clientUrl}/login?error=google_auth_failed`);
  }

  try {
    const { user } = await handleOAuthCallback(code, state);
    if (!user) {
      return res.redirect(`${clientUrl}/login?error=google_auth_failed`);
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    if (state === 'login') {
      res.redirect(`${clientUrl}/login?googleToken=${token}&role=${user.role}&name=${encodeURIComponent(user.firstName || 'User')}`);
    } else {
      res.redirect(`${clientUrl}/patient?calendar=connected`);
    }
  } catch (err) {
    logger.error(`[AuthController] Google OAuth Callback failed: ${err.message}`);
    res.redirect(`${clientUrl}/login?error=google_auth_error`);
  }
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  googleLoginStart,
  googleCalendarConnect,
  googleCalendarCallback,
  registerValidation,
  loginValidation,
};

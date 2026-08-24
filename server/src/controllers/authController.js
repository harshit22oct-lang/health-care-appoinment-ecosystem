// ============================================================
// CONTROLLER — Authentication
// ============================================================
'use strict';

const { body } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const authService = require('../services/authService');
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
  ApiResponse.created(res, result, 'Account created successfully.');
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);
  // Set HTTP-only cookie for web clients, also return token in body for mobile/SPA
  res.cookie('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

const googleCalendarConnect = asyncHandler(async (req, res) => {
  const authUrl = getAuthUrl(req.user._id.toString());
  if (!authUrl) {
    return ApiResponse.ok(res, { configured: false }, 'Google Calendar is not configured on this server.');
  }
  res.redirect(authUrl);
});

const googleCalendarCallback = asyncHandler(async (req, res) => {
  const { code, state: userId } = req.query;
  await handleOAuthCallback(code, userId);
  res.redirect(`${process.env.CLIENT_URL}/patient/dashboard?calendar=connected`);
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  googleCalendarConnect,
  googleCalendarCallback,
  registerValidation,
  loginValidation,
};

// ============================================================
// CONTROLLER — Authentication
// ============================================================
'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const authService = require('../services/authService');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');
const { getAuthUrl, handleOAuthCallback } = require('../services/calendarService');
const { templates, queueNotification } = require('../services/notificationService');

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
      { id: user._id, userId: user._id, role: user.role, name: user.firstName, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    if (state === 'login') {
      res.redirect(`${clientUrl}/login?googleToken=${token}&role=${user.role}&name=${encodeURIComponent(user.firstName || 'User')}`);
    } else {
      res.redirect(`${clientUrl}/patient?calendar=connected`);
    }
  } catch (err) {
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw ApiError.badRequest('Email is required.');

  const cleanEmail = email.toLowerCase().trim();
  let user = null;
  try {
    user = await User.findOne({ email: cleanEmail });
  } catch {}

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  if (user) {
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = expiresAt;
    try {
      await user.save({ validateBeforeSave: false });
    } catch {}
  }

  let clientUrl = (env.CLIENT_URL || '').trim();
  if (!clientUrl || !clientUrl.startsWith('http') || clientUrl.includes('*') || clientUrl.includes('localhost')) {
    clientUrl = 'https://health-care-appoinment-ecosystem.vercel.app';
  }
  clientUrl = clientUrl.replace(/\/+$/, '');
  const resetLink = `${clientUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(cleanEmail)}`;

  // Dispatch email notification via Resend
  const { subject, html } = templates.passwordResetLink({
    userName: user ? user.firstName : 'User',
    resetLink,
    validMinutes: 15,
  });

  try {
    await queueNotification({
      type: 'PASSWORD_RESET',
      recipientId: user?._id || 'guest',
      recipientEmail: cleanEmail,
      subject,
      htmlBody: html,
    });
  } catch (e) {
    logger.warn(`[AuthController] Reset email error: ${e.message}`);
  }

  ApiResponse.ok(res, { sent: true }, 'If an account exists with this email, a reset link has been sent.');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) throw ApiError.badRequest('Reset token and new password are required.');
  if (password.length < 6) throw ApiError.badRequest('Password must be at least 6 characters.');

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  let user = null;
  try {
    user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });
  } catch {}

  if (!user) {
    throw ApiError.badRequest('Password reset link is invalid or has expired. Please request a new one.');
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  const jwtToken = jwt.sign(
    { id: user._id, userId: user._id, role: user.role, name: user.firstName, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  ApiResponse.ok(res, { token: jwtToken, user: user.toPublicJSON ? user.toPublicJSON() : user }, 'Password reset successfully. You are now logged in.');
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  googleLoginStart,
  googleCalendarConnect,
  googleCalendarCallback,
  registerValidation,
  loginValidation,
};

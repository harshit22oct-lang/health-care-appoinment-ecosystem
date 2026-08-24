// ============================================================
// SERVICE — Authentication
// ============================================================
'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Sign a JWT access token
 */
const signToken = (userId, role) =>
  jwt.sign({ id: userId, role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

/**
 * Register a new patient (or admin via internal call)
 */
const registerUser = async ({ firstName, lastName, email, password, role = 'patient', phone, dateOfBirth, bloodGroup }) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.');
  }

  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    passwordHash: password, // pre-save hook hashes it
    role,
    phone,
    dateOfBirth,
    bloodGroup,
  });

  logger.info(`[AuthService] New ${role} registered: ${user.email} (${user._id})`);

  const token = signToken(user._id, user.role);
  return { token, user: user.toPublicJSON() };
};

const DEMO_USERS = {
  'rohan@patient.demo': {
    _id: '64f1a2b3c4d5e6f7a8b9c0d1',
    firstName: 'Rohan',
    lastName: 'Verma',
    email: 'rohan@patient.demo',
    role: 'patient',
    bloodGroup: 'B+',
    phone: '+91 98765 43210',
    isActive: true,
    passwords: ['Patient@123456', 'patient123'],
  },
  'dr.priya@healthsync.demo': {
    _id: '64f1a2b3c4d5e6f7a8b9c0d2',
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'dr.priya@healthsync.demo',
    role: 'doctor',
    phone: '+91 98765 43211',
    isActive: true,
    passwords: ['Doctor@123456', 'doctor123'],
  },
  'admin@healthsync.demo': {
    _id: '64f1a2b3c4d5e6f7a8b9c0d0',
    firstName: 'Platform',
    lastName: 'Admin',
    email: 'admin@healthsync.demo',
    role: 'admin',
    isActive: true,
    passwords: ['Admin@123456', 'admin123'],
  },
};

/**
 * Authenticate a user with email/password
 */
const loginUser = async ({ email, password }) => {
  const normEmail = (email || '').toLowerCase().trim();

  let user = null;
  try {
    user = await User.findOne({ email: normEmail }).select('+passwordHash');
  } catch (err) {
    logger.warn(`[AuthService] DB query failed during login: ${err.message}`);
  }

  if (user) {
    if (!user.isActive) {
      throw ApiError.unauthorized('Account is deactivated. Please contact support.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch && (!DEMO_USERS[normEmail] || !DEMO_USERS[normEmail].passwords.includes(password))) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    try {
      await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });
    } catch {}

    const token = signToken(user._id, user.role);

    let doctorProfile = null;
    if (user.role === 'doctor') {
      try {
        doctorProfile = await DoctorProfile.findOne({ userId: user._id });
      } catch {}
    }

    logger.info(`[AuthService] Login: ${user.email} (${user.role})`);
    return { token, user: user.toPublicJSON ? user.toPublicJSON() : user, doctorProfile };
  }

  // Fallback demo account login
  const demo = DEMO_USERS[normEmail];
  if (demo && demo.passwords.includes(password)) {
    const token = signToken(demo._id, demo.role);
    logger.info(`[AuthService] Demo Login: ${demo.email} (${demo.role})`);
    return { token, user: demo, doctorProfile: null };
  }

  throw ApiError.unauthorized('Invalid email or password.');
};

/**
 * Get current user profile with doctor profile if applicable
 */
const getCurrentUser = async (userId) => {
  let user = null;
  try {
    user = await User.findById(userId);
  } catch (err) {
    logger.warn(`[AuthService] DB query in getCurrentUser: ${err.message}`);
  }

  if (!user) {
    const demo = Object.values(DEMO_USERS).find(u => String(u._id) === String(userId));
    if (demo) return { user: demo, doctorProfile: null };
    throw ApiError.notFound('User not found.');
  }

  let doctorProfile = null;
  if (user.role === 'doctor') {
    try {
      doctorProfile = await DoctorProfile.findOne({ userId: user._id });
    } catch {}
  }

  return { user: user.toPublicJSON ? user.toPublicJSON() : user, doctorProfile };
};

/**
 * Update user profile
 */
const updateProfile = async (userId, updates) => {
  const allowedFields = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'bloodGroup', 'allergies', 'emergencyContact'];
  const filteredUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) filteredUpdates[key] = updates[key];
  }

  const user = await User.findByIdAndUpdate(userId, filteredUpdates, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found.');

  return user.toPublicJSON();
};

module.exports = { registerUser, loginUser, getCurrentUser, updateProfile, signToken };

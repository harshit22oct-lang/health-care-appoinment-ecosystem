// ============================================================
// MODEL — User (Patient, Doctor, Admin)
// ============================================================
'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const calendarTokensSchema = new mongoose.Schema({
  access_token:  { type: String },
  refresh_token: { type: String },
  expiry_date:   { type: Number },
  scope:         { type: String },
  token_type:    { type: String, default: 'Bearer' },
}, { _id: false });

const emergencyContactSchema = new mongoose.Schema({
  name:     { type: String, trim: true },
  phone:    { type: String, trim: true },
  relation: { type: String, trim: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false, // Never returned in queries by default
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'admin'],
    default: 'patient',
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: 50,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: 50,
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[+\d\s\-()]{7,20}$/, 'Please provide a valid phone number'],
  },

  // Patient-specific fields
  dateOfBirth:      { type: Date },
  bloodGroup:       { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', ''] },
  allergies:        [{ type: String, trim: true }],
  emergencyContact: { type: emergencyContactSchema },

  // Google Calendar OAuth tokens (encrypted at application level)
  calendarTokens: { type: calendarTokensSchema },

  isActive:    { type: Boolean, default: true },
  lastLoginAt: { type: Date },

}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────
userSchema.index({ role: 1 });

// ── Virtual: full name ────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Pre-save: hash password ───────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
  next();
});

// ── Methods ───────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  delete obj.calendarTokens;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

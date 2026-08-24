// ============================================================
// ROUTES — Auth
// ============================================================
'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  register, login, logout, getMe, updateProfile,
  googleCalendarConnect, googleCalendarCallback,
  registerValidation, loginValidation,
} = require('../controllers/authController');

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateProfile);
router.get('/google/connect', authenticate, googleCalendarConnect);
router.get('/google/callback', googleCalendarCallback);

module.exports = router;
